// SuperGnome web — UI + state (main thread).
// Canvas port of the JSFX @gfx section. The musical state lives here in a
// flat Float64Array with the same layout as the JSFX serialized block; every
// edit ships the whole block to the worklet (gnome-worklet.js), which is the
// only reader during playback. MIDI-era fields (NOTE/CH, SYN/MID, stems) are
// gone; lanes pick from the bundled DR-55 kit and each part has a volume knob.

'use strict';

const LANES_CAP = 8, MAX_STEPS = 32, EUC_N = 21, NROWS = 12, NSCALES = 14,
  NPROGS = 14, NSYN = 3;

// ---- mem offsets (mirror of the JSFX block; keep in sync with the worklet) ----
const PAT = 0, NOTE_A = 256, CHAN_A = 264, STEPS_A = 272, SPAN_A = 280,
  PUL_A = 288, ROT_A = 296, VEL_A = 304, GATE_A = 312, MUTE_A = 320,
  EUC_NEXT = 328, LMODE_A = 336, PIT_A = 344, LPF_A = 352, BASS_ON = 360,
  BASS_DEG = 392, BASS_P = 424, MEL2_ON = 448, MEL2_DEG = 480, MEL_P = 512,
  LRATE_A = 536, LDEP_A = 544, LSHAPE_A = 552, FENV_A = 568, CHD_P = 576,
  CHD_ON = 608, CHD_DEG = 640, LPT_A = 672, SWG_A = 680, NDG_A = 688,
  VHM_A = 696, SSW_A = 704, SND_A = 708, SFL_A = 712, GKEY_NOTE = 716,
  GKEY_SCALE = 717, GKEY_PROG = 718, GKEY_SPD = 719, LOCK_A = 720, HML_A = 724;

// ---- web-only region (>= 728; extends the JSFX block, kept in the worklet) ----
const MEM = 768;
const ENG_A = 728;            // per-synth engine: 0 osc, 1 string, 2 glass
const GEN_STYLE = 731;        // RND generation style (index into STYLE_NAMES)
const FX_ON = 736, DLY_ON = 737, DLY_TIME = 738, DLY_FB = 739, DLY_TONE = 740,
  DLY_WOW = 741, FX_FEED = 742, AVO_ON = 743, AVO_AMT = 744, AVO_RATE = 745,
  AVO_CRUSH = 746, AVO_MIX = 747, DLY_PITCH = 748, DLY_REV = 749;
const SEND_A = 752;          // per-part send: drums, bass, melody, chords
const GLC_A = 756;           // per-synth glass harmonic-cycle rate
const CLD_ON = 760, CLD_MIX = 761, CLD_SIZE = 762, CLD_DENS = 763,
  CLD_PITCH = 764, CLD_SPREAD = 765, CLD_REVERB = 766, CLD_REVG = 767;

const m = new Float64Array(MEM);
let numLanes = 3;

// ---- tables (mirror of the JSFX; keep in sync with the worklet) ----
const SCL = [
  [7, 0, 200, 400, 500, 700, 900, 1100],
  [7, 0, 200, 300, 500, 700, 800, 1000],
  [7, 0, 200, 300, 500, 700, 900, 1000],
  [7, 0, 100, 300, 500, 700, 800, 1000],
  [7, 0, 200, 400, 600, 700, 900, 1100],
  [7, 0, 200, 400, 500, 700, 900, 1000],
  [5, 0, 200, 400, 700, 900],
  [5, 0, 300, 500, 700, 1000],
  [6, 0, 300, 500, 600, 700, 1000],
  [7, 0, 200, 300, 500, 700, 800, 1100],
  [6, 0, 200, 400, 600, 800, 1000],
  [7, 0, 120, 270, 540, 670, 800, 1080],
  [5, 0, 240, 480, 720, 960],
  [7, 0, 200, 350, 500, 700, 900, 1050],
];
const SCALE_NAMES = ['Major', 'Natural Minor', 'Dorian', 'Phrygian', 'Lydian',
  'Mixolydian', 'Pentatonic Major', 'Pentatonic Minor', 'Blues',
  'Harmonic Minor', 'Whole Tone', 'Pelog (approx)', 'Slendro (approx)',
  'Rast (quarter-tone)'];
const PROG_NAMES = ['off', 'I - IV', 'I - IV - V - IV', 'doo-wop I-vi-IV-V',
  'axis I-V-vi-IV', 'ii - V - I', '12-bar blues', 'Andalusian descent',
  'circle of fifths', 'minor 3rds (dim cycle)', 'Giant Steps (maj 3rd cycle)',
  'Coltrane V-I chain', 'harmonic series 3-5-7-11 (just)', 'overtone ladder (just)'];
const SHAPE_NAMES = ['sine', 'triangle', 'saw down', 'random (S&H)'];
const SYN_NAMES = ['bass', 'melody', 'chords'];
// RND generation styles. Each picks an idiomatic scale (-1 keeps the current
// one) and steers the melodic contour; bass/chords stay root-anchored and go
// static under a moving progression so key shifts don't fall apart.
const STYLE_NAMES = ['free', 'Appalachian', 'West African', 'Gamelan',
  'Blues', 'Andalusian', 'Middle Eastern'];
const STYLE_SCALE = [-1, 5, 6, 11, 8, 3, 9]; // free, Mixolydian, PentMaj, Pelog, Blues, Phrygian, HarmMin
const FEEL_NAMES = ['straight', 'triplet', 'dotted'];
const EUC = [
  [2, 5, 0, 'Khafif-e-ramal (Persia)'], [3, 4, 0, 'Cumbia / Calypso'],
  [3, 5, 2, 'Khafif-e-ramal / Rumanian folk'], [3, 7, 0, 'Ruchenitza (Bulgaria)'],
  [3, 8, 0, 'tresillo (Cuba)'], [4, 7, 0, 'Ruchenitza 2 (Bulgaria)'],
  [4, 9, 0, 'Aksak (Turkey)'], [4, 11, 0, 'Zappa: Outside Now'],
  [5, 6, 0, 'York-Samai (Arab)'], [5, 7, 0, 'Nawakhat (Arab)'],
  [5, 8, 0, 'cinquillo (Cuba)'], [5, 9, 0, 'Agsag-Samai (Arab)'],
  [5, 11, 0, 'Moussorgsky: Pictures at an Exhibition'],
  [5, 12, 0, 'Venda clapping (South Africa)'], [5, 16, 0, 'Bossa-Nova (Brazil)'],
  [7, 8, 0, 'Bendir frame drum'], [7, 12, 0, 'West African bell'],
  [7, 16, 14, 'Samba (Brazil)'], [9, 16, 0, 'Central African Republic'],
  [11, 24, 14, 'Aka Pygmies (Central Africa)'], [13, 24, 5, 'Aka Pygmies, upper Sangha'],
];

// ---- samples ----
const SAMPLE_DEFS = [
  { label: '---', file: null },
  { label: 'BD', file: '../supergnome/dr55_bd.wav' },
  { label: 'SN', file: '../supergnome/dr55_sn.wav' },
  { label: 'RIM', file: '../supergnome/dr55_rim.wav' },
];
// each lane is permanently paired with a sample (cycling the DR-55 kit), so a
// lane labelled BD always is BD. New lanes inherit their slot's pairing.
const LANE_SAMPLE = [1, 2, 3, 1, 2, 3, 1, 2];
let smpA = LANE_SAMPLE.slice();
const decoded = [null, null, null, null]; // {data,nch,sr,len} per SAMPLE_DEF

// ---- transport / mix ----
let playing = false;
let bpm = 120;
let vols = { drum: 90, bass: 90, mel: 90, chd: 90, master: 80 };
let altMode = false; // touch stand-in for right-click

