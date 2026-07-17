// SuperGnome web — UI + state (main thread).
// Canvas port of the JSFX @gfx section. The musical state lives here in a
// flat Float64Array with the same layout as the JSFX serialized block; every
// edit ships the whole block to the worklet (gnome-worklet.js), which is the
// only reader during playback. MIDI-era fields (NOTE/CH, SYN/MID, stems) are
// gone; lanes pick from the bundled DR-55 kit and each part has a volume knob.

'use strict';

// bump on every release: cache-busts the worklet module so a stale cached
// DSP can never run against fresh UI code
const APP_V = '13';


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
const MEM = 928;
const ENG_A = 728;            // per-synth engine: 0 osc, 1 string, 2 glass
const GEN_STYLE = 731;        // RND generation style (index into STYLE_NAMES)
const FX_ON = 736, DLY_ON = 737, DLY_TIME = 738, DLY_FB = 739, DLY_TONE = 740,
  DLY_WOW = 741, FX_FEED = 742, AVO_ON = 743, AVO_AMT = 744, AVO_RATE = 745,
  AVO_CRUSH = 746, AVO_MIX = 747, DLY_PITCH = 748, DLY_REV = 749;
const SEND_A = 752;          // legacy per-part send (delay column of SND_MTX on load)
const GLC_A = 756;           // per-synth glass harmonic-cycle rate
const CLD_ON = 760, CLD_MIX = 761, CLD_SIZE = 762, CLD_DENS = 763,
  CLD_PITCH = 764, CLD_SPREAD = 765, CLD_REVERB = 766, CLD_REVG = 767;
// routing matrix: part (0 drums, 1 bass, 2 melody, 3 chords) × fx (0 delay,
// 1 glitch, 2 clouds) send amount = SND_MTX + part*3 + fx. Lets any instrument
// feed any fx stage independently.
const SND_MTX = 768;
// live-perform mute/solo. Drum lanes reuse MUTE_A (per lane); solos + synth
// mutes live here. When any solo is lit, only soloed channels sound.
const MUTE_SYN = 780;        // 3: bass / melody / chords mute
const SOLO_LANE = 783;       // 8: per drum-lane solo
const SOLO_SYN = 791;        // 3: per-synth solo
const SND_PRE = 794;         // 1: sends tap pre-fader (part volume down ≠ fx down)
// splice sampler (per synth): crop window %, pitch mode, fine tune
const SPL_ST_A = 800, SPL_EN_A = 803, SPL_MODE_A = 806, SPL_TUNE_A = 809;
// synth drum engine (per lane): noise mix, pitch sweep, 30Hz sub, click
const DNSE_A = 812, DSWP_A = 820, DSUB_A = 828, DCLK_A = 836;
// global tempo wobble: amount (% of ±12% depth) + period in beats
const BPM_WOB = 844, BPM_WRT = 845;
// two assignable mod LFOs (MIDI-learn style): rate (beats) / depth % / shape
// for L1 + L2, then 16 assignment slots (target mem offset + mask 1|2|3)
const MLFO_A = 846;                 // 846..851: L1 rate,depth,shape, L2 ditto
const MOD_TGT_A = 852, MOD_MSK_A = 868, MOD_SLOTS = 16;
// per-lane sample start % (USR lanes; LFO-able slice motion)
const DCRP_A = 884;
// 3D space per part (drums,bass,melody,chords): azimuth in degrees and an
// audio-force amount - the part's own energy shoves it around the head
const PAN_AZ_A = 896, PAN_FRC_A = 900;
// dome ball bounciness: how elastically crowded parts trade momentum
const PAN_BNC = 904;
// XY-scope waveshaper on the bass: drive folds it, skew biases it asymmetric
const XY_DRV = 905, XY_SKW = 906;
// harmonic wheel spin: 0 off, 1/2/3 = root walks the wheel every 4/2/1 beats
const WHL_SPIN = 907;

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
const SHAPE_NAMES = ['sine', 'triangle', 'saw down', 'random (S&H)', 'saw up'];
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
// 4 = SYN (the synthesized drum voice), 5 = USR (a file the user loaded)
const SAMPLE_DEFS = [
  { label: '---', file: null },
  { label: 'BD', file: '../supergnome/dr55_bd.wav' },
  { label: 'SN', file: '../supergnome/dr55_sn.wav' },
  { label: 'RIM', file: '../supergnome/dr55_rim.wav' },
  { label: 'SYN', file: null },
  { label: 'USR', file: null },
];
const SMP_SYN = 4, SMP_USR = 5;
// each lane is permanently paired with a sample (cycling the DR-55 kit), so a
// lane labelled BD always is BD. New lanes inherit their slot's pairing.
const LANE_SAMPLE = [1, 2, 3, 1, 2, 3, 1, 2];
let smpA = LANE_SAMPLE.slice();
const decoded = [null, null, null, null]; // {data,nch,sr,len} per SAMPLE_DEF
const userSmp = [null, null, null, null, null, null, null, null]; // per-lane file
const splSmp = [null, null, null];        // per-synth splice sample (mono)

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

// cents of a scale degree (mirror of the worklet's degCents)
function degCentsJ(dg, scix) {
  const s = SCL[scix], cnt = Math.max(1, s[0]);
  const oc = Math.floor(dg / cnt);
  return oc * 1200 + s[1 + (dg - oc * cnt)];
}
// MIDI note a synth degree sounds (written, ignoring live key rotation)
function degMidi(si, deg) {
  return effBase(si) + Math.round(degCentsJ(deg, effScale(si)) / 100);
}
// the note a bass/melody roll degree sounds (written, ignoring live rotation)
function degNoteName(si, deg) { return noteName(degMidi(si, deg)); }
// a scale is microtonal when any degree misses the 12-TET semitone grid
function scaleIsMicro(scix) {
  return SCL[scix].slice(1).some(c => c % 100 !== 0);
}
// name the chord a chords-roll root degree builds (e.g. "Bbm7")
function chordName(rootDeg) {
  const scix = effScale(2), base = effBase(2), has7 = sget(2, 24) > 0;
  const r0 = Math.round(degCentsJ(rootDeg, scix) / 100);
  const degs = has7 ? [0, 2, 4, 6] : [0, 2, 4];
  const iv = degs.map(dd => Math.round(degCentsJ(rootDeg + dd, scix) / 100) - r0);
  const third = iv[1], fifth = iv[2], sev = has7 ? iv[3] : null;
  let q;
  if (third === 4 && fifth === 7) q = has7 ? (sev === 11 ? 'maj7' : '7') : '';
  else if (third === 3 && fifth === 7) q = has7 ? 'm7' : 'm';
  else if (third === 3 && fifth === 6) q = has7 ? 'm7♭5' : 'dim';
  else if (third === 4 && fifth === 8) q = 'aug';
  else q = (third <= 3 ? 'm' : '') + (has7 ? '7' : '');
  return noteName(base + r0).replace(/-?\d+$/, '') + q;
}
// label for a roll note just placed (used in the status line)
function rollLabel(si, deg) {
  return si === 2 ? `chords: ${chordName(deg)}` : `${SYN_NAMES[si]}: ${degNoteName(si, deg)}`;
}

// Guess the global meter (beats per measure) from where the kick drum and
// bass put their weight. For each candidate measure length that divides a
// part's span, score the average accent weight landing on its downbeats —
// a four-on-the-floor kick ties everything and the prior picks 4/4, but a
// kick on 1 & 4 of a 6-beat span makes 3 win (waltz feel), etc.
function guessMeter() {
  const on = [];   // onsets: { b: beat position, w: weight }
  for (let l = 0; l < numLanes; l++) {
    if (!smpA[l]) continue;
    const steps = m[STEPS_A + l], bps = m[SPAN_A + l] / steps;
    const w = SAMPLE_DEFS[smpA[l]].label === 'BD' ? 3 : 1;   // the kick leads
    for (let i = 0; i < steps; i++)
      if (m[PAT + l * MAX_STEPS + i]) on.push({ b: i * bps, w });
  }
  const bron = ronOff(0), bsteps = sget(0, 2), bbps = sget(0, 3) / bsteps;
  for (let i = 0; i < bsteps; i++)
    if (m[bron + i]) on.push({ b: i * bbps, w: 2 });         // bass emphasis
  if (!on.length) return 4;
  const spans = [];
  for (let l = 0; l < numLanes; l++) if (smpA[l]) spans.push(m[SPAN_A + l]);
  spans.push(sget(0, 3));
  let best = 4, bestScore = -1;
  for (const M of [4, 3, 2, 6, 5, 7]) {
    if (!spans.some(sp => Math.abs(sp / M - Math.round(sp / M)) < 1e-6)) continue;
    let hit = 0, down = 0;
    for (const o of on) {
      const r = o.b % M;
      if (r < 1e-6 || M - r < 1e-6) hit += o.w;
    }
    for (const sp of spans) down += Math.max(1, Math.round(sp / M));
    const score = hit / down + (M === 4 ? 0.02 : M === 3 ? 0.01 : 0);
    if (score > bestScore + 1e-9) { bestScore = score; best = M; }
  }
  return best;
}
// time signature {n, d} for a span, preferring the global meter; parts whose
// span the global meter doesn't divide get their own (polymeter shown as-is)
function spanSig(span, meterM) {
  let b = Math.abs(span / meterM - Math.round(span / meterM)) < 1e-6 ? meterM
    : span % 4 === 0 ? 4 : span % 3 === 0 ? 3 : span;
  let d = 4;
  while (b !== Math.round(b) && d <= 16) { b *= 2; d *= 2; }   // 3.5 -> 7/8
  return { n: Math.round(b), d };
}
const sigBeats = sig => sig.n * 4 / sig.d;

// A musical model of the current pattern, for the score export. Pitches match
// what plays (nearest semitone — microtonal scales are approximated); timing
// is the step grid (beats per step = span / steps).
function buildScoreModel() {
  const parts = [];
  const has7 = sget(2, 24) > 0;
  const chordDegs = has7 ? [0, 2, 4, 6] : [0, 2, 4];
  const meterM = guessMeter();
  let microtonal = false;
  for (let si = 0; si < NSYN; si++) {
    const ron = ronOff(si), rdg = rdgOff(si);
    const steps = Math.round(sget(si, 2)), span = sget(si, 3);
    const bps = span / steps;
    const notes = [];
    for (let i = 0; i < steps; i++) {
      if (!m[ron + i]) { notes.push(null); continue; }
      const deg = m[rdg + i], accent = m[ron + i] === 2;
      const midis = si === 2 ? chordDegs.map(dd => degMidi(2, deg + dd)) : [degMidi(si, deg)];
      notes.push({ midis, accent });
    }
    if (notes.some(Boolean)) {
      // the disclaimer covers every part that actually sounds, using the
      // scale that part plays in (unlocked parts have their own scale)
      if (scaleIsMicro(effScale(si))) microtonal = true;
      // pick the clef from the part's pitch range so notes sit on the staff
      // instead of stacks of ledger lines (chords/low parts go to bass clef).
      const allMidi = notes.filter(Boolean).flatMap(n => n.midis).sort((a, b) => a - b);
      const median = allMidi[Math.floor(allMidi.length / 2)];
      parts.push({ name: SYN_NAMES[si].toUpperCase(), clef: median < 59 ? 'bass' : 'treble',
        steps, span, bps, notes, sig: spanSig(span, meterM),
        keyPc: ((effBase(si) % 12) + 12) % 12, scix: effScale(si) });
    }
  }
  const drums = [];
  for (let l = 0; l < numLanes; l++) {
    if (!smpA[l]) continue;   // '---' lane is silent: don't notate phantom hits
    const steps = Math.round(m[STEPS_A + l]), span = m[SPAN_A + l];
    const hits = [];
    let any = false;
    for (let i = 0; i < steps; i++) {
      const v = m[PAT + l * MAX_STEPS + i];
      hits.push(v ? (v === 2 ? 2 : 1) : 0);
      if (v) any = true;
    }
    if (any) drums.push({ name: SAMPLE_DEFS[smpA[l]].label, steps, span,
      bps: span / steps, hits, sig: spanSig(span, meterM) });
  }
  const scix = m[GKEY_SCALE];
  return {
    key: noteName(m[GKEY_NOTE]).replace(/-?\d+$/, ''),
    scale: SCALE_NAMES[scix] || '',
    meter: spanSig(meterM, meterM),
    microtonal,
    bpm, parts, drums,
  };
}

