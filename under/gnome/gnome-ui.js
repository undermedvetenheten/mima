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
        : (G.splSmp[0] || G.splSmp[1] || G.splSmp[2])
          ? 'splice: borrowing another part\'s sample — load one below to replace it'
          : 'splice: load a sample (below) and this part plays it')
      : e === 4 ? 'throat drone: a steady root + an overtone that climbs with Openness — LFO it to sing (use LATCH to hold the drone)'
      : e === 5 ? 'bell / gong: inharmonic partials with φ-spaced upper shimmer, each dying at its own rate. Low notes toll like a church bell, high ones clang like a kettle drum'
      : e === 6 ? 'piano strings: hammered strings that ring long — Pedal sets the sustain and lets the chord\'s strings resonate into each other'
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

  // Long-press a control's label to cycle its LFO: none -> L1 -> L2 -> both.
  // The +/- buttons already use press-and-hold to auto-repeat, so the gesture
  // lives on the label instead of the chips. A pulsing badge shows what is on.
  function lfoable(off, node) {
    if (off == null) return node;
    const lab = node.querySelector('.pk-slabel') || node.querySelector('.pk-rowlabel');
    if (!lab) return node;
    const badge = h('span', 'pk-lfo', '');
    lab.append(badge);
    const paint = () => {
      const msk = G.modMaskFor(off) | 0;
      badge.textContent = msk ? (msk === 3 ? '∿12' : msk === 2 ? '∿2' : '∿1') : '';
      badge.classList.toggle('on', !!msk);
    };
    let t = null, fired = false;
    const start = () => {
      fired = false;
      t = setTimeout(() => {
        fired = true;
        const msk = G.modMaskFor(off) | 0;
        if (msk === 0) G.modToggle(1, off);
        else if (msk === 1) { G.modToggle(1, off); G.modToggle(2, off); }
        else if (msk === 2) G.modToggle(1, off);
        else { G.modToggle(1, off); G.modToggle(2, off); }
        paint();
        node.classList.add('lfoflash');
        setTimeout(() => node.classList.remove('lfoflash'), 350);
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* ignore */ } }
      }, 450);
    };
    const stop = () => { if (t) { clearTimeout(t); t = null; } };
    lab.addEventListener('pointerdown', e => { e.preventDefault(); start(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => lab.addEventListener(ev, stop));
    lab.addEventListener('click', e => { if (fired) { e.preventDefault(); e.stopPropagation(); } });
    lab.classList.add('pk-lfohold');
    st.syncs.push(paint);
    paint();
    return node;
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
    // the sequencer itself stays pinned; the sample chooser belongs on the
    // SOUND page with everything else that decides what the lane sounds like
    return {
      pinned: group('',
        m[C.MUTE_A + l] ? 'lane muted' : null,
        h('div', 'pk-actions',
          chip('MUTE', () => m[C.MUTE_A + l], v => m[C.MUTE_A + l] = v ? 1 : 0, 'danger'),
          action('🎲 choose euclidean rhythm', () => { say(`lane ${l + 1}: ${G.dealEuclid(l)}`); G.touchState(); })),
        modeBar(),
        drumGrid(l)),
      sample: group('sample', 'what this lane actually hits',
        seg('Sample', G.SAMPLE_DEFS.map(s => s.label), () => G.smpA[l],
          i => { G.setSmp(l, i); rr(); },
          isSyn ? 'SYN: a synthesized drum — shape it below'
            : isUsr ? (G.userSmp[l] ? `“${G.userSmp[l].name}”` : 'no file yet — load or dig one below') : null),
        ...(isUsr ? [h('div', 'pk-actions',
          action('📂 load audio file', () => G.loadUserSample(l)),
          action('💿 wiki dig', () => G.digSample('lane', l, 'wiki')),
          action('📀 78rpm dig', () => G.digSample('lane', l, 'ia')))] : [])),
    };
  }

  function drumParams(l) {
    return {
      crop: (G.smpA[l] === C.SMP_USR
        ? group('crop', 'where each hit starts in the file — LFO it for slice motion',
          lfoable(C.DCRP_A + l, stepper('Crop start', 0, 100, 1, () => m[C.DCRP_A + l], v => m[C.DCRP_A + l] = v, fmtPct))) : null),
      synth: (G.smpA[l] === C.SMP_SYN ? (
        group('synth drum voice', 'Pitch = tuning, Filter shapes it, decay from Gate',
          lfoable(C.DNSE_A + l, stepper('Noise mix', 0, 100, 5, () => m[C.DNSE_A + l], v => m[C.DNSE_A + l] = v, fmtPct)),
          lfoable(C.DSWP_A + l, stepper('Pitch sweep', 0, 100, 5, () => m[C.DSWP_A + l], v => m[C.DSWP_A + l] = v, fmtPct,
            'the hit starts high and drops to the pitch — 808-style')),
          lfoable(C.DSUB_A + l, stepper('30Hz sub (beef)', 0, 100, 5, () => m[C.DSUB_A + l], v => m[C.DSUB_A + l] = v, fmtPct,
            'a low sine under the transient to fatten it')),
          lfoable(C.DCLK_A + l, stepper('Click', 0, 100, 5, () => m[C.DCLK_A + l], v => m[C.DCLK_A + l] = v, fmtPct)),
          stepper('Decay (gate)', 5, 200, 5, () => G.getParam(l, 7), v => G.setParam(l, 7, v), fmtPct))) : null),
      pattern: group('pattern', 'euclidean engine: pulses spread evenly across steps',
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
      sound: group('sound', null,
        stepper('Velocity', 1, 127, 1, () => G.getParam(l, 6), v => G.setParam(l, 6, v)),
        stepper('Pitch', -24, 24, 1, () => G.getParam(l, 8), v => G.setParam(l, 8, v), fmtSt),
        stepper('Filter cutoff', 0, 100, 5, () => G.getParam(l, 9), v => G.setParam(l, 9, v), fmtCut),
        stepper('Filter env per hit', 0, 100, 5, () => G.getParam(l, 10), v => G.setParam(l, 10, v))),
      motion: group('motion', 'a beat-synced LFO wobbles the filter (and pitch, if you let it)',
        stepper('LFO rate (beats)', 0.25, 16, 0.25, () => G.getParam(l, 11), v => G.setParam(l, 11, v), fmtQ),
        stepper('LFO → filter depth', 0, 100, 5, () => G.getParam(l, 12), v => G.setParam(l, 12, v)),
        seg('LFO shape', ['sine', 'triangle', 'saw ↓', 'S&H', 'saw ↑', 'spline', 'golden'], () => m[C.LSHAPE_A + l], i => m[C.LSHAPE_A + l] = i),
        stepper('LFO → pitch (semis)', 0, 24, 1, () => G.getParam(l, 14), v => G.setParam(l, 14, v))),
      groove: group('groove', null,
        stepper('Swing', 0, 75, 5, () => G.getParam(l, 15), v => G.setParam(l, 15, v), fmtPct),
        stepper('Nudge range', -50, 50, 5, () => G.getParam(l, 16), v => G.setParam(l, 16, v), fmtPct,
          'how far off the grid a hit may land — each hit picks its own amount up to this, so the lane breathes instead of sitting exactly late'),
        stepper('Humanize velocity', 0, 100, 5, () => G.getParam(l, 17), v => G.setParam(l, 17, v), fmtPct)),
    };
  }

  function synthMain(si, say, rerender) {
    const engHint = () => engineHint(si);
    return {
      pinned: group('',
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
      instrument: group('instrument', 'the voice this part plays through',
        seg('Engine', ['classic', 'string', 'glass', 'splice', 'drone', 'bell', 'piano'],
          () => m[C.ENG_A + si], i => { m[C.ENG_A + si] = i; rerender(); }, engHint()),
        ...(m[C.ENG_A + si] === 2
          ? [lfoable(C.GLC_A + si, stepper('Harmonic cycle', 0, 100, 5, () => m[C.GLC_A + si], v => m[C.GLC_A + si] = v, fmtPct,
              'slowly sweeps which harmonic is loudest — 0 = static'))]
          : []),
        ...(m[C.ENG_A + si] === 4
          ? [lfoable(C.DRONE_OPEN_A + si, stepper('Openness', 0, 100, 5, () => m[C.DRONE_OPEN_A + si], v => m[C.DRONE_OPEN_A + si] = v, fmtPct,
              'closed mouth = low overtones, open = high — assign an LFO to make it sing'))]
          : []),
        ...(m[C.ENG_A + si] === 5
          ? [lfoable(C.BELL_STK_A + si, stepper('Mallet hardness', 0, 100, 5, () => m[C.BELL_STK_A + si], v => m[C.BELL_STK_A + si] = v, fmtPct,
              'soft felt … hard striker — brightness + attack noise (Decay scales the ring)'))]
          : []),
        ...(m[C.ENG_A + si] === 6
          ? [lfoable(C.PNO_A + si, stepper('Sustain pedal', 0, 100, 5, () => m[C.PNO_A + si], v => m[C.PNO_A + si] = v, fmtPct,
              'pedal down: strings ring longer and bleed into each other'))]
          : []),
        ...(m[C.ENG_A + si] === 3
          ? [h('div', 'pk-actions',
              action('📂 load audio file', () => { G.loadSpliceSample(si); }),
              action('💿 wiki dig', () => G.digSample('splice', si, 'wiki')),
              action('📀 78rpm dig', () => G.digSample('splice', si, 'ia'))),
            lfoable(C.SPL_ST_A + si, stepper('Crop start', 0, 100, 1, () => m[C.SPL_ST_A + si], v => m[C.SPL_ST_A + si] = v, fmtPct)),
            lfoable(C.SPL_EN_A + si, stepper('Crop end', 0, 100, 1, () => m[C.SPL_EN_A + si], v => m[C.SPL_EN_A + si] = v, fmtPct,
              'the crop window loops while a note sustains')),
            seg('Pitch', ['track the notes', 'fixed'],
              () => m[C.SPL_MODE_A + si], i => m[C.SPL_MODE_A + si] = i,
              'track: repitched per note (C4 = as recorded). fixed: plays as-is'),
            lfoable(C.SPL_TUNE_A + si, stepper('Fine tune', -12, 12, 1, () => m[C.SPL_TUNE_A + si], v => m[C.SPL_TUNE_A + si] = v, fmtSt))]
          : [])),
    };
  }

  function synthParams(si) {
    const locked = () => m[C.LOCK_A + si]
      ? 'following the master key — unlock to use' : '';
    return {
      pattern: group('pattern', 'euclidean engine: pulses spread evenly across steps',
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
      key: group('pitch & key', null,
        seg('Key lock', ['independent', 'locked to key'],
          () => m[C.LOCK_A + si], i => m[C.LOCK_A + si] = i,
          'locked sections follow the master key/scale/harmony'),
        seg('Harmony speed', ['½×', '1×', '2×'], () => m[C.HML_A + si], i => m[C.HML_A + si] = i),
        stepper('Base note', 12, 108, 1, () => G.sget(si, 0), v => G.sset(si, 0, v), fmtNote),
        selectRow('Scale', T.SCALE_NAMES, () => G.sget(si, 1), v => G.sset(si, 1, v), locked),
        selectRow('Own progression', T.PROG_NAMES, () => G.sget(si, 22), v => G.sset(si, 22, v), locked),
        stepper('Own prog. speed', 0.25, 16, 0.25, () => G.sget(si, 23), v => G.sset(si, 23, v), fmtBeats),
        ...(si === 2 ? [seg('Chord size', ['triads', 'sevenths'], () => G.sget(si, 24), i => G.sset(si, 24, i)),
          seg('Wheel spin', ['off', '4 beats', '2 beats', 'every beat'],
            () => m[C.WHL_SPIN], i => m[C.WHL_SPIN] = i,
            'the global spin rate — roots walk the harmonic wheel')] : []),
        seg('Join wheel spin', ['no', 'yes'], () => m[C.SPIN_P + si], i => m[C.SPIN_P + si] = i,
          'walk this part’s root around the wheel when spin is on'),
        // GROW lives here now, beside the spin, instead of only on the canvas
        seg('Grow from Life', ['off', 'on'], () => G.growFor(si) ? 1 : 0,
          i => { G.setGrowFor(si, i); G.touchState(); },
          'the Game of Life colony writes notes into this part as it evolves'),
        selectRow('Life speed', G.golRates.map(r => r + '×/beat'),
          () => G.golRateIx, v => G.setGolRateIx(v)),
        h('div', 'pk-actions',
          action('✦ seed life', () => { G.golSeed(); G.touchState(); }),
          action('✕ clear life', () => { G.golClear(); G.touchState(); }),
          action('▸ step once', () => { G.golStepOnce(); G.touchState(); }))),
      sound: group('sound', null,
        stepper('Wave', 0, 100, 5, () => G.sget(si, 19), v => G.sset(si, 19, v), fmtWave),
        stepper('Filter cutoff', 0, 100, 5, () => G.sget(si, 12), v => G.sset(si, 12, v), fmtCut),
        stepper('Resonance', 0, 100, 5, () => G.sget(si, 13), v => G.sset(si, 13, v)),
        stepper('Filter env amount', 0, 100, 5, () => G.sget(si, 14), v => G.sset(si, 14, v)),
        stepper('Attack', 0, 500, 5, () => G.sget(si, 8), v => G.sset(si, 8, v), fmtMs),
        stepper('Decay', 5, 4000, 5, () => G.sget(si, 9), v => G.sset(si, 9, v), fmtMs),
        seg('Envelope', ['AD pluck', 'HOLD', 'LATCH'], () => G.sget(si, 20), i => G.sset(si, 20, i)),
        stepper('Glide', 0, 2000, 10, () => G.sget(si, 21), v => G.sset(si, 21, v), fmtMs),
        ...(si === 0 ? [
          lfoable(C.XY_DRV, stepper('Shape drive', 0, 100, 5, () => m[C.XY_DRV], v => m[C.XY_DRV] = v, fmtPct,
            'tanh fold on the bass sum — the desktop XY scope, as sound')),
          lfoable(C.XY_SKW, stepper('Shape skew', -50, 50, 5, () => m[C.XY_SKW], v => m[C.XY_SKW] = v,
            v => (v > 0 ? '+' : '') + Math.round(v),
            'asymmetric bias: even harmonics, tube-ish'))] : [])),
      motion: group('motion', null,
        stepper('LFO rate (beats)', 0.25, 16, 0.25, () => G.sget(si, 16), v => G.sset(si, 16, v), fmtQ),
        stepper('LFO → filter depth', 0, 100, 5, () => G.sget(si, 17), v => G.sset(si, 17, v)),
        seg('LFO shape', ['sine', 'triangle', 'saw ↓', 'S&H', 'saw ↑', 'spline', 'golden'], () => G.sget(si, 18), i => G.sset(si, 18, i))),
      groove: group('groove', null,
        stepper('Velocity', 1, 127, 1, () => G.sget(si, 6), v => G.sset(si, 6, v)),
        stepper('Gate length', 5, 200, 5, () => G.sget(si, 7), v => G.sset(si, 7, v), fmtPct),
        stepper('Swing', 0, 75, 5, () => G.sget(si, 25), v => G.sset(si, 25, v), fmtPct),
        stepper('Nudge range', -50, 50, 5, () => G.sget(si, 26), v => G.sset(si, 26, v), fmtPct,
          'how far off the grid a note may land — each note picks its own amount up to this')),
    };
  }

  function fxSections(rerender) {
    const rr = rerender || (() => { });
    const fmtDlyBeats = v => v + ' beats';
    // mod LFOs: L1/L2 controls + a MIDI-learn-free assignment list for touch
    const lfoRows = [1, 2].map(n => {
      const b = C.MLFO_A + (n - 1) * 3;
      return group(`mod LFO ${n}`, null,
        stepper('Rate (beats)', 0.25, 64, 0.25, () => m[b], v => m[b] = v, fmtQ),
        stepper('Depth', 0, 100, 5, () => m[b + 1], v => m[b + 1] = v, fmtPct),
        seg('Shape', ['sine', 'triangle', 'saw ↓', 'S&H', 'saw ↑', 'spline', 'golden'], () => m[b + 2], i => m[b + 2] = i));
    });
    const asnRows = [];
    for (let k = 0; k < C.MOD_SLOTS; k++) {
      const t = m[C.MOD_TGT_A + k], msk = m[C.MOD_MSK_A + k];
      if (!t || !msk) continue;
      asnRows.push(h('div', 'pk-msrow',
        h('span', 'pk-mslabel', G.modTargetName(t)),
        ...[1, 2].filter(n => msk & n).map(n =>
          action(`✕ L${n}`, () => { G.modToggle(n, t); rr(); }))));
    }
    const targets = G.modTargets();
    const sel = h('select', 'pk-select');
    targets.forEach((t, i) => { const o = h('option', '', t.name); o.value = i; sel.append(o); });
    const assignRow = h('div', 'pk-actions',
      action('assign → L1', () => { G.modToggle(1, targets[+sel.value].off); rr(); }),
      action('assign → L2', () => { G.modToggle(2, targets[+sel.value].off); rr(); }));
    const modSection = group('LFO assignments',
      'two free LFOs you can point at almost anything — pick a target, assign, stack both for chaos',
      ...asnRows, h('div', 'pk-row col', h('div', 'pk-rowlabel', 'Target'), sel), assignRow);
    // per-fx routing: send each part (0 drums,1 bass,2 melody,3 chords) into
    // this specific fx stage (fxi 0 delay, 1 glitch, 2 clouds).
    const route = fxi => {
      const rows = [];
      for (let l = 0; l < G.numLanes; l++) {
        const off = C.DSND_A + l * 3 + fxi;
        rows.push(stepper('Lane ' + (l + 1) + ' →', 0, 100, 5, () => m[off], v => m[off] = v, fmtPct));
      }
      ['Bass', 'Melody', 'Chords'].forEach((nm, p) => {
        const off = C.SND_MTX + (p + 1) * 3 + fxi;
        rows.push(stepper(nm + ' →', 0, 100, 5, () => m[off], v => m[off] = v, fmtPct));
      });
      return rows;
    };
    const fmtDeg = v => Math.round(v) + '°';
    const spaceRows = [];
    for (let l = 0; l < G.numLanes; l++) {
      spaceRows.push(
        lfoable(C.DAZ_A + l, stepper('Lane ' + (l + 1) + ' azimuth', -180, 180, 5, () => m[C.DAZ_A + l], v => m[C.DAZ_A + l] = v, fmtDeg)),
        lfoable(C.DFRC_A + l, stepper('Lane ' + (l + 1) + ' force', 0, 100, 5, () => m[C.DFRC_A + l], v => m[C.DFRC_A + l] = v, fmtPct,
          l === 0 ? 'each lane is its own marble; force 0 = other marbles can’t shove it' : null)));
    }
    ['Bass', 'Melody', 'Chords'].forEach((nm, p) => {
      spaceRows.push(
        stepper(nm + ' azimuth', -180, 180, 5, () => m[C.PAN_AZ_A + 1 + p], v => m[C.PAN_AZ_A + 1 + p] = v, fmtDeg),
        stepper(nm + ' force', 0, 100, 5, () => m[C.PAN_FRC_A + 1 + p], v => m[C.PAN_FRC_A + 1 + p] = v, fmtPct));
    });
    // sends into the piano-string resonator: one row per lane, then the parts
    const pnoRoute = () => {
      const rows = [];
      for (let l = 0; l < G.numLanes; l++) {
        const off = C.PLSND_A + l;
        rows.push(stepper('Lane ' + (l + 1) + ' →', 0, 100, 5, () => m[off], v => m[off] = v, fmtPct));
      }
      ['Bass', 'Melody', 'Chords'].forEach((nm, p) => {
        const off = C.PSND_A + 1 + p;
        rows.push(stepper(nm + ' →', 0, 100, 5, () => m[off], v => m[off] = v, fmtPct));
      });
      return rows;
    };
    // sends into the 4-band resonator: one row per lane, then the parts
    const mbrRoute = () => {
      const rows = [];
      for (let l = 0; l < G.numLanes; l++) {
        const off = C.MBR_LSND_A + l;
        rows.push(stepper('Lane ' + (l + 1) + ' \u2192', 0, 100, 5, () => m[off], v => m[off] = v, fmtPct));
      }
      ['Bass', 'Melody', 'Chords'].forEach((nm, p2) => {
        const off = C.MBR_SND_A + 1 + p2;
        rows.push(stepper(nm + ' \u2192', 0, 100, 5, () => m[off], v => m[off] = v, fmtPct));
      });
      return rows;
    };
    const fmtDens = v => v ? 'D' + Math.round(v) : 'off';
    const fracParts = [];
    for (let l = 0; l < G.numLanes; l++)
      fracParts.push(lfoable(C.DFILL_A + l, stepper('Lane ' + (l + 1) + ' density', 0, 7, 1,
        () => m[C.DFILL_A + l], v => m[C.DFILL_A + l] = v, fmtDens)));
    ['Bass', 'Melody', 'Chords'].forEach((nm, p) =>
      fracParts.push(lfoable(C.SFILL_A + p, stepper(nm + ' density', 0, 7, 1,
        () => m[C.SFILL_A + p], v => m[C.SFILL_A + p] = v, fmtDens,
        p === 0 ? 'D1 = a tiny tail variation, D7 = a radical self-similar flurry' : null))));
    // One rack page at a time: the FX tab was a single endless scroll.
    return [
      { id: 'rack', label: 'RACK', rows: [
        group('effects rack', 'each fx has its own per-part sends, or feed the whole mix through',
        seg('Rack', ['off', 'on'], () => m[C.FX_ON], i => m[C.FX_ON] = i),
        lfoable(C.FX_FEED, stepper('Feed full mix in', 0, 100, 5, () => m[C.FX_FEED], v => m[C.FX_FEED] = v, fmtPct)),
        seg('Sends tap', ['post-fader', 'pre-fader'], () => m[C.SND_PRE], i => m[C.SND_PRE] = i,
          'pre-fader: pull a part’s volume down and its fx wash stays'))] },
      { id: 'delay', label: 'DELAY', rows: [
        group('dub delay', 'a tape-ish echo — pitch/reverse the repeats or let them drift',
        seg('Delay', ['off', 'on'], () => m[C.DLY_ON], i => m[C.DLY_ON] = i),
        lfoable(C.DLY_TIME, stepper('Time (beats)', 0.0625, 2, 0.0625, () => m[C.DLY_TIME], v => m[C.DLY_TIME] = v, fmtDlyBeats)),
        lfoable(C.DLY_FB, stepper('Feedback', 0, 100, 5, () => m[C.DLY_FB], v => m[C.DLY_FB] = v, fmtPct)),
        lfoable(C.DLY_PITCH, stepper('Pitch', -24, 24, 1, () => m[C.DLY_PITCH], v => m[C.DLY_PITCH] = v, fmtSt,
          'each repeat shifts by this — climbing or falling echoes')),
        seg('Reverse', ['off', 'on'], () => m[C.DLY_REV], i => m[C.DLY_REV] = i,
          'play the echoes backwards'),
        lfoable(C.DLY_TONE, stepper('Tone', 0, 100, 5, () => m[C.DLY_TONE], v => m[C.DLY_TONE] = v, fmtPct)),
        lfoable(C.DLY_WOW, stepper('Float / wow', 0, 100, 5, () => m[C.DLY_WOW], v => m[C.DLY_WOW] = v, fmtPct,
          'slow pitch drift (only when Pitch/Reverse are off)')),
        seg('Golden echo', ['off', 'φ↓ compress', 'φ↑ expand'], () => m[C.DLY_GLD], i => m[C.DLY_GLD] = i,
          'repeats spaced by ×φ instead of evenly — ripples obeying a growth law'),
        ...route(0))] },
      { id: 'glitch', label: 'GLITCH', rows: [
        group('glitch', 'beat-synced stutter + crush for glitching out',
        seg('Glitch', ['off', 'on'], () => m[C.AVO_ON], i => m[C.AVO_ON] = i),
        lfoable(C.AVO_AMT, stepper('Amount', 0, 100, 5, () => m[C.AVO_AMT], v => m[C.AVO_AMT] = v, fmtPct)),
        lfoable(C.AVO_RATE, stepper('Rate (beats)', 0.0625, 2, 0.0625, () => m[C.AVO_RATE], v => m[C.AVO_RATE] = v, fmtDlyBeats)),
        lfoable(C.AVO_CRUSH, stepper('Crush', 0, 100, 5, () => m[C.AVO_CRUSH], v => m[C.AVO_CRUSH] = v, fmtPct)),
        lfoable(C.AVO_MIX, stepper('Mix', 0, 100, 5, () => m[C.AVO_MIX], v => m[C.AVO_MIX] = v, fmtPct)),
        ...route(1))] },
      { id: 'granulator', label: 'GRAIN', rows: [
        group('granulator', 'granular reverb — smears the sound into a pitched, textured wash',
        seg('Clouds', ['off', 'on'], () => m[C.CLD_ON], i => m[C.CLD_ON] = i),
        lfoable(C.CLD_SIZE, stepper('Grain size', 0, 100, 5, () => m[C.CLD_SIZE], v => m[C.CLD_SIZE] = v, fmtPct)),
        lfoable(C.CLD_DENS, stepper('Density', 0, 100, 5, () => m[C.CLD_DENS], v => m[C.CLD_DENS] = v, fmtPct)),
        lfoable(C.CLD_PITCH, stepper('Pitch', -24, 24, 1, () => m[C.CLD_PITCH], v => m[C.CLD_PITCH] = v, fmtSt)),
        seg('Reverse grains', ['off', 'on'], () => m[C.CLD_REVG], i => m[C.CLD_REVG] = i),
        lfoable(C.CLD_SPREAD, stepper('Spread', 0, 100, 5, () => m[C.CLD_SPREAD], v => m[C.CLD_SPREAD] = v, fmtPct,
          'how far back grains reach — bigger = more smear')),
        lfoable(C.CLD_REVERB, stepper('Reverb tail', 0, 100, 5, () => m[C.CLD_REVERB], v => m[C.CLD_REVERB] = v, fmtPct)),
        lfoable(C.CLD_MIX, stepper('Mix', 0, 100, 5, () => m[C.CLD_MIX], v => m[C.CLD_MIX] = v, fmtPct)),
        ...route(2))] },
      { id: 'band', label: '4-BAND', rows: [
        group('4-band resonator', 'four resonant bandpass filters, then summed or MULTIPLIED together \u2014 summing gives a formant bank, multiplying is ring modulation by the signal\u2019s own bands (send anything in via the 4B sends)',
        seg('4-band', ['off', 'on'], () => m[C.MBR_ON], i => m[C.MBR_ON] = i),
        seg('Mode', ['sum', 'ring', 'pair', 'mult'], () => m[C.MBR_MODE], i => m[C.MBR_MODE] = i,
          'sum = resonant/formant, gentle \u00b7 ring = neighbours multiply, metallic \u00b7 pair = two ring pairs, wide \u00b7 mult = all four, wreckage'),
        lfoable(C.MBR_FREQ, stepper('Base freq', 40, 4000, 10, () => m[C.MBR_FREQ], v => m[C.MBR_FREQ] = v,
          v => Math.round(v) + ' Hz', 'where the lowest band sits')),
        lfoable(C.MBR_SPRD, stepper('Spread', 0, 100, 5, () => m[C.MBR_SPRD], v => m[C.MBR_SPRD] = v, fmtPct,
          'spacing between the four bands \u2014 low packs them into a formant, high fans them across the spectrum')),
        lfoable(C.MBR_Q, stepper('Resonance', 0, 100, 5, () => m[C.MBR_Q], v => m[C.MBR_Q] = v, fmtPct,
          'band Q \u2014 high is narrow and ringing, and makes the multiply modes sing')),
        lfoable(C.MBR_DRV, stepper('Drive', 0, 100, 5, () => m[C.MBR_DRV], v => m[C.MBR_DRV] = v, fmtPct)),
        lfoable(C.MBR_MIX, stepper('Mix', 0, 100, 5, () => m[C.MBR_MIX], v => m[C.MBR_MIX] = v, fmtPct)),
        ...mbrRoute())] },
      { id: 'piano', label: 'PIANO', rows: [
        group('piano strings', 'a rack of strings with the sustain pedal down, tuned to the key — send anything into it (PNO sends) and the sympathetic strings ring',
        seg('Resonator', ['off', 'on'], () => m[C.PRES_ON], i => m[C.PRES_ON] = i),
        lfoable(C.PRES_MIX, stepper('Mix', 0, 100, 5, () => m[C.PRES_MIX], v => m[C.PRES_MIX] = v, fmtPct)),
        lfoable(C.PRES_DEC, stepper('Pedal (decay)', 0, 100, 5, () => m[C.PRES_DEC], v => m[C.PRES_DEC] = v, fmtPct)),
        lfoable(C.PRES_TONE, stepper('Tone', 0, 100, 5, () => m[C.PRES_TONE], v => m[C.PRES_TONE] = v, fmtPct,
          'string damping — low is felted, high is bright and open')),
        ...pnoRoute())] },
      { id: 'cross', label: 'CROSS', rows: [
        group('cross-routing', 'let one instrument work on another — ring-modulate it, sidechain-duck it, or drive it into distortion',
        ...['Bass', 'Melody', 'Chords'].map((nm, si) => [
          seg(nm + ' source', T.XSRC_NAMES, () => m[C.XSRC_A + si], i => m[C.XSRC_A + si] = i),
          lfoable(C.XAMT_A + si, stepper(nm + ' amount', 0, 100, 5, () => m[C.XAMT_A + si], v => m[C.XAMT_A + si] = v, fmtPct)),
          seg(nm + ' mode', T.XMODE_NAMES, () => m[C.XMODE_A + si], i => m[C.XMODE_A + si] = i),
        ]).flat())] },
      { id: 'space', label: 'SPACE', rows: [
        group('3D space', 'angle each part around your head — LFO the azimuth to orbit it',
        ...spaceRows,
        lfoable(C.PAN_BNC, stepper('Bounciness', 0, 100, 5, () => m[C.PAN_BNC], v => m[C.PAN_BNC] = v, fmtPct,
          'how elastically crowded parts bounce off each other')))] },
      { id: 'fills', label: 'FILLS', rows: [
        group('fractal fills', 'a classic L-system picks WHEN fills land; each part’s density picks HOW MUCH',
        seg('Fractal fills', ['off', 'on'], () => m[C.FRC_ON], i => m[C.FRC_ON] = i),
        selectRow('L-system', T.FRACTAL_NAMES, () => m[C.FRC_RULE], v => m[C.FRC_RULE] = v),
        lfoable(C.FRC_AMT, stepper('Fractality', 0, 100, 5, () => m[C.FRC_AMT], v => m[C.FRC_AMT] = v, fmtPct,
          'scales every fill the L-system asks for')),
        lfoable(C.FRC_BEND, stepper('Bend / swing', 0, 100, 5, () => m[C.FRC_BEND], v => m[C.FRC_BEND] = v, fmtPct,
          'bows the tree and swings the fill timing')),
        ...fracParts)] },
      { id: 'lfo', label: 'LFO', rows: [
        ...lfoRows, modSection] },
    ];
  }

  function masterKeySection() {
    return group('master key', 'key-locked B / M / C sections all follow this',
      lfoable(C.GKEY_NOTE, stepper('Key', 12, 108, 1, () => m[C.GKEY_NOTE], v => m[C.GKEY_NOTE] = Math.max(12, Math.min(108, v)), fmtNote)),
      selectRow('Scale', T.SCALE_NAMES, () => m[C.GKEY_SCALE], v => m[C.GKEY_SCALE] = v),
      selectRow('Progression', T.PROG_NAMES, () => m[C.GKEY_PROG], v => m[C.GKEY_PROG] = v),
      lfoable(C.GKEY_SPD, stepper('Progression speed', 0.25, 16, 0.25, () => m[C.GKEY_SPD], v => m[C.GKEY_SPD] = Math.max(0.25, v), fmtBeats)),
      selectRow('Generate style', T.STYLE_NAMES, () => m[C.GEN_STYLE], v => G.setStyle(v)),
      seg('\u26a0 \u03c6 tuning', ['off', 'on'], () => m[C.PHI_TUNE], i => m[C.PHI_TUNE] = i,
        'EXPERIMENTAL \u2014 the octave becomes a golden sixth; every scale leans toward golden-ratio intervals'),
      seg('\u26a0 \u03c6 loop', ['off', 'on'], () => m[C.GLD_TIME], i => m[C.GLD_TIME] = i,
        'EXPERIMENTAL \u2014 same tempo, same grid; the loop runs 1, 1, 2, 3, 5, 8, 13 then 21 steps before snapping back to step 1'));
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
      ...Array.from({ length: G.numLanes }, (_, l) =>
        lfoable(C.DVOL_A + l, stepper('· lane ' + (l + 1), 0, 100, 5, () => m[C.DVOL_A + l],
          v => m[C.DVOL_A + l] = v, fmtPct))),
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
    // stems arm before the take; the zip carries master + stems + the
    // compressed copy in one file
    const stems = h('button', 'pk-chip', '\u2699 stems');
    stems.addEventListener('click', () => {
      G.setArmStems(!G.armStems);
      say(G.armStems
        ? 'stems armed \u2014 the next take captures drums / bass / melody / chords / fx separately'
        : 'stems off \u2014 master only');
    });
    const zip = h('button', 'pk-save', '\u2b07 save all (zip)');
    zip.style.display = 'none';
    zip.addEventListener('click', () => G.saveTakeZip());
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
      zip.style.display = G.lastRecording ? '' : 'none';
      stems.classList.toggle('on', G.armStems);
      undo.disabled = !G.canUndo; redo.disabled = !G.canRedo;
    }
    return { play, bpmBox, rec, save, stems, zip, undoBox, upd };
  }

  return {
    st, h,
    setSay(fn) { st.say = fn || (() => { }); },
    beginRender() { st.syncs = []; st.paint = 'draw'; },
    frame() { for (const f of st.syncs) f(); },
    stepper, seg, chip, action, selectRow, group, modeBar, rotateRow, lfoable,
    drumGrid, rollGrid, laneStrip, engineHint, transport,
    drumMain, drumParams, synthMain, synthParams, fxSections,
    masterKeySection, locksSection, volumesSection, performSection, presetsSection,
    SYN_LABELS: ['BASS', 'MELODY', 'CHORDS'],
  };
};