// ---- helpers ported from the JSFX ----
function noteName(n) {
  const NM = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return NM[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
}

function getParam(l, f) {
  const off = [NOTE_A, CHAN_A, STEPS_A, SPAN_A, PUL_A, ROT_A, VEL_A, GATE_A,
    PIT_A, LPF_A, FENV_A, LRATE_A, LDEP_A, LSHAPE_A, LPT_A, SWG_A, NDG_A, VHM_A][f];
  return m[off + l];
}
function setParam(l, f, v) {
  const clamp = (lo, hi) => Math.max(lo, Math.min(hi, v));
  if (f === 0) m[NOTE_A + l] = clamp(0, 127);
  else if (f === 1) m[CHAN_A + l] = clamp(0, 15);
  else if (f === 2) m[STEPS_A + l] = clamp(1, MAX_STEPS);
  else if (f === 3) m[SPAN_A + l] = clamp(0.25, 32);
  else if (f === 4) m[PUL_A + l] = clamp(0, MAX_STEPS);
  else if (f === 5) m[ROT_A + l] = clamp(0, MAX_STEPS);
  else if (f === 6) m[VEL_A + l] = clamp(1, 127);
  else if (f === 7) m[GATE_A + l] = clamp(5, 200);
  else if (f === 8) m[PIT_A + l] = clamp(-24, 24);
  else if (f === 9) m[LPF_A + l] = clamp(0, 100);
  else if (f === 10) m[FENV_A + l] = clamp(0, 100);
  else if (f === 11) m[LRATE_A + l] = clamp(0.25, 32);
  else if (f === 12) m[LDEP_A + l] = clamp(0, 100);
  else if (f === 13) m[LSHAPE_A + l] = clamp(0, 3);
  else if (f === 14) m[LPT_A + l] = clamp(0, 24);
  else if (f === 15) m[SWG_A + l] = clamp(0, 75);
  else if (f === 16) m[NDG_A + l] = clamp(-50, 50);
  else m[VHM_A + l] = clamp(0, 100);
}

function spOff(si) { return si === 0 ? BASS_P : si === 1 ? MEL_P : CHD_P; }
function ronOff(si) { return si === 0 ? BASS_ON : si === 1 ? MEL2_ON : CHD_ON; }
function rdgOff(si) { return si === 0 ? BASS_DEG : si === 1 ? MEL2_DEG : CHD_DEG; }

function sget(si, k) {
  if (k === 25) return m[SSW_A + si];
  if (k === 26) return m[SND_A + si];
  if (k === 27) return m[SFL_A + si];
  return m[spOff(si) + k];
}
function sset(si, k, v) {
  const sp = spOff(si);
  const clamp = (lo, hi) => Math.max(lo, Math.min(hi, v));
  if (k === 0) m[sp] = clamp(12, 108);
  else if (k === 1) m[sp + 1] = ((v % NSCALES) + NSCALES) % NSCALES;
  else if (k === 2) m[sp + 2] = clamp(1, MAX_STEPS);
  else if (k === 3) m[sp + 3] = clamp(0.25, 32);
  else if (k === 4) m[sp + 4] = clamp(0, MAX_STEPS);
  else if (k === 5) m[sp + 5] = clamp(0, MAX_STEPS);
  else if (k === 6) m[sp + 6] = clamp(1, 127);
  else if (k === 7) m[sp + 7] = clamp(5, 200);
  else if (k === 8) m[sp + 8] = clamp(0, 500);
  else if (k === 9) m[sp + 9] = clamp(5, 4000);
  else if (k === 10) m[sp + 10] = v ? 1 : 0;
  else if (k === 11) m[sp + 11] = v ? 1 : 0;
  else if (k === 12) m[sp + 12] = clamp(0, 100);
  else if (k === 13) m[sp + 13] = clamp(0, 100);
  else if (k === 14) m[sp + 14] = clamp(0, 100);
  else if (k === 15) m[sp + 15] = v ? 1 : 0;
  else if (k === 16) m[sp + 16] = clamp(0.25, 32);
  else if (k === 17) m[sp + 17] = clamp(0, 100);
  else if (k === 18) m[sp + 18] = clamp(0, 3);
  else if (k === 19) m[sp + 19] = clamp(0, 100);
  else if (k === 20) m[sp + 20] = clamp(0, 2);
  else if (k === 21) m[sp + 21] = clamp(0, 2000);
  else if (k === 22) m[sp + 22] = clamp(0, NPROGS - 1);
  else if (k === 23) m[sp + 23] = clamp(0.25, 32);
  else if (k === 24) m[sp + 24] = v ? 1 : 0;
  else if (k === 25) m[SSW_A + si] = clamp(0, 75);
  else if (k === 26) m[SND_A + si] = clamp(-50, 50);
  else if (k === 27) m[SFL_A + si] = clamp(0, 2);
}

// row 2 field -> synth param index
function r2map(f) {
  return [12, 13, 14, 19, 16, 17, 18, 20, 21, 25, 26, 27, 22, 23][f];
}

function effScale(si) { return m[LOCK_A + si] ? m[GKEY_SCALE] : sget(si, 1); }
function effBase(si) {
  if (m[LOCK_A + si]) {
    const gb = m[GKEY_NOTE];
    return gb + 12 * Math.floor((sget(si, 0) - gb) / 12 + 0.5);
  }
  return sget(si, 0);
}

function applyEuclid(l) {
  const n = m[STEPS_A + l], k = Math.min(m[PUL_A + l], n);
  for (let i = 0; i < n; i++) {
    const ii = ((i - m[ROT_A + l]) % n + n) % n;
    m[PAT + l * MAX_STEPS + i] = k > 0 ? ((ii * k) % n < k ? 1 : 0) : 0;
  }
}

function rotatePat(l, dd) {
  const st = m[STEPS_A + l], tmp = [];
  for (let i = 0; i < st; i++) tmp[i] = m[PAT + l * MAX_STEPS + ((i - dd) % st + st) % st];
  for (let i = 0; i < st; i++) m[PAT + l * MAX_STEPS + i] = tmp[i];
}

function rotateSyn(si, dd) {
  const ron = ronOff(si), rdg = rdgOff(si), st = sget(si, 2), ta = [], tb = [];
  for (let i = 0; i < st; i++) {
    const src = ((i - dd) % st + st) % st;
    ta[i] = m[ron + src]; tb[i] = m[rdg + src];
  }
  for (let i = 0; i < st; i++) { m[ron + i] = ta[i]; m[rdg + i] = tb[i]; }
}

function applySynEuclid(si) {
  const ron = ronOff(si), n = sget(si, 2), k = Math.min(sget(si, 4), n);
  for (let i = 0; i < n; i++) {
    const ii = ((i - sget(si, 5)) % n + n) % n;
    m[ron + i] = k > 0 ? ((ii * k) % n < k ? 1 : 0) : 0;
  }
}

// scale degree nearest a target interval (cents) — for finding the fifth/third
function degNear(scix, cents) {
  const s = SCL[scix], cnt = s[0];
  let best = 1e9, bi = 0;
  for (let k = 0; k < cnt; k++) {
    const d = Math.abs(s[1 + k] - cents);
    if (d < best) { best = d; bi = k; }
  }
  return bi;
}

// BASS. Free style keeps the original random walk (kept as the default so RND
// stays surprising). Named styles anchor to root + fifth so the bass stays
// solid when the harmony rotates.
function genBass(style) {
  const ron = ronOff(0), rdg = rdgOff(0), n = sget(0, 2), scix = effScale(0);
  const cnt = SCL[scix][0], fifth = degNear(scix, 700);
  applySynEuclid(0);
  if (style === 0) {                            // original random walk
    let prev = Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) if (m[ron + i]) {
      prev = prev + Math.floor(Math.random() * 7) - 3;
      if (prev < 0) prev += 5; if (prev > NROWS - 1) prev -= 5;
      m[rdg + i] = Math.max(0, Math.min(NROWS - 1, prev));
    }
    return;
  }
  m[ron] = 1;                                   // root on the downbeat
  if (style === 1) {                            // Appalachian boom-chuck
    let tog = 0;
    for (let i = 0; i < n; i++) if (m[ron + i]) { m[rdg + i] = tog ? fifth : 0; tog ^= 1; }
    return;
  }
  if (style === 2) {                            // West African: short root-ish cell
    const cell = [0, fifth, 0, cnt];
    for (let i = 0; i < n; i++) if (m[ron + i]) m[rdg + i] = cell[i % cell.length];
    return;
  }
  for (let i = 0; i < n; i++) {
    if (!m[ron + i]) continue;
    if (i === 0) { m[rdg + i] = 0; continue; }
    const r = Math.random();
    m[rdg + i] = r < 0.55 ? 0 : r < 0.82 ? fifth : r < 0.92 ? cnt
      : Math.max(0, fifth + (Math.random() < 0.5 ? 1 : -1));
  }
}

// MELODY. Free style keeps the original per-bar euclid + sweeping arc (random
// arps). Named styles use a flavoured contour.
function genMelody(style) {
  const ron = ronOff(1), rdg = rdgOff(1), n = sget(1, 2), scix = effScale(1);
  const cnt = SCL[scix][0], top = NROWS - 1;    // roll rows = degrees 0..11

  if (style === 0) {                            // original: per-bar variations + arc
    const k = sget(1, 4);
    const bars = Math.max(1, Math.floor(sget(1, 3) / 4 + 0.5));
    const sbar = Math.floor(n / bars);
    if (sbar > 0 && sbar * bars === n) {
      for (let b = 0; b < bars; b++) {
        const kk = Math.min(k, sbar);
        for (let i = 0; i < sbar; i++) {
          const ii = ((i - sget(1, 5) - b) % sbar + sbar) % sbar;
          m[ron + b * sbar + i] = kk > 0 ? ((ii * kk) % sbar < kk ? 1 : 0) : 0;
        }
      }
    } else applySynEuclid(1);
    const arc = Math.random();
    for (let i = 0; i < n; i++) if (m[ron + i]) {
      const dgv = Math.floor(5.5 + 4.5 * Math.sin(2 * Math.PI * (i / n + arc)) + Math.random() * 3 - 1);
      m[rdg + i] = Math.max(0, Math.min(NROWS - 1, dgv));
    }
    return;
  }

  // rhythm: fuller for busy styles, euclidean otherwise
  if (style === 1 || style === 4) {
    for (let i = 0; i < n; i++) m[ron + i] = 1;  // busy, mostly-continuous line
  } else applySynEuclid(1);

  const ons = [];
  for (let i = 0; i < n; i++) if (m[ron + i]) ons.push(i);
  if (!ons.length) return;

  if (style === 2 || style === 3) {
    // West African / Gamelan: a short cell (pentatonic-ish) tiled with drift
    const clen = 2 + Math.floor(Math.random() * 3);
    const cell = [];
    let d = Math.floor(Math.random() * cnt);
    for (let c = 0; c < clen; c++) {
      cell.push(Math.max(0, Math.min(top, d)));
      d += (style === 3 ? 2 : 1) * (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 2));
    }
    ons.forEach((i, j) => {
      let deg = cell[j % clen];
      if (Math.random() < 0.18) deg = Math.max(0, Math.min(top, deg + (Math.random() < 0.5 ? cnt : -cnt)));
      m[rdg + i] = deg;
    });
    return;
  }
  if (style === 5) {
    // Andalusian: descending phrygian motif, resolving down to the tonic
    let deg = Math.min(top, cnt + 3);
    ons.forEach((i, j) => {
      m[rdg + i] = Math.max(0, Math.min(top, deg));
      deg -= (j % 4 === 3) ? -(3 + Math.floor(Math.random() * 3)) : 1; // step down, occasional leap up
      if (deg < 0) deg = Math.min(top, cnt + 2);
    });
    return;
  }
  // Appalachian / Blues / Free / Middle Eastern: stepwise walk with small
  // arpeggio leaps and a pull back to the tonic at phrase ends
  let deg = [0, cnt][Math.floor(Math.random() * 2)];
  const steps = style === 4 ? [-2, -1, 1, 2, 3, -3] : [-2, -1, -1, 1, 1, 2];
  ons.forEach((i, j) => {
    if (j === ons.length - 1) deg = Math.round(deg / cnt) * cnt;   // cadence to a tonic
    else deg += steps[Math.floor(Math.random() * steps.length)];
    deg = Math.max(0, Math.min(top, deg));
    m[rdg + i] = deg;
  });
}

// CHORDS: when a progression is rotating the key, hold essentially one root
// chord (the progression does the moving) — "one chord is best". Otherwise a
// gentle diatonic move favouring I / IV / V / vi.
function genChords(style) {
  const ron = ronOff(2), rdg = rdgOff(2), n = sget(2, 2), cnt = SCL[effScale(2)][0];
  const progActive = (m[LOCK_A + 2] ? m[GKEY_PROG] : sget(2, 22)) > 0;
  // one held root chord while a progression is rotating the key (any style)
  if (progActive) {
    for (let i = 0; i < n; i++) { m[ron + i] = 0; m[rdg + i] = 0; }
    m[ron] = 1; m[rdg] = 0;
    if (n >= 8) { const h = Math.floor(n / 2); m[ron + h] = 1; m[rdg + h] = 0; }
    return;
  }
  applySynEuclid(2);
  if (style === 0) {                              // original 4th/5th root walk
    let prev = 0;
    for (let i = 0; i < n; i++) if (m[ron + i]) {
      const rr = Math.random();
      prev += rr < 0.28 ? 3 : rr < 0.56 ? -3 : rr < 0.72 ? 4 : rr < 0.82 ? -4 : rr < 0.92 ? 1 : 0;
      prev = ((prev % cnt) + cnt) % cnt;
      m[rdg + i] = prev;
    }
    return;
  }
  const good = [0, Math.min(3, cnt - 1), Math.min(4, cnt - 1), Math.min(5, cnt - 1)];
  let prev = 0;
  for (let i = 0; i < n; i++) {
    if (!m[ron + i]) continue;
    prev = (i === 0 || Math.random() < 0.4) ? 0 : good[Math.floor(Math.random() * good.length)];
    m[rdg + i] = ((prev % cnt) + cnt) % cnt;
  }
}

