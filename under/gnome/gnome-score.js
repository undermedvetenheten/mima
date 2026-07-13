// SuperGnome — sheet-music export.
// Renders the current pattern as staff notation (SVG) in an on-screen preview,
// then leans on the browser's "Save as PDF" (window.print) so it works the same
// on desktop and iOS. Self-contained: no fonts or libraries beyond the DOM.
//
// Engraving rules honoured here:
// - one shared beats->pixels scale for every system, so barlines line up
//   across staves and equal durations have equal widths everywhere;
// - each staff auto-extends vertically to fit its ledger lines (nothing clips);
// - a real key signature (sharps/flats after the clef) derived from each
//   part's key + mode; noteheads only carry an accidental when they depart
//   from the signature (including naturals);
// - a time signature on every staff; parts in another meter than the global
//   guess carry their own.
'use strict';
(function () {
  const G = window.gnome;
  if (!G) return;

  const SP = 10;                       // staff space (line gap) in svg units
  // note-value buckets: [beats, filled?, stem?, flags]
  const DURS = [
    [4, false, false, 0], [3, false, true, 0], [2, false, true, 0],
    [1.5, true, true, 0], [1, true, true, 0], [0.75, true, true, 1],
    [0.5, true, true, 1], [0.375, true, true, 2], [0.25, true, true, 2],
    [0.125, true, true, 3],
  ];
  const nearestDur = bps => DURS.reduce((a, b) =>
    Math.abs(b[0] - bps) < Math.abs(a[0] - bps) ? b : a);

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const el = (t, a, inner) => {
    const at = Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('');
    return `<${t}${at}${inner == null ? '/>' : `>${inner}</${t}>`}`;
  };

  // ---- key signatures & spelling --------------------------------------
  // fifths position of each pitch class relative to C (C=0, G=1, ... F=-1)
  const PC_FIFTHS = [0, 7, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
  // mode offset in fifths (how the mode's signature relates to its tonic's
  // major signature): ionian 0, mixolydian -1, dorian -2, minor -3, ...
  // indexed by the SCL scale list; null = no meaningful signature (spell all)
  const MODE_FIFTHS = [0, -3, -2, -4, 1, -1, 0, -3, -3, -3, null, null, null, null];
  const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  // key signature (positive = sharps, negative = flats) for a tonic pc + scale
  function keySig(pc, scix) {
    const mo = MODE_FIFTHS[scix];
    if (mo == null) return 0;
    let k = PC_FIFTHS[pc] + mo;
    if (k > 6) k -= 12;                // prefer 5 flats over 7 sharps
    if (k < -6) k += 12;
    return Math.max(-7, Math.min(7, k));
  }
  const LETTER = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const SPELL_SHARP = [['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
    ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0]];
  const SPELL_FLAT = [['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
    ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]];
  // spell a midi note in a key: staff step (diatonic position) + accidental
  // glyph ('' = matches the key signature, '♯' '♭' '♮' when it departs)
  function spell(midi, k) {
    const pc = ((midi % 12) + 12) % 12;
    const [letter, alt] = (k < 0 ? SPELL_FLAT : SPELL_SHARP)[pc];
    // octave of the LETTER (C-based): pc 11 spelled Cb would need care, but
    // our tables never emit Cb/B#/E#/Fb, so floor(midi/12) is safe
    const oct = Math.floor(midi / 12) - 1;
    const step = oct * 7 + LETTER[letter];
    const inSig = k >= 0 ? SHARP_ORDER.slice(0, k).includes(letter)
      : FLAT_ORDER.slice(0, -k).includes(letter);
    const sigAlt = inSig ? (k >= 0 ? 1 : -1) : 0;
    const glyph = alt === sigAlt ? '' : alt === 1 ? '♯' : alt === -1 ? '♭' : '♮';
    return { step, glyph };
  }
  // staff steps where signature accidentals sit (treble; bass is 2 lower)
  const SIG_STEP_SHARP = { F: 38, C: 35, G: 39, D: 36, A: 33, E: 37, B: 34 };
  const SIG_STEP_FLAT = { B: 34, E: 37, A: 33, D: 36, G: 32, C: 35, F: 31 };

  // ---- shared layout ----------------------------------------------------
  const sigBeats = sig => sig.n * 4 / sig.d;
  const ACC_W = 9, CLEF_W = 46, TSIG_W = 26, NAME_W = 8;

  function sigGlyph(x, staffTop, sig) {
    const f = { 'font-size': 19, fill: '#111', 'font-family': 'Georgia,serif',
      'font-weight': 700, 'text-anchor': 'middle' };
    return el('text', Object.assign({ x, y: staffTop + SP * 1.7 }, f), sig.n)
      + el('text', Object.assign({ x, y: staffTop + SP * 3.7 }, f), sig.d);
  }

  // draw a single notehead (+ its ledger lines); accidental glyph optional
  function head(x, yOf, s, filled, botLine, topLine, glyph) {
    const y = yOf(s);
    let g = '';
    for (let ls = botLine - 2; ls >= s; ls -= 2)
      g += el('line', { x1: x - 9, y1: yOf(ls), x2: x + 9, y2: yOf(ls), stroke: '#111', 'stroke-width': 1.2 });
    for (let ls = topLine + 2; ls <= s; ls += 2)
      g += el('line', { x1: x - 9, y1: yOf(ls), x2: x + 9, y2: yOf(ls), stroke: '#111', 'stroke-width': 1.2 });
    g += el('ellipse', { cx: x, cy: y, rx: 5.9, ry: 4.2, fill: filled ? '#111' : 'none',
      stroke: '#111', 'stroke-width': 1.4, transform: `rotate(-18 ${x} ${y})` });
    if (glyph) g += el('text', { x: x - 16, y: y + 4.5, 'font-size': 14, fill: '#111',
      'font-family': 'Georgia,serif' }, glyph);
    return { g, y };
  }

  // one system (staff) for a pitched part. lay = { pxPerBeat, labelW, maxW }
  function pitchedSystem(part, lay) {
    const isB = part.clef === 'bass';
    const botLine = isB ? 18 : 30, topLine = isB ? 26 : 38, midLine = isB ? 22 : 34;
    const k = keySig(part.keyPc, part.scix);
    // spell everything first so the vertical extent is known before drawing
    const spelled = part.notes.map(n => n && n.midis.map(md => spell(md, k)));
    let loS = botLine, hiS = topLine;
    for (const ns of spelled) if (ns) for (const s of ns) {
      if (s.step < loS) loS = s.step;
      if (s.step > hiS) hiS = s.step;
    }
    const padTop = 24 + Math.max(0, (hiS - topLine) / 2 * SP) + 10;   // stems/flags headroom
    const padBot = 16 + Math.max(0, (botLine - loS) / 2 * SP) + 14;   // accents line
    const staffTop = padTop;
    const yOf = s => staffTop + (topLine - s) / 2 * SP;

    const labelW = lay.labelW;
    const staffW = part.span * lay.pxPerBeat;
    const stepW = part.bps * lay.pxPerBeat;
    const W = lay.maxW, H = padTop + padBot + SP * 4;
    let svg = '';
    for (let i = 0; i < 5; i++)
      svg += el('line', { x1: labelW, y1: staffTop + i * SP, x2: labelW + staffW, y2: staffTop + i * SP,
        stroke: '#111', 'stroke-width': 1 });
    // clef, key signature, time signature — all inside the label margin
    let lx = NAME_W + 30;
    svg += el('text', { x: lx - 24, y: staffTop + (isB ? 1.6 : 3.1) * SP, 'font-size': isB ? 34 : 44,
      fill: '#111', 'font-family': "'Noto Music','Bravura','Apple Symbols','Segoe UI Symbol',serif" },
      isB ? '𝄢' : '𝄞');
    lx += 18;
    const order = k >= 0 ? SHARP_ORDER.slice(0, k) : FLAT_ORDER.slice(0, -k);
    for (const L of order) {
      // the bass staff sits 14 diatonic steps below the treble positions
      const st = (k >= 0 ? SIG_STEP_SHARP : SIG_STEP_FLAT)[L] - (isB ? 14 : 0);
      svg += el('text', { x: lx, y: yOf(st) + 4.5, 'font-size': 15,
        fill: '#111', 'font-family': 'Georgia,serif' }, k >= 0 ? '♯' : '♭');
      lx += ACC_W;
    }
    svg += sigGlyph(labelW - 13, staffTop, part.sig);
    svg += el('text', { x: NAME_W - 4, y: staffTop - 12, 'font-size': 13, fill: '#333',
      'font-family': 'Nunito,Arial,sans-serif', 'font-weight': 700 }, esc(part.name));

    const dur = nearestDur(part.bps), filled = dur[1], stem = dur[2], flags = dur[3];
    const mb = sigBeats(part.sig);
    svg += el('line', { x1: labelW, y1: staffTop, x2: labelW, y2: staffTop + 4 * SP, stroke: '#111', 'stroke-width': 1.4 });
    for (let i = 0; i < part.steps; i++) {
      const beat = i * part.bps;
      const x = labelW + beat * lay.pxPerBeat + stepW / 2;
      if (i > 0 && Math.abs(beat / mb - Math.round(beat / mb)) < 1e-6)
        svg += el('line', { x1: labelW + beat * lay.pxPerBeat, y1: staffTop,
          x2: labelW + beat * lay.pxPerBeat, y2: staffTop + 4 * SP, stroke: '#111', 'stroke-width': 1 });
      const ns = spelled[i];
      if (!ns) {
        svg += el('rect', { x: x - 5, y: yOf(midLine) - 2, width: 10, height: 4, fill: '#bbb' });
        continue;
      }
      let lo = Infinity, hi = -Infinity, ys = [];
      for (const s of ns) {
        const r = head(x, yOf, s.step, filled, botLine, topLine, s.glyph);
        svg += r.g; ys.push(r.y); lo = Math.min(lo, s.step); hi = Math.max(hi, s.step);
      }
      if (stem) {
        const up = (lo + hi) / 2 < midLine;
        const yTop = Math.min(...ys), yBot = Math.max(...ys);
        const sx = up ? x + 6 : x - 6;
        const y1 = up ? yBot : yTop, y2 = (up ? yTop : yBot) + (up ? -28 : 28);
        svg += el('line', { x1: sx, y1: y1, x2: sx, y2: y2, stroke: '#111', 'stroke-width': 1.4 });
        for (let fl = 0; fl < flags; fl++) {
          const fy = y2 + (up ? fl * 6 : -fl * 6);
          svg += el('path', { d: `M ${sx} ${fy} q 10 ${up ? 5 : -5} 8 ${up ? 16 : -16}`, stroke: '#111', 'stroke-width': 1.4, fill: 'none' });
        }
      }
      if (part.notes[i].accent)
        svg += el('text', { x: x - 4, y: staffTop + 4 * SP + 13, 'font-size': 12, fill: '#111' }, '>');
    }
    svg += el('line', { x1: labelW + staffW, y1: staffTop, x2: labelW + staffW, y2: staffTop + 4 * SP, stroke: '#111', 'stroke-width': 1.4 });
    // every system renders at the same width scale -> equal beats align
    return `<svg viewBox="0 0 ${W} ${H}" class="sc-sys" preserveAspectRatio="xMinYMin meet">${svg}</svg>`;
  }

  // compact rhythm staff for a drum lane (x = hit, ◆ = accent); shares the
  // global beat scale and shows its own sig when it departs from the meter
  function drumSystem(lane, globalSig, lay) {
    const labelW = lay.labelW, pad = 16;
    const staffW = lane.span * lay.pxPerBeat, stepW = lane.bps * lay.pxPerBeat;
    const W = lay.maxW, H = pad * 2 + 12;
    const y = pad + 6;
    let svg = el('line', { x1: labelW, y1: y, x2: labelW + staffW, y2: y, stroke: '#111', 'stroke-width': 1 });
    svg += el('text', { x: NAME_W - 4, y: y + 4, 'font-size': 12, fill: '#333',
      'font-family': 'Nunito,Arial,sans-serif', 'font-weight': 700 }, esc(lane.name));
    if (lane.sig.n !== globalSig.n || lane.sig.d !== globalSig.d)
      svg += el('text', { x: labelW - 8, y: y + 4, 'font-size': 12, fill: '#111', 'text-anchor': 'end',
        'font-family': 'Georgia,serif', 'font-weight': 700 }, `${lane.sig.n}/${lane.sig.d}`);
    svg += el('line', { x1: labelW, y1: y - 8, x2: labelW, y2: y + 8, stroke: '#111', 'stroke-width': 1.4 });
    const mb = sigBeats(lane.sig);
    for (let i = 0; i < lane.steps; i++) {
      const beat = i * lane.bps;
      const x = labelW + beat * lay.pxPerBeat + stepW / 2;
      if (i > 0 && Math.abs(beat / mb - Math.round(beat / mb)) < 1e-6)
        svg += el('line', { x1: labelW + beat * lay.pxPerBeat, y1: y - 8, x2: labelW + beat * lay.pxPerBeat, y2: y + 8, stroke: '#ccc', 'stroke-width': 1 });
      if (lane.hits[i] === 2)
        svg += el('path', { d: `M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} L ${x - 6} ${y} Z`, fill: '#111' });
      else if (lane.hits[i] === 1) {
        svg += el('line', { x1: x - 5, y1: y - 5, x2: x + 5, y2: y + 5, stroke: '#111', 'stroke-width': 1.6 });
        svg += el('line', { x1: x - 5, y1: y + 5, x2: x + 5, y2: y - 5, stroke: '#111', 'stroke-width': 1.6 });
      }
    }
    svg += el('line', { x1: labelW + staffW, y1: y - 8, x2: labelW + staffW, y2: y + 8, stroke: '#111', 'stroke-width': 1.4 });
    return `<svg viewBox="0 0 ${W} ${H}" class="sc-sys" preserveAspectRatio="xMinYMin meet">${svg}</svg>`;
  }

  function ensureStyle() {
    if (document.getElementById('sc-style')) return;
    const s = document.createElement('style');
    s.id = 'sc-style';
    s.textContent = `
    #sc-overlay{position:fixed;inset:0;z-index:9999;background:#3a3f45;overflow:auto;
      font-family:Nunito,Arial,sans-serif;}
    #sc-bar{position:sticky;top:0;display:flex;gap:10px;align-items:center;
      padding:12px 16px;background:#20242a;color:#e7eef2;box-shadow:0 2px 8px rgba(0,0,0,.4);}
    #sc-bar h2{font-size:15px;margin:0;flex:1;font-weight:800;}
    #sc-bar button{min-height:40px;padding:0 16px;border-radius:9px;border:1px solid #4a5560;
      background:#2b3138;color:#dfe8ee;font-size:14px;cursor:pointer;}
    #sc-bar button.pri{background:#1f6f7a;border-color:#2b96a4;color:#eafbff;font-weight:700;}
    #sc-sheet{max-width:900px;margin:18px auto;background:#fff;color:#111;padding:34px 40px;
      border-radius:4px;box-shadow:0 6px 30px rgba(0,0,0,.5);}
    #sc-sheet .sc-title{font-family:Georgia,serif;text-align:center;}
    #sc-sheet .sc-title p{margin:0;color:#222;font-size:16px;}
    #sc-sheet h3{font-size:12px;letter-spacing:.08em;color:#666;margin:22px 0 2px;
      border-bottom:1px solid #ddd;padding-bottom:3px;text-transform:uppercase;}
    #sc-sheet .sc-sys{display:block;width:100%;height:auto;margin:2px 0;}
    #sc-sheet .sc-note{color:#555;font-size:11px;margin-top:18px;font-style:italic;}
    @media print{
      body>*{display:none !important;}
      #sc-overlay{display:block !important;position:static;background:#fff;overflow:visible;}
      #sc-bar{display:none !important;}
      #sc-sheet{box-shadow:none;margin:0;max-width:none;padding:0;}
    }`;
    document.head.append(s);
  }

  function exportScore() {
    const model = G.buildScoreModel();
    if (!model.parts.length && !model.drums.length) {
      if (G.setStatus) G.setStatus('nothing to notate yet — place some notes first');
      else alert('Add some notes first, then export the score.');
      return;
    }
    ensureStyle();
    const old = document.getElementById('sc-overlay');
    if (old) old.remove();

    // one beats->pixels scale for the whole sheet; the label margin fits the
    // clef + the widest key signature + the time signature
    let maxAcc = 0;
    for (const p of model.parts) maxAcc = Math.max(maxAcc, Math.abs(keySig(p.keyPc, p.scix)));
    const labelW = NAME_W + 30 + CLEF_W + maxAcc * ACC_W + TSIG_W;
    let maxSpan = 1;
    for (const p of model.parts) maxSpan = Math.max(maxSpan, p.span);
    for (const d of model.drums) maxSpan = Math.max(maxSpan, d.span);
    const pxPerBeat = Math.max(28, Math.min(110, (860 - labelW) / maxSpan));
    const lay = { pxPerBeat, labelW, maxW: labelW + maxSpan * pxPerBeat + 16 };

    let body = `<div class="sc-title"><p>${esc(model.key)} ${esc(model.scale)}` +
      ` · ${Math.round(model.bpm)} bpm · ${model.meter.n}/${model.meter.d}</p></div>`;
    for (const p of model.parts) body += el('h3', {}, esc(p.name)) + pitchedSystem(p, lay);
    if (model.drums.length) {
      body += el('h3', {}, 'Drums');
      for (const d of model.drums) body += drumSystem(d, model.meter, lay);
    }
    let note = 'Notation follows the step grid (beats per step = span ÷ steps). '
      + 'The time signature is guessed from the kick/bass emphasis; parts in '
      + 'another meter carry their own signature. ';
    if (model.microtonal) note += 'A scale in use is microtonal — pitches are rounded to the nearest semitone. ';
    body += `<p class="sc-note">${esc(note)}</p>`;

    const ov = document.createElement('div');
    ov.id = 'sc-overlay';
    ov.innerHTML =
      `<div id="sc-bar"><h2>sheet music preview</h2>` +
      `<button class="pri" id="sc-print">⬇ Save PDF / Print</button>` +
      `<button id="sc-close">Close</button></div>` +
      `<div id="sc-sheet">${body}</div>`;
    document.body.append(ov);
    ov.querySelector('#sc-print').addEventListener('click', () => window.print());
    ov.querySelector('#sc-close').addEventListener('click', () => ov.remove());
  }

  G.exportScore = exportScore;
})();
