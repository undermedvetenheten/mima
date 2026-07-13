// SuperGnome web — shared DOM UI kit.
// Both layouts (gnome-mobile.js tabs, gnome-desktop.js dashboard) build their
// screens from these widgets and section builders, so a control behaves and
// looks the same everywhere and there's one place to change it. Everything
// drives the state array / engine plumbing exposed by gnome.js on window.gnome.
//
// createGnomeUI(G) returns a UI instance holding a per-render `syncs` list
// (per-frame updaters) and the shared paint mode. A layout calls beginRender()
// before rebuilding, assembles nodes from the builders, and runs frame() each
// animation frame to refresh live values / playheads.

'use strict';
window.createGnomeUI = function (G) {
  const C = G.consts, T = G.tables, m = G.m;
  const st = { syncs: [], paint: 'draw', say: () => { } };

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
    return e === 1 ? 'plucked string (Karplus-Strong): Cutoff filters it, Resonance = sustain — 100 = infinite (use the LATCH envelope for a drone)'
      : e === 2 ? 'blown glass: stretched harmonics, shimmer + breathy onset. Turn up Harmonic cycle for an evolving drone'
      : e === 3 ? (G.splSmp[si]
        ? `splice: plays “${G.splSmp[si].name || 'your sample'}” — crop it, track the notes or fix the pitch`
        : 'splice: load a sample (below) and this part plays it')
      : 'classic oscillator: sine → triangle → saw morph via Wave';
  };

  function h(tag, cls, ...kids) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (const k of kids) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
    return e;
  }

  // −/+ stepper: values change only on discrete taps (or press-hold repeat),
  // never by a stray drag.
  function stepper(label, min, max, step, get, set, fmt = fmtInt, hint) {
    const val = h('span', 'pk-val', fmt(get()));
    const bump = dir => {
      let v = get() + dir * step;
      v = Math.round(v / step) * step;
      v = Math.max(min, Math.min(max, v));
      set(v); val.textContent = fmt(get()); G.touchState();
    };
    const mk = (dir, glyph) => {
      const b = h('button', 'pk-step-btn', glyph);
      let t = null, delay = 340, held = 0;
      const stop = () => { if (t) { clearTimeout(t); t = null; } held = 0; delay = 340; };
      const tick = () => {
        bump(dir); held++;
        delay = held > 6 ? 45 : held > 3 ? 90 : 180;
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
    st.syncs.push(() => { val.textContent = fmt(get()); });
    return h('div', 'pk-stepper',
      h('div', 'pk-slabel', h('span', '', label), val),
      h('div', 'pk-steprow', mk(-1, '−'), mk(1, '+')),
      hint ? h('div', 'pk-hint', hint) : null);
  }

  function seg(label, opts, get, set, hint) {
    const btns = opts.map((o, i) => {
      const b = h('button', 'pk-seg-btn', o);
      b.addEventListener('click', () => { set(i); G.touchState(); upd(); });
      return b;
    });
    function upd() { btns.forEach((b, i) => b.classList.toggle('sel', get() === i)); }
    upd(); st.syncs.push(upd);
    return h('div', 'pk-row',
      h('div', 'pk-rowlabel', label),
      h('div', 'pk-seg', ...btns),
      hint ? h('div', 'pk-hint', hint) : null);
  }

  function chip(label, get, set, cls) {
    const b = h('button', 'pk-chip ' + (cls || ''), label);
    b.addEventListener('click', () => { set(!get()); G.touchState(); upd(); });
    function upd() { b.classList.toggle('sel', !!get()); }
    upd(); st.syncs.push(upd);
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
    st.syncs.push(() => {
      const lk = lockedHint && lockedHint();
      sel.disabled = !!lk;
      note.textContent = lk || '';
      if (document.activeElement !== sel) sel.value = get();
    });
    return h('div', 'pk-row col', h('div', 'pk-rowlabel', label), sel, note);
  }

  function group(title, hint, ...rows) {
    return h('section', 'pk-group',
      title ? h('h3', '', title) : null,
      hint ? h('div', 'pk-hint head', hint) : null,
      ...rows);
  }

  function modeBar() {
    const mk = (id, label) => {
      const b = h('button', 'pk-seg-btn', label);
      b.addEventListener('click', () => { st.paint = id; upd(); });
      b.dataset.id = id;
      return b;
    };
    const btns = [mk('draw', '✏️ draw'), mk('alt', '🌗 2nd-cycle')];
    function upd() { btns.forEach(b => b.classList.toggle('sel', b.dataset.id === st.paint)); }
    upd(); st.syncs.push(upd);
    return h('div', 'pk-modes', ...btns,
      h('span', 'pk-hint', 'tap a cell to toggle it on/off · 2nd-cycle = every other loop'));
  }

  function rotateRow(doRot) {
    return h('div', 'pk-row',
      h('div', 'pk-rowlabel', 'Rotate pattern'),
      h('div', 'pk-seg',
        action('⟵ shift', () => { doRot(-1); G.touchState(); }),
        action('shift ⟶', () => { doRot(1); G.touchState(); })));
  }

  // ---- grids ----
  function drumGrid(l) {
    const grid = h('div', 'pk-grid');
    let built = -1;
    function build() {
      const steps = m[C.STEPS_A + l];
      built = steps;
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = `repeat(${Math.min(steps, 8)}, 1fr)`;
      for (let i = 0; i < steps; i++) {
        const c = h('button', 'pk-cell'); c.dataset.i = i; grid.append(c);
      }
    }
    grid.addEventListener('click', e => {
      const t = e.target.closest('.pk-cell');
      if (!t) return;
      const p = C.PAT + l * C.MAX_STEPS + (+t.dataset.i);
      if (st.paint === 'alt') m[p] = m[p] === 2 ? 0 : 2;
      else m[p] = m[p] ? 0 : 1;
      G.touchState();
    });
    st.syncs.push(() => {
      const steps = m[C.STEPS_A + l];
      if (steps !== built) build();
      const gsd = m[C.LMODE_A + l] ? m[C.SPAN_A + l] / 16 : m[C.SPAN_A + l] / steps;
      const ph = G.playing ? ((Math.floor(G.dispBeat / gsd) % steps) + steps) % steps : -1;
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
      const steps = G.sget(si, 2);
      built = steps;
      grid.innerHTML = '';
      grid.style.gridTemplateColumns = `repeat(${steps}, 36px)`;
      for (let r = 0; r < C.NROWS; r++) {
        const deg = C.NROWS - 1 - r;
        for (let i = 0; i < steps; i++) {
          const c = h('button', 'pk-rcell'); c.dataset.i = i; c.dataset.deg = deg; grid.append(c);
        }
      }
    }
    grid.addEventListener('click', e => {
      const t = e.target.closest('.pk-rcell');
      if (!t) return;
      const i = +t.dataset.i, deg = +t.dataset.deg;
      const here = m[ron + i] && m[rdg + i] === deg;
      if (st.paint === 'alt') {
        if (here) m[ron + i] = m[ron + i] === 1 ? 2 : 0;
        else { m[ron + i] = 2; m[rdg + i] = deg; }
      } else {
        if (here) m[ron + i] = 0;
        else { m[ron + i] = 1; m[rdg + i] = deg; }
      }
      if (m[ron + i]) st.say(G.rollLabel(si, deg));
      G.touchState();
    });
    st.syncs.push(() => {
      const steps = G.sget(si, 2);
      if (steps !== built) build();
      const msd = (G.sget(si, 15) ? G.sget(si, 3) / 16 : G.sget(si, 3) / steps)
        * [1, 2 / 3, 1.5][m[C.SFL_A + si]];
      const ph = G.playing ? ((Math.floor(G.dispBeat / msd) % steps) + steps) % steps : -1;
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

  // ---- lane strip (shared drum lane picker) ----
  function laneStrip(cur, onPick, onAdd, onRemove) {
    const row = h('div', 'pk-lanes');
    for (let i = 0; i < G.numLanes; i++) {
      const b = h('button', 'pk-chip lane' + (i === cur ? ' sel' : ''),
        `${i + 1} · ${G.SAMPLE_DEFS[G.smpA[i]].label}`);
      b.addEventListener('click', () => onPick(i));
      const li = i;
      st.syncs.push(() => b.classList.toggle('muted', !!m[C.MUTE_A + li]));
      row.append(b);
    }
    if (G.numLanes < C.LANES_CAP) row.append(action('＋', onAdd));
    if (G.numLanes > 1) row.append(action('－', onRemove));
    return row;
  }

  // ---- section builders (return arrays of <section> groups) ----
  function drumMain(l, say, rerender) {
    const rr = rerender || (() => { });
    const isSyn = G.smpA[l] === C.SMP_SYN, isUsr = G.smpA[l] === C.SMP_USR;
    return group('',
      m[C.MUTE_A + l] ? 'lane muted' : null,
      h('div', 'pk-actions',
        chip('MUTE', () => m[C.MUTE_A + l], v => m[C.MUTE_A + l] = v ? 1 : 0, 'danger'),
        action('🎲 choose euclidean rhythm', () => { say(`lane ${l + 1}: ${G.dealEuclid(l)}`); G.touchState(); })),
      seg('Sample', G.SAMPLE_DEFS.map(s => s.label), () => G.smpA[l],
        i => { G.setSmp(l, i); rr(); },
        isSyn ? 'SYN: a synthesized drum — shape it under “synth drum voice” below'
          : isUsr ? (G.userSmp[l] ? `“${G.userSmp[l].name}”` : 'no file yet — load or dig one below') : null),
      ...(isUsr ? [h('div', 'pk-actions',
        action('📂 load audio file', () => G.loadUserSample(l)),
        action('💿 crate dig (public domain)', () => G.digSample('lane', l)))] : []),
      modeBar(),
      drumGrid(l));
  }

  function drumParams(l) {
    return [
      ...(G.smpA[l] === C.SMP_SYN ? [
        group('synth drum voice', 'Pitch = tuning, Filter shapes it, decay from Gate',
          stepper('Noise mix', 0, 100, 5, () => m[C.DNSE_A + l], v => m[C.DNSE_A + l] = v, fmtPct),
          stepper('Pitch sweep', 0, 100, 5, () => m[C.DSWP_A + l], v => m[C.DSWP_A + l] = v, fmtPct,
            'the hit starts high and drops to the pitch — 808-style'),
          stepper('30Hz sub (beef)', 0, 100, 5, () => m[C.DSUB_A + l], v => m[C.DSUB_A + l] = v, fmtPct,
            'a low sine under the transient to fatten it'),
          stepper('Click', 0, 100, 5, () => m[C.DCLK_A + l], v => m[C.DCLK_A + l] = v, fmtPct),
          stepper('Decay (gate)', 5, 200, 5, () => G.getParam(l, 7), v => G.setParam(l, 7, v), fmtPct))] : []),
      group('pattern', 'euclidean engine: pulses spread evenly across steps',
        stepper('Steps', 1, 32, 1, () => G.getParam(l, 2), v => G.setParam(l, 2, v)),
        stepper('Length (beats)', 0.25, 16, 0.25, () => G.getParam(l, 3), v => G.setParam(l, 3, v), fmtQ),
        stepper('Pulses', 0, 32, 1, () => G.getParam(l, 4), v => { G.setParam(l, 4, v); G.applyEuclid(l); }),
        rotateRow(dd => {
          G.rotatePat(l, dd);
          const s = Math.max(1, m[C.STEPS_A + l]);
          m[C.ROT_A + l] = ((m[C.ROT_A + l] + dd) % s + s) % s;
        }),
        seg('Timing mode', ['PR — synced', 'PM — drifts'],
          () => m[C.LMODE_A + l], i => m[C.LMODE_A + l] = i,
          'PR: steps fill the length. PM: fixed 16th steps, pattern drifts')),
      group('sound', null,
        stepper('Velocity', 1, 127, 1, () => G.getParam(l, 6), v => G.setParam(l, 6, v)),
        stepper('Pitch', -24, 24, 1, () => G.getParam(l, 8), v => G.setParam(l, 8, v), fmtSt),
        stepper('Filter cutoff', 0, 100, 5, () => G.getParam(l, 9), v => G.setParam(l, 9, v), fmtCut),
        stepper('Filter env per hit', 0, 100, 5, () => G.getParam(l, 10), v => G.setParam(l, 10, v))),
      group('motion', 'a beat-synced LFO wobbles the filter (and pitch, if you let it)',
        stepper('LFO rate (beats)', 0.25, 16, 0.25, () => G.getParam(l, 11), v => G.setParam(l, 11, v), fmtQ),
        stepper('LFO → filter depth', 0, 100, 5, () => G.getParam(l, 12), v => G.setParam(l, 12, v)),
        seg('LFO shape', ['sine', 'triangle', 'saw', 'S&H'], () => m[C.LSHAPE_A + l], i => m[C.LSHAPE_A + l] = i),
        stepper('LFO → pitch (semis)', 0, 24, 1, () => G.getParam(l, 14), v => G.setParam(l, 14, v))),
      group('groove', null,
        stepper('Swing', 0, 75, 5, () => G.getParam(l, 15), v => G.setParam(l, 15, v), fmtPct),
        stepper('Nudge', -50, 50, 5, () => G.getParam(l, 16), v => G.setParam(l, 16, v), fmtPct),
        stepper('Humanize velocity', 0, 100, 5, () => G.getParam(l, 17), v => G.setParam(l, 17, v), fmtPct)),
    ];
  }

  function synthMain(si, say, rerender) {
    const engHint = () => engineHint(si);
    return [
      group('',
        m[C.LOCK_A + si] ? null : 'independent of the master key',
        h('div', 'pk-actions',
          chip('MUTE', () => G.sget(si, 11), v => G.sset(si, 11, v ? 1 : 0), 'danger'),
          action('🎲 random', () => {
            G.synGenerate(si);
            say(`${T.SYN_NAMES[si]}: random pattern`);
            G.touchState();
          }),
          action('🎯 in key', () => {
            G.synKeyGen(si);
            say(`${T.SYN_NAMES[si]}: generated in ${T.STYLE_NAMES[m[C.GEN_STYLE] || 0]} / ${T.SCALE_NAMES[G.effScale(si)]}`);
            G.touchState();
          })),
        modeBar(),
        rollGrid(si)),
      group('instrument', 'the voice this part plays through',
        seg('Engine', ['classic', 'string', 'glass', 'splice'],
          () => m[C.ENG_A + si], i => { m[C.ENG_A + si] = i; rerender(); }, engHint()),
        ...(m[C.ENG_A + si] === 2
          ? [stepper('Harmonic cycle', 0, 100, 5, () => m[C.GLC_A + si], v => m[C.GLC_A + si] = v, fmtPct,
              'slowly sweeps which harmonic is loudest — 0 = static')]
          : []),
        ...(m[C.ENG_A + si] === 3
          ? [h('div', 'pk-actions',
              action('📂 load audio file', () => { G.loadSpliceSample(si); }),
              action('💿 crate dig (public domain)', () => G.digSample('splice', si))),
            stepper('Crop start', 0, 100, 1, () => m[C.SPL_ST_A + si], v => m[C.SPL_ST_A + si] = v, fmtPct),
            stepper('Crop end', 0, 100, 1, () => m[C.SPL_EN_A + si], v => m[C.SPL_EN_A + si] = v, fmtPct,
              'the crop window loops while a note sustains'),
            seg('Pitch', ['track the notes', 'fixed'],
              () => m[C.SPL_MODE_A + si], i => m[C.SPL_MODE_A + si] = i,
              'track: repitched per note (C4 = as recorded). fixed: plays as-is'),
            stepper('Fine tune', -12, 12, 1, () => m[C.SPL_TUNE_A + si], v => m[C.SPL_TUNE_A + si] = v, fmtSt)]
          : [])),
    ];
  }

  function synthParams(si) {
    const locked = () => m[C.LOCK_A + si]
      ? 'following the master key — unlock to use' : '';
    return [
      group('pattern', 'euclidean engine: pulses spread evenly across steps',
        stepper('Steps', 1, 32, 1, () => G.sget(si, 2), v => G.sset(si, 2, v)),
        stepper('Length (beats)', 0.25, 16, 0.25, () => G.sget(si, 3), v => G.sset(si, 3, v), fmtQ),
        stepper('Pulses', 0, 32, 1, () => G.sget(si, 4), v => { G.sset(si, 4, v); G.applySynEuclid(si); }),
        rotateRow(dd => {
          G.rotateSyn(si, dd);
          const s = Math.max(1, G.sget(si, 2));
          G.sset(si, 5, ((G.sget(si, 5) + dd) % s + s) % s);
        }),
        seg('Timing mode', ['PR — synced', 'PM — drifts'], () => G.sget(si, 15), i => G.sset(si, 15, i)),
        seg('Feel', ['straight', 'triplet', 'dotted'], () => m[C.SFL_A + si], i => m[C.SFL_A + si] = i)),
      group('pitch & key', null,
        seg('Key lock', ['independent', 'locked to key'],
          () => m[C.LOCK_A + si], i => m[C.LOCK_A + si] = i,
          'locked sections follow the master key/scale/harmony'),
        seg('Harmony speed', ['½×', '1×', '2×'], () => m[C.HML_A + si], i => m[C.HML_A + si] = i),
        stepper('Base note', 12, 108, 1, () => G.sget(si, 0), v => G.sset(si, 0, v), fmtNote),
        selectRow('Scale', T.SCALE_NAMES, () => G.sget(si, 1), v => G.sset(si, 1, v), locked),
        selectRow('Own progression', T.PROG_NAMES, () => G.sget(si, 22), v => G.sset(si, 22, v), locked),
        stepper('Own prog. speed', 0.25, 16, 0.25, () => G.sget(si, 23), v => G.sset(si, 23, v), fmtBeats),
        ...(si === 2 ? [seg('Chord size', ['triads', 'sevenths'], () => G.sget(si, 24), i => G.sset(si, 24, i))] : [])),
      group('sound', null,
        stepper('Wave', 0, 100, 5, () => G.sget(si, 19), v => G.sset(si, 19, v), fmtWave),
        stepper('Filter cutoff', 0, 100, 5, () => G.sget(si, 12), v => G.sset(si, 12, v), fmtCut),
        stepper('Resonance', 0, 100, 5, () => G.sget(si, 13), v => G.sset(si, 13, v)),
        stepper('Filter env amount', 0, 100, 5, () => G.sget(si, 14), v => G.sset(si, 14, v)),
        stepper('Attack', 0, 500, 5, () => G.sget(si, 8), v => G.sset(si, 8, v), fmtMs),
        stepper('Decay', 5, 4000, 5, () => G.sget(si, 9), v => G.sset(si, 9, v), fmtMs),
        seg('Envelope', ['AD pluck', 'HOLD', 'LATCH'], () => G.sget(si, 20), i => G.sset(si, 20, i)),
        stepper('Glide', 0, 2000, 10, () => G.sget(si, 21), v => G.sset(si, 21, v), fmtMs)),
      group('motion', null,
        stepper('LFO rate (beats)', 0.25, 16, 0.25, () => G.sget(si, 16), v => G.sset(si, 16, v), fmtQ),
        stepper('LFO → filter depth', 0, 100, 5, () => G.sget(si, 17), v => G.sset(si, 17, v)),
        seg('LFO shape', ['sine', 'triangle', 'saw', 'S&H'], () => G.sget(si, 18), i => G.sset(si, 18, i))),
      group('groove', null,
        stepper('Velocity', 1, 127, 1, () => G.sget(si, 6), v => G.sset(si, 6, v)),
        stepper('Gate length', 5, 200, 5, () => G.sget(si, 7), v => G.sset(si, 7, v), fmtPct),
        stepper('Swing', 0, 75, 5, () => G.sget(si, 25), v => G.sset(si, 25, v), fmtPct),
        stepper('Nudge', -50, 50, 5, () => G.sget(si, 26), v => G.sset(si, 26, v), fmtPct)),
    ];
  }

  function fxSections() {
    const fmtDlyBeats = v => v + ' beats';
    // per-fx routing: send each part (0 drums,1 bass,2 melody,3 chords) into
    // this specific fx stage (fxi 0 delay, 1 glitch, 2 clouds).
    const route = fxi => ['Drums', 'Bass', 'Melody', 'Chords'].map((nm, p) => {
      const off = C.SND_MTX + p * 3 + fxi;
      return stepper(nm + ' →', 0, 100, 5, () => m[off], v => m[off] = v, fmtPct);
    });
    return [
      group('effects rack', 'each fx has its own per-part sends, or feed the whole mix through',
        seg('Rack', ['off', 'on'], () => m[C.FX_ON], i => m[C.FX_ON] = i),
        stepper('Feed full mix in', 0, 100, 5, () => m[C.FX_FEED], v => m[C.FX_FEED] = v, fmtPct),
        seg('Sends tap', ['post-fader', 'pre-fader'], () => m[C.SND_PRE], i => m[C.SND_PRE] = i,
          'pre-fader: pull a part’s volume down and its fx wash stays')),
      group('floaty delay', 'a tape-ish echo — pitch/reverse the repeats or let them drift',
        seg('Delay', ['off', 'on'], () => m[C.DLY_ON], i => m[C.DLY_ON] = i),
        stepper('Time (beats)', 0.0625, 2, 0.0625, () => m[C.DLY_TIME], v => m[C.DLY_TIME] = v, fmtDlyBeats),
        stepper('Feedback', 0, 100, 5, () => m[C.DLY_FB], v => m[C.DLY_FB] = v, fmtPct),
        stepper('Pitch', -24, 24, 1, () => m[C.DLY_PITCH], v => m[C.DLY_PITCH] = v, fmtSt,
          'each repeat shifts by this — climbing or falling echoes'),
        seg('Reverse', ['off', 'on'], () => m[C.DLY_REV], i => m[C.DLY_REV] = i,
          'play the echoes backwards'),
        stepper('Tone', 0, 100, 5, () => m[C.DLY_TONE], v => m[C.DLY_TONE] = v, fmtPct),
        stepper('Float / wow', 0, 100, 5, () => m[C.DLY_WOW], v => m[C.DLY_WOW] = v, fmtPct,
          'slow pitch drift (only when Pitch/Reverse are off)'),
        ...route(0)),
      group('avocado glitch', 'beat-synced stutter + crush for glitching out',
        seg('Glitch', ['off', 'on'], () => m[C.AVO_ON], i => m[C.AVO_ON] = i),
        stepper('Amount', 0, 100, 5, () => m[C.AVO_AMT], v => m[C.AVO_AMT] = v, fmtPct),
        stepper('Rate (beats)', 0.0625, 2, 0.0625, () => m[C.AVO_RATE], v => m[C.AVO_RATE] = v, fmtDlyBeats),
        stepper('Crush', 0, 100, 5, () => m[C.AVO_CRUSH], v => m[C.AVO_CRUSH] = v, fmtPct),
        stepper('Mix', 0, 100, 5, () => m[C.AVO_MIX], v => m[C.AVO_MIX] = v, fmtPct),
        ...route(1)),
      group('clouds', 'granular reverb — smears the sound into a pitched, textured wash',
        seg('Clouds', ['off', 'on'], () => m[C.CLD_ON], i => m[C.CLD_ON] = i),
        stepper('Grain size', 0, 100, 5, () => m[C.CLD_SIZE], v => m[C.CLD_SIZE] = v, fmtPct),
        stepper('Density', 0, 100, 5, () => m[C.CLD_DENS], v => m[C.CLD_DENS] = v, fmtPct),
        stepper('Pitch', -24, 24, 1, () => m[C.CLD_PITCH], v => m[C.CLD_PITCH] = v, fmtSt),
        seg('Reverse grains', ['off', 'on'], () => m[C.CLD_REVG], i => m[C.CLD_REVG] = i),
        stepper('Spread', 0, 100, 5, () => m[C.CLD_SPREAD], v => m[C.CLD_SPREAD] = v, fmtPct,
          'how far back grains reach — bigger = more smear'),
        stepper('Reverb tail', 0, 100, 5, () => m[C.CLD_REVERB], v => m[C.CLD_REVERB] = v, fmtPct),
        stepper('Mix', 0, 100, 5, () => m[C.CLD_MIX], v => m[C.CLD_MIX] = v, fmtPct),
        ...route(2)),
    ];
  }

  function masterKeySection() {
    return group('master key', 'key-locked B / M / C sections all follow this',
      stepper('Key', 12, 108, 1, () => m[C.GKEY_NOTE], v => m[C.GKEY_NOTE] = Math.max(12, Math.min(108, v)), fmtNote),
      selectRow('Scale', T.SCALE_NAMES, () => m[C.GKEY_SCALE], v => m[C.GKEY_SCALE] = v),
      selectRow('Progression', T.PROG_NAMES, () => m[C.GKEY_PROG], v => m[C.GKEY_PROG] = v),
      stepper('Progression speed', 0.25, 16, 0.25, () => m[C.GKEY_SPD], v => m[C.GKEY_SPD] = Math.max(0.25, v), fmtBeats),
      selectRow('Generate style', T.STYLE_NAMES, () => m[C.GEN_STYLE], v => G.setStyle(v)));
  }

  function locksSection() {
    return group('section locks', null,
      ...[0, 1, 2].map(si => seg(T.SYN_NAMES[si], ['independent', 'lock ½×', 'lock 1×', 'lock 2×'],
        () => m[C.LOCK_A + si] ? 1 + m[C.HML_A + si] : 0,
        i => { if (i === 0) m[C.LOCK_A + si] = 0; else { m[C.LOCK_A + si] = 1; m[C.HML_A + si] = i - 1; } })));
  }

  function volumesSection() {
    return group('volumes', null,
      stepper('Drums', 0, 100, 5, () => G.vols.drum, v => G.setVol('drum', v)),
      stepper('Bass', 0, 100, 5, () => G.vols.bass, v => G.setVol('bass', v)),
      stepper('Melody', 0, 100, 5, () => G.vols.mel, v => G.setVol('mel', v)),
      stepper('Chords', 0, 100, 5, () => G.vols.chd, v => G.setVol('chd', v)),
      stepper('Main out', 0, 100, 5, () => G.vols.master, v => G.setVol('master', v)));
  }

  // ---- perform mixer: per-channel mute / solo (live) ----
  function performSection() {
    const msRow = (label, muteOff, soloOff) =>
      h('div', 'pk-msrow',
        h('span', 'pk-mslabel', label),
        chip('M', () => m[muteOff], v => m[muteOff] = v ? 1 : 0, 'ms mute'),
        chip('S', () => m[soloOff], v => m[soloOff] = v ? 1 : 0, 'ms solo'));
    const rows = [];
    for (let l = 0; l < G.numLanes; l++)
      rows.push(msRow(`lane ${l + 1} · ${G.SAMPLE_DEFS[G.smpA[l]].label}`,
        C.MUTE_A + l, C.SOLO_LANE + l));
    rows.push(msRow('BASS', C.MUTE_SYN, C.SOLO_SYN));
    rows.push(msRow('MELODY', C.MUTE_SYN + 1, C.SOLO_SYN + 1));
    rows.push(msRow('CHORDS', C.MUTE_SYN + 2, C.SOLO_SYN + 2));
    return group('perform — mute / solo', 'solo any channel to hear it alone', ...rows);
  }

  // ---- presets: A/B/C live slots, each downloadable / loadable as .json ----
  function presetsSection(say) {
    const rows = ['A', 'B', 'C'].map(id => {
      const load = h('button', 'pk-chip', '▶ load');
      load.addEventListener('click', () => { G.recallPreset(id); say(`preset ${id}`); });
      const save = h('button', 'pk-chip', '⊙ save');
      save.addEventListener('click', () => { G.storePreset(id); say(`preset ${id} stored`); });
      const dl = h('button', 'pk-chip', '⇩ file');
      dl.addEventListener('click', () => G.downloadPreset(id));
      const ul = h('button', 'pk-chip', '⇧ file');
      ul.addEventListener('click', () => { G.importToPreset(id); });
      const lab = h('span', 'pk-mslabel', id);
      st.syncs.push(() => {
        const used = G.presetUsed(id);
        lab.textContent = `${id} ${used ? '●' : '○'}`;
        load.disabled = dl.disabled = !used;
      });
      return h('div', 'pk-msrow', lab, load, save, dl, ul);
    });
    return group('presets — live A/B/C',
      'save the groove into a slot, tap load to switch live; ⇩/⇧ move slots as .json files',
      ...rows);
  }

  // ---- transport widgets (play / bpm / record / save) ----
  function transport(say) {
    const play = h('button', 'pk-play', '▶');
    play.addEventListener('click', async () => {
      if (!G.audioReady) await G.initAudio();
      G.togglePlay();
      say(G.playing ? 'playing — phase-locked to beat 0' : 'stopped');
    });
    const bpmVal = h('span', 'pk-bpmval', G.bpm + '');
    const bpmDown = h('button', 'pk-chip', '−5');
    const bpmUp = h('button', 'pk-chip', '+5');
    bpmDown.addEventListener('click', () => G.setBpm(G.bpm - 5));
    bpmUp.addEventListener('click', () => G.setBpm(G.bpm + 5));
    const rec = h('button', 'pk-rec', '⏺ REC');
    rec.addEventListener('click', () => {
      G.toggleRecording();
      say(G.recording ? 'recording the output to a .wav…' : 'recording stopped — tap save');
    });
    const save = h('button', 'pk-save', '⬇ save .wav');
    save.style.display = 'none';
    save.addEventListener('click', () => G.saveLastRecording());
    const undo = h('button', 'pk-chip', '⤺');
    const redo = h('button', 'pk-chip', '⤼');
    undo.addEventListener('click', () => { G.undo(); say('undo'); });
    redo.addEventListener('click', () => { G.redo(); say('redo'); });
    const undoBox = h('div', 'pk-undo', undo, redo);
    const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const bpmBox = h('div', 'pk-bpm', bpmDown, h('div', 'pk-bpmbox', bpmVal, h('span', 'pk-hint', 'bpm')), bpmUp);
    function upd() {
      play.textContent = G.audioStarting ? '…' : G.playing ? '■' : '▶';
      play.classList.toggle('playing', G.playing);
      bpmVal.textContent = String(G.bpm);
      rec.classList.toggle('on', G.recording);
      rec.textContent = G.recording ? '⏹ ' + fmtTime(G.recSeconds) : '⏺ REC';
      save.style.display = G.lastRecording ? '' : 'none';
      undo.disabled = !G.canUndo; redo.disabled = !G.canRedo;
    }
    return { play, bpmBox, rec, save, undoBox, upd };
  }

  return {
    st, h,
    setSay(fn) { st.say = fn || (() => { }); },
    beginRender() { st.syncs = []; st.paint = 'draw'; },
    frame() { for (const f of st.syncs) f(); },
    stepper, seg, chip, action, selectRow, group, modeBar, rotateRow,
    drumGrid, rollGrid, laneStrip, engineHint, transport,
    drumMain, drumParams, synthMain, synthParams, fxSections,
    masterKeySection, locksSection, volumesSection, performSection, presetsSection,
    SYN_LABELS: ['BASS', 'MELODY', 'CHORDS'],
  };
};