function synGenerate(si) {
  const style = m[GEN_STYLE] || 0;
  if (si === 0) genBass(style);
  else if (si === 1) genMelody(style);
  else genChords(style);
}

// pick a generation style: also swaps the master scale to something idiomatic
function setStyle(v) {
  m[GEN_STYLE] = ((v % STYLE_NAMES.length) + STYLE_NAMES.length) % STYLE_NAMES.length;
  const sc = STYLE_SCALE[m[GEN_STYLE]];
  if (sc >= 0) m[GKEY_SCALE] = sc;
}

// ---- default state (port of @init, then a starter groove) ----
function initState() {
  m.fill(0);
  numLanes = 3;
  for (let l = 0; l < LANES_CAP; l++) {
    m[STEPS_A + l] = 16; m[SPAN_A + l] = 4; m[PUL_A + l] = 4;
    m[VEL_A + l] = 100; m[GATE_A + l] = 50; m[LPF_A + l] = 100;
    m[LRATE_A + l] = 4;
  }
  const B = BASS_P, M2 = MEL_P, C = CHD_P;
  // BASS: big saw bass on C1, filter mostly closed, env opens it
  [24, 0, 16, 4, 5, 0, 100, 80, 3, 250, 1, 0, 33, 28, 33, 0, 4, 0, 0, 100, 0, 0, 0, 4]
    .forEach((v, i) => m[B + i] = v);
  // MELODY: triangle, 2-bar phrases, soft attack, gentle LFO sweep
  [60, 0, 16, 8, 7, 0, 100, 90, 60, 600, 1, 0, 60, 20, 20, 0, 8, 15, 0, 50, 0, 0, 0, 4]
    .forEach((v, i) => m[M2 + i] = v);
  // CHORDS: soft sine-tri pad, held for gate, glide, 7ths on
  [48, 0, 8, 8, 4, 0, 90, 95, 120, 900, 1, 0, 55, 15, 15, 0, 8, 10, 0, 35, 1, 80, 0, 4, 1]
    .forEach((v, i) => m[C + i] = v);
  m[GKEY_NOTE] = 48; m[GKEY_SCALE] = 0; m[GKEY_PROG] = 0; m[GKEY_SPD] = 4;
  m[GEN_STYLE] = 0;
  for (let i = 0; i < 3; i++) { m[LOCK_A + i] = 1; m[HML_A + i] = 1; m[ENG_A + i] = 0; }
  smpA = LANE_SAMPLE.slice();
  // FX rack defaults: a gentle floaty delay ready to go, glitch idle
  m[FX_ON] = 0;
  m[DLY_ON] = 1; m[DLY_TIME] = 0.75; m[DLY_FB] = 38; m[DLY_TONE] = 55;
  m[DLY_WOW] = 30; m[FX_FEED] = 0;
  m[AVO_ON] = 0; m[AVO_AMT] = 40; m[AVO_RATE] = 0.5; m[AVO_CRUSH] = 0; m[AVO_MIX] = 100;
  m[DLY_PITCH] = 0; m[DLY_REV] = 0;
  for (let i = 0; i < 4; i++) m[SEND_A + i] = 0;
  for (let i = 0; i < 3; i++) m[GLC_A + i] = 0;
  m[CLD_ON] = 0; m[CLD_MIX] = 50; m[CLD_SIZE] = 45; m[CLD_DENS] = 55;
  m[CLD_PITCH] = 0; m[CLD_SPREAD] = 40; m[CLD_REVERB] = 55; m[CLD_REVG] = 0;
}

function seedGroove() {
  // the plugin starts with empty grids; the web demo starts with a groove
  m[PUL_A + 0] = 4; m[ROT_A + 0] = 0; applyEuclid(0);          // BD four-floor
  m[PUL_A + 1] = 2; m[ROT_A + 1] = 4; applyEuclid(1);          // SN backbeat
  m[PUL_A + 2] = 8; m[ROT_A + 2] = 1; applyEuclid(2);          // RIM off-8ths
  for (let si = 0; si < NSYN; si++) synGenerate(si);
}

// deal the next euclidean world-rhythm preset onto a lane; returns its name
function dealEuclid(l) {
  const epi = m[EUC_NEXT + l] % EUC_N;
  m[PUL_A + l] = EUC[epi][0];
  m[STEPS_A + l] = EUC[epi][1];
  m[ROT_A + l] = EUC[epi][2];
  applyEuclid(l);
  m[EUC_NEXT + l] = epi + 1;
  return `E(${EUC[epi][0]},${EUC[epi][1]}) rot ${EUC[epi][2]}  -  ${EUC[epi][3]}`;
}

function resetAll() {
  initState();
  seedGroove();
  touchState();
  for (let l = 0; l < LANES_CAP; l++) pushSample(l);
}

// ---- persistence ----
const STORE_KEY = 'supergnome_web_v2';
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      mem: Array.from(m), numLanes, vols, bpm, smp: smpA,
    }));
  } catch (e) { /* private mode etc - just don't persist */ }
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    // v1 saves lack the engine/FX region - let them re-init cleanly
    if (!s || !s.mem || s.mem.length !== MEM) return false;
    m.set(s.mem);
    numLanes = Math.max(1, Math.min(LANES_CAP, s.numLanes || 3));
    vols = Object.assign(vols, s.vols);
    bpm = s.bpm || 120;
    smpA = (s.smp && s.smp.length === LANES_CAP) ? s.smp.slice() : LANE_SAMPLE.slice();
    for (let si = 0; si < NSYN; si++) m[spOff(si) + 10] = 1; // always internal
    return true;
  } catch (e) { return false; }
}
let saveTimer = 0;
function touchState() {
  pushState();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 400);
}

// ---- audio ----
let actx = null, node = null, audioReady = false, audioStarting = false;
let dispBeat = 0, gsndB = -1, gsndM = -1, gsndC = [0, 0, 0, 0], gsndCn = 0;

function pushState() {
  if (node) node.port.postMessage({ type: 'state', mem: m, numLanes });
}
function pushGains() {
  if (!node) return;
  const g = v => (v / 100) * (v / 100);
  node.port.postMessage({
    type: 'gains', drum: g(vols.drum), bass: g(vols.bass),
    mel: g(vols.mel), chd: g(vols.chd), master: g(vols.master),
  });
}
function pushTransport() {
  if (node) node.port.postMessage({ type: 'transport', playing, bpm });
}
function pushSample(lane) {
  if (!node) return;
  const s = decoded[smpA[lane]];
  node.port.postMessage(s
    ? { type: 'sample', lane, data: s.data, nch: s.nch, sr: s.sr, len: s.len }
    : { type: 'sample', lane, data: null });
}

async function loadSamples() {
  for (let i = 1; i < SAMPLE_DEFS.length; i++) {
    try {
      const resp = await fetch(SAMPLE_DEFS[i].file);
      const buf = await actx.decodeAudioData(await resp.arrayBuffer());
      const nch = Math.min(2, buf.numberOfChannels), len = buf.length;
      const data = new Float32Array(len * nch);
      for (let c = 0; c < nch; c++) {
        const ch = buf.getChannelData(c);
        for (let j = 0; j < len; j++) data[j * nch + c] = ch[j];
      }
      decoded[i] = { data, nch, sr: buf.sampleRate, len };
    } catch (e) {
      setStatus('could not load sample: ' + SAMPLE_DEFS[i].label);
    }
  }
  for (let l = 0; l < LANES_CAP; l++) pushSample(l);
}

