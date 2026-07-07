// SuperGnome web — pocket layout (touch-first tabbed UI).
// Runs instead of the canvas when window.gnome.usePocket is set. Pure DOM:
// one tab per part (drums / bass / melody / chords / fx / key·mix), big
// tappable wrapping grids with DRAW / 2ND paint modes replacing right-click,
// −/+ steppers (not sliders — nothing shifts by a stray drag) and selects
// instead of drag-fields. All edits go through the same state array and
// engine plumbing exposed by gnome.js.

'use strict';
(function () {
  const G = window.gnome;
  if (!G || !G.usePocket) return;
  const C = G.consts, T = G.tables, m = G.m;
  const root = document.getElementById('pocket');

  // ---- formatting ----
  const fmtInt = v => String(Math.round(v));
  const fmtQ = v => String(Math.round(v * 100) / 100);
  const fmtPct = v => Math.round(v) + '%';
  const fmtSt = v => (v > 0 ? '+' : '') + Math.round(v) + ' st';
  const fmtCut = v => v >= 100 ? 'open (off)' : String(Math.round(v));
  const fmtMs = v => Math.round(v) + ' ms';
  const fmtBeats = v => fmtQ(v) + ' beats';
  const fmtWave = v => v <= 0 ? 'sine' : v >= 100 ? 'saw' : v === 50 ? 'triangle'
    : Math.round(v) < 50 ? `${Math.round(v)} (sine→tri)` : `${Math.round(v)} (tri→saw)`;
  const fmtNote = v => G.noteName(Math.round(v));
  const engineHint = si => {
    const e = m[C.ENG_A + si];
    return e === 1 ? 'plucked string (Karplus-Strong): Resonance = sustain, Cutoff = brightness'
      : e === 2 ? 'blown glass: stretched harmonics with a slow shimmer and breathy onset'
      : 'classic oscillator: sine → triangle → saw morph via Wave';
  };

  // ---- tiny DOM helpers ----
  function h(tag, cls, ...kids) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (const k of kids) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
    return e;
  }

  let syncs = [];          // per-frame updaters for the current tab
  let paintMode = 'draw';  // draw | alt
  let curLane = 0;
  let curTab = 'drums';

  // A −/+ stepper. Deliberately NOT a slider: values only change on discrete
  // taps (or press-and-hold auto-repeat that accelerates), so nothing shifts
  // by a stray drag. Signature matches the old slider() for drop-in use.
  function stepper(label, min, max, step, get, set, fmt = fmtInt, hint) {
    const val = h('span', 'pk-val', fmt(get()));
    const bump = dir => {
      let v = get() + dir * step;
      v = Math.round(v / step) * step;              // stay on the grid
      v = Math.max(min, Math.min(max, v));
      set(v); val.textContent = fmt(get()); G.touchState();
    };
    const mk = (dir, glyph) => {
      const b = h('button', 'pk-step-btn', glyph);
      let t = null, delay = 340, held = 0;
      const stop = () => { if (t) { clearTimeout(t); t = null; } held = 0; delay = 340; };
      const tick = () => {
        bump(dir); held++;
        delay = held > 6 ? 45 : held > 3 ? 90 : 180;   // accelerate on hold
        t = setTimeout(tick, delay);
      };
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); b.setPointerCapture(e.pointerId);
        bump(dir); t = setTimeout(tick, delay);
      });
      b.addEventListener('pointerup', stop);
      b.addEventListener('pointercancel', stop);
      b.addEventListener('pointerleave', stop);
      return b;
    };
    syncs.push(() => { val.textContent = fmt(get()); });
    return h('div', 'pk-stepper',
      h('div', 'pk-slabel', h('span', '', label), val),
      h('div', 'pk-steprow', mk(-1, '−'), mk(1, '+')),
      hint ? h('div', 'pk-hint', hint) : null);
  }
  const slider = stepper; // call sites read as sliders; they're steppers now

  function seg(label, opts, get, set, hint) {
    const btns = opts.map((o, i) => {
      const b = h('button', 'pk-seg-btn', o);
      b.addEventListener('click', () => { set(i); G.touchState(); upd(); });
      return b;
    });
    function upd() { btns.forEach((b, i) => b.classList.toggle('sel', get() === i)); }
    upd(); syncs.push(upd);
    return h('div', 'pk-row',
      h('div', 'pk-rowlabel', label),
      h('div', 'pk-seg', ...btns),
      hint ? h('div', 'pk-hint', hint) : null);
  }

  function chip(label, get, set, cls) {
    const b = h('button', 'pk-chip ' + (cls || ''), label);
    b.addEventListener('click', () => { set(!get()); G.touchState(); upd(); });
    function upd() { b.classList.toggle('sel', !!get()); }
    upd(); syncs.push(upd);
    return b;
  }

  function action(label, fn, cls) {
    const b = h('button', 'pk-chip act ' + (cls || ''), label);
    b.addEventListener('click', fn);
    return b;
  }

  function selectRow(label, names, get, set, lockedHint) {
    const sel = h('select', 'pk-select');
    names.forEach((n, i) => { const o = h('option', '', n); o.value = i; sel.append(o); });
    sel.value = get();
    sel.addEventListener('change', () => { set(parseInt(sel.value, 10)); G.touchState(); });
    const note = h('div', 'pk-hint', '');
    syncs.push(() => {
      const lk = lockedHint && lockedHint();
      sel.disabled = !!lk;
      note.textContent = lk || '';
      if (document.activeElement !== sel) sel.value = get();
    });
    return h('div', 'pk-row col', h('div', 'pk-rowlabel', label), sel, note);
  }

  function group(title, hint, ...rows) {
    return h('section', 'pk-group',
      h('h3', '', title),
      hint ? h('div', 'pk-hint head', hint) : null,
      ...rows);
  }

  function modeBar() {
    const mk = (id, label) => {
      const b = h('button', 'pk-seg-btn', label);
      b.addEventListener('click', () => { paintMode = id; upd(); });
      b.dataset.id = id;
      return b;
    };
    const btns = [mk('draw', '✏️ draw'), mk('alt', '🌗 2nd-cycle')];
    function upd() { btns.forEach(b => b.classList.toggle('sel', b.dataset.id === paintMode)); }
    upd(); syncs.push(upd);
    return h('div', 'pk-modes', ...btns,
      h('span', 'pk-hint', 'tap a cell to toggle it on/off · 2nd-cycle = every other loop'));
  }

  // ---- grids ----
  // drum grid wraps to rows of up to 8 cells so it never runs off-screen
  function drumGrid(l) {
    const grid = h('div', 'pk-grid');
    let built = -1;
    function build() {
      const st = m[C.STEPS_A + l];
      built = st;
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = `repeat(${Math.min(st, 8)}, 1fr)`;
      for (let i = 0; i < st; i++) {
        const c = h('button', 'pk-cell');
        c.dataset.i = i;
        grid.append(c);
      }
    }
    grid.addEventListener('click', e => {
      const t = e.target.closest('.pk-cell');
      if (!t) return;
      const p = C.PAT + l * C.MAX_STEPS + (+t.dataset.i);
      if (paintMode === 'alt') m[p] = m[p] === 2 ? 0 : 2;
      else m[p] = m[p] ? 0 : 1;
      G.touchState();
    });
    syncs.push(() => {
      const st = m[C.STEPS_A + l];
      if (st !== built) build();
      const gsd = m[C.LMODE_A + l] ? m[C.SPAN_A + l] / 16 : m[C.SPAN_A + l] / st;
      const ph = G.playing ? ((Math.floor(G.dispBeat / gsd) % st) + st) % st : -1;
      const spbi = 1 / gsd;
      const bt = (Math.abs(spbi - Math.round(spbi)) < 1e-6 && spbi >= 1) ? Math.round(spbi) : 0;
      for (let i = 0; i < grid.children.length; i++) {
        const c = grid.children[i], v = m[C.PAT + l * C.MAX_STEPS + i];
        c.classList.toggle('on', v === 1);
        c.classList.toggle('alt', v === 2);
        c.classList.toggle('ph', i === ph);
        c.classList.toggle('beat', !!bt && i % bt === 0);
      }
    });
    build();
    return h('div', 'pk-gridwrap', grid);
  }

  function rollGrid(si) {
    const grid = h('div', 'pk-roll');
    const ron = G.ronOff(si), rdg = G.rdgOff(si);
    let built = -1;
    function build() {
      const st = G.sget(si, 2);
      built = st;
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = `repeat(${st}, 36px)`;
      for (let r = 0; r < C.NROWS; r++) {
        const deg = C.NROWS - 1 - r;
        for (let i = 0; i < st; i++) {
          const c = h('button', 'pk-rcell');
          c.dataset.i = i; c.dataset.deg = deg;
          grid.append(c);
        }
      }
    }
    grid.addEventListener('click', e => {
      const t = e.target.closest('.pk-rcell');
      if (!t) return;
      const i = +t.dataset.i, deg = +t.dataset.deg;
      const here = m[ron + i] && m[rdg + i] === deg;
      if (paintMode === 'alt') {
        if (here) m[ron + i] = m[ron + i] === 1 ? 2 : 0;
        else { m[ron + i] = 2; m[rdg + i] = deg; }
      } else {
        if (here) m[ron + i] = 0;
        else { m[ron + i] = 1; m[rdg + i] = deg; }
      }
      G.touchState();
    });
    syncs.push(() => {
      const st = G.sget(si, 2);
      if (st !== built) build();
      const msd = (G.sget(si, 15) ? G.sget(si, 3) / 16 : G.sget(si, 3) / st)
        * [1, 2 / 3, 1.5][m[C.SFL_A + si]];
      const ph = G.playing ? ((Math.floor(G.dispBeat / msd) % st) + st) % st : -1;
      const cnt = Math.max(1, T.SCL[G.effScale(si)][0]);
      for (const c of grid.children) {
        const i = +c.dataset.i, deg = +c.dataset.deg;
        const here = m[ron + i] && m[rdg + i] === deg;
        c.classList.toggle('on', here && m[ron + i] === 1);
        c.classList.toggle('alt', here && m[ron + i] === 2);
        c.classList.toggle('ph', i === ph);
        c.classList.toggle('root', deg % cnt === 0);
      }
    });
    build();
    return h('div', 'pk-gridwrap tall', grid,
      h('div', 'pk-hint', 'rows are scale degrees — bottom row = BASE note'));
  }

  function rotateRow(doRot) {
    return h('div', 'pk-row',
      h('div', 'pk-rowlabel', 'Rotate pattern'),
      h('div', 'pk-seg',
        action('⟵ shift', () => { doRot(-1); G.touchState(); }),
        action('shift ⟶', () => { doRot(1); G.touchState(); })));
  }

  // ---- status ----
  let statusEl;
  function say(s) { if (statusEl) statusEl.textContent = s; }

  // ---- tabs ----
  function drumsTab(view) {
    const l = curLane = Math.min(curLane, G.numLanes - 1);

    // lane picker — each lane is its (fixed) sample name
    const lanesRow = h('div', 'pk-lanes');
    for (let i = 0; i < G.numLanes; i++) {
      const b = h('button', 'pk-chip lane' + (i === l ? ' sel' : ''),
        `${i + 1} · ${G.SAMPLE_DEFS[G.smpA[i]].label}`);
      b.addEventListener('click', () => { curLane = i; renderTab(); });
      const li = i;
      syncs.push(() => b.classList.toggle('muted', !!m[C.MUTE_A + li]));
      lanesRow.append(b);
    }
    if (G.numLanes < C.LANES_CAP)
      lanesRow.append(action('＋', () => { G.setNumLanes(G.numLanes + 1); renderTab(); }));
    if (G.numLanes > 1)
      lanesRow.append(action('－', () => {
        G.setNumLanes(G.numLanes - 1);
        curLane = Math.min(curLane, G.numLanes - 1);
        renderTab();
      }));

    view.append(
      h('div', 'pk-group', h('h3', '', `drum lanes — editing lane ${l + 1}`), lanesRow),
      group('', null,
        h('div', 'pk-actions',
          chip('MUTE', () => m[C.MUTE_A + l], v => m[C.MUTE_A + l] = v ? 1 : 0, 'danger'),
          action('🎲 choose euclidean rhythm', () => {
            say(`lane ${l + 1}: ${G.dealEuclid(l)}`);
            G.touchState();
          })),
        modeBar(),
        drumGrid(l)),
      group('pattern', 'euclidean engine: pulses spread evenly across steps',
        slider('Steps', 1, 32, 1, () => G.getParam(l, 2), v => G.setParam(l, 2, v)),
        slider('Length (beats)', 0.25, 16, 0.25, () => G.getParam(l, 3), v => G.setParam(l, 3, v), fmtQ),
        slider('Pulses', 0, 32, 1,
          () => G.getParam(l, 4), v => { G.setParam(l, 4, v); G.applyEuclid(l); }),
        rotateRow(dd => {
          G.rotatePat(l, dd);
          const st = Math.max(1, m[C.STEPS_A + l]);
          m[C.ROT_A + l] = ((m[C.ROT_A + l] + dd) % st + st) % st;
        }),
        seg('Timing mode', ['PR — synced', 'PM — drifts'],
          () => m[C.LMODE_A + l], i => m[C.LMODE_A + l] = i,
          'PR: steps fill the length. PM: fixed 16th steps, pattern drifts against the bar')),
      group('sound', null,
        slider('Velocity', 1, 127, 1, () => G.getParam(l, 6), v => G.setParam(l, 6, v)),
        slider('Pitch', -24, 24, 1, () => G.getParam(l, 8), v => G.setParam(l, 8, v), fmtSt),
        slider('Filter cutoff', 0, 100, 1, () => G.getParam(l, 9), v => G.setParam(l, 9, v), fmtCut),
        slider('Filter envelope per hit', 0, 100, 1, () => G.getParam(l, 10), v => G.setParam(l, 10, v))),
      group('motion', 'a beat-synced LFO wobbles the filter (and pitch, if you let it)',
        slider('LFO rate (beats)', 0.25, 16, 0.25, () => G.getParam(l, 11), v => G.setParam(l, 11, v), fmtQ),
        slider('LFO → filter depth', 0, 100, 1, () => G.getParam(l, 12), v => G.setParam(l, 12, v)),
        seg('LFO shape', ['sine', 'triangle', 'saw', 'S&H'],
          () => m[C.LSHAPE_A + l], i => m[C.LSHAPE_A + l] = i),
        slider('LFO → pitch (semitones)', 0, 24, 1, () => G.getParam(l, 14), v => G.setParam(l, 14, v))),
      group('groove', null,
        slider('Swing', 0, 75, 1, () => G.getParam(l, 15), v => G.setParam(l, 15, v), fmtPct),
        slider('Nudge (rush ↔ drag)', -50, 50, 1, () => G.getParam(l, 16), v => G.setParam(l, 16, v), fmtPct),
        slider('Humanize velocity', 0, 100, 1, () => G.getParam(l, 17), v => G.setParam(l, 17, v), fmtPct)));
  }

  function synthTab(view, si) {
    const locked = () => m[C.LOCK_A + si]
      ? 'following the master key (KEY·MIX tab) — unlock below to use' : '';

    view.append(
      group('', null,
        h('div', 'pk-actions',
          chip('MUTE', () => G.sget(si, 11), v => G.sset(si, 11, v ? 1 : 0), 'danger'),
          action('✨ new phrase', () => {
            G.synGenerate(si);
            say(`${T.SYN_NAMES[si]}: new phrase in ${T.SCALE_NAMES[G.effScale(si)]}` +
              (si === 0 ? ' (random walk)' : si === 1 ? ' (sweeping arc)' : ' (roots by 4ths/5ths)'));
            G.touchState();
          })),
        modeBar(),
        rollGrid(si)),
      group('instrument', 'the voice this part plays through',
        seg('Engine', ['classic', 'string', 'glass'],
          () => m[C.ENG_A + si], i => { m[C.ENG_A + si] = i; renderTab(); },
          engineHint(si))),
      group('pattern', 'euclidean engine: pulses spread evenly across steps',
        slider('Steps', 1, 32, 1, () => G.sget(si, 2), v => G.sset(si, 2, v)),
        slider('Length (beats)', 0.25, 16, 0.25, () => G.sget(si, 3), v => G.sset(si, 3, v), fmtQ),
        slider('Pulses', 0, 32, 1,
          () => G.sget(si, 4), v => { G.sset(si, 4, v); G.applySynEuclid(si); }),
        rotateRow(dd => {
          G.rotateSyn(si, dd);
          const st = Math.max(1, G.sget(si, 2));
          G.sset(si, 5, ((G.sget(si, 5) + dd) % st + st) % st);
        }),
        seg('Timing mode', ['PR — synced', 'PM — drifts'],
          () => G.sget(si, 15), i => G.sset(si, 15, i)),
        seg('Feel', ['straight', 'triplet', 'dotted'],
          () => m[C.SFL_A + si], i => m[C.SFL_A + si] = i)),
      group('pitch & key', null,
        seg('Key lock', ['independent', 'locked to key'],
          () => m[C.LOCK_A + si], i => m[C.LOCK_A + si] = i,
          'locked sections follow the master key, scale and harmony from KEY·MIX'),
        seg('Harmony speed', ['½×', '1×', '2×'],
          () => m[C.HML_A + si], i => m[C.HML_A + si] = i,
          'how fast this section moves through the progression, when locked'),
        slider('Base note', 12, 108, 1, () => G.sget(si, 0), v => G.sset(si, 0, v), fmtNote,
          'when locked, base snaps to the key — drag to choose the octave'),
        selectRow('Scale', T.SCALE_NAMES, () => G.sget(si, 1), v => G.sset(si, 1, v), locked),
        selectRow('Own progression', T.PROG_NAMES, () => G.sget(si, 22), v => G.sset(si, 22, v), locked),
        slider('Own progression speed', 0.25, 16, 0.25, () => G.sget(si, 23), v => G.sset(si, 23, v), fmtBeats),
        ...(si === 2 ? [seg('Chord size', ['triads', 'sevenths'],
          () => G.sget(si, 24), i => G.sset(si, 24, i))] : [])),
      group('sound', null,
        slider('Wave', 0, 100, 1, () => G.sget(si, 19), v => G.sset(si, 19, v), fmtWave),
        slider('Filter cutoff', 0, 100, 1, () => G.sget(si, 12), v => G.sset(si, 12, v), fmtCut),
        slider('Resonance', 0, 100, 1, () => G.sget(si, 13), v => G.sset(si, 13, v)),
        slider('Filter envelope amount', 0, 100, 1, () => G.sget(si, 14), v => G.sset(si, 14, v)),
        slider('Attack', 0, 500, 1, () => G.sget(si, 8), v => G.sset(si, 8, v), fmtMs),
        slider('Decay', 5, 4000, 5, () => G.sget(si, 9), v => G.sset(si, 9, v), fmtMs),
        seg('Envelope mode', ['AD pluck', 'HOLD for gate', 'LATCH drone'],
          () => G.sget(si, 20), i => G.sset(si, 20, i)),
        slider('Glide', 0, 2000, 5, () => G.sget(si, 21), v => G.sset(si, 21, v), fmtMs)),
      group('motion', null,
        slider('LFO rate (beats)', 0.25, 16, 0.25, () => G.sget(si, 16), v => G.sset(si, 16, v), fmtQ),
        slider('LFO → filter depth', 0, 100, 1, () => G.sget(si, 17), v => G.sset(si, 17, v)),
        seg('LFO shape', ['sine', 'triangle', 'saw', 'S&H'],
          () => G.sget(si, 18), i => G.sset(si, 18, i))),
      group('groove', null,
        slider('Velocity', 1, 127, 1, () => G.sget(si, 6), v => G.sset(si, 6, v)),
        slider('Gate length', 5, 200, 1, () => G.sget(si, 7), v => G.sset(si, 7, v), fmtPct),
        slider('Swing', 0, 75, 1, () => G.sget(si, 25), v => G.sset(si, 25, v), fmtPct),
        slider('Nudge (rush ↔ drag)', -50, 50, 1, () => G.sget(si, 26), v => G.sset(si, 26, v), fmtPct)));
  }

  function mixTab(view) {
    view.append(
      group('master key', 'B / M / C sections that are key-locked all follow this',
        slider('Key', 12, 108, 1, () => m[C.GKEY_NOTE], v => m[C.GKEY_NOTE] = Math.max(12, Math.min(108, v)), fmtNote),
        selectRow('Scale', T.SCALE_NAMES,
          () => m[C.GKEY_SCALE], v => m[C.GKEY_SCALE] = v),
        selectRow('Progression', T.PROG_NAMES,
          () => m[C.GKEY_PROG], v => m[C.GKEY_PROG] = v),
        slider('Progression speed', 0.25, 16, 0.25,
          () => m[C.GKEY_SPD], v => m[C.GKEY_SPD] = Math.max(0.25, v), fmtBeats)),
      group('section locks', null,
        ...[0, 1, 2].map(si => seg(T.SYN_NAMES[si], ['independent', 'locked · ½×', 'locked · 1×', 'locked · 2×'],
          () => m[C.LOCK_A + si] ? 1 + m[C.HML_A + si] : 0,
          i => {
            if (i === 0) m[C.LOCK_A + si] = 0;
            else { m[C.LOCK_A + si] = 1; m[C.HML_A + si] = i - 1; }
          }))),
      group('volumes', null,
        slider('Drums', 0, 100, 5, () => G.vols.drum, v => G.setVol('drum', v)),
        slider('Bass', 0, 100, 5, () => G.vols.bass, v => G.setVol('bass', v)),
        slider('Melody', 0, 100, 5, () => G.vols.mel, v => G.setVol('mel', v)),
        slider('Chords', 0, 100, 5, () => G.vols.chd, v => G.setVol('chd', v)),
        slider('Main out', 0, 100, 5, () => G.vols.master, v => G.setVol('master', v))),
      group('tempo & reset', null,
        slider('Tempo', 40, 240, 1, () => G.bpm, v => G.setBpm(v), v => Math.round(v) + ' bpm'),
        h('div', 'pk-actions',
          action('🔄 INIT — fresh starter groove', () => {
            G.resetAll();
            curLane = 0;
            renderTab();
            say('fresh gnome: starter groove restored');
          }, 'danger'))));
  }

  function fxTab(view) {
    const fmtDlyBeats = v => v + ' beats';
    view.append(
      group('effects rack', 'a shared bus: send parts in below, or feed the whole mix through',
        seg('Rack', ['off', 'on'], () => m[C.FX_ON], i => m[C.FX_ON] = i,
          'master switch for the delay + glitch chain'),
        slider('Feed full mix in', 0, 100, 5, () => m[C.FX_FEED], v => m[C.FX_FEED] = v, fmtPct,
          'how much of the whole mix runs through the rack')),
      group('sends into the rack', 'push individual parts into the effects',
        slider('Drums send', 0, 100, 5, () => m[C.SEND_A], v => m[C.SEND_A] = v, fmtPct),
        slider('Bass send', 0, 100, 5, () => m[C.SEND_A + 1], v => m[C.SEND_A + 1] = v, fmtPct),
        slider('Melody send', 0, 100, 5, () => m[C.SEND_A + 2], v => m[C.SEND_A + 2] = v, fmtPct),
        slider('Chords send', 0, 100, 5, () => m[C.SEND_A + 3], v => m[C.SEND_A + 3] = v, fmtPct)),
      group('floaty delay', 'a tape-ish echo with slow pitch drift',
        seg('Delay', ['off', 'on'], () => m[C.DLY_ON], i => m[C.DLY_ON] = i),
        slider('Time (beats)', 0.0625, 2, 0.0625, () => m[C.DLY_TIME], v => m[C.DLY_TIME] = v, fmtDlyBeats),
        slider('Feedback', 0, 100, 5, () => m[C.DLY_FB], v => m[C.DLY_FB] = v, fmtPct),
        slider('Tone', 0, 100, 5, () => m[C.DLY_TONE], v => m[C.DLY_TONE] = v, fmtPct,
          'darkens (low) or brightens (high) the echoes'),
        slider('Float / wow', 0, 100, 5, () => m[C.DLY_WOW], v => m[C.DLY_WOW] = v, fmtPct,
          'slow pitch drift for a seasick, floaty tail')),
      group('avocado glitch', 'beat-synced stutter + crush for glitching out',
        seg('Glitch', ['off', 'on'], () => m[C.AVO_ON], i => m[C.AVO_ON] = i),
        slider('Amount', 0, 100, 5, () => m[C.AVO_AMT], v => m[C.AVO_AMT] = v, fmtPct,
          'chance (and shortness) of a stutter each slice'),
        slider('Rate (beats)', 0.0625, 2, 0.0625, () => m[C.AVO_RATE], v => m[C.AVO_RATE] = v, fmtDlyBeats,
          'the grid it chops on'),
        slider('Crush', 0, 100, 5, () => m[C.AVO_CRUSH], v => m[C.AVO_CRUSH] = v, fmtPct,
          'bit + sample-rate reduction — grit'),
        slider('Mix', 0, 100, 5, () => m[C.AVO_MIX], v => m[C.AVO_MIX] = v, fmtPct)));
  }

  // ---- shell ----
  const TABS = [
    { id: 'drums', label: 'DRUMS' }, { id: 0, label: 'BASS' },
    { id: 1, label: 'MELODY' }, { id: 2, label: 'CHORDS' },
    { id: 'fx', label: 'FX' }, { id: 'mix', label: 'KEY·MIX' },
  ];

  const playBtn = h('button', 'pk-play', '▶');
  playBtn.addEventListener('click', async () => {
    if (!G.audioReady) { await G.initAudio(); }
    G.togglePlay();
    say(G.playing ? 'playing — everything phase-locked to beat 0' : 'stopped');
  });

  const bpmVal = h('span', 'pk-bpmval', G.bpm + '');
  const bpmDown = h('button', 'pk-chip', '−5');
  const bpmUp = h('button', 'pk-chip', '+5');
  bpmDown.addEventListener('click', () => G.setBpm(G.bpm - 5));
  bpmUp.addEventListener('click', () => G.setBpm(G.bpm + 5));

  statusEl = h('div', 'pk-status', 'tap ▶ to wake the gnome and play');

  const tabBar = h('div', 'pk-tabs');
  const tabBtns = TABS.map(t => {
    const b = h('button', 'pk-tab', t.label);
    b.addEventListener('click', () => { curTab = t.id; renderTab(); });
    tabBar.append(b);
    return { b, id: t.id };
  });

  const view = h('div', 'pk-view');
  root.append(
    h('div', 'pk-head',
      h('div', 'pk-topbar',
        playBtn,
        h('div', 'pk-bpm', bpmDown, h('div', 'pk-bpmbox', bpmVal, h('span', 'pk-hint', 'bpm')), bpmUp),
        statusEl),
      tabBar),
    view);

  function renderTab() {
    syncs = [];
    paintMode = 'draw'; // don't carry 2nd/erase modes into another tab unseen
    view.innerHTML = '';
    tabBtns.forEach(t => t.b.classList.toggle('sel', t.id === curTab));
    if (curTab === 'drums') drumsTab(view);
    else if (curTab === 'mix') mixTab(view);
    else if (curTab === 'fx') fxTab(view);
    else synthTab(view, curTab);
  }
  renderTab();

  // ---- per-frame sync ----
  function tick() {
    playBtn.textContent = G.audioStarting ? '…' : G.playing ? '■' : '▶';
    playBtn.classList.toggle('playing', G.playing);
    bpmVal.textContent = String(G.bpm);
    for (const f of syncs) f();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
