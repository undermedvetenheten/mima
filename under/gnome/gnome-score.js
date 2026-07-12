// SuperGnome — sheet-music export.
// Renders the current pattern as staff notation (SVG) in an on-screen preview,
// then leans on the browser's "Save as PDF" (window.print) so it works the same
// on desktop and iOS. Self-contained: no fonts or libraries beyond the DOM.
//
// Pitches come from gnome.js's buildScoreModel (nearest semitone — microtonal
// scales are approximated); rhythm is the step grid (beats per step).
'use strict';
(function () {
  const G = window.gnome;
  if (!G) return;

  const SP = 10;                       // staff space (line gap) in svg units
  const LETTER = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  // note-value buckets: [beats, filled?, stem?, flags]
  const DURS = [
    [4, false, false, 0], [3, false, true, 0], [2, false, true, 0],
    [1.5, true, true, 0], [1, true, true, 0], [0.75, true, true, 1],
    [0.5, true, true, 1], [0.375, true, true, 2], [0.25, true, true, 2],
    [0.125, true, true, 3],
  ];
  const nearestDur = bps => DURS.reduce((a, b) =>
    Math.abs(b[0] - bps) < Math.abs(a[0] - bps) ? b : a);

  function parseNote(name) {
    const mm = /^([A-G])([#b]?)(-?\d+)$/.exec(name);
    if (!mm) return { step: 0, acc: '' };
    const oct = parseInt(mm[3], 10);
    return { step: oct * 7 + LETTER[mm[1]], acc: mm[2] };
  }

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const el = (t, a, inner) => {
    const at = Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('');
    return `<${t}${at}${inner == null ? '/>' : `>${inner}</${t}>`}`;
  };
  // beats per measure from a {n, d} time signature (7/8 -> 3.5 beats)
  const sigBeats = sig => sig.n * 4 / sig.d;
  // stacked time-signature digits at x, on a 5-line staff starting at staffTop
  function sigGlyph(x, staffTop, sig) {
    const f = { 'font-size': 19, fill: '#111', 'font-family': 'Georgia,serif',
      'font-weight': 700, 'text-anchor': 'middle' };
    return el('text', Object.assign({ x, y: staffTop + SP * 1.7 }, f), sig.n)
      + el('text', Object.assign({ x, y: staffTop + SP * 3.7 }, f), sig.d);
  }

  // draw a single notehead + optional accidental + ledger lines at staff-step s
  function head(x, yOf, s, filled, botLine, topLine, acc) {
    const y = yOf(s);
    let g = '';
    // ledger lines above / below the staff
    for (let ls = botLine - 2; ls >= s; ls -= 2)
      g += el('line', { x1: x - 9, y1: yOf(ls), x2: x + 9, y2: yOf(ls), stroke: '#111', 'stroke-width': 1.2 });
    for (let ls = topLine + 2; ls <= s; ls += 2)
      g += el('line', { x1: x - 9, y1: yOf(ls), x2: x + 9, y2: yOf(ls), stroke: '#111', 'stroke-width': 1.2 });
    g += el('ellipse', { cx: x, cy: y, rx: 5.9, ry: 4.2, fill: filled ? '#111' : 'none',
      stroke: '#111', 'stroke-width': 1.4, transform: `rotate(-18 ${x} ${y})` });
    if (acc === '#') g += el('text', { x: x - 11, y: y + 4, 'font-size': 15, fill: '#111',
      'font-family': 'Georgia,serif' }, '♯');
    else if (acc === 'b') g += el('text', { x: x - 11, y: y + 4, 'font-size': 15, fill: '#111',
      'font-family': 'Georgia,serif' }, '♭');
    return { g, y };
  }

  // one system (staff) for a pitched part
  function pitchedSystem(part) {
    const stepW = Math.max(28, SP * 3.2);
    const labelW = 104, padTop = 46, padBot = 34;
    const staffW = part.steps * stepW;
    const W = labelW + staffW + 24;
    const H = padTop + padBot + SP * 4;
    const staffTop = padTop;
    const isB = part.clef === 'bass';
    const yOf = s => staffTop + (isB ? 26 - s : 38 - s) / 2 * SP;
    const botLine = isB ? 18 : 30, topLine = isB ? 26 : 38, midLine = isB ? 22 : 34;
    let svg = '';
    // 5 staff lines
    for (let i = 0; i < 5; i++)
      svg += el('line', { x1: labelW, y1: staffTop + i * SP, x2: labelW + staffW, y2: staffTop + i * SP,
        stroke: '#111', 'stroke-width': 1 });
    // clef + time signature (in the label margin) + part label
    svg += el('text', { x: labelW - 60, y: staffTop + (isB ? 1.6 : 3.1) * SP, 'font-size': isB ? 34 : 44,
      fill: '#111', 'font-family': "'Noto Music','Bravura','Apple Symbols','Segoe UI Symbol',serif" },
      isB ? '𝄢' : '𝄞');
    svg += sigGlyph(labelW - 15, staffTop, part.sig);
    svg += el('text', { x: 4, y: staffTop - 16, 'font-size': 13, fill: '#333',
      'font-family': 'Nunito,Arial,sans-serif', 'font-weight': 700 }, esc(part.name));
    const dur = nearestDur(part.bps), filled = dur[1], stem = dur[2], flags = dur[3];
    const mb = sigBeats(part.sig);
    // opening bar line
    svg += el('line', { x1: labelW, y1: staffTop, x2: labelW, y2: staffTop + 4 * SP, stroke: '#111', 'stroke-width': 1.4 });
    for (let i = 0; i < part.steps; i++) {
      const x = labelW + i * stepW + stepW / 2;
      const beat = i * part.bps;
      if (i > 0 && Math.abs(beat / mb - Math.round(beat / mb)) < 1e-6)
        svg += el('line', { x1: labelW + i * stepW, y1: staffTop, x2: labelW + i * stepW, y2: staffTop + 4 * SP,
          stroke: '#111', 'stroke-width': 1 });
      const n = part.notes[i];
      if (!n) { // rest tick on the middle line
        svg += el('rect', { x: x - 5, y: yOf(midLine) - 2, width: 10, height: 4, fill: '#999' });
        continue;
      }
      const staffs = n.midis.map(md => parseNote(G.noteName(md)));
      let lo = Infinity, hi = -Infinity, ys = [];
      for (const st of staffs) {
        const r = head(x, yOf, st.step, filled, botLine, topLine, st.acc);
        svg += r.g; ys.push(r.y); lo = Math.min(lo, st.step); hi = Math.max(hi, st.step);
      }
      if (stem) {
        const up = (lo + hi) / 2 < midLine;
        const yTop = Math.min(...ys), yBot = Math.max(...ys);
        const sx = up ? x + 6 : x - 6;
        const y1 = up ? yBot : yTop, y2 = (up ? yTop : yBot) + (up ? -30 : 30);
        svg += el('line', { x1: sx, y1: y1, x2: sx, y2: y2, stroke: '#111', 'stroke-width': 1.4 });
        for (let fl = 0; fl < flags; fl++) {
          const fy = y2 + (up ? fl * 6 : -fl * 6);
          svg += el('path', { d: `M ${sx} ${fy} q 10 5 8 16`, stroke: '#111', 'stroke-width': 1.4, fill: 'none' });
        }
      }
      if (n.accent)
        svg += el('text', { x: x - 4, y: staffTop + 4 * SP + 16, 'font-size': 13, fill: '#111' }, '>');
    }
    // closing double bar
    svg += el('line', { x1: labelW + staffW, y1: staffTop, x2: labelW + staffW, y2: staffTop + 4 * SP, stroke: '#111', 'stroke-width': 1.4 });
    return `<svg viewBox="0 0 ${W} ${H}" class="sc-sys" preserveAspectRatio="xMinYMid meet">${svg}</svg>`;
  }

  // compact rhythm staff for a drum lane (x = hit, ◆ = accent). A lane whose
  // meter differs from the global one shows its own sig (polymeter made visible).
  function drumSystem(lane, globalSig) {
    const stepW = Math.max(24, SP * 3), labelW = 74, pad = 18;
    const staffW = lane.steps * stepW, W = labelW + staffW + 24, H = pad * 2 + 12;
    const y = pad + 6;
    let svg = el('line', { x1: labelW, y1: y, x2: labelW + staffW, y2: y, stroke: '#111', 'stroke-width': 1 });
    svg += el('text', { x: 4, y: y + 4, 'font-size': 12, fill: '#333',
      'font-family': 'Nunito,Arial,sans-serif', 'font-weight': 700 }, esc(lane.name));
    if (lane.sig.n !== globalSig.n || lane.sig.d !== globalSig.d)
      svg += el('text', { x: labelW - 8, y: y + 4, 'font-size': 12, fill: '#111', 'text-anchor': 'end',
        'font-family': 'Georgia,serif', 'font-weight': 700 }, `${lane.sig.n}/${lane.sig.d}`);
    svg += el('line', { x1: labelW, y1: y - 8, x2: labelW, y2: y + 8, stroke: '#111', 'stroke-width': 1.4 });
    const mb = sigBeats(lane.sig);
    for (let i = 0; i < lane.steps; i++) {
      const x = labelW + i * stepW + stepW / 2, beat = i * lane.bps;
      if (i > 0 && Math.abs(beat / mb - Math.round(beat / mb)) < 1e-6)
        svg += el('line', { x1: labelW + i * stepW, y1: y - 8, x2: labelW + i * stepW, y2: y + 8, stroke: '#ccc', 'stroke-width': 1 });
      if (lane.hits[i] === 2)
        svg += el('path', { d: `M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} L ${x - 6} ${y} Z`, fill: '#111' });
      else if (lane.hits[i] === 1) {
        svg += el('line', { x1: x - 5, y1: y - 5, x2: x + 5, y2: y + 5, stroke: '#111', 'stroke-width': 1.6 });
        svg += el('line', { x1: x - 5, y1: y + 5, x2: x + 5, y2: y - 5, stroke: '#111', 'stroke-width': 1.6 });
      }
    }
    svg += el('line', { x1: labelW + staffW, y1: y - 8, x2: labelW + staffW, y2: y + 8, stroke: '#111', 'stroke-width': 1.4 });
    return `<svg viewBox="0 0 ${W} ${H}" class="sc-sys" preserveAspectRatio="xMinYMid meet">${svg}</svg>`;
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
    let body = `<div class="sc-title"><p>${esc(model.key)} ${esc(model.scale)}` +
      ` · ${Math.round(model.bpm)} bpm · ${model.meter.n}/${model.meter.d}</p></div>`;
    for (const p of model.parts) body += el('h3', {}, esc(p.name)) + pitchedSystem(p);
    if (model.drums.length) {
      body += el('h3', {}, 'Drums');
      for (const d of model.drums) body += drumSystem(d, model.meter);
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