// iOS Safari mutes Web Audio when the ring/silent switch is on unless an
// HTMLMediaElement has played — that flips the audio session to "playback".
// Play a tiny silent clip (in the unlocking gesture) to bump the session.
let iosTag = null;
function iosSessionUnlock() {
  if (iosTag) { iosTag.play().catch(() => { }); return; }
  try {
    iosTag = new Audio('data:audio/wav;base64,UklGRiQBAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    iosTag.loop = true; iosTag.setAttribute('playsinline', ''); iosTag.volume = 0.001;
    iosTag.play().catch(() => { });
  } catch (e) { /* ignore */ }
}

async function initAudio() {
  if (audioReady || audioStarting) return;
  audioStarting = true;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  // iOS Safari: the context is born suspended and only unlocks if we resume
  // (and make a sound) synchronously inside this unlocking gesture — before
  // any await hands control back to the event loop.
  iosSessionUnlock();
  try { actx.resume(); } catch (e) { /* ignore */ }
  try {
    const b = actx.createBuffer(1, 1, actx.sampleRate);
    const src = actx.createBufferSource();
    src.buffer = b; src.connect(actx.destination); src.start(0);
  } catch (e) { /* ignore */ }
  await actx.audioWorklet.addModule('gnome-worklet.js');
  node = new AudioWorkletNode(actx, 'supergnome',
    { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
  node.connect(actx.destination);
  try { await actx.resume(); } catch (e) { /* ignore */ }
  node.port.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'tick') {
      dispBeat = d.beat;
      gsndB = d.gsndB; gsndM = d.gsndM; gsndC = d.gsndC; gsndCn = d.gsndCn;
    } else if (d.type === 'rec') {
      recChunks.push(d); recFrames += d.l.length;
    } else if (d.type === 'recdone') {
      finalizeRecording(d.sr);
    }
  };
  pushState(); pushGains(); pushTransport();
  await loadSamples();
  audioReady = true;
  audioStarting = false;
}

function togglePlay() {
  playing = !playing;
  if (actx && actx.state === 'suspended') actx.resume();
  pushTransport();
}

// ---- recording ----
// The worklet streams the master output as PCM chunks; we hold them, then
// encode a 16-bit WAV on stop. lastRec keeps the finished take so the UI can
// offer a save button (a fresh user gesture, which iOS/Safari needs).
let recording = false, recChunks = [], recFrames = 0, recSampleRate = 44100;
let lastRec = null; // { url, name, blob }

async function startRecording() {
  if (recording) return;
  if (!audioReady) await initAudio();
  if (actx.state === 'suspended') actx.resume();
  recSampleRate = actx.sampleRate;
  recChunks = []; recFrames = 0; recording = true;
  node.port.postMessage({ type: 'record', on: true });
}
function stopRecording() {
  if (!recording) return;
  recording = false;
  node.port.postMessage({ type: 'record', on: false }); // -> flush + recdone
}
function toggleRecording() { recording ? stopRecording() : startRecording(); }

function finalizeRecording(sr) {
  recSampleRate = sr || (actx ? actx.sampleRate : 44100);
  if (!recChunks.length) return;
  const blob = encodeWav(recChunks, recSampleRate);
  recChunks = [];
  if (lastRec && lastRec.url) URL.revokeObjectURL(lastRec.url);
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  const name = `supergnome-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.wav`;
  lastRec = { url: URL.createObjectURL(blob), name, blob };
}

function encodeWav(chunks, sr) {
  let n = 0;
  for (const c of chunks) n += c.l.length;
  const buf = new ArrayBuffer(44 + n * 4);      // 16-bit stereo
  const v = new DataView(buf);
  const wr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  wr(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); wr(8, 'WAVE');
  wr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true);
  v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  wr(36, 'data'); v.setUint32(40, n * 4, true);
  let o = 44;
  for (const c of chunks) {
    const L = c.l, R = c.r;
    for (let i = 0; i < L.length; i++) {
      let l = L[i]; l = l < -1 ? -1 : l > 1 ? 1 : l;
      let r = R[i]; r = r < -1 ? -1 : r > 1 ? 1 : r;
      v.setInt16(o, l < 0 ? l * 0x8000 : l * 0x7fff, true); o += 2;
      v.setInt16(o, r < 0 ? r * 0x8000 : r * 0x7fff, true); o += 2;
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// save the finished take. Called from a user tap so the share sheet /
// download is allowed. Prefers the native share sheet (iOS "Save to Files"),
// falls back to a download link.
async function saveLastRecording() {
  if (!lastRec) return;
  const file = new File([lastRec.blob], lastRec.name, { type: 'audio/wav' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: lastRec.name }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; /* else fall through */ }
  }
  const a = document.createElement('a');
  a.href = lastRec.url; a.download = lastRec.name;
  document.body.appendChild(a); a.click(); a.remove();
}

// ---- layout ----
const W = 1264;
const laneTop = 34, rowh = 40, xFields = 8, fieldw = 36;
const xMute = xFields + 17 * fieldw + 4;   // 624 (17 drum fields, NOTE/CH gone)
const xEuc = xMute + 22, xMode = xEuc + 36, xGrid = xMode + 30;
const cellw = 16, cellh = 28, rollrh = 8;
function yBtn() { return laneTop + numLanes * rowh + 2; }
function ys(si) { return yBtn() + 28 + si * 188; }
const fxH = 160;                        // demarcated FX box at the bottom
function fxY() { return ys(2) + 184; }
function yStat() { return fxY() + fxH + 2; }
function totalH() { return yStat() + 22; }

// KEY row layout
const kxKey = 156, kxScl = 204, kxPrg = 252, kxSpd = 298;
const kxB = 348, kxM = 398, kxC = 448; // lock buttons; +20 = mult boxes
const STYLE_X = 1040, STYLE_W = 216;   // GEN-style button (right of the KEY row)

// header controls
const PLAY_R = [130, 4, 44, 22], BPM_R = [180, 4, 52, 22],
  INIT_R = [238, 4, 40, 22], ALT_R = [284, 4, 40, 22],
  REC_R = [330, 4, 52, 22], SAVE_R = [388, 4, 52, 22];
const KNOBS = [
  { id: 'drum', label: 'DRUM' }, { id: 'bass', label: 'BASS' },
  { id: 'mel', label: 'MEL' }, { id: 'chd', label: 'CHD' },
  { id: 'master', label: 'MAIN' },
];
function knobX(i) { return W - (KNOBS.length - i) * 52 - 8; }

// FX panel cells (drawn as a demarcated box at the bottom, OG drag-field
// idiom). Positions are absolute; rebuilt each frame so they track fxY().
function fxFmt(kind, v) {
  return kind === 'pct' ? Math.round(v) + '%'
    : kind === 'st' ? (v > 0 ? '+' : '') + Math.round(v)
    : kind === 'beats' ? fmtG(v) : String(Math.round(v));
}
function fxCells() {
  const fy = fxY(), c = [];
  const val = (x, y, w, label, off, min, max, step, fmt) =>
    c.push({ t: 'val', x, y, w, label, off, min, max, step, fmt });
  const tog = (x, y, w, label, off) => c.push({ t: 'tog', x, y, w, label, off });
  const lbl = (x, y, text) => c.push({ t: 'lbl', x, y, text });
  let x, y;
  y = fy + 24; x = 12;
  tog(x, y, 34, 'FX', FX_ON); x += 40;
  val(x, y, 44, 'FEED', FX_FEED, 0, 100, 5, 'pct'); x += 54;
  lbl(x, y + 9, 'SEND'); x += 40;
  val(x, y, 40, 'DRM', SEND_A, 0, 100, 5, 'pct'); x += 44;
  val(x, y, 40, 'BAS', SEND_A + 1, 0, 100, 5, 'pct'); x += 44;
  val(x, y, 40, 'MEL', SEND_A + 2, 0, 100, 5, 'pct'); x += 44;
  val(x, y, 40, 'CHD', SEND_A + 3, 0, 100, 5, 'pct'); x += 54;
  lbl(x, y + 9, 'GLASS CYC'); x += 72;
  val(x, y, 38, 'BAS', GLC_A, 0, 100, 5, 'pct'); x += 42;
  val(x, y, 38, 'MEL', GLC_A + 1, 0, 100, 5, 'pct'); x += 42;
  val(x, y, 38, 'CHD', GLC_A + 2, 0, 100, 5, 'pct');
  y = fy + 60; x = 12;
  lbl(x, y + 9, 'DELAY'); x += 52;
  tog(x, y, 34, '', DLY_ON); x += 40;
  val(x, y, 46, 'TIME', DLY_TIME, 0.0625, 2, 0.0625, 'beats'); x += 50;
  val(x, y, 40, 'FB', DLY_FB, 0, 100, 5, 'pct'); x += 44;
  val(x, y, 40, 'PIT', DLY_PITCH, -24, 24, 1, 'st'); x += 44;
  tog(x, y, 42, 'REV', DLY_REV); x += 48;
  val(x, y, 42, 'TONE', DLY_TONE, 0, 100, 5, 'pct'); x += 46;
  val(x, y, 42, 'WOW', DLY_WOW, 0, 100, 5, 'pct');
  y = fy + 96; x = 12;
  lbl(x, y + 9, 'GLITCH'); x += 52;
  tog(x, y, 34, '', AVO_ON); x += 40;
  val(x, y, 44, 'AMT', AVO_AMT, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 46, 'RATE', AVO_RATE, 0.0625, 2, 0.0625, 'beats'); x += 50;
  val(x, y, 44, 'CRSH', AVO_CRUSH, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 42, 'MIX', AVO_MIX, 0, 100, 5, 'pct');
  y = fy + 132; x = 12;
  lbl(x, y + 9, 'CLOUDS'); x += 52;
  tog(x, y, 34, '', CLD_ON); x += 40;
  val(x, y, 44, 'SIZE', CLD_SIZE, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 44, 'DENS', CLD_DENS, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 40, 'PIT', CLD_PITCH, -24, 24, 1, 'st'); x += 44;
  tog(x, y, 48, 'REVG', CLD_REVG); x += 52;
  val(x, y, 44, 'SPRD', CLD_SPREAD, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 44, 'TAIL', CLD_REVERB, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 42, 'MIX', CLD_MIX, 0, 100, 5, 'pct');
  return c;
}

// drum lane fields: label, jsfx param index ('smp' = sample picker)
const DFIELDS = [
  ['SMP', 'smp'], ['ST', 2], ['SPAN', 3], ['PULS', 4], ['ROT', 5], ['VEL', 6],
  ['GATE', 7], ['PIT', 8], ['LPF', 9], ['FEV', 10], ['LRT', 11], ['LDP', 12],
  ['LSH', 13], ['LPT', 14], ['SWG', 15], ['NDG', 16], ['VHM', 17],
];
const S1FIELDS = ['BASE', 'SCAL', 'ST', 'SPAN', 'PULS', 'ROT', 'VEL', 'GATE', 'ATT', 'DEC'];
const S2FIELDS = ['CUT', 'RES', 'ENV', 'WAV', 'RATE', 'DEP', 'SHP', 'EMD', 'GLD',
  'SWG', 'NDG', 'FEL', 'PRG', 'SPD'];

// ---- canvas ----
const canvas = document.getElementById('gnome');
const ctx = canvas.getContext('2d');
let curH = 0;
function sizeCanvas() {
  const h = totalH();
  if (h === curH) return;
  curH = h;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = h * dpr;
  canvas.style.aspectRatio = `${W} / ${h}`;
}

let statusText = '', haveStatus = false;
function setStatus(s) { statusText = s; haveStatus = true; }

// ---- interaction state (port of the JSFX drag machinery) ----
let dragMode = 0, dragF = 0, dragLane = 0, dragSynth = 0, dragY = 0, dragV = 0,
  dragMoved = false, rotApplied = 0, paint = 0, dragKnob = 0, dragFx = null;
const FEL_MULT = [1, 2 / 3, 1.5];

function canvasXY(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (W / r.width)];
}

function inRect(x, y, r) { return x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]; }