const PARAM_OFF = [NOTE_A, CHAN_A, STEPS_A, SPAN_A, PUL_A, ROT_A, VEL_A, GATE_A,
  PIT_A, LPF_A, FENV_A, LRATE_A, LDEP_A, LSHAPE_A, LPT_A, SWG_A, NDG_A, VHM_A];
function getParam(l, f) {
  return m[PARAM_OFF[f] + l];
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
  else if (f === 13) m[LSHAPE_A + l] = clamp(0, 4);
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
  else if (k === 18) m[sp + 18] = clamp(0, 4);
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

// ============================================================================
// Generation comes in two flavours, on two buttons:
//   RND  -> synGenerate  : purely random, independent of the key/style
//   GEN KEY -> synKeyGen  : musical, matches the master key + GEN style
// ============================================================================

// ---- RND (random, key-independent) ----
function randBass() {
  const ron = ronOff(0), rdg = rdgOff(0), n = sget(0, 2);
  applySynEuclid(0);
  let prev = Math.floor(Math.random() * 6);
  for (let i = 0; i < n; i++) if (m[ron + i]) {
    prev = prev + Math.floor(Math.random() * 7) - 3;
    if (prev < 0) prev += 5; if (prev > NROWS - 1) prev -= 5;
    m[rdg + i] = Math.max(0, Math.min(NROWS - 1, prev));
  }
}
function randMelody() {
  const ron = ronOff(1), rdg = rdgOff(1), n = sget(1, 2);
  const k = sget(1, 4), bars = Math.max(1, Math.floor(sget(1, 3) / 4 + 0.5));
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
}
function randChords() {
  const ron = ronOff(2), rdg = rdgOff(2), n = sget(2, 2), cnt = SCL[effScale(2)][0];
  applySynEuclid(2);
  let prev = 0;
  for (let i = 0; i < n; i++) if (m[ron + i]) {
    const rr = Math.random();
    prev += rr < 0.28 ? 3 : rr < 0.56 ? -3 : rr < 0.72 ? 4 : rr < 0.82 ? -4 : rr < 0.92 ? 1 : 0;
    prev = ((prev % cnt) + cnt) % cnt;
    m[rdg + i] = prev;
  }
}

// ---- GEN KEY (musical, matches the key + GEN style) ----
// BASS: root-anchored (mostly root + fifth) so it stays solid when the harmony
// rotates. Appalachian alternates root/fifth; West African tiles a short cell.
function keyBass(style) {
  const ron = ronOff(0), rdg = rdgOff(0), n = sget(0, 2), scix = effScale(0);
  const cnt = SCL[scix][0], fifth = degNear(scix, 700);
  applySynEuclid(0);
  m[ron] = 1;                                   // root on the downbeat
  if (style === 1) {
    let tog = 0;
    for (let i = 0; i < n; i++) if (m[ron + i]) { m[rdg + i] = tog ? fifth : 0; tog ^= 1; }
    return;
  }
  if (style === 2) {
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

// MELODY: a style-flavoured contour over the euclidean rhythm.
function keyMelody(style) {
  const ron = ronOff(1), rdg = rdgOff(1), n = sget(1, 2), scix = effScale(1);
  const cnt = SCL[scix][0], top = NROWS - 1;    // roll rows = degrees 0..11

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

// CHORDS: hold one root chord while a progression is rotating the key ("one
// chord is best"); otherwise a gentle diatonic move favouring I / IV / V / vi.
function keyChords(style) {
  const ron = ronOff(2), rdg = rdgOff(2), n = sget(2, 2), cnt = SCL[effScale(2)][0];
  const progActive = (m[LOCK_A + 2] ? m[GKEY_PROG] : sget(2, 22)) > 0;
  void style;
  if (progActive) {
    for (let i = 0; i < n; i++) { m[ron + i] = 0; m[rdg + i] = 0; }
    m[ron] = 1; m[rdg] = 0;
    if (n >= 8) { const h = Math.floor(n / 2); m[ron + h] = 1; m[rdg + h] = 0; }
    return;
  }
  applySynEuclid(2);
  const good = [0, Math.min(3, cnt - 1), Math.min(4, cnt - 1), Math.min(5, cnt - 1)];
  let prev = 0;
  for (let i = 0; i < n; i++) {
    if (!m[ron + i]) continue;
    prev = (i === 0 || Math.random() < 0.4) ? 0 : good[Math.floor(Math.random() * good.length)];
    m[rdg + i] = ((prev % cnt) + cnt) % cnt;
  }
}

// RND button: a purely random pattern, independent of key/style.
function synGenerate(si) {
  if (si === 0) randBass(); else if (si === 1) randMelody(); else randChords();
}
// GEN KEY button: a musical pattern that matches the master key + GEN style.
function synKeyGen(si) {
  const style = m[GEN_STYLE] || 0;
  if (si === 0) keyBass(style); else if (si === 1) keyMelody(style); else keyChords(style);
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
  seedNewRegions();
}
// defaults for the splice + synth-drum regions (also applied to old saves)
function seedNewRegions(arr) {
  const a = arr || m;
  for (let si = 0; si < NSYN; si++) {
    a[SPL_ST_A + si] = 0; a[SPL_EN_A + si] = 100;
    a[SPL_MODE_A + si] = 0; a[SPL_TUNE_A + si] = 0;
  }
  for (let l = 0; l < LANES_CAP; l++) {
    a[DNSE_A + l] = 20; a[DSWP_A + l] = 55; a[DSUB_A + l] = 25; a[DCLK_A + l] = 25;
  }
  a[BPM_WOB] = 0; a[BPM_WRT] = 32;
  a[MLFO_A] = 8; a[MLFO_A + 1] = 50; a[MLFO_A + 2] = 0;      // L1: 8 beats, 50%
  a[MLFO_A + 3] = 16; a[MLFO_A + 4] = 50; a[MLFO_A + 5] = 0; // L2: 16 beats
  for (let k = 0; k < MOD_SLOTS; k++) { a[MOD_TGT_A + k] = 0; a[MOD_MSK_A + k] = 0; }
  for (let l = 0; l < LANES_CAP; l++) a[DCRP_A + l] = 0;
  for (let p = 0; p < 4; p++) { a[PAN_AZ_A + p] = 0; a[PAN_FRC_A + p] = 0; }
  a[PAN_BNC] = 40; a[XY_DRV] = 0; a[XY_SKW] = 0; a[WHL_SPIN] = 0;
}
// bring a stored mem block (768 / 800 / 864) up to the current layout;
// returns a MEM-length plain array, or null for an unknown length
function migrateMem(arr) {
  if (!arr || !arr.length) return null;
  if (arr.length === MEM) return Array.from(arr);
  if (![768, 800, 864, 896].includes(arr.length)) return null;
  const out = Array.from(arr);
  while (out.length < MEM) out.push(0);
  if (arr.length === 768)   // pre-routing: old single-bus sends -> delay column
    for (let p = 0; p < 4; p++) out[SND_MTX + p * 3] = arr[SEND_A + p] || 0;
  if (arr.length < 864) seedNewRegions(out);   // splice + drum-voice defaults
  // regions the save predates get their defaults (mod LFOs came with 896)
  out[MLFO_A] = out[MLFO_A] || 8; out[MLFO_A + 1] = out[MLFO_A + 1] || 50;
  out[MLFO_A + 3] = out[MLFO_A + 3] || 16; out[MLFO_A + 4] = out[MLFO_A + 4] || 50;
  return out;
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
    if (!s || !s.mem) return false;
    const mem = migrateMem(s.mem);
    if (!mem) return false;
    m.set(mem);
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
  scheduleCommit();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 400);
}

// ---- undo / redo ----
// A burst of edits (e.g. one drag) is coalesced into a single history entry,
// committed a moment after you stop. `committed` always holds the last stable
// snapshot; undo/redo swap it with the stacks.
let undoStack = [], redoStack = [], committed = null, commitTimer = 0;
function snapshot() {
  return { mem: m.slice(), nl: numLanes, smp: smpA.slice(), vols: Object.assign({}, vols), bpm };
}
function sameSnap(a, b) {
  if (!a || !b || a.nl !== b.nl || a.bpm !== b.bpm) return false;
  for (let i = 0; i < MEM; i++) if (a.mem[i] !== b.mem[i]) return false;
  for (let i = 0; i < LANES_CAP; i++) if (a.smp[i] !== b.smp[i]) return false;
  for (const k in a.vols) if (a.vols[k] !== b.vols[k]) return false;
  return true;
}
function scheduleCommit() {
  if (!committed) committed = snapshot();
  clearTimeout(commitTimer);
  commitTimer = setTimeout(() => {
    const cur = snapshot();
    if (!sameSnap(cur, committed)) {
      undoStack.push(committed);
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
      committed = cur;
    }
  }, 350);
}
function restoreSnap(s) {
  m.set(s.mem); numLanes = s.nl; smpA = s.smp.slice();
  vols = Object.assign(vols, s.vols); bpm = s.bpm;
  pushState(); pushGains(); pushTransport();
  for (let l = 0; l < LANES_CAP; l++) pushSample(l);
  clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 400);
}
function undo() {
  clearTimeout(commitTimer);
  const cur = snapshot();
  if (!sameSnap(cur, committed)) { redoStack.push(cur); committed = cur; } // fold in an uncommitted burst
  if (!undoStack.length) { setStatus('nothing to undo'); return; }
  redoStack.push(committed);
  committed = undoStack.pop();
  restoreSnap(committed);
  setStatus('undo');
}
function redo() {
  clearTimeout(commitTimer);
  if (!redoStack.length) { setStatus('nothing to redo'); return; }
  undoStack.push(committed);
  committed = redoStack.pop();
  restoreSnap(committed);
  setStatus('redo');
}

// ---- mod LFOs (two global assignable LFOs, MIDI-learn style) --------------
// modRange(off) says whether a mem offset is a legal LFO target and what its
// value range is (the worklet swings the value across ±depth/2 of that range).
// KEEP IN SYNC with the worklet's copy.
function modRange(off) {
  const within = (base, n) => off >= base && off < base + n;
  if (within(PIT_A, 8)) return [-24, 24];
  if (within(LPF_A, 8) || within(FENV_A, 8)) return [0, 100];
  if (within(VEL_A, 8)) return [1, 127];
  if (within(GATE_A, 8)) return [5, 200];
  if (within(SWG_A, 8)) return [0, 75];
  if (within(DNSE_A, 8) || within(DSWP_A, 8) || within(DSUB_A, 8) || within(DCLK_A, 8)) return [0, 100];
  for (let si = 0; si < NSYN; si++) {
    const sp = spOff(si);
    if (off === sp + 6) return [1, 127];              // VEL
    if (off === sp + 7) return [5, 200];              // GATE
    if (off === sp + 12 || off === sp + 13 || off === sp + 14 || off === sp + 19) return [0, 100]; // CUT RES ENV WAV
  }
  if (within(SPL_ST_A, 3) || within(SPL_EN_A, 3)) return [0, 100];
  if (within(SPL_TUNE_A, 3)) return [-12, 12];
  if (off === DLY_TIME || off === AVO_RATE) return [0.0625, 2];
  if (off === DLY_FB || off === DLY_TONE || off === DLY_WOW || off === FX_FEED
    || off === AVO_AMT || off === AVO_CRUSH || off === AVO_MIX
    || off === CLD_MIX || off === CLD_SIZE || off === CLD_DENS
    || off === CLD_SPREAD || off === CLD_REVERB) return [0, 100];
  if (off === DLY_PITCH || off === CLD_PITCH) return [-24, 24];
  if (within(SND_MTX, 12) || within(GLC_A, 3)) return [0, 100];
  if (off === BPM_WOB) return [0, 100];
  if (within(DCRP_A, 8) || within(PAN_FRC_A, 4)) return [0, 100];
  if (within(PAN_AZ_A, 4)) return [-180, 180];
  if (off === PAN_BNC || off === XY_DRV) return [0, 100];
  if (off === XY_SKW) return [-50, 50];
  return null;
}
// mask of LFOs assigned to an offset (bit 1 = L1, bit 2 = L2)
function modMaskFor(off) {
  for (let k = 0; k < MOD_SLOTS; k++)
    if (m[MOD_TGT_A + k] === off) return m[MOD_MSK_A + k];
  return 0;
}
// toggle an LFO (1|2) on a target; returns a status string
function modToggle(lfo, off) {
  if (!modRange(off)) return 'that field can’t take an LFO';
  const bit = lfo === 2 ? 2 : 1;
  for (let k = 0; k < MOD_SLOTS; k++) {
    if (m[MOD_TGT_A + k] === off) {
      m[MOD_MSK_A + k] ^= bit;
      if (!m[MOD_MSK_A + k]) m[MOD_TGT_A + k] = 0;
      touchState();
      return (m[MOD_MSK_A + k] & bit) ? `L${lfo} → assigned` : `L${lfo} removed`;
    }
  }
  for (let k = 0; k < MOD_SLOTS; k++) {
    if (!m[MOD_TGT_A + k]) {
      m[MOD_TGT_A + k] = off; m[MOD_MSK_A + k] = bit;
      touchState();
      return `L${lfo} → assigned`;
    }
  }
  return 'all 16 LFO slots are in use — remove one first';
}
// human-readable catalog of every target (drives the pocket's assign UI)
function modTargets() {
  const out = [];
  for (let l = 0; l < numLanes; l++) {
    const nm = `lane ${l + 1}`;
    out.push({ name: `${nm} pitch`, off: PIT_A + l }, { name: `${nm} filter`, off: LPF_A + l },
      { name: `${nm} velocity`, off: VEL_A + l }, { name: `${nm} swing`, off: SWG_A + l });
    if (smpA[l] === SMP_SYN)
      out.push({ name: `${nm} sweep`, off: DSWP_A + l }, { name: `${nm} sub`, off: DSUB_A + l });
    if (smpA[l] === SMP_USR)
      out.push({ name: `${nm} crop start`, off: DCRP_A + l });
  }
  for (let si = 0; si < NSYN; si++) {
    const sp = spOff(si), nm = SYN_NAMES[si];
    out.push({ name: `${nm} cutoff`, off: sp + 12 }, { name: `${nm} resonance`, off: sp + 13 },
      { name: `${nm} wave`, off: sp + 19 }, { name: `${nm} velocity`, off: sp + 6 },
      { name: `${nm} gate`, off: sp + 7 });
    if (m[ENG_A + si] === 3)
      out.push({ name: `${nm} crop start`, off: SPL_ST_A + si }, { name: `${nm} tune`, off: SPL_TUNE_A + si });
  }
  out.push(
    { name: 'dub delay time', off: DLY_TIME }, { name: 'dub delay feedback', off: DLY_FB },
    { name: 'delay tone', off: DLY_TONE }, { name: 'delay pitch', off: DLY_PITCH },
    { name: 'fx feed', off: FX_FEED },
    { name: 'glitch amount', off: AVO_AMT }, { name: 'glitch mix', off: AVO_MIX },
    { name: 'granulator mix', off: CLD_MIX }, { name: 'granulator density', off: CLD_DENS },
    { name: 'granulator pitch', off: CLD_PITCH }, { name: 'granulator size', off: CLD_SIZE });
  for (let p = 0; p < 4; p++) {
    const pn = ['drums', 'bass', 'melody', 'chords'][p];
    for (let f = 0; f < 3; f++)
      out.push({ name: `${pn} → ${['dub delay', 'glitch', 'granulator'][f]} send`,
        off: SND_MTX + p * 3 + f });
    out.push({ name: `${pn} azimuth (3D)`, off: PAN_AZ_A + p });
  }
  out.push({ name: 'bass shape drive (XY scope)', off: XY_DRV },
    { name: 'bass shape skew (XY scope)', off: XY_SKW },
    { name: 'dome bounciness', off: PAN_BNC });
  return out;
}
const modTargetName = off => {
  const t = modTargets().find(t => t.off === off);
  return t ? t.name : 'slot ' + off;
};

// ---- presets (A/B/C live slots + .json file export/import) ----
// A preset is a full serialized groove (same shape as an undo snapshot but
// with plain arrays so it JSONs). Recall is undoable and works mid-playback.
const PRESET_KEY = 'supergnome_presets_v1';
let presets = { A: null, B: null, C: null };
try {
  const pp = JSON.parse(localStorage.getItem(PRESET_KEY));
  if (pp) for (const k of ['A', 'B', 'C']) if (pp[k]) presets[k] = pp[k];
} catch (e) { /* fresh */ }
function serializeState() {
  return { mem: Array.from(m), nl: numLanes, smp: smpA.slice(),
    vols: Object.assign({}, vols), bpm };
}
// validate + migrate an imported/stored state into snapshot shape (null = bad)
function normalizeState(s) {
  if (!s || !Array.isArray(s.mem)) return null;
  const mem = migrateMem(s.mem);
  if (!mem) return null;
  const smp = (Array.isArray(s.smp) && s.smp.length === LANES_CAP)
    ? s.smp.slice() : LANE_SAMPLE.slice();
  return {
    mem, smp,
    nl: Math.max(1, Math.min(LANES_CAP, s.nl || s.numLanes || 3)),
    vols: Object.assign({ drum: 90, bass: 90, mel: 90, chd: 90, master: 80 }, s.vols),
    bpm: Math.max(30, Math.min(260, s.bpm || 120)),
  };
}
function savePresets() {
  try { localStorage.setItem(PRESET_KEY, JSON.stringify(presets)); } catch (e) { }
}
function storePreset(id) {
  presets[id] = serializeState();
  savePresets();
  setStatus(`preset ${id} stored`);
}
function recallPreset(id) {
  const p = normalizeState(presets[id]);
  if (!p) { setStatus(`preset ${id} is empty — ALT-tap (canvas) or Save (pocket) stores the groove`); return; }
  recallPresetState(p, `preset ${id}`);
}
function downloadPreset(id) {
  const s = id === 'now' ? serializeState() : presets[id];
  if (!s) { setStatus(`preset ${id} is empty — nothing to download`); return; }
  const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = id === 'now' ? 'supergnome-groove.json' : `supergnome-preset-${id}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
// open a file picker, parse the groove, hand it over (bad files -> status)
function pickGrooveFile(cb) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.addEventListener('change', () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    f.text().then(t => {
      let s = null;
      try { s = normalizeState(JSON.parse(t)); } catch (e) { }
      if (s) cb(s); else setStatus('that file is not a gnome groove');
    });
  });
  inp.click();
}
function importToPreset(id) {
  pickGrooveFile(s => { presets[id] = s; savePresets(); setStatus(`file loaded into preset ${id}`); });
}
function importCurrent() {
  pickGrooveFile(s => recallPresetState(s, 'groove loaded from file'));
}
// apply a groove (preset recall / file load) as one undoable step
function recallPresetState(p, label) {
  clearTimeout(commitTimer);
  const cur = snapshot();
  if (committed && !sameSnap(cur, committed)) undoStack.push(committed);
  undoStack.push(cur);
  if (undoStack.length > 100) undoStack.splice(0, undoStack.length - 100);
  redoStack.length = 0;
  restoreSnap(p);
  committed = snapshot();
  setStatus(label);
}

// ---- audio ----
let actx = null, node = null, audioReady = false, audioStarting = false;
let dispBeat = 0, gsndB = -1, gsndM = -1, gsndC = [0, 0, 0, 0], gsndCn = 0;
let azv = [0, 0, 0, 0], enerArr = [0, 0, 0, 0], scopeArr = null;

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
  const k = smpA[lane];
  if (k === SMP_SYN) { node.port.postMessage({ type: 'sample', lane, synth: true }); return; }
  const s = k === SMP_USR ? userSmp[lane] : decoded[k];
  node.port.postMessage(s
    ? { type: 'sample', lane, data: s.data, nch: s.nch, sr: s.sr, len: s.len }
    : { type: 'sample', lane, data: null });
}
function pushSplice(si) {
  if (!node) return;
  const s = splSmp[si];
  node.port.postMessage(s
    ? { type: 'ssmp', si, data: s.data, sr: s.sr, len: s.len }
    : { type: 'ssmp', si, data: null });
}

async function loadSamples() {
  for (let i = 1; i < SAMPLE_DEFS.length; i++) {
    if (!SAMPLE_DEFS[i].file) continue;
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
  for (let si = 0; si < NSYN; si++) pushSplice(si);
}

// ---- user samples (drum lanes + splice), persisted in IndexedDB ----------
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('supergnome', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('samples');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbPut(key, val) {
  try {
    const db = await idbOpen();
    await new Promise((res, rej) => {
      const tx = db.transaction('samples', 'readwrite');
      tx.objectStore('samples').put(val, key);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  } catch (e) { /* private mode etc */ }
}
async function restoreUserSamples() {
  try {
    const db = await idbOpen();
    const store = db.transaction('samples').objectStore('samples');
    await new Promise((res) => {
      const cur = store.openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (!c) { res(); return; }
        const v = c.value, mL = /^lane(\d)$/.exec(c.key), mS = /^syn(\d)$/.exec(c.key);
        if (v && v.data) {
          if (mL) userSmp[+mL[1]] = v;
          else if (mS) splSmp[+mS[1]] = v;
        }
        c.continue();
      };
      cur.onerror = () => res();
    });
    if (node) {
      for (let l = 0; l < LANES_CAP; l++) pushSample(l);
      for (let si = 0; si < NSYN; si++) pushSplice(si);
    }
  } catch (e) { /* no idb - samples just don't persist */ }
}
restoreUserSamples();

// AudioBuffer -> our transferable shapes. Every import is peak-normalized
// (to 0.9) so quiet files and archive digs sit at a usable level.
function normalize(data) {
  let peak = 0;
  for (let i = 0; i < data.length; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
  if (peak > 0.0001) { const g = 0.9 / peak; for (let i = 0; i < data.length; i++) data[i] *= g; }
  return data;
}
function bufToStereo(buf, name) {
  const nch = Math.min(2, buf.numberOfChannels), len = buf.length;
  const data = new Float32Array(len * nch);
  for (let c = 0; c < nch; c++) {
    const ch = buf.getChannelData(c);
    for (let j = 0; j < len; j++) data[j * nch + c] = ch[j];
  }
  return { data: normalize(data), nch, sr: buf.sampleRate, len, name: name || '' };
}
function bufToMono(buf, name) {
  const len = buf.length, data = new Float32Array(len);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let j = 0; j < len; j++) data[j] += ch[j] / buf.numberOfChannels;
  }
  return { data: normalize(data), nch: 1, sr: buf.sampleRate, len, name: name || '' };
}
// pick + decode a local audio file (must run from a user gesture)
function pickAudioFile(cb) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'audio/*';
  inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    try {
      if (!audioReady) await initAudio();
      const buf = await actx.decodeAudioData(await f.arrayBuffer());
      cb(buf, f.name);
    } catch (e) { setStatus('could not decode that audio file'); }
  });
  inp.click();
}
function setUserSample(lane, smp) {
  userSmp[lane] = smp;
  smpA[lane] = SMP_USR;
  pushSample(lane); saveLater();
  idbPut('lane' + lane, smp);
}
function setSpliceSample(si, smp) {
  splSmp[si] = smp;
  m[ENG_A + si] = 3;
  pushSplice(si); touchState();
  idbPut('syn' + si, smp);
}
function loadUserSample(lane) {
  pickAudioFile((buf, name) => {
    setUserSample(lane, bufToStereo(buf, name));
    setStatus(`lane ${lane + 1}: “${name}” loaded (USR)`);
  });
}
function loadSpliceSample(si) {
  pickAudioFile((buf, name) => {
    setSpliceSample(si, bufToMono(buf, name));
    setStatus(`${SYN_NAMES[si]} splice: “${name}” — crop with CRP◀/▶, TRK follows the notes`);
  });
}

// ---- crate dig: pull free audio from Wikimedia Commons (public-domain /
// free-licensed; the status names the file so its licence page is findable).
// Commons is the big library with documented anonymous browser CORS
// (origin=*); archive.org now bot-blocks cross-origin fetches.
async function digSample(kind, idx, from) {
  if (from === 'ia') return digArchive(kind, idx);
  setStatus('digging Wikimedia Commons for free audio…');
  try {
    const terms = ['78 rpm record', 'phonograph cylinder', 'gramophone record',
      'Edison record', 'shellac record music'];
    const term = terms[Math.floor(Math.random() * terms.length)];
    const off = Math.floor(Math.random() * 120);
    const api = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search'
      + '&gsrsearch=' + encodeURIComponent('filetype:audio ' + term)
      + '&gsrnamespace=6&gsrlimit=30&gsroffset=' + off
      + '&prop=imageinfo&iiprop=url%7Cmime%7Csize&format=json&origin=*';
    const j = await (await fetch(api)).json();
    const pages = j.query && j.query.pages ? Object.values(j.query.pages) : [];
    // prefer formats every browser decodes (Safari can't do ogg); cap size
    const GOOD = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4',
      'audio/flac', 'audio/x-flac'];
    let cands = pages.filter(p => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].size < 14e6);
    const good = cands.filter(p => GOOD.includes(p.imageinfo[0].mime));
    cands = (good.length ? good : cands).sort(() => Math.random() - 0.5);
    if (!cands.length) throw new Error('empty');
    if (!audioReady) await initAudio();
    // try candidates until one downloads AND decodes — one bad file
    // shouldn't kill the dig
    for (const p of cands.slice(0, 4)) {
      const title = String(p.title || '').replace(/^File:/, '');
      setStatus(`fetching “${title}”…`);
      try {
        const ab = await (await fetch(p.imageinfo[0].url)).arrayBuffer();
        const buf = await actx.decodeAudioData(ab);
        applyDug(kind, idx, buf, title);
        setStatus(`dug: “${title}” — free media from Wikimedia Commons (licence on its file page)`);
        return;
      } catch (e) { /* next candidate */ }
    }
    throw new Error('nodecode');
  } catch (e) {
    setStatus(e && e.message === 'empty'
      ? 'crate dig: no results this time — tap again'
      : 'crate dig failed (network blocked or nothing decodable) — tap again, or load a local file');
  }
}
// Internet Archive 78rpm dig (public domain 1900-1922). The IA fronts
// aggressive bot protection, so this may be blocked for some networks /
// browsers - the wiki dig is the dependable one; this one is the treat.
async function digArchive(kind, idx) {
  setStatus('digging the archive for a public-domain 78…');
  try {
    const q = 'collection:georgeblood AND mediatype:audio AND year:[1900 TO 1922]';
    let ids = [];
    try {   // preferred: the scrape API
      const s = await (await fetch('https://archive.org/services/search/v1/scrape?q='
        + encodeURIComponent(q) + '&fields=identifier&count=100')).json();
      ids = (s.items || []).map(it => it.identifier);
    } catch (e) { /* fall through */ }
    if (!ids.length) {   // fallback: classic advancedsearch
      const page = 1 + Math.floor(Math.random() * 100);
      const s = await (await fetch('https://archive.org/advancedsearch.php?q='
        + encodeURIComponent(q) + '&fl[]=identifier&rows=20&page=' + page + '&output=json')).json();
      ids = ((s.response && s.response.docs) || []).map(d => d.identifier);
    }
    if (!ids.length) throw new Error('search blocked');
    const id = ids[Math.floor(Math.random() * ids.length)];
    const md = await (await fetch('https://archive.org/metadata/' + id)).json();
    const f = (md.files || []).find(ff => /\.mp3$/i.test(ff.name));
    if (!f) throw new Error('no mp3 in the item');
    const title = (md.metadata && md.metadata.title) || id;
    setStatus(`fetching “${title}”…`);
    const ab = await (await fetch('https://archive.org/download/' + id + '/'
      + encodeURIComponent(f.name))).arrayBuffer();
    if (!audioReady) await initAudio();
    const buf = await actx.decodeAudioData(ab);
    applyDug(kind, idx, buf, title);
    setStatus(`dug: “${title}” (78rpm, 1900–1922, public domain)`);
  } catch (e) {
    setStatus('78s dig failed (' + ((e && e.message) || 'network') + ') — the archive blocks some networks; try WIKI or a local file');
  }
}

// slice a workable chunk out of a dug recording and land it on the target
function applyDug(kind, idx, buf, title) {
  const sr = buf.sampleRate;
  const startS = Math.min(10, Math.max(0, buf.duration - 12));   // skip lead-in
  const secs = kind === 'lane' ? 4 : 12;
  const off = Math.floor(startS * sr);
  const len = Math.max(1, Math.min(buf.length - off, Math.floor(secs * sr)));
  const slice = new AudioBuffer({ numberOfChannels: 1, length: len, sampleRate: sr });
  const src = buf.getChannelData(0), dst = slice.getChannelData(0);
  for (let i = 0; i < len; i++) dst[i] = src[off + i];
  if (kind === 'lane') setUserSample(idx, bufToStereo(slice, title));
  else setSpliceSample(idx, bufToMono(slice, title));
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
  // versioned URL: a cached stale worklet must never run against fresh UI
  // code (that skew silently breaks features that live in the DSP)
  await actx.audioWorklet.addModule('gnome-worklet.js?v=' + APP_V);
  node = new AudioWorkletNode(actx, 'supergnome',
    { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
  node.connect(actx.destination);
  try { await actx.resume(); } catch (e) { /* ignore */ }
  node.port.onmessage = (e) => {
    const d = e.data;
    if (d.type === 'tick') {
      dispBeat = d.beat;
      gsndB = d.gsndB; gsndM = d.gsndM; gsndC = d.gsndC; gsndCn = d.gsndCn;
      if (d.azv) azv = d.azv;
      if (d.ener) enerArr = d.ener;
      if (d.scope) scopeArr = d.scope;
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
const xSolo = xMute + 22;                  // perform solo sits beside mute
const xEuc = xSolo + 22, xMode = xEuc + 36, xGrid = xMode + 30;
const cellw = 16, cellh = 28, rollrh = 8;
function yBtn() { return laneTop + numLanes * rowh + 2; }
function ys(si) { return yBtn() + 28 + si * 208; }
const fxH = 300;                        // demarcated FX box at the bottom
const ROLL_X = 8, ROLL_Y = 88;          // rolls sit UNDER the control rows
const RC_X = 744;                       // right-hand column (text + visuals)
function fxY() { return ys(2) + 184; }
function yStat() { return fxY() + fxH + 2; }
function totalH() { return yStat() + 22; }

// KEY row layout
const kxKey = 156, kxScl = 204, kxPrg = 252, kxSpd = 298;
const kxB = 348, kxM = 398, kxC = 448; // lock buttons; +20 = mult boxes
const STYLE_X = 900, STYLE_W = 200;    // style selector (right of the KEY row)
const GENKEY_X = 1108, GENKEY_W = 148; // "GEN KEY" — generate all parts in key

// header controls
const PLAY_R = [130, 4, 44, 22], BPM_R = [180, 4, 52, 22],
  INIT_R = [238, 4, 40, 22], ALT_R = [284, 4, 40, 22],
  REC_R = [330, 4, 52, 22], SAVE_R = [388, 4, 52, 22],
  UNDO_R = [446, 4, 34, 22], REDO_R = [484, 4, 34, 22],
  SHEET_R = [524, 4, 56, 22],
  // preset slots: tap = recall live, ALT/right-click = store; ⇩⇧ = file io
  PRE_RS = [[590, 4, 26, 22], [620, 4, 26, 22], [650, 4, 26, 22]],
  PEXP_R = [684, 4, 26, 22], PIMP_R = [714, 4, 26, 22];
const PRESET_IDS = ['A', 'B', 'C'];
const KNOBS = [
  { id: 'drum', label: 'DRUM' }, { id: 'bass', label: 'BASS' },
  { id: 'mel', label: 'MEL' }, { id: 'chd', label: 'CHD' },
  { id: 'master', label: 'MAIN' },
];
function knobX(i) { return W - (KNOBS.length - i) * 52 - 8; }

// FX panel cells (drawn as a demarcated box at the bottom, OG drag-field
// idiom). Positions are absolute; rebuilt each frame so they track fxY().
// corner ticks marking a field as an LFO target (amber = L1, teal = L2)
function modTick(off, x, w, y) {
  const mk = modMaskFor(off);
  if (!mk) return;
  if (mk & 1) { set(0.95, 0.72, 0.25); rect(x + w - 7, y + 2, 5, 5); }
  if (mk & 2) { set(0.3, 0.85, 0.85); rect(x + w - 7, y + 9, 5, 5); }
}

function fxFmt(kind, v) {
  return kind === 'pct' ? Math.round(v) + '%'
    : kind === 'st' ? (v > 0 ? '+' : '') + Math.round(v)
    : kind === 'beats' ? fmtG(v)
    : kind === 'shp' ? ['SIN', 'TRI', 'SW\u2193', 'S&H', 'SW\u2191'][Math.round(v)] || 'SIN'
    : kind === 'deg' ? Math.round(v) + '\u00b0'
    : String(Math.round(v));
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
  val(x, y, 44, 'FEED', FX_FEED, 0, 100, 5, 'pct'); x += 50;
  tog(x, y, 40, 'PRE', SND_PRE); x += 48;
  lbl(x, y + 9, 'GLASS CYC'); x += 72;
  val(x, y, 38, 'BAS', GLC_A, 0, 100, 5, 'pct'); x += 42;
  val(x, y, 38, 'MEL', GLC_A + 1, 0, 100, 5, 'pct'); x += 42;
  val(x, y, 38, 'CHD', GLC_A + 2, 0, 100, 5, 'pct'); x += 54;
  lbl(x, y + 9, 'TEMPO WOBBLE'); x += 96;
  val(x, y, 42, 'AMT', BPM_WOB, 0, 100, 5, 'pct'); x += 46;
  val(x, y, 46, 'BEATS', BPM_WRT, 4, 256, 4, 'raw');
  y = fy + 60; x = 12;
  lbl(x, y + 9, 'DUB DLY'); x += 52;
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
  lbl(x, y + 9, 'GRAIN'); x += 52;
  tog(x, y, 34, '', CLD_ON); x += 40;
  val(x, y, 44, 'SIZE', CLD_SIZE, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 44, 'DENS', CLD_DENS, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 40, 'PIT', CLD_PITCH, -24, 24, 1, 'st'); x += 44;
  tog(x, y, 48, 'REVG', CLD_REVG); x += 52;
  val(x, y, 44, 'SPRD', CLD_SPREAD, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 44, 'TAIL', CLD_REVERB, 0, 100, 5, 'pct'); x += 48;
  val(x, y, 42, 'MIX', CLD_MIX, 0, 100, 5, 'pct');
  // 3D SPACE (right column, under the SENDS box): azimuth + audio force
  y = fy + 140; x = 1000;
  val(x, y, 44, 'DR·AZ', PAN_AZ_A, -180, 180, 5, 'deg'); x += 48;
  val(x, y, 40, 'FRC', PAN_FRC_A, 0, 100, 5, 'pct'); x += 46;
  val(x, y, 44, 'BS·AZ', PAN_AZ_A + 1, -180, 180, 5, 'deg'); x += 48;
  val(x, y, 40, 'FRC', PAN_FRC_A + 1, 0, 100, 5, 'pct'); x += 46;
  lbl(x + 4, y + 9, 'SPACE');
  y = fy + 176; x = 1000;
  val(x, y, 44, 'ML·AZ', PAN_AZ_A + 2, -180, 180, 5, 'deg'); x += 48;
  val(x, y, 40, 'FRC', PAN_FRC_A + 2, 0, 100, 5, 'pct'); x += 46;
  val(x, y, 44, 'CH·AZ', PAN_AZ_A + 3, -180, 180, 5, 'deg'); x += 48;
  val(x, y, 40, 'FRC', PAN_FRC_A + 3, 0, 100, 5, 'pct'); x += 46;
  val(x, y, 42, 'BNC', PAN_BNC, 0, 100, 5, 'pct');

  // mod LFOs (right column): L1 / L2 rate + depth + shape; ARM drawn apart
  y = fy + 214; x = 1046;
  val(x, y, 46, 'RATE', MLFO_A, 0.25, 64, 0.25, 'beats'); x += 50;
  val(x, y, 42, 'DEP', MLFO_A + 1, 0, 100, 5, 'pct'); x += 46;
  val(x, y, 40, 'SHP', MLFO_A + 2, 0, 4, 1, 'shp'); x += 44;
  lbl(x + 4, y + 9, 'arm, then');
  y = fy + 250; x = 1046;
  val(x, y, 46, 'RATE', MLFO_A + 3, 0.25, 64, 0.25, 'beats'); x += 50;
  val(x, y, 42, 'DEP', MLFO_A + 4, 0, 100, 5, 'pct'); x += 46;
  val(x, y, 40, 'SHP', MLFO_A + 5, 0, 4, 1, 'shp'); x += 44;
  lbl(x + 4, y + 9, 'tap fields');
  return c;
}

// SENDS matrix mini-knob centers (part 0..3 x fx 0..2), inside the FX band
function sndKnobXY(part, fxi) {
  return [1050 + fxi * 42, fxY() + 36 + part * 26];
}
// ARM button rects for the two mod LFOs (draw + hit share these)
function armRect(n) { return [1000, fxY() + (n === 1 ? 214 : 250), 40, 30]; }

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
  dragMoved = false, rotApplied = 0, paint = 0, dragKnob = 0, dragFx = null,
  dragX = 0, dragV2 = 0;
// mod-LFO assignment mode: 0 = off, 1/2 = tapping fields assigns that LFO
let armLfo = 0;

// ---- Game of Life (melody band): HighLife B36/S23 on a torus. The melody
// seeds cells as it plays; GROW lets the colony rewrite notes now and then.
const GOL_W = 30, GOL_H = 16;
const golGrid = new Uint8Array(GOL_W * GOL_H);
const GOL_RATES = [0.25, 0.5, 1, 2, 4];   // generations per beat
const GOL_RATE_LBL = ['¼×', '½×', '1×', '2×', '4×'];
let golGrow = false, golPaintV = 1, golLastBeat = -1, golLastStep = -1, golGen = 0,
  golRate = 2;
function golStep() {
  const nx = new Uint8Array(GOL_W * GOL_H);
  for (let r = 0; r < GOL_H; r++) for (let c = 0; c < GOL_W; c++) {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      n += golGrid[((r + dr + GOL_H) % GOL_H) * GOL_W + ((c + dc + GOL_W) % GOL_W)];
    }
    const alive = golGrid[r * GOL_W + c];
    nx[r * GOL_W + c] = alive ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 || n === 6 ? 1 : 0);
  }
  golGrid.set(nx);
  golGen++;
  if (golGrow && golGen % 4 === 0) {
    const steps = Math.max(1, Math.round(sget(1, 2)));
    const alive = [];
    for (let r = 0; r < GOL_H; r++) for (let c = 0; c < Math.min(steps, GOL_W); c++)
      if (golGrid[r * GOL_W + c]) alive.push([c, r]);
    if (alive.length) {
      const [c, r] = alive[Math.floor(Math.random() * alive.length)];
      const deg = Math.max(0, Math.min(NROWS - 1, Math.floor((GOL_H - 1 - r) * NROWS / GOL_H)));
      const ron = ronOff(1), rdg = rdgOff(1);
      if (m[ron + c] && m[rdg + c] === deg) m[ron + c] = 0;
      else { m[ron + c] = 1; m[rdg + c] = deg; }
      touchState();
    }
  }
}
function golFrame() {
  if (!playing) return;
  const b = Math.floor(dispBeat * GOL_RATES[golRate]);
  if (b !== golLastBeat) { golLastBeat = b; golStep(); }
  const steps = Math.max(1, Math.round(sget(1, 2)));
  const msd = (sget(1, 15) ? sget(1, 3) / 16 : sget(1, 3) / steps) * FEL_MULT[m[SFL_A + 1]];
  const st = ((Math.floor(dispBeat / msd) % steps) + steps) % steps;
  if (st !== golLastStep) {
    golLastStep = st;
    if (m[ronOff(1) + st]) {
      const r = Math.max(0, Math.min(GOL_H - 1,
        GOL_H - 1 - Math.floor(m[rdgOff(1) + st] * GOL_H / NROWS)));
      const cc = st % GOL_W;
      // an L-tromino, not a lone cell — lone cells die before the next beat
      golGrid[r * GOL_W + cc] = 1;
      golGrid[r * GOL_W + ((cc + 1) % GOL_W)] = 1;
      golGrid[((r + 1) % GOL_H) * GOL_W + cc] = 1;
    }
  }
}
function tryModAssign(off) {
  if (!armLfo) return false;
  setStatus(`${modToggle(armLfo, off)} — ${modTargetName(off)}`);
  return true;
}
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
    if (inRect(x, y, UNDO_R)) { undo(); return; }
    if (inRect(x, y, REDO_R)) { redo(); return; }
    if (inRect(x, y, SHEET_R)) { if (window.gnome.exportScore) window.gnome.exportScore(); return; }
    for (let i = 0; i < 3; i++)
      if (inRect(x, y, PRE_RS[i])) { recallPreset(PRESET_IDS[i]); return; }
    if (inRect(x, y, PEXP_R)) { downloadPreset('now'); setStatus('current groove saved as a .json file'); return; }
    if (inRect(x, y, PIMP_R)) { importCurrent(); return; }
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
    for (const n of [1, 2]) {
      if (inRect(x, y, armRect(n))) {
        armLfo = armLfo === n ? 0 : n;
        setStatus(armLfo ? `L${n} armed — tap any value field to assign / remove it` : `L${n} disarmed`);
        return;
      }
    }
    // SENDS matrix mini-knobs (vertical drag; armed tap assigns)
    for (let p = 0; p < 4; p++) for (let f = 0; f < 3; f++) {
      const [kx, ky] = sndKnobXY(p, f);
      if ((x - kx) * (x - kx) + (y - ky) * (y - ky) <= 144) {
        const off = SND_MTX + p * 3 + f;
        if (tryModAssign(off)) return;
        dragMode = 44; dragFx = off; dragY = y; dragV = m[off];
        return;
      }
    }
    // 3D dome: grab the nearest part ball and drag it around the head
    {
      const cx = 868, cy = fxY() + 150;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= 115 * 115) {
        let best = -1, bd = 1e9;
        for (let p = 0; p < 4; p++) {
          const a = (azv[p] || 0) * Math.PI / 180;
          const bx = cx + Math.sin(a) * 78, by = cy - Math.cos(a) * 78;
          const dd = (x - bx) * (x - bx) + (y - by) * (y - by);
          if (dd < bd) { bd = dd; best = p; }
        }
        if (best >= 0 && bd <= 26 * 26) {
          if (tryModAssign(PAN_AZ_A + best)) return;
          dragMode = 51; dragLane = best;
          return;
        }
      }
    }
    for (const cell of fxCells()) {
      if (cell.t === 'lbl') continue;
      if (x >= cell.x && x < cell.x + cell.w && y >= cell.y && y < cell.y + 30) {
        if (cell.t === 'val' && tryModAssign(cell.off)) return;
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
      setStatus(`style: ${STYLE_NAMES[m[GEN_STYLE]]}${STYLE_SCALE[m[GEN_STYLE]] >= 0 ? ' — scale set to ' + SCALE_NAMES[m[GKEY_SCALE]] + '; hit GEN KEY' : ''}`);
      touchState();
    }
    else if (x >= GENKEY_X && x < GENKEY_X + GENKEY_W) {
      for (let si = 0; si < NSYN; si++) synKeyGen(si);
      setStatus(`generated bass + melody + chords in ${STYLE_NAMES[m[GEN_STYLE] || 0]} / ${SCALE_NAMES[m[GKEY_SCALE]]}`);
      touchState();
    }
    else if ((x >= 756 && x < 822) || (x >= 826 && x < 892)) {
      // dig into a drum lane: the first USR lane, or turn the last into one
      let tl = -1;
      for (let l = 0; l < numLanes; l++) if (smpA[l] === SMP_USR) { tl = l; break; }
      if (tl < 0) { tl = numLanes - 1; smpA[tl] = SMP_USR; }
      digSample('lane', tl, x < 822 ? 'wiki' : 'ia');
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
    // Game of Life painting (melody band, right column)
    if (gsi === 1 && x >= 1000 && x < 1000 + GOL_W * 8 && y >= ysv + 4 && y < ysv + 4 + GOL_H * 8) {
      const gc = Math.floor((x - 1000) / 8), gr2 = Math.floor((y - (ysv + 4)) / 8);
      golPaintV = golGrid[gr2 * GOL_W + gc] ? 0 : 1;
      golGrid[gr2 * GOL_W + gc] = golPaintV;
      dragMode = 50;
      return;
    }
    if (gsi === 1 && y >= ysv + 4 + GOL_H * 8 + 4 && y < ysv + 4 + GOL_H * 8 + 24) {
      if (x >= 1000 && x < 1044) { golGrid.fill(0); setStatus('life cleared'); return; }
      if (x >= 1048 && x < 1108) {
        golGrow = !golGrow;
        setStatus(golGrow ? 'GROW on: the colony occasionally rewrites melody notes (undo works)'
          : 'GROW off: the colony just watches the melody');
        return;
      }
      if (x >= 1112 && x < 1164) {
        golRate = (golRate + 1) % GOL_RATES.length;
        setStatus(`life speed: ${GOL_RATE_LBL[golRate]} — ${GOL_RATES[golRate]} generation${GOL_RATES[golRate] === 1 ? '' : 's'} per beat`);
        return;
      }
    }
    // XY scope (bass band): grab the figure to shape the bass -
    // vertical = drive (tanh fold), horizontal = skew (asymmetric bias)
    if (gsi === 0 && x >= 1000 && x < 1248 && y >= ysv + 4 && y < ysv + 184) {
      if (armLfo) { tryModAssign(x < 1124 ? XY_DRV : XY_SKW); return; }
      dragMode = 52; dragY = y; dragX = x;
      dragV = m[XY_DRV]; dragV2 = m[XY_SKW];
      return;
    }
    // harmonic wheel SPIN button (chords band, under the wheel)
    if (gsi === 2 && x >= 1096 && x < 1184 && y >= ysv + 160 && y < ysv + 178) {
      m[WHL_SPIN] = ((m[WHL_SPIN] || 0) + 1) % 4;
      setStatus(['spin off — chords play as written',
        'SPIN: the chord root walks the wheel every 4 beats',
        'SPIN: the chord root walks the wheel every 2 beats',
        'SPIN: the chord root walks the wheel every beat'][m[WHL_SPIN]]);
      touchState();
      return;
    }
    if (y >= ysv && y < ysv + rowh) {
      if (x >= xFields && x < xFields + 10 * fieldw) {
        dragF = Math.floor((x - xFields) / fieldw);
        if (armLfo) { tryModAssign(spOff(gsi) + dragF); return; }
        dragY = y; dragSynth = gsi; dragV = sget(gsi, dragF);
        dragMode = dragF === 5 ? 9 : 5;
      } else if (x >= xMute && x < xMute + 18) {
        sset(gsi, 11, sget(gsi, 11) ? 0 : 1); touchState();
      } else if (x >= xSolo && x < xSolo + 18) {
        m[SOLO_SYN + gsi] = m[SOLO_SYN + gsi] ? 0 : 1; touchState();
        setStatus(m[SOLO_SYN + gsi] ? `${SYN_NAMES[gsi]} SOLO — only soloed channels sound` : `${SYN_NAMES[gsi]} solo off`);
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
        // splice engine reclaims the WAV/RATE/DEP/SHP slots for its own
        // controls: crop start / crop end / fine tune / pitch-track toggle
        if (m[ENG_A + gsi] === 3 && dragF >= 3 && dragF <= 6) {
          if (armLfo) {
            if (dragF === 6) setStatus('TRK/FIX can’t take an LFO');
            else tryModAssign([SPL_ST_A, SPL_EN_A, SPL_TUNE_A][dragF - 3] + gsi);
            return;
          }
          if (dragF === 6) {   // TRK/FIX tap toggle
            m[SPL_MODE_A + gsi] = m[SPL_MODE_A + gsi] ? 0 : 1;
            setStatus(`${SYN_NAMES[gsi]} splice: ${m[SPL_MODE_A + gsi] ? 'FIX - plays at its own pitch (TUNE to taste)' : 'TRK - repitched to follow the notes'}`);
            touchState();
            return;
          }
          dragY = y; dragSynth = gsi;
          dragFx = [SPL_ST_A, SPL_EN_A, SPL_TUNE_A][dragF - 3] + gsi;
          dragV = m[dragFx];
          dragMode = 42;
          return;
        }
        if (armLfo) { tryModAssign(spOff(gsi) + r2map(dragF)); return; }
        dragY = y; dragSynth = gsi; dragV = sget(gsi, r2map(dragF));
        dragMode = 10;
      } else if (m[ENG_A + gsi] === 3 && x >= 516 && x < 556) {
        digSample('splice', gsi, 'wiki');   // each tap = a fresh find
      } else if (m[ENG_A + gsi] === 3 && x >= 560 && x < 600) {
        digSample('splice', gsi, 'ia');
      } else if (x >= xEuc && x < xEuc + 32) {
        m[ENG_A + gsi] = (m[ENG_A + gsi] + 1) % 4;
        if (m[ENG_A + gsi] === 3 && !splSmp[gsi])
          setStatus(`${SYN_NAMES[gsi]} engine: SPLICE — ALT-tap ENG to load a sample (or dig one on the FX row)`);
        else
          setStatus(`${SYN_NAMES[gsi]} engine: ${['classic oscillator', 'plucked string (RES=sustain, 100=infinite)', 'blown glass (GCY on the FX panel cycles harmonics)', 'splice — plays your sample; CRP crops, TRK follows the notes'][m[ENG_A + gsi]]}`);
        touchState();
      } else if (gsi === 2 && x >= xMode && x < xMode + 26) {
        sset(2, 24, sget(2, 24) ? 0 : 1);
        setStatus(`chords: ${sget(2, 24) ? 'sevenths' : 'triads'}`);
        touchState();
      }
      return;
    }
    if (y >= ysv + ROLL_Y && y < ysv + ROLL_Y + NROWS * rollrh
        && x >= ROLL_X && x < ROLL_X + MAX_STEPS * cellw) {
      const mcol = Math.floor((x - ROLL_X) / cellw);
      const mrow = NROWS - 1 - Math.floor((y - (ysv + ROLL_Y)) / rollrh);
      const ron = ronOff(gsi), rdg = rdgOff(gsi);
      if (mcol >= 0 && mcol < sget(gsi, 2)) {
        if (m[ron + mcol] && m[rdg + mcol] === mrow) {
          m[ron + mcol] = 0;
          dragMode = 7;
        } else {
          m[ron + mcol] = 1;
          m[rdg + mcol] = mrow;
          dragMode = 6;
          setStatus(rollLabel(gsi, mrow));
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
      // USR lanes: the LPT slot becomes CRP (sample start %, LFO-able)
      if (smpA[ml] === SMP_USR && uiF === 13) {
        if (armLfo) { tryModAssign(DCRP_A + ml); return; }
        dragLane = ml; dragY = y;
        dragFx = DCRP_A + ml;
        dragV = m[dragFx];
        dragMode = 43;
        return;
      }
      // SYN lanes reclaim the LFO slots for the drum voice: NSE/SWP/SUB/CLK
      if (smpA[ml] === SMP_SYN && uiF >= 10 && uiF <= 13) {
        const doff = [DNSE_A, DSWP_A, DSUB_A, DCLK_A][uiF - 10] + ml;
        if (armLfo) { tryModAssign(doff); return; }
        dragLane = ml; dragY = y;
        dragFx = doff;
        dragV = m[dragFx];
        dragMode = 43;
        return;
      }
      dragF = DFIELDS[uiF][1];
      if (armLfo) {
        if (typeof dragF === 'number') tryModAssign(PARAM_OFF[dragF] + ml);
        else setStatus('that field can\u2019t take an LFO');
        return;
      }
      dragLane = ml; dragY = y;
      dragV = dragF === 'smp' ? 0 : getParam(ml, dragF);
      dragMode = dragF === 5 ? 8 : 1;
    } else if (x >= xMute && x < xMute + 18) {
      m[MUTE_A + ml] = m[MUTE_A + ml] ? 0 : 1; touchState();
    } else if (x >= xSolo && x < xSolo + 18) {
      m[SOLO_LANE + ml] = m[SOLO_LANE + ml] ? 0 : 1; touchState();
      setStatus(m[SOLO_LANE + ml] ? `lane ${ml + 1} SOLO — only soloed channels sound` : `lane ${ml + 1} solo off`);
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
  // header: ALT/right-click a preset slot stores the current groove into it
  if (y < 28) {
    for (let i = 0; i < 3; i++)
      if (inRect(x, y, PRE_RS[i])) { storePreset(PRESET_IDS[i]); return; }
    return;
  }

  // lane SMP field: ALT/right-click loads a local audio file into the lane
  const rml = Math.floor((y - laneTop) / rowh);
  if (rml >= 0 && rml < numLanes && y >= laneTop && y < yBtn()
      && x >= xFields && x < xFields + fieldw) {
    loadUserSample(rml);
    return;
  }
  // synth ENG button (row 2): ALT/right-click loads a splice sample
  for (let gsi = 0; gsi < NSYN; gsi++) {
    const ysv = ys(gsi);
    if (y >= ysv + rowh && y < ysv + 2 * rowh && x >= xEuc && x < xEuc + 32) {
      loadSpliceSample(gsi);
      return;
    }
  }

  // rolls: cycle normal -> orange every-2nd-cycle -> off; empty = erase drag
  for (let gsi = 0; gsi < NSYN; gsi++) {
    const ysv = ys(gsi);
    // right-click the XY scope = reset the bass shaper to clean
    if (gsi === 0 && x >= 1000 && x < 1248 && y >= ysv + 4 && y < ysv + 184) {
      m[XY_DRV] = 0; m[XY_SKW] = 0;
      touchState();
      setStatus('bass shape reset — clean waveform');
      return;
    }
    // right-drag inside the Game of Life = erase cells
    if (gsi === 1 && x >= 1000 && x < 1000 + GOL_W * 8 && y >= ysv + 4 && y < ysv + 4 + GOL_H * 8) {
      const gc = Math.floor((x - 1000) / 8), gr2 = Math.floor((y - (ysv + 4)) / 8);
      golGrid[gr2 * GOL_W + gc] = 0;
      golPaintV = 0;
      dragMode = 50;
      return;
    }
    if (y >= ysv + ROLL_Y && y < ysv + ROLL_Y + NROWS * rollrh
        && x >= ROLL_X && x < ROLL_X + MAX_STEPS * cellw) {
      const mcol = Math.floor((x - ROLL_X) / cellw);
      const mrow = NROWS - 1 - Math.floor((y - (ysv + ROLL_Y)) / rollrh);
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
    const mcol = Math.floor((x - ROLL_X) / cellw);
    const mrow = NROWS - 1 - Math.floor((y - (ysv + ROLL_Y)) / rollrh);
    if (mcol >= 0 && mcol < sget(dragSynth, 2) && mrow >= 0 && mrow < NROWS) {
      m[ronOff(dragSynth) + mcol] = 1;
      m[rdgOff(dragSynth) + mcol] = mrow;
      setStatus(rollLabel(dragSynth, mrow));
    }
  } else if (dragMode === 7) {
    const mcol = Math.floor((x - ROLL_X) / cellw);
    if (mcol >= 0 && mcol < sget(dragSynth, 2)) m[ronOff(dragSynth) + mcol] = 0;
  } else if (dragMode === 30) {
    const c = dragFx;
    let nv = dragV + d * c.step;
    nv = Math.round(nv / c.step) * c.step;
    m[c.off] = Math.max(c.min, Math.min(c.max, nv));
  } else if (dragMode === 42) {
    // splice crop / tune fields (dragFx is a raw mem offset here)
    const tune = dragFx >= SPL_TUNE_A && dragFx < SPL_TUNE_A + 3;
    m[dragFx] = tune ? Math.max(-12, Math.min(12, dragV + Math.floor(d / 2)))
      : Math.max(0, Math.min(100, dragV + d));
  } else if (dragMode === 43) {
    // synth-drum voice fields (NSE/SWP/SUB/CLK), 0..100
    m[dragFx] = Math.max(0, Math.min(100, dragV + d));
  } else if (dragMode === 44) {
    // SENDS matrix mini-knob (vertical drag, 0..100)
    m[dragFx] = Math.max(0, Math.min(100, dragV + d * 2));
  } else if (dragMode === 50) {
    // paint the Game of Life
    const ysv = ys(1);
    if (x >= 1000 && x < 1000 + GOL_W * 8 && y >= ysv + 4 && y < ysv + 4 + GOL_H * 8) {
      const gc = Math.floor((x - 1000) / 8), gr2 = Math.floor((y - (ysv + 4)) / 8);
      golGrid[gr2 * GOL_W + gc] = golPaintV;
    }
    return;
  } else if (dragMode === 52) {
    // tweeze the bass on the XY scope: up = more drive, right = more skew
    m[XY_DRV] = Math.max(0, Math.min(100, dragV + (dragY - y) * 0.75));
    m[XY_SKW] = Math.max(-50, Math.min(50, dragV2 + (x - dragX) * 0.5));
  } else if (dragMode === 51) {
    // drag a dome ball: pointer angle around the head -> azimuth
    const cx = 868, cy = fxY() + 150;
    let deg = Math.atan2(x - cx, -(y - cy)) * 180 / Math.PI;
    deg = Math.max(-180, Math.min(180, Math.round(deg / 5) * 5));
    m[PAN_AZ_A + dragLane] = deg;
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
      const k = smpA[dragLane];
      setStatus(`lane ${dragLane + 1} sample: ${SAMPLE_DEFS[k].label}`
        + (k === SMP_SYN ? ' — synth drum: PIT/GATE/LPF shape it, NSE/SWP/SUB/CLK on the LFO slots'
          : k === SMP_USR ? (userSmp[dragLane] ? ` (“${userSmp[dragLane].name}”)` : ' — ALT-tap SMP to load a file')
          : ''));
    } else if (dragMode === 1 && dragF === 13) {
      m[LSHAPE_A + dragLane] = (m[LSHAPE_A + dragLane] + 1) % 5;
      setStatus(`lane ${dragLane + 1} LFO shape: ${SHAPE_NAMES[m[LSHAPE_A + dragLane]]}`);
    } else if (dragMode === 5 && dragF === 1) {
      sset(dragSynth, 1, sget(dragSynth, 1) + 1);
      setStatus(`${SYN_NAMES[dragSynth]} scale: ${SCALE_NAMES[sget(dragSynth, 1)]}` +
        (m[LOCK_A + dragSynth] ? '  (locked to master key - unlock to use)' : ''));
    } else if (dragMode === 10 && dragF === 6) {
      sset(dragSynth, 18, (sget(dragSynth, 18) + 1) % 5);
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
  golFrame();   // evolve + seed the melody's life colony
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

  undoStack.length ? set(0.26, 0.26, 0.32) : set(0.18, 0.18, 0.2);
  rect(...UNDO_R);
  set(undoStack.length ? 0.85 : 0.4, undoStack.length ? 0.85 : 0.4, 0.9);
  textC('⤺', UNDO_R[0], UNDO_R[0] + UNDO_R[2], 8, '14px Arial');
  redoStack.length ? set(0.26, 0.26, 0.32) : set(0.18, 0.18, 0.2);
  rect(...REDO_R);
  set(redoStack.length ? 0.85 : 0.4, redoStack.length ? 0.85 : 0.4, 0.9);
  textC('⤼', REDO_R[0], REDO_R[0] + REDO_R[2], 8, '14px Arial');
  set(0.24, 0.3, 0.36); rect(...SHEET_R);
  set(0.82, 0.9, 0.95); textC('♪ PDF', SHEET_R[0], SHEET_R[0] + SHEET_R[2], 9, F11);
  // preset slots: lit when stored; tap recalls, ALT/right-click stores
  for (let i = 0; i < 3; i++) {
    const r = PRE_RS[i], used = !!presets[PRESET_IDS[i]];
    used ? set(0.3, 0.42, 0.3) : set(0.18, 0.19, 0.21);
    rect(...r);
    used ? set(0.85, 0.95, 0.85) : set(0.45, 0.46, 0.5);
    textC(PRESET_IDS[i], r[0], r[0] + r[2], 9, F11);
  }
  set(0.24, 0.28, 0.34); rect(...PEXP_R);
  set(0.8, 0.85, 0.9); textC('⇩', PEXP_R[0], PEXP_R[0] + PEXP_R[2], 8, '14px Arial');
  set(0.24, 0.28, 0.34); rect(...PIMP_R);
  set(0.8, 0.85, 0.9); textC('⇧', PIMP_R[0], PIMP_R[0] + PIMP_R[2], 8, '14px Arial');

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

    const laneReady = smpA[gl] === SMP_SYN || decoded[smpA[gl]]
      || (smpA[gl] === SMP_USR && userSmp[gl]);
    if (laneReady) { set(0.35, 0.8, 0.4); rect(2, ry + 4, 4, 32); }

    // SYN lanes reclaim the LFO slots for the drum voice: NSE/SWP/SUB/CLK;
    // USR lanes turn LPT into CRP (sample start)
    const isSyn = smpA[gl] === SMP_SYN;
    const isUsr = smpA[gl] === SMP_USR;
    for (let gf = 0; gf < 17; gf++) {
      const fx = xFields + gf * fieldw;
      const synF = isSyn && gf >= 10 && gf <= 13;
      const usrF = isUsr && gf === 13;
      (synF || usrF) ? set(0.24, 0.21, 0.3) : set(0.19, 0.19, 0.21);
      rect(fx, ry + 4, fieldw - 4, 32);
      set(0.45, 0.45, 0.5);
      textC(synF ? ['NSE', 'SWP', 'SUB', 'CLK'][gf - 10] : usrF ? 'CRP' : DFIELDS[gf][0],
        fx, fx + fieldw - 4, ry + 5, F10);
      set(0.85, 0.85, 0.85);
      const f = DFIELDS[gf][1];
      let v;
      if (synF) v = String(m[[DNSE_A, DSWP_A, DSUB_A, DCLK_A][gf - 10] + gl]);
      else if (usrF) v = m[DCRP_A + gl] + '%';
      else if (f === 'smp') v = SAMPLE_DEFS[smpA[gl]].label;
      else if (f === 3) v = fmtG(m[SPAN_A + gl]);
      else if (f === 7) v = m[GATE_A + gl] + '%';
      else if (f === 9) v = m[LPF_A + gl] >= 100 ? '---' : String(m[LPF_A + gl]);
      else if (f === 11) v = fmtG(m[LRATE_A + gl]);
      else if (f === 13) v = ['SIN', 'TRI', 'SW↓', 'S&H', 'SW↑'][m[LSHAPE_A + gl]];
      else v = String(getParam(gl, f));
      textC(v, fx, fx + fieldw - 4, ry + 18, F13);
      if (synF) modTick([DNSE_A, DSWP_A, DSUB_A, DCLK_A][gf - 10] + gl, fx, fieldw - 4, ry + 4);
      else if (usrF) modTick(DCRP_A + gl, fx, fieldw - 4, ry + 4);
      else if (typeof f === 'number') modTick(PARAM_OFF[f] + gl, fx, fieldw - 4, ry + 4);
    }

    m[MUTE_A + gl] ? set(0.75, 0.25, 0.25) : set(0.25, 0.25, 0.28);
    rect(xMute, ry + 4, 18, 32);
    set(0.9, 0.9, 0.9); textC('M', xMute, xMute + 18, ry + 12, F12);

    m[SOLO_LANE + gl] ? set(0.8, 0.62, 0.15) : set(0.25, 0.25, 0.28);
    rect(xSolo, ry + 4, 18, 32);
    m[SOLO_LANE + gl] ? set(0.15, 0.12, 0.05) : set(0.9, 0.9, 0.9);
    textC('S', xSolo, xSolo + 18, ry + 12, F12);

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

  // style selector + GEN KEY button. RND (per part) stays purely random;
  // GEN KEY writes musical parts that match the key + this style.
  const stName = STYLE_NAMES[m[GEN_STYLE] || 0];
  set(0.26, 0.26, 0.3);
  rect(STYLE_X, yb, STYLE_W, 18);
  set(0.8, 0.8, 0.9);
  textC('STYLE: ' + stName, STYLE_X, STYLE_X + STYLE_W, yb + 3, F11);
  set(0.3, 0.42, 0.34);
  rect(GENKEY_X, yb, GENKEY_W, 18);
  set(0.85, 0.95, 0.88);
  textC('GEN KEY ▸', GENKEY_X, GENKEY_X + GENKEY_W, yb + 3, F11);
  set(0.3, 0.26, 0.2); rect(756, yb, 66, 18);
  set(0.9, 0.8, 0.55); textC('WIKI ▸ DR', 756, 822, yb + 3, F10);
  set(0.26, 0.22, 0.3); rect(826, yb, 66, 18);
  set(0.85, 0.75, 0.95); textC('78s ▸ DR', 826, 892, yb + 3, F10);

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
      modTick(sp + gf, fx, fieldw - 4, ysv + 4);
    }

    m[sp + 11] ? set(0.75, 0.25, 0.25) : set(0.25, 0.25, 0.28);
    rect(xMute, ysv + 4, 18, 32);
    set(0.9, 0.9, 0.9); textC('M', xMute, xMute + 18, ysv + 12, F12);

    m[SOLO_SYN + gsi] ? set(0.8, 0.62, 0.15) : set(0.25, 0.25, 0.28);
    rect(xSolo, ysv + 4, 18, 32);
    m[SOLO_SYN + gsi] ? set(0.15, 0.12, 0.05) : set(0.9, 0.9, 0.9);
    textC('S', xSolo, xSolo + 18, ysv + 12, F12);

    set(0.3, 0.24, 0.34); rect(xEuc, ysv + 4, 32, 32);
    set(0.9, 0.75, 0.95); textC('RND', xEuc, xEuc + 32, ysv + 12, F12);

    m[sp + 15] ? set(0.42, 0.28, 0.5) : set(0.22, 0.28, 0.38);
    rect(xMode, ysv + 4, 26, 32);
    set(0.85, 0.85, 0.9); textC(m[sp + 15] ? 'PM' : 'PR', xMode, xMode + 26, ysv + 12, F12);

    // row 2 (14 fields; SYN/MID toggle gone - always the internal synth).
    // With the splice engine the WAV/RATE/DEP/SHP slots become CRP◀ / CRP▶ /
    // TUNE / TRK (crop window, fine tune, pitch-track toggle).
    const isSpl = m[ENG_A + gsi] === 3;
    for (let gf = 0; gf < 14; gf++) {
      const fx = xFields + gf * fieldw;
      const splF = isSpl && gf >= 3 && gf <= 6;
      splF ? set(0.24, 0.21, 0.3) : set(0.21, 0.19, 0.23);
      rect(fx, ysv + rowh + 4, fieldw - 4, 32);
      set(0.5, 0.45, 0.5);
      textC(splF ? ['CRP◀', 'CRP▶', 'TUNE', 'TRK'][gf - 3] : S2FIELDS[gf],
        fx, fx + fieldw - 4, ysv + rowh + 5, F10);
      (glk && gf >= 12) ? set(0.5, 0.5, 0.55) : set(0.85, 0.85, 0.85);
      let v;
      if (splF) {
        v = gf === 3 ? m[SPL_ST_A + gsi] + '%'
          : gf === 4 ? m[SPL_EN_A + gsi] + '%'
          : gf === 5 ? (m[SPL_TUNE_A + gsi] > 0 ? '+' : '') + m[SPL_TUNE_A + gsi]
          : m[SPL_MODE_A + gsi] ? 'FIX' : 'TRK';
      }
      else if (gf === 0) v = m[sp + 12] >= 100 ? '---' : String(m[sp + 12]);
      else if (gf === 3) v = m[sp + 19] <= 0 ? 'SIN' : m[sp + 19] >= 100 ? 'SAW' :
        m[sp + 19] === 50 ? 'TRI' : String(m[sp + 19]);
      else if (gf === 4) v = fmtG(m[sp + 16]);
      else if (gf === 6) v = ['SIN', 'TRI', 'SW↓', 'S&H', 'SW↑'][m[sp + 18]];
      else if (gf === 7) v = ['AD', 'HLD', 'LAT'][m[sp + 20]];
      else if (gf === 11) v = ['STR', 'TRP', 'DOT'][m[SFL_A + gsi]];
      else if (gf === 12) v = m[sp + 22] > 0 ? 'P' + m[sp + 22] : 'off';
      else if (gf === 13) v = fmtG(m[sp + 23]);
      else v = String(sget(gsi, r2map(gf)));
      textC(v, fx, fx + fieldw - 4, ysv + rowh + 18, F13);
      if (splF && gf < 6) modTick([SPL_ST_A, SPL_EN_A, SPL_TUNE_A][gf - 3] + gsi, fx, fieldw - 4, ysv + rowh + 4);
      else if (!splF) modTick(sp + r2map(gf), fx, fieldw - 4, ysv + rowh + 4);
    }

    // ENG: per-synth engine selector (in the freed SYN/MID slot);
    // green dot = a splice sample is loaded, ALT-tap loads one
    const eng = m[ENG_A + gsi];
    eng === 1 ? set(0.28, 0.4, 0.5) : eng === 2 ? set(0.46, 0.4, 0.28)
      : eng === 3 ? set(0.36, 0.28, 0.44) : set(0.28, 0.3, 0.34);
    rect(xEuc, ysv + rowh + 4, 32, 32);
    if (splSmp[gsi]) { set(0.4, 0.85, 0.45); rect(xEuc + 26, ysv + rowh + 6, 4, 4); }
    set(0.9, 0.92, 0.95);
    textC(['OSC', 'STR', 'GLS', 'SPL'][eng], xEuc, xEuc + 32, ysv + rowh + 12, F12);
    if (eng === 3) {   // crate digs: every tap swaps in a fresh find
      set(0.3, 0.26, 0.2); rect(516, ysv + rowh + 4, 40, 32);
      set(0.9, 0.8, 0.55); textC('WIKI', 516, 556, ysv + rowh + 12, F12);
      set(0.26, 0.22, 0.3); rect(560, ysv + rowh + 4, 40, 32);
      set(0.85, 0.75, 0.95); textC('78s', 560, 600, ysv + rowh + 12, F12);
    }

    if (gsi === 2) {
      m[sp + 24] ? set(0.4, 0.32, 0.24) : set(0.24, 0.24, 0.27);
      rect(xMode, ysv + rowh + 4, 26, 32);
      set(0.9, 0.85, 0.75);
      textC(m[sp + 24] ? '7TH' : '3RD', xMode, xMode + 26, ysv + rowh + 12, F12);
    }

    // info panel: chords get the pitch wheel, others get text
    // ---- right column: caption text + a visual per section ----
    const rys = ysv + 4;
    if (gsi === 2) {
      const wcx = 1140, wcy = ysv + 96, wr = 56;
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
        circle(wcx + Math.cos(wang) * (wr - 10), wcy + Math.sin(wang) * (wr - 10), 5, true);
      }
      if (gsndM >= 0) {
        const wang = gsndM / 1200 * 2 * Math.PI - Math.PI / 2;
        set(0.25, 0.75, 0.7);
        circle(wcx + Math.cos(wang) * (wr - 20), wcy + Math.sin(wang) * (wr - 20), 5, true);
      }
      for (let gd = 0; gd < gsndCn; gd++) {
        const wang = gsndC[gd] / 1200 * 2 * Math.PI - Math.PI / 2;
        set(0.6, 0.45, 0.85);
        circle(wcx + Math.cos(wang) * (wr - 30), wcy + Math.sin(wang) * (wr - 30), 4, true);
      }
      const spv = m[WHL_SPIN] || 0;
      spv ? set(0.4, 0.32, 0.5) : set(0.24, 0.24, 0.27);
      rect(1096, ysv + 160, 88, 18);
      set(0.88, 0.82, 0.95);
      textC('SPIN ' + ['OFF', '4B', '2B', '1B'][spv], 1096, 1184, ysv + 163, F10);
      set(0.45, 0.45, 0.5); text('pitch wheel', RC_X, rys, F10);
      set(0.85, 0.6, 0.2); text('bass', RC_X, rys + 16, F10);
      set(0.25, 0.75, 0.7); text('melody', RC_X + 34, rys + 16, F10);
      set(0.6, 0.45, 0.85); text('chords', RC_X + 80, rys + 16, F10);
      set(0.45, 0.45, 0.5);
      text('roll = chord ROOT degree', RC_X, rys + 40, F11);
      text('right-click / ALT-tap note:', RC_X, rys + 56, F11);
      text('orange = every 2nd cycle', RC_X, rys + 72, F11);
      set(0.55, 0.6, 0.6);
      text(`scale: ${SCALE_NAMES[effScale(2)]}${glk ? ' (key)' : ''}`, RC_X, rys + 96, F11);
      set(0.45, 0.45, 0.5);
      text('SPIN walks the chord root', RC_X, rys + 120, F11);
      text('around the wheel as it plays', RC_X, rys + 136, F11);
    } else {
      set(0.55, 0.6, 0.6);
      text(`scale: ${SCALE_NAMES[effScale(gsi)]}${glk ? ' (key)' : ''}`, RC_X, rys, F11);
      set(0.45, 0.45, 0.5);
      text('click place / re-click clear', RC_X, rys + 18, F11);
      text('right-click / ALT-tap note:', RC_X, rys + 34, F11);
      text('plays every 2nd cycle', RC_X, rys + 50, F11);
      text('rows = degrees, bottom = BASE', RC_X, rys + 66, F11);
      if (gsi === 0) {
        set(0.55, 0.6, 0.6);
        text('the scope IS a pedal: drag it', RC_X, rys + 92, F11);
        text('up = drive · right = skew', RC_X, rys + 108, F11);
        text('right-click resets clean', RC_X, rys + 124, F11);
      }
    }
    if (gsi === 0) {
      // XY oscilloscope: the bass waveform against a delayed copy of itself
      // (sines trace ellipses; saws and squares trace angular figures)
      set(0.14, 0.15, 0.17); rect(1000, rys, 248, 180);
      set(0.3, 0.32, 0.36);
      rect(1000, rys, 248, 1); rect(1000, rys + 179, 248, 1);
      rect(1000, rys, 1, 180); rect(1247, rys, 1, 180);
      set(0.45, 0.45, 0.5); text('XY scope', 1006, rys + 4, F10);
      modTick(XY_DRV, 1000, 124, rys); modTick(XY_SKW, 1124, 124, rys);
      const xdrv = Math.round(m[XY_DRV]), xskw = Math.round(m[XY_SKW]);
      if (xdrv || xskw) {
        set(0.85, 0.7, 0.3);
        text(`drv ${xdrv} · skw ${xskw > 0 ? '+' : ''}${xskw}`, 1006, rys + 164, F10);
      }
      if (scopeArr && scopeArr.length >= 240) {
        const cx = 1124, cy = rys + 92;
        let pk = 0.02;
        for (let i = 0; i < 240; i++) { const a = Math.abs(scopeArr[i]); if (a > pk) pk = a; }
        const sc = 78 / pk;
        ctx.strokeStyle = 'rgba(80,220,210,0.9)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < 200; i++) {
          const px = cx + Math.max(-118, Math.min(118, scopeArr[i] * sc));
          const py = cy + Math.max(-84, Math.min(84, scopeArr[i + 40] * sc));
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    } else if (gsi === 1) {
      // Game of Life colony (HighLife): paint it, or let the melody seed it
      set(0.14, 0.15, 0.17); rect(1000, rys, GOL_W * 8, GOL_H * 8);
      for (let r = 0; r < GOL_H; r++) for (let c = 0; c < GOL_W; c++) {
        if (golGrid[r * GOL_W + c]) {
          set(0.35, 0.8, 0.5);
          rect(1000 + c * 8 + 1, rys + r * 8 + 1, 6, 6);
        }
      }
      set(0.3, 0.32, 0.36);
      rect(1000, rys, GOL_W * 8, 1); rect(1000, rys + GOL_H * 8 - 1, GOL_W * 8, 1);
      rect(1000, rys, 1, GOL_H * 8); rect(1000 + GOL_W * 8 - 1, rys, 1, GOL_H * 8);
      const by2 = rys + GOL_H * 8 + 4;
      set(0.3, 0.24, 0.24); rect(1000, by2, 44, 18);
      set(0.9, 0.8, 0.8); textC('CLR', 1000, 1044, by2 + 3, F10);
      golGrow ? set(0.35, 0.55, 0.3) : set(0.22, 0.28, 0.24);
      rect(1048, by2, 60, 18);
      set(0.85, 0.95, 0.85); textC('GROW', 1048, 1108, by2 + 3, F10);
      set(0.24, 0.27, 0.32); rect(1112, by2, 52, 18);
      set(0.85, 0.9, 0.95); textC(GOL_RATE_LBL[golRate], 1112, 1164, by2 + 3, F10);
      set(0.45, 0.45, 0.5);
      text('paint it · melody seeds it · GROW writes notes · ×N speed', 1000, by2 + 24, F10);
    }
    // roll (under the control rows)
    const gyr = ysv + ROLL_Y;
    const nst = m[sp + 2];
    const msd = (m[sp + 15] ? m[sp + 3] / 16 : m[sp + 3] / nst) * FEL_MULT[m[SFL_A + gsi]];
    const mplay = playing ? ((Math.floor(dispBeat / msd) % nst) + nst) % nst : -1;
    const mcnt = Math.max(1, SCL[effScale(gsi)][0]);
    const mspb = 1 / msd;
    const mbt = (Math.abs(mspb - Math.floor(mspb + 0.5)) < 1e-6 && mspb >= 1)
      ? Math.floor(mspb + 0.5) : 0;
    for (let gi = 0; gi < nst; gi++) {
      const cx = ROLL_X + gi * cellw;
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
  text('PRE = sends ignore the faders · FEED taps the whole mix · SENDS + SPACE + MOD live on the right', 78, fy + 7, F10);
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
    // routing tint: a live send (matrix cell > 0) glows so you can see at a
    // glance which instruments feed which fx
    const isSend = cell.off >= SND_MTX && cell.off < SND_MTX + 12;
    const live = isSend && m[cell.off] > 0;
    live ? set(0.16, 0.34, 0.36) : set(0.2, 0.21, 0.24);
    rect(cell.x, cell.y, cell.w, 30);
    live ? set(0.55, 0.85, 0.85) : set(0.45, 0.46, 0.5);
    textC(cell.label, cell.x, cell.x + cell.w, cell.y + 2, F10);
    if (live) set(0.75, 0.95, 0.95);
    else set(fxLit ? 0.85 : 0.6, fxLit ? 0.85 : 0.6, fxLit ? 0.88 : 0.62);
    textC(fxFmt(cell.fmt, m[cell.off]), cell.x, cell.x + cell.w, cell.y + 15, F12);
    modTick(cell.off, cell.x, cell.w, cell.y);
  }
  // ---- FX right column: ARM buttons, SENDS matrix, 3D dome ----
  {
    const a1 = armRect(1), a2 = armRect(2);
    armLfo === 1 ? set(0.95, 0.72, 0.25) : set(0.32, 0.28, 0.2);
    rect(...a1);
    armLfo === 1 ? set(0.15, 0.1, 0.02) : set(0.95, 0.85, 0.6);
    textC(armLfo === 1 ? 'L1⦿' : 'L1', a1[0], a1[0] + a1[2], a1[1] + 8, F11);
    armLfo === 2 ? set(0.3, 0.85, 0.85) : set(0.2, 0.3, 0.32);
    rect(...a2);
    armLfo === 2 ? set(0.02, 0.14, 0.15) : set(0.7, 0.95, 0.95);
    textC(armLfo === 2 ? 'L2⦿' : 'L2', a2[0], a2[0] + a2[2], a2[1] + 8, F11);

    // SENDS matrix: mini circular faders, part rows x fx columns
    set(0.5, 0.52, 0.56); text('SENDS', 1000, fy + 6, F10);
    const FXCOL = ['DLY', 'GLI', 'GRN'], PROW = ['DR', 'BS', 'ML', 'CH'];
    for (let f = 0; f < 3; f++) {
      set(0.45, 0.46, 0.5);
      textC(FXCOL[f], 1050 + f * 42 - 16, 1050 + f * 42 + 16, fy + 6, F10);
    }
    for (let p = 0; p < 4; p++) {
      set(0.45, 0.46, 0.5); text(PROW[p], 1004, fy + 30 + p * 26, F10);
      for (let f = 0; f < 3; f++) {
        const [kx, ky] = sndKnobXY(p, f);
        const off = SND_MTX + p * 3 + f, v = m[off] / 100;
        v > 0 ? set(0.16, 0.34, 0.36) : set(0.2, 0.21, 0.24);
        circle(kx, ky, 9, true);
        set(0.32, 0.34, 0.38); circle(kx, ky, 9, false);
        if (v > 0) {
          ctx.strokeStyle = 'rgba(120,230,225,0.95)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(kx, ky, 9, Math.PI * 0.75, Math.PI * 0.75 + v * Math.PI * 1.5);
          ctx.stroke();
        }
        const mk = modMaskFor(off);
        if (mk & 1) { set(0.95, 0.72, 0.25); rect(kx + 7, ky - 12, 4, 4); }
        if (mk & 2) { set(0.3, 0.85, 0.85); rect(kx + 7, ky - 6, 4, 4); }
      }
    }
    set(0.45, 0.45, 0.5); text('drag ↕', 1186, fy + 56, F10);

    // 3D dome: top-down head, one ball per part at its live azimuth. Balls
    // pulse with energy, FRC physics shoves them, and they repel each other.
    const cx = 868, cy = fy + 150;
    set(0.26, 0.28, 0.32); circle(cx, cy, 105, false);
    set(0.2, 0.21, 0.24); circle(cx, cy, 78, false);
    set(0.3, 0.32, 0.36);
    rect(cx - 105, cy, 210, 1); rect(cx, cy - 105, 1, 210);
    set(0.5, 0.52, 0.56);
    textC('FRONT', cx - 24, cx + 24, cy - 122, F10);
    set(0.35, 0.37, 0.4); circle(cx, cy, 10, true);   // the head
    const BCOL = [[1, 0.65, 0.3], [0.3, 0.85, 0.85], [0.35, 0.8, 0.45], [0.85, 0.55, 0.85]];
    const BLBL = ['DR', 'BS', 'ML', 'CH'];
    for (let p = 0; p < 4; p++) {
      const a = (azv[p] || 0) * Math.PI / 180;
      const bx = cx + Math.sin(a) * 78, by = cy - Math.cos(a) * 78;
      const br = 8 + (enerArr[p] || 0) * 10;
      set(BCOL[p][0] * 0.4, BCOL[p][1] * 0.4, BCOL[p][2] * 0.4);
      circle(bx, by, br + 3, true);
      set(...BCOL[p]);
      circle(bx, by, br, true);
      set(0.05, 0.05, 0.08);
      textC(BLBL[p], bx - 12, bx + 12, by - 5, F10);
    }
    set(0.45, 0.45, 0.5);
    text('drag a ball to place it · FRC shoves it · BNC = bounce', 748, fy + 272, F10);
  }

  // status / hint line (bottom)
  if (haveStatus) { set(0.7, 0.85, 0.7); text(statusText, 8, yStat(), F11); }
  else {
    set(0.45, 0.45, 0.5);
    text('drag fields · tap ENG to pick classic/string/glass · right-click notes for 2nd-cycle · sends / space / mod + the dome live right of the FX rack', 8, yStat(), F11);
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
committed = snapshot();                                   // undo baseline
// desktop = the canvas (all on one page); pocket = the DOM tab layout.
if (usePocket) document.body.classList.add('pocket');
else requestAnimationFrame(draw);

// keyboard undo/redo (desktop)
document.addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey)) return;
  const k = e.key.toLowerCase();
  if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (k === 'y') { e.preventDefault(); redo(); }
});

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
  samplesMsg: () => smpA.map((k, lane) => {
    if (k === SMP_SYN) return { type: 'sample', lane, synth: true };
    const s = k === SMP_USR ? userSmp[lane] : decoded[k];
    return s
      ? { type: 'sample', lane, data: s.data, nch: s.nch, sr: s.sr, len: s.len }
      : { type: 'sample', lane, data: null };
  }).concat(splSmp.map((s, si) => s
    ? { type: 'ssmp', si, data: s.data, sr: s.sr, len: s.len }
    : { type: 'ssmp', si, data: null })),
  loadUserSample, loadSpliceSample, setUserSample, setSpliceSample, digSample,
  modToggle, modTargets, modMaskFor, modTargetName,
  get userSmp() { return userSmp; }, get splSmp() { return splSmp; },
  get scopeArr() { return scopeArr; }, get azv() { return azv; },
  get enerArr() { return enerArr; },
  get golGrid() { return golGrid; }, get golGrow() { return golGrow; },
  get golRate() { return GOL_RATES[golRate]; },
  golStepOnce: golStep,
  initAudio, togglePlay,
  undo, redo,
  get canUndo() { return undoStack.length > 0; },
  get canRedo() { return redoStack.length > 0; },
  storePreset, recallPreset, downloadPreset, importToPreset, importCurrent,
  presetUsed(id) { return !!presets[id]; },
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
    SND_MTX, MUTE_SYN, SOLO_LANE, SOLO_SYN, SND_PRE, DCRP_A, PAN_AZ_A, PAN_FRC_A,
    SPL_ST_A, SPL_EN_A, SPL_MODE_A, SPL_TUNE_A,
    DNSE_A, DSWP_A, DSUB_A, DCLK_A, SMP_SYN, SMP_USR, BPM_WOB, BPM_WRT,
    MLFO_A, MOD_TGT_A, MOD_MSK_A, MOD_SLOTS,
    PAN_BNC, XY_DRV, XY_SKW, WHL_SPIN,
  },
  tables: { SCALE_NAMES, PROG_NAMES, SHAPE_NAMES, SYN_NAMES, FEEL_NAMES, SCL, STYLE_NAMES },
  SAMPLE_DEFS,
  noteName, rollLabel, getParam, setParam, sget, sset, ronOff, rdgOff, effScale, effBase,
  buildScoreModel, setStatus,
  applyEuclid, applySynEuclid, rotatePat, rotateSyn, synGenerate, synKeyGen, dealEuclid, setStyle,
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