function onDown(x, y, right) {
  if (!audioReady) { initAudio(); return; }
  if (right || altMode) { onRClick(x, y); return; }
  dragMode = 0; dragMoved = false; rotApplied = 0;

  // header
  if (y < 28) {
    if (inRect(x, y, PLAY_R)) { togglePlay(); return; }
    if (inRect(x, y, BPM_R)) { dragMode = 21; dragY = y; dragV = bpm; return; }
    if (inRect(x, y, INIT_R)) {
      resetAll();
      setStatus('fresh gnome: starter groove restored');
      return;
    }
    if (inRect(x, y, ALT_R)) {
      altMode = !altMode;
      setStatus(altMode ? 'ALT on: taps act as right-clicks (2nd-cycle notes / erase)'
                        : 'ALT off');
      return;
    }
    if (inRect(x, y, REC_R)) {
      recording ? stopRecording() : startRecording();
      setStatus(recording ? 'recording the output to a WAV…' : 'recording stopped — hit SAVE');
      return;
    }
    if (lastRec && inRect(x, y, SAVE_R)) { saveLastRecording(); return; }
    for (let i = 0; i < KNOBS.length; i++) {
      if (x >= knobX(i) && x < knobX(i) + 44) {
        dragMode = 20; dragKnob = i; dragY = y; dragV = vols[KNOBS[i].id];
        return;
      }
    }
    return;
  }

  // FX box at the bottom
  if (y >= fxY() && y < fxY() + fxH) {
    for (const cell of fxCells()) {
      if (cell.t === 'lbl') continue;
      if (x >= cell.x && x < cell.x + cell.w && y >= cell.y && y < cell.y + 30) {
        if (cell.t === 'tog') { dragMode = 31; dragFx = cell; dragY = y; }
        else { dragMode = 30; dragFx = cell; dragY = y; dragV = m[cell.off]; }
        return;
      }
    }
    return;
  }

  // lane buttons + KEY row
  const yb = yBtn();
  if (y >= yb && y < yb + 18) {
    if (x >= 8 && x < 60) { numLanes = Math.min(LANES_CAP, numLanes + 1); touchState(); }
    else if (x >= 64 && x < 116) { numLanes = Math.max(1, numLanes - 1); touchState(); }
    else if (x >= kxKey && x < kxKey + 44) { dragMode = 14; dragY = y; dragV = m[GKEY_NOTE]; }
    else if (x >= kxScl && x < kxScl + 44) { dragMode = 15; dragY = y; dragV = m[GKEY_SCALE]; }
    else if (x >= kxPrg && x < kxPrg + 42) { dragMode = 16; dragY = y; dragV = m[GKEY_PROG]; }
    else if (x >= kxSpd && x < kxSpd + 36) { dragMode = 17; dragY = y; dragV = m[GKEY_SPD]; }
    else if (x >= STYLE_X && x < STYLE_X + STYLE_W) {
      setStyle((m[GEN_STYLE] || 0) + 1);
      setStatus(`GEN style: ${STYLE_NAMES[m[GEN_STYLE]]}${STYLE_SCALE[m[GEN_STYLE]] >= 0 ? ' — scale set to ' + SCALE_NAMES[m[GKEY_SCALE]] + '; hit RND on a part' : ''}`);
      touchState();
    }
    else {
      for (let i = 0; i < NSYN; i++) {
        const gpx = [kxB, kxM, kxC][i];
        if (x >= gpx && x < gpx + 18) {
          m[LOCK_A + i] = m[LOCK_A + i] ? 0 : 1;
          setStatus(`${SYN_NAMES[i]}: ${m[LOCK_A + i] ? 'LOCKED to master key' : 'independent (own BASE/SCAL/PRG/SPD)'}`);
          touchState();
        } else if (x >= gpx + 20 && x < gpx + 44) {
          m[HML_A + i] = (m[HML_A + i] + 1) % 3;
          setStatus(`${SYN_NAMES[i]} harmony speed: ${['half-time', 'x1', 'double-time'][m[HML_A + i]]}`);
          touchState();
        }
      }
    }
    return;
  }

  // synth sections
  for (let gsi = 0; gsi < NSYN; gsi++) {
    const ysv = ys(gsi);
    if (y >= ysv && y < ysv + rowh) {
      if (x >= xFields && x < xFields + 10 * fieldw) {
        dragF = Math.floor((x - xFields) / fieldw);
        dragY = y; dragSynth = gsi; dragV = sget(gsi, dragF);
        dragMode = dragF === 5 ? 9 : 5;
      } else if (x >= xMute && x < xMute + 18) {
        sset(gsi, 11, sget(gsi, 11) ? 0 : 1); touchState();
      } else if (x >= xEuc && x < xEuc + 32) {
        synGenerate(gsi);
        setStatus(`${SYN_NAMES[gsi]}: E(${sget(gsi, 4)},${sget(gsi, 2)}) ` +
          (gsi === 0 ? 'random walk' : gsi === 1 ? 'per-bar variations, sweeping arc' : 'roots by 4ths/5ths') +
          ` in ${SCALE_NAMES[effScale(gsi)]}`);
        touchState();
      } else if (x >= xMode && x < xMode + 26) {
        sset(gsi, 15, sget(gsi, 15) ? 0 : 1);
        setStatus(`${SYN_NAMES[gsi]}: ${sget(gsi, 15) ? 'PM polymeter - fixed SPAN/16 steps, drifts' : 'PR polyrhythm - ST fills SPAN, synced'}`);
        touchState();
      }
      return;
    }
    if (y >= ysv + rowh && y < ysv + 2 * rowh) {
      if (x >= xFields && x < xFields + 14 * fieldw) {
        dragF = Math.floor((x - xFields) / fieldw);
        dragY = y; dragSynth = gsi; dragV = sget(gsi, r2map(dragF));
        dragMode = 10;
      } else if (x >= xEuc && x < xEuc + 32) {
        m[ENG_A + gsi] = (m[ENG_A + gsi] + 1) % 3;
        setStatus(`${SYN_NAMES[gsi]} engine: ${['classic oscillator', 'plucked string (RES=sustain, 100=infinite)', 'blown glass (GCY on the FX panel cycles harmonics)'][m[ENG_A + gsi]]}`);
        touchState();
      } else if (gsi === 2 && x >= xMode && x < xMode + 26) {
        sset(2, 24, sget(2, 24) ? 0 : 1);
        setStatus(`chords: ${sget(2, 24) ? 'sevenths' : 'triads'}`);
        touchState();
      }
      return;
    }
    if (y >= ysv + 2 * rowh && y < ysv + 2 * rowh + NROWS * rollrh && x >= xGrid) {
      const mcol = Math.floor((x - xGrid) / cellw);
      const mrow = NROWS - 1 - Math.floor((y - (ysv + 2 * rowh)) / rollrh);
      const ron = ronOff(gsi), rdg = rdgOff(gsi);
      if (mcol >= 0 && mcol < sget(gsi, 2)) {
        if (m[ron + mcol] && m[rdg + mcol] === mrow) {
          m[ron + mcol] = 0;
          dragMode = 7;
        } else {
          m[ron + mcol] = 1;
          m[rdg + mcol] = mrow;
          dragMode = 6;
        }
        dragSynth = gsi;
        touchState();
      }
      return;
    }
  }

  // drum lanes
  const ml = Math.floor((y - laneTop) / rowh);
  if (ml >= 0 && ml < numLanes && y >= laneTop) {
    if (x >= xFields && x < xFields + 17 * fieldw) {
      const uiF = Math.floor((x - xFields) / fieldw);
      dragF = DFIELDS[uiF][1];
      dragLane = ml; dragY = y;
      dragV = dragF === 'smp' ? 0 : getParam(ml, dragF);
      dragMode = dragF === 5 ? 8 : 1;
    } else if (x >= xMute && x < xMute + 18) {
      m[MUTE_A + ml] = m[MUTE_A + ml] ? 0 : 1; touchState();
    } else if (x >= xEuc && x < xEuc + 32) {
      setStatus(`lane ${ml + 1}:  ${dealEuclid(ml)}`);
      touchState();
    } else if (x >= xMode && x < xMode + 26) {
      m[LMODE_A + ml] = m[LMODE_A + ml] ? 0 : 1;
      setStatus(`lane ${ml + 1}: ${m[LMODE_A + ml] ? 'PM polymeter - fixed SPAN/16 steps, drifts' : 'PR polyrhythm - ST fills SPAN, synced'}`);
      touchState();
    } else if (x >= xGrid) {
      const mi = Math.floor((x - xGrid) / cellw);
      if (mi >= 0 && mi < m[STEPS_A + ml]) {
        paint = m[PAT + ml * MAX_STEPS + mi] ? 0 : 1;
        m[PAT + ml * MAX_STEPS + mi] = paint;
        dragMode = 2;
        dragLane = ml;
        touchState();
      }
    }
  }
}

function onRClick(x, y) {
  // rolls: cycle normal -> orange every-2nd-cycle -> off; empty = erase drag
  for (let gsi = 0; gsi < NSYN; gsi++) {
    const ysv = ys(gsi);
    if (y >= ysv + 2 * rowh && y < ysv + 2 * rowh + NROWS * rollrh && x >= xGrid) {
      const mcol = Math.floor((x - xGrid) / cellw);
      const mrow = NROWS - 1 - Math.floor((y - (ysv + 2 * rowh)) / rollrh);
      const ron = ronOff(gsi), rdg = rdgOff(gsi);
      if (mcol >= 0 && mcol < sget(gsi, 2)) {
        if (m[ron + mcol] && m[rdg + mcol] === mrow) {
          m[ron + mcol] = m[ron + mcol] === 1 ? 2 : 0;
        } else {
          m[ron + mcol] = 0;
          dragMode = 7;
          dragSynth = gsi;
        }
        touchState();
      }
      return;
    }
  }
  const ml = Math.floor((y - laneTop) / rowh);
  if (ml >= 0 && ml < numLanes && y >= laneTop && x >= xGrid) {
    const mi = Math.floor((x - xGrid) / cellw);
    const p = PAT + ml * MAX_STEPS + mi;
    if (mi >= 0 && mi < m[STEPS_A + ml] && m[p]) {
      m[p] = m[p] === 1 ? 2 : 0;
      touchState();
    }
  }
}

function onMove(x, y) {
  if (!dragMode) return;
  if (Math.abs(y - dragY) >= 4) dragMoved = true;
  const d = Math.floor((dragY - y) / 4);
  if (dragMode === 1) {
    if (dragF !== 'smp') {
      setParam(dragLane, dragF, dragV + ((dragF === 3 || dragF === 11) ? d * 0.25 : d));
      if (dragF === 4) applyEuclid(dragLane);
    }
  } else if (dragMode === 5) {
    sset(dragSynth, dragF, dragV +
      (dragF === 3 ? d * 0.25 : dragF === 8 ? d * 2 : dragF === 9 ? d * 10 : d));
    if (dragF === 4) applySynEuclid(dragSynth);
  } else if (dragMode === 10) {
    sset(dragSynth, r2map(dragF), dragV +
      ((dragF === 4 || dragF === 13) ? d * 0.25 : dragF === 8 ? d * 10 : d));
  } else if (dragMode === 8) {
    if (d !== rotApplied) {
      rotatePat(dragLane, d - rotApplied);
      const st = Math.max(1, m[STEPS_A + dragLane]);
      m[ROT_A + dragLane] = ((m[ROT_A + dragLane] + d - rotApplied) % st + st) % st;
      rotApplied = d;
    }
  } else if (dragMode === 9) {
    if (d !== rotApplied) {
      rotateSyn(dragSynth, d - rotApplied);
      const st = Math.max(1, sget(dragSynth, 2));
      sset(dragSynth, 5, ((sget(dragSynth, 5) + d - rotApplied) % st + st) % st);
      rotApplied = d;
    }
  } else if (dragMode === 14) {
    m[GKEY_NOTE] = Math.max(12, Math.min(108, dragV + d));
  } else if (dragMode === 15) {
    m[GKEY_SCALE] = Math.max(0, Math.min(NSCALES - 1, dragV + d));
  } else if (dragMode === 16) {
    m[GKEY_PROG] = Math.max(0, Math.min(NPROGS - 1, dragV + d));
  } else if (dragMode === 17) {
    m[GKEY_SPD] = Math.max(0.25, Math.min(32, dragV + d * 0.25));
  } else if (dragMode === 2) {
    const mi = Math.floor((x - xGrid) / cellw);
    if (mi >= 0 && mi < m[STEPS_A + dragLane]) m[PAT + dragLane * MAX_STEPS + mi] = paint;
  } else if (dragMode === 6) {
    const ysv = ys(dragSynth);
    const mcol = Math.floor((x - xGrid) / cellw);
    const mrow = NROWS - 1 - Math.floor((y - (ysv + 2 * rowh)) / rollrh);
    if (mcol >= 0 && mcol < sget(dragSynth, 2) && mrow >= 0 && mrow < NROWS) {
      m[ronOff(dragSynth) + mcol] = 1;
      m[rdgOff(dragSynth) + mcol] = mrow;
    }
  } else if (dragMode === 7) {
    const mcol = Math.floor((x - xGrid) / cellw);
    if (mcol >= 0 && mcol < sget(dragSynth, 2)) m[ronOff(dragSynth) + mcol] = 0;
  } else if (dragMode === 30) {
    const c = dragFx;
    let nv = dragV + d * c.step;
    nv = Math.round(nv / c.step) * c.step;
    m[c.off] = Math.max(c.min, Math.min(c.max, nv));
  } else if (dragMode === 20) {
    vols[KNOBS[dragKnob].id] = Math.max(0, Math.min(100, dragV + Math.floor((dragY - y) / 2)));
    pushGains();
    saveLater();
    return;
  } else if (dragMode === 21) {
    bpm = Math.max(30, Math.min(260, dragV + d));
    pushTransport();
    saveLater();
    return;
  }
  touchState();
}
function saveLater() { clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 400); }

function onUp() {
  if (dragMode && !dragMoved) {
    // taps on cycling fields (port of the JSFX release block)
    if (dragMode === 31) {
      m[dragFx.off] = m[dragFx.off] ? 0 : 1;
    } else if (dragMode === 8) {
      rotatePat(dragLane, 1);
      const st = Math.max(1, m[STEPS_A + dragLane]);
      m[ROT_A + dragLane] = (m[ROT_A + dragLane] + 1) % st;
    } else if (dragMode === 9) {
      const st = Math.max(1, sget(dragSynth, 2));
      rotateSyn(dragSynth, 1);
      sset(dragSynth, 5, (sget(dragSynth, 5) + 1) % st);
    } else if (dragMode === 1 && dragF === 'smp') {
      smpA[dragLane] = (smpA[dragLane] + 1) % SAMPLE_DEFS.length;
      pushSample(dragLane);
      setStatus(`lane ${dragLane + 1} sample: ${SAMPLE_DEFS[smpA[dragLane]].label}`);
    } else if (dragMode === 1 && dragF === 13) {
      m[LSHAPE_A + dragLane] = (m[LSHAPE_A + dragLane] + 1) % 4;
      setStatus(`lane ${dragLane + 1} LFO shape: ${SHAPE_NAMES[m[LSHAPE_A + dragLane]]}`);
    } else if (dragMode === 5 && dragF === 1) {
      sset(dragSynth, 1, sget(dragSynth, 1) + 1);
      setStatus(`${SYN_NAMES[dragSynth]} scale: ${SCALE_NAMES[sget(dragSynth, 1)]}` +
        (m[LOCK_A + dragSynth] ? '  (locked to master key - unlock to use)' : ''));
    } else if (dragMode === 10 && dragF === 6) {
      sset(dragSynth, 18, (sget(dragSynth, 18) + 1) % 4);
      setStatus(`${SYN_NAMES[dragSynth]} LFO shape: ${SHAPE_NAMES[sget(dragSynth, 18)]}`);
    } else if (dragMode === 10 && dragF === 7) {
      sset(dragSynth, 20, (sget(dragSynth, 20) + 1) % 3);
      setStatus(`${SYN_NAMES[dragSynth]} envelope: ` +
        ['AD pluck', 'HOLD - sustains for GATE, then decays', 'LATCH - drones until the next note'][sget(dragSynth, 20)]);
    } else if (dragMode === 10 && dragF === 11) {
      sset(dragSynth, 27, (sget(dragSynth, 27) + 1) % 3);
      setStatus(`${SYN_NAMES[dragSynth]} feel: ${FEEL_NAMES[sget(dragSynth, 27)]}`);
    } else if (dragMode === 10 && dragF === 12) {
      sset(dragSynth, 22, (sget(dragSynth, 22) + 1) % NPROGS);
      setStatus(`${SYN_NAMES[dragSynth]} own harmony: ${PROG_NAMES[sget(dragSynth, 22)]}` +
        (m[LOCK_A + dragSynth] ? '  (locked to master - unlock to use)' : ''));
    } else if (dragMode === 15) {
      m[GKEY_SCALE] = (m[GKEY_SCALE] + 1) % NSCALES;
      setStatus(`master scale: ${SCALE_NAMES[m[GKEY_SCALE]]}`);
    } else if (dragMode === 16) {
      m[GKEY_PROG] = (m[GKEY_PROG] + 1) % NPROGS;
      setStatus(`master harmony: ${PROG_NAMES[m[GKEY_PROG]]}`);
    }
    touchState();
  }
  dragMode = 0;
}

// pointer events cover mouse and touch; ALT button stands in for right-click
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  const [x, y] = canvasXY(e);
  onDown(x, y, e.button === 2);
});
canvas.addEventListener('pointermove', e => {
  if (e.buttons === 0) return;
  const [x, y] = canvasXY(e);
  onMove(x, y);
});
canvas.addEventListener('pointerup', () => onUp());
canvas.addEventListener('pointercancel', () => { dragMode = 0; });

// ---- drawing (port of the JSFX draw pass) ----
function set(r, g, b) {
  ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}
function rect(x, y, w, h) { ctx.fillRect(x, y, w, h); }
function text(s, x, y, font) {
  ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(s, x, y);
}
function textC(s, x1, x2, y, font) {
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(s, (x1 + x2) / 2, y);
}
function circle(x, y, r, fill) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
  if (fill) ctx.fill(); else { ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); }
}
const F10 = '10px Arial', F11 = '11px Arial', F12 = '12px Arial',
  F13 = '13px Arial', F15 = 'bold 15px Arial';

function fmtG(v) { return String(Math.round(v * 100) / 100); }

function draw() {
  sizeCanvas();
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const H = totalH();

  set(0.13, 0.13, 0.14); rect(0, 0, W, H);

  // ---- header: title, transport, knobs ----
  set(0.85, 0.85, 0.9); text('SUPERGNOME', 8, 8, F15);

  playing ? set(0.3, 0.55, 0.35) : set(0.24, 0.3, 0.26);
  rect(...PLAY_R);
  set(0.9, 0.95, 0.9);
  textC(playing ? '■ STOP' : '▶ PLAY', PLAY_R[0], PLAY_R[0] + PLAY_R[2], 9, F11);

  set(0.24, 0.26, 0.3); rect(...BPM_R);
  set(0.85, 0.85, 0.9);
  textC(bpm + ' bpm', BPM_R[0], BPM_R[0] + BPM_R[2], 9, F11);

  set(0.3, 0.24, 0.24); rect(...INIT_R);
  set(0.9, 0.8, 0.8); textC('INIT', INIT_R[0], INIT_R[0] + INIT_R[2], 9, F11);

  altMode ? set(0.55, 0.3, 0.4) : set(0.24, 0.26, 0.3);
  rect(...ALT_R);
  set(0.9, 0.85, 0.9); textC('ALT', ALT_R[0], ALT_R[0] + ALT_R[2], 9, F11);

  const recS = recFrames / (recSampleRate || 44100);
  recording ? set(0.62, 0.2, 0.26) : set(0.3, 0.24, 0.24);
  rect(...REC_R);
  set(0.95, 0.85, 0.85);
  textC(recording ? '■ ' + Math.floor(recS / 60) + ':' +
    String(Math.floor(recS % 60)).padStart(2, '0') : '● REC',
    REC_R[0], REC_R[0] + REC_R[2], 9, F11);
  if (lastRec) {
    set(0.24, 0.4, 0.3); rect(...SAVE_R);
    set(0.85, 0.95, 0.88); textC('SAVE', SAVE_R[0], SAVE_R[0] + SAVE_R[2], 9, F11);
  }

  for (let i = 0; i < KNOBS.length; i++) {
    const kx = knobX(i) + 22, ky = 13, v = vols[KNOBS[i].id] / 100;
    set(0.22, 0.22, 0.25); circle(kx, ky, 10, true);
    ctx.strokeStyle = 'rgb(140,200,210)'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(kx, ky, 9, 0.75 * Math.PI, 0.75 * Math.PI + 1.5 * Math.PI * v);
    ctx.stroke();
    ctx.lineWidth = 1;
    set(0.5, 0.55, 0.58);
    textC(KNOBS[i].label, kx - 22, kx + 22, 24, '8px Arial');
  }

  // ---- drum lanes ----
  for (let gl = 0; gl < numLanes; gl++) {
    const ry = laneTop + gl * rowh;
    const gsd = m[LMODE_A + gl] ? m[SPAN_A + gl] / 16 : m[SPAN_A + gl] / m[STEPS_A + gl];
    const steps = m[STEPS_A + gl];
    const playstep = playing ? ((Math.floor(dispBeat / gsd) % steps) + steps) % steps : -1;

    if (decoded[smpA[gl]]) { set(0.35, 0.8, 0.4); rect(2, ry + 4, 4, 32); }

    for (let gf = 0; gf < 17; gf++) {
      const fx = xFields + gf * fieldw;
      set(0.19, 0.19, 0.21); rect(fx, ry + 4, fieldw - 4, 32);
      set(0.45, 0.45, 0.5);
      textC(DFIELDS[gf][0], fx, fx + fieldw - 4, ry + 5, F10);
      set(0.85, 0.85, 0.85);
      const f = DFIELDS[gf][1];
      let v;
      if (f === 'smp') v = SAMPLE_DEFS[smpA[gl]].label;
      else if (f === 3) v = fmtG(m[SPAN_A + gl]);
      else if (f === 7) v = m[GATE_A + gl] + '%';
      else if (f === 9) v = m[LPF_A + gl] >= 100 ? '---' : String(m[LPF_A + gl]);
      else if (f === 11) v = fmtG(m[LRATE_A + gl]);
      else if (f === 13) v = ['SIN', 'TRI', 'SAW', 'S&H'][m[LSHAPE_A + gl]];
      else v = String(getParam(gl, f));
      textC(v, fx, fx + fieldw - 4, ry + 18, F13);
    }

    m[MUTE_A + gl] ? set(0.75, 0.25, 0.25) : set(0.25, 0.25, 0.28);
    rect(xMute, ry + 4, 18, 32);
    set(0.9, 0.9, 0.9); textC('M', xMute, xMute + 18, ry + 12, F12);

    set(0.22, 0.3, 0.24); rect(xEuc, ry + 4, 32, 32);
    set(0.7, 0.9, 0.7); textC('EUC', xEuc, xEuc + 32, ry + 12, F12);

    m[LMODE_A + gl] ? set(0.42, 0.28, 0.5) : set(0.22, 0.28, 0.38);
    rect(xMode, ry + 4, 26, 32);
    set(0.85, 0.85, 0.9); textC(m[LMODE_A + gl] ? 'PM' : 'PR', xMode, xMode + 26, ry + 12, F12);

    const spbi = 1 / gsd;
    const beatTick = (Math.abs(spbi - Math.floor(spbi + 0.5)) < 1e-6 && spbi >= 1)
      ? Math.floor(spbi + 0.5) : 0;
    for (let gi = 0; gi < steps; gi++) {
      const cx = xGrid + gi * cellw;
      const on = m[PAT + gl * MAX_STEPS + gi];
      if (gi === playstep) {
        on === 2 ? set(1, 0.55, 0.6) : on ? set(1, 0.85, 0.4) : set(0.38, 0.38, 0.42);
      } else {
        if (on === 2) m[MUTE_A + gl] ? set(0.5, 0.28, 0.32) : set(0.85, 0.32, 0.45);
        else if (on) m[MUTE_A + gl] ? set(0.45, 0.4, 0.3) : set(0.85, 0.6, 0.2);
        else set(0.22, 0.22, 0.25);
      }
      rect(cx + 1, ry + 4, cellw - 2, cellh);
      if (beatTick && gi % beatTick === 0) {
        set(0.6, 0.6, 0.65); rect(cx, ry + 2, 1, cellh + 4);
      }
    }
  }

  // ---- lane buttons + KEY row ----
  const yb = yBtn();
  set(0.24, 0.26, 0.3); rect(8, yb, 52, 18); rect(64, yb, 52, 18);
  set(0.8, 0.8, 0.85);
  textC('+ LANE', 8, 60, yb + 3, F11);
  textC('- LANE', 64, 116, yb + 3, F11);

  set(0.7, 0.7, 0.5); text('KEY', 124, yb + 4, F11);
  set(0.3, 0.28, 0.2); rect(kxKey, yb, 44, 18); rect(kxScl, yb, 44, 18);
  m[GKEY_PROG] > 0 ? set(0.32, 0.28, 0.36) : set(0.22, 0.22, 0.25);
  rect(kxPrg, yb, 42, 18);
  set(0.24, 0.22, 0.28); rect(kxSpd, yb, 36, 18);
  set(0.95, 0.9, 0.7);
  textC(noteName(m[GKEY_NOTE]), kxKey, kxKey + 44, yb + 3, F12);
  textC('S' + (m[GKEY_SCALE] + 1), kxScl, kxScl + 44, yb + 3, F12);
  textC(m[GKEY_PROG] > 0 ? 'P' + m[GKEY_PROG] : 'off', kxPrg, kxPrg + 42, yb + 3, F12);
  textC(fmtG(m[GKEY_SPD]), kxSpd, kxSpd + 36, yb + 3, F12);

  for (let i = 0; i < NSYN; i++) {
    const gpx = [kxB, kxM, kxC][i];
    m[LOCK_A + i] ? set(0.3, 0.5, 0.32) : set(0.25, 0.25, 0.28);
    rect(gpx, yb, 18, 18);
    set(0.9, 0.9, 0.9); textC('BMC'[i], gpx, gpx + 18, yb + 3, F12);
    set(0.22, 0.24, 0.26); rect(gpx + 20, yb, 24, 18);
    set(0.7, 0.7, 0.75);
    textC(['1/2', 'x1', 'x2'][m[HML_A + i]], gpx + 20, gpx + 44, yb + 3, F11);
  }
  set(0.55, 0.55, 0.45);
  text(`${SCALE_NAMES[m[GKEY_SCALE]]} / ${PROG_NAMES[m[GKEY_PROG]]}  |  B M C lock sections; box = harmony speed`,
    500, yb + 4, F11);

  // GEN style button (RND on each synth generates in this style)
  const stName = STYLE_NAMES[m[GEN_STYLE] || 0];
  m[GEN_STYLE] > 0 ? set(0.32, 0.3, 0.42) : set(0.24, 0.24, 0.28);
  rect(STYLE_X, yb, STYLE_W, 18);
  set(0.85, 0.85, 0.95);
  textC('GEN: ' + stName, STYLE_X, STYLE_X + STYLE_W, yb + 3, F11);

  // ---- synth sections ----
  for (let gsi = 0; gsi < NSYN; gsi++) {
    const ysv = ys(gsi);
    const sp = spOff(gsi), ron = ronOff(gsi), rdg = rdgOff(gsi);
    const glk = m[LOCK_A + gsi];

    set(0.3, 0.3, 0.34); rect(8, ysv - 14, W - 16, 1);
    set(0.65, 0.65, 0.7);
    text(['BASS', 'MELODY', 'CHORDS'][gsi], 8, ysv - 11, F11);
    if (glk) {
      set(0.5, 0.65, 0.5);
      text('[key-locked]', 60, ysv - 11, F11);
    }

    // row 1
    for (let gf = 0; gf < 10; gf++) {
      const fx = xFields + gf * fieldw;
      set(0.19, 0.21, 0.23); rect(fx, ysv + 4, fieldw - 4, 32);
      set(0.45, 0.5, 0.5); textC(S1FIELDS[gf], fx, fx + fieldw - 4, ysv + 5, F10);
      (glk && gf <= 1) ? set(0.55, 0.65, 0.55) : set(0.85, 0.85, 0.85);
      let v;
      if (gf === 0) v = noteName(glk ? effBase(gsi) : m[sp]);
      else if (gf === 1) v = String((glk ? effScale(gsi) : m[sp + 1]) + 1);
      else if (gf === 3) v = fmtG(m[sp + 3]);
      else if (gf === 7) v = m[sp + 7] + '%';
      else v = String(m[sp + gf]);
      textC(v, fx, fx + fieldw - 4, ysv + 18, F13);
    }

    m[sp + 11] ? set(0.75, 0.25, 0.25) : set(0.25, 0.25, 0.28);
    rect(xMute, ysv + 4, 18, 32);
    set(0.9, 0.9, 0.9); textC('M', xMute, xMute + 18, ysv + 12, F12);

    set(0.3, 0.24, 0.34); rect(xEuc, ysv + 4, 32, 32);
    set(0.9, 0.75, 0.95); textC('RND', xEuc, xEuc + 32, ysv + 12, F12);

    m[sp + 15] ? set(0.42, 0.28, 0.5) : set(0.22, 0.28, 0.38);
    rect(xMode, ysv + 4, 26, 32);
    set(0.85, 0.85, 0.9); textC(m[sp + 15] ? 'PM' : 'PR', xMode, xMode + 26, ysv + 12, F12);

    // row 2 (14 fields; SYN/MID toggle gone - always the internal synth)
    for (let gf = 0; gf < 14; gf++) {
      const fx = xFields + gf * fieldw;
      set(0.21, 0.19, 0.23); rect(fx, ysv + rowh + 4, fieldw - 4, 32);
      set(0.5, 0.45, 0.5); textC(S2FIELDS[gf], fx, fx + fieldw - 4, ysv + rowh + 5, F10);
      (glk && gf >= 12) ? set(0.5, 0.5, 0.55) : set(0.85, 0.85, 0.85);
      let v;
      if (gf === 0) v = m[sp + 12] >= 100 ? '---' : String(m[sp + 12]);
      else if (gf === 3) v = m[sp + 19] <= 0 ? 'SIN' : m[sp + 19] >= 100 ? 'SAW' :
        m[sp + 19] === 50 ? 'TRI' : String(m[sp + 19]);
      else if (gf === 4) v = fmtG(m[sp + 16]);
      else if (gf === 6) v = ['SIN', 'TRI', 'SAW', 'S&H'][m[sp + 18]];
      else if (gf === 7) v = ['AD', 'HLD', 'LAT'][m[sp + 20]];
      else if (gf === 11) v = ['STR', 'TRP', 'DOT'][m[SFL_A + gsi]];
      else if (gf === 12) v = m[sp + 22] > 0 ? 'P' + m[sp + 22] : 'off';
      else if (gf === 13) v = fmtG(m[sp + 23]);
      else v = String(sget(gsi, r2map(gf)));
      textC(v, fx, fx + fieldw - 4, ysv + rowh + 18, F13);
    }

    // ENG: per-synth engine selector (in the freed SYN/MID slot)
    const eng = m[ENG_A + gsi];
    eng === 1 ? set(0.28, 0.4, 0.5) : eng === 2 ? set(0.46, 0.4, 0.28) : set(0.28, 0.3, 0.34);
    rect(xEuc, ysv + rowh + 4, 32, 32);
    set(0.9, 0.92, 0.95);
    textC(['OSC', 'STR', 'GLS'][eng], xEuc, xEuc + 32, ysv + rowh + 12, F12);

    if (gsi === 2) {
      m[sp + 24] ? set(0.4, 0.32, 0.24) : set(0.24, 0.24, 0.27);
      rect(xMode, ysv + rowh + 4, 26, 32);
      set(0.9, 0.85, 0.75);
      textC(m[sp + 24] ? '7TH' : '3RD', xMode, xMode + 26, ysv + rowh + 12, F12);
    }

    // info panel: chords get the pitch wheel, others get text
    if (gsi === 2) {
      const wcx = 64, wcy = ysv + 2 * rowh + 48, wr = 42;
      set(0.3, 0.3, 0.34); circle(wcx, wcy, wr, false);
      const gcnt = Math.max(1, SCL[effScale(2)][0]);
      for (let gd = 0; gd < gcnt; gd++) {
        const wang = SCL[effScale(2)][1 + gd] / 1200 * 2 * Math.PI - Math.PI / 2;
        set(0.45, 0.45, 0.5);
        circle(wcx + Math.cos(wang) * wr, wcy + Math.sin(wang) * wr, 2, true);
      }
      if (gsndB >= 0) {
        const wang = gsndB / 1200 * 2 * Math.PI - Math.PI / 2;
        set(0.85, 0.6, 0.2);
        circle(wcx + Math.cos(wang) * (wr - 8), wcy + Math.sin(wang) * (wr - 8), 4, true);
      }
      if (gsndM >= 0) {
        const wang = gsndM / 1200 * 2 * Math.PI - Math.PI / 2;
        set(0.25, 0.75, 0.7);
        circle(wcx + Math.cos(wang) * (wr - 16), wcy + Math.sin(wang) * (wr - 16), 4, true);
      }
      for (let gd = 0; gd < gsndCn; gd++) {
        const wang = gsndC[gd] / 1200 * 2 * Math.PI - Math.PI / 2;
        set(0.6, 0.45, 0.85);
        circle(wcx + Math.cos(wang) * (wr - 24), wcy + Math.sin(wang) * (wr - 24), 3, true);
      }
      set(0.45, 0.45, 0.5); text('pitch wheel', 118, ysv + 2 * rowh + 8, F10);
      set(0.85, 0.6, 0.2); text('bass', 118, ysv + 2 * rowh + 22, F10);
      set(0.25, 0.75, 0.7); text('melody', 146, ysv + 2 * rowh + 22, F10);
      set(0.6, 0.45, 0.85); text('chords', 186, ysv + 2 * rowh + 22, F10);
      set(0.45, 0.45, 0.5);
      text('roll = chord ROOT degree', 118, ysv + 2 * rowh + 40, F11);
      text('right-click / ALT-tap note:', 118, ysv + 2 * rowh + 54, F11);
      text('orange = every 2nd cycle', 118, ysv + 2 * rowh + 68, F11);
    } else {
      set(0.55, 0.6, 0.6);
      text(`scale: ${SCALE_NAMES[effScale(gsi)]}${glk ? ' (key)' : ''}`, 8, ysv + 2 * rowh + 4, F11);
      set(0.45, 0.45, 0.5);
      text('click place / re-click clear', 8, ysv + 2 * rowh + 20, F11);
      text('right-click / ALT-tap note:', 8, ysv + 2 * rowh + 36, F11);
      text('plays every 2nd cycle', 8, ysv + 2 * rowh + 52, F11);
      text('rows = degrees, bottom = BASE', 8, ysv + 2 * rowh + 68, F11);
    }

    // roll
    const gyr = ysv + 2 * rowh;
    const nst = m[sp + 2];
    const msd = (m[sp + 15] ? m[sp + 3] / 16 : m[sp + 3] / nst) * FEL_MULT[m[SFL_A + gsi]];
    const mplay = playing ? ((Math.floor(dispBeat / msd) % nst) + nst) % nst : -1;
    const mcnt = Math.max(1, SCL[effScale(gsi)][0]);
    const mspb = 1 / msd;
    const mbt = (Math.abs(mspb - Math.floor(mspb + 0.5)) < 1e-6 && mspb >= 1)
      ? Math.floor(mspb + 0.5) : 0;
    for (let gi = 0; gi < nst; gi++) {
      const cx = xGrid + gi * cellw;
      for (let gr = 0; gr < NROWS; gr++) {
        const cy = gyr + (NROWS - 1 - gr) * rollrh;
        if (m[ron + gi] && m[rdg + gi] === gr) {
          if (m[ron + gi] === 2) {
            gi === mplay ? set(1, 0.7, 0.3)
              : m[sp + 11] ? set(0.5, 0.38, 0.2) : set(0.9, 0.55, 0.15);
          } else {
            gi === mplay ? set(0.5, 1, 0.95)
              : m[sp + 11] ? set(0.25, 0.45, 0.42) : set(0.25, 0.75, 0.7);
          }
        } else {
          gi === mplay ? set(0.3, 0.32, 0.34)
            : (gr % mcnt === 0) ? set(0.2, 0.22, 0.24) : set(0.17, 0.18, 0.2);
        }
        rect(cx + 1, cy + 1, cellw - 2, rollrh - 2);
      }
      if (mbt && gi % mbt === 0) {
        set(0.6, 0.6, 0.65); rect(cx, gyr, 1, NROWS * rollrh);
      }
    }
  }

  // ---- FX box (demarcated panel at the bottom) ----
  const fy = fxY();
  const fxLit = m[FX_ON] > 0;
  fxLit ? set(0.16, 0.19, 0.2) : set(0.145, 0.145, 0.16);
  rect(8, fy, W - 16, fxH);
  set(0.3, 0.32, 0.36); rect(8, fy, W - 16, 1); rect(8, fy + fxH - 1, W - 16, 1);
  fxLit ? set(0.6, 0.85, 0.85) : set(0.5, 0.52, 0.56);
  text('FX RACK', 12, fy + 6, F12);
  set(0.4, 0.42, 0.46);
  text('a shared bus: SEND parts in or FEED the mix — delay · glitch · clouds', 78, fy + 7, F10);
  for (const cell of fxCells()) {
    if (cell.t === 'lbl') {
      set(0.5, 0.52, 0.56); text(cell.text, cell.x, cell.y, F10);
      continue;
    }
    if (cell.t === 'tog') {
      const on = m[cell.off] > 0;
      on ? set(0.28, 0.5, 0.4) : set(0.26, 0.26, 0.3);
      rect(cell.x, cell.y, cell.w, 30);
      set(0.9, 0.92, 0.9);
      textC(cell.label || (on ? 'ON' : 'off'), cell.x, cell.x + cell.w, cell.y + 8, F11);
      continue;
    }
    set(0.2, 0.21, 0.24); rect(cell.x, cell.y, cell.w, 30);
    set(0.45, 0.46, 0.5); textC(cell.label, cell.x, cell.x + cell.w, cell.y + 2, F10);
    set(fxLit ? 0.85 : 0.6, fxLit ? 0.85 : 0.6, fxLit ? 0.88 : 0.62);
    textC(fxFmt(cell.fmt, m[cell.off]), cell.x, cell.x + cell.w, cell.y + 15, F12);
  }

  // status / hint line (bottom)
  if (haveStatus) { set(0.7, 0.85, 0.7); text(statusText, 8, yStat(), F11); }
  else {
    set(0.45, 0.45, 0.5);
    text('drag fields · tap ENG to pick classic/string/glass · right-click notes for 2nd-cycle · the FX box is the effects rack + sends', 8, yStat(), F11);
  }

  // wake overlay until the first gesture creates the AudioContext
  if (!audioReady) {
    ctx.fillStyle = 'rgba(8,10,12,0.82)';
    rect(0, 0, W, H);
    ctx.fillStyle = 'rgb(160,225,235)';
    textC(audioStarting ? 'waking the gnome…' : 'tap to wake the gnome',
      0, W, H / 2 - 30, 'italic bold 26px Arial');
    ctx.fillStyle = 'rgb(100,130,140)';
    textC('a euclidean drum machine + three synths, phase-locked to beat 0',
      0, W, H / 2 + 8, '14px Arial');
  }

  requestAnimationFrame(draw);
}

// ---- boot: pick a layout ----
// pocket = the tabbed touch UI (gnome-mobile.js); desk = this canvas.
// Coarse pointers on narrow screens default to pocket; a footer link
// overrides via localStorage.
let layoutPref = null;
try { layoutPref = localStorage.getItem('gnome_layout'); } catch (e) { }
const usePocket = layoutPref
  ? layoutPref === 'pocket'
  : (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 920);

if (!loadState()) { initState(); seedGroove(); }
for (let si = 0; si < NSYN; si++) m[spOff(si) + 10] = 1; // internal synth, always
// desktop = the canvas (all on one page); pocket = the DOM tab layout.
if (usePocket) document.body.classList.add('pocket');
else requestAnimationFrame(draw);

// iOS Safari: a suspended context can need more than one gesture to unlock,
// and it re-suspends when the app is backgrounded. Nudge it back on any tap.
['pointerdown', 'touchend'].forEach(ev => document.addEventListener(ev, () => {
  if (actx && actx.state === 'suspended') actx.resume().catch(() => { });
}, { passive: true }));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && playing && actx && actx.state === 'suspended') actx.resume().catch(() => { });
});

// exposed for the pocket UI (gnome-mobile.js), the tests, and the console
window.gnome = {
  m, get numLanes() { return numLanes; },
  setNumLanes(v) { numLanes = Math.max(1, Math.min(LANES_CAP, v)); touchState(); },
  stateMsg: () => ({ type: 'state', mem: m, numLanes }),
  samplesMsg: () => smpA.map((s, lane) => decoded[s]
    ? { type: 'sample', lane, data: decoded[s].data, nch: decoded[s].nch, sr: decoded[s].sr, len: decoded[s].len }
    : { type: 'sample', lane, data: null }),
  initAudio, togglePlay,
  startRecording, stopRecording, toggleRecording, saveLastRecording,
  get recording() { return recording; },
  get recSeconds() { return recFrames / (recSampleRate || 44100); },
  get lastRecording() { return lastRec; },
  get playing() { return playing; }, get audioReady() { return audioReady; },
  get audioStarting() { return audioStarting; },
  get decoded() { return decoded; },
  get dispBeat() { return dispBeat; },
  get wheel() { return { b: gsndB, m: gsndM, c: gsndC, cn: gsndCn }; },

  // state + engine plumbing shared by both layouts
  usePocket,
  setLayout(mode) {
    try { localStorage.setItem('gnome_layout', mode); } catch (e) { }
    location.reload();
  },
  consts: {
    LANES_CAP, MAX_STEPS, NROWS, NSCALES, NPROGS, NSYN,
    PAT, STEPS_A, SPAN_A, PUL_A, ROT_A, VEL_A, GATE_A, MUTE_A, LMODE_A,
    PIT_A, LPF_A, FENV_A, LRATE_A, LDEP_A, LSHAPE_A, LPT_A, SWG_A, NDG_A,
    VHM_A, SSW_A, SND_A, SFL_A, GKEY_NOTE, GKEY_SCALE, GKEY_PROG, GKEY_SPD,
    LOCK_A, HML_A, ENG_A, FX_ON, DLY_ON, DLY_TIME, DLY_FB, DLY_TONE, DLY_WOW,
    FX_FEED, AVO_ON, AVO_AMT, AVO_RATE, AVO_CRUSH, AVO_MIX, SEND_A,
    DLY_PITCH, DLY_REV, GLC_A, CLD_ON, CLD_MIX, CLD_SIZE, CLD_DENS,
    CLD_PITCH, CLD_SPREAD, CLD_REVERB, CLD_REVG, GEN_STYLE,
  },
  tables: { SCALE_NAMES, PROG_NAMES, SHAPE_NAMES, SYN_NAMES, FEEL_NAMES, SCL, STYLE_NAMES },
  SAMPLE_DEFS,
  noteName, getParam, setParam, sget, sset, ronOff, rdgOff, effScale, effBase,
  applyEuclid, applySynEuclid, rotatePat, rotateSyn, synGenerate, dealEuclid, setStyle,
  resetAll, touchState, pushTransport, pushGains, pushSample,
  get smpA() { return smpA; },
  setSmp(lane, i) {
    smpA[lane] = ((i % SAMPLE_DEFS.length) + SAMPLE_DEFS.length) % SAMPLE_DEFS.length;
    pushSample(lane); saveLater();
  },
  get vols() { return vols; },
  setVol(id, v) { vols[id] = Math.max(0, Math.min(100, v)); pushGains(); saveLater(); },
  get bpm() { return bpm; },
  setBpm(v) { bpm = Math.max(30, Math.min(260, v)); pushTransport(); saveLater(); },
};
