// SuperGnome web — audio engine (AudioWorkletProcessor).
// A port of sequencer_supergnome.jsfx @init/@block/@sample with the MIDI and
// 24-channel stem paths removed: everything sounds through the internal
// synths and sample voices, summed to stereo with per-part gains.
//
// The musical state lives in a flat Float64Array `m` using the SAME offsets
// as the JSFX serialized memory block (0..727), so code ports line-for-line
// and the UI thread can ship the whole block over in one message.

'use strict';

const LANES_CAP = 8, MAX_STEPS = 32, NROWS = 12, NSYN = 3;

// ---- mem offsets (mirror of the JSFX block; keep in sync with gnome.js) ----
const PAT = 0, STEPS_A = 272, SPAN_A = 280, PUL_A = 288,
  VEL_A = 304, GATE_A = 312, MUTE_A = 320, LMODE_A = 336, PIT_A = 344,
  LPF_A = 352, BASS_ON = 360, BASS_DEG = 392, BASS_P = 424, MEL2_ON = 448,
  MEL2_DEG = 480, MEL_P = 512, LRATE_A = 536, LDEP_A = 544, LSHAPE_A = 552,
  FENV_A = 568, CHD_P = 576, CHD_ON = 608, CHD_DEG = 640, LPT_A = 672,
  SWG_A = 680, NDG_A = 688, VHM_A = 696, SSW_A = 704, SND_A = 708,
  SFL_A = 712, GKEY_NOTE = 716, GKEY_SCALE = 717, GKEY_PROG = 718,
  GKEY_SPD = 719, LOCK_A = 720, HML_A = 724;

// ---- web-only region (>= 728; extends the JSFX block, kept in gnome.js) ----
const MEM = 864;
// per-synth engine: 0 classic osc, 1 plucked string, 2 blown glass (3 slots)
const ENG_A = 728;
// FX rack (delay -> avocado glitch -> clouds) fed by the full mix + sends
const FX_ON = 736, DLY_ON = 737, DLY_TIME = 738, DLY_FB = 739, DLY_TONE = 740,
  DLY_WOW = 741, FX_FEED = 742, AVO_ON = 743, AVO_AMT = 744, AVO_RATE = 745,
  AVO_CRUSH = 746, AVO_MIX = 747, DLY_PITCH = 748, DLY_REV = 749;
// legacy single-bus send (superseded by SND_MTX; kept for offset alignment)
const SEND_A = 752;
// per-synth glass harmonic-cycle rate (3 slots)
const GLC_A = 756;
// Clouds granular reverb
const CLD_ON = 760, CLD_MIX = 761, CLD_SIZE = 762, CLD_DENS = 763,
  CLD_PITCH = 764, CLD_SPREAD = 765, CLD_REVERB = 766, CLD_REVG = 767;
// routing matrix: part (0 drums,1 bass,2 melody,3 chords) × fx (0 delay,
// 1 glitch, 2 clouds) send = SND_MTX + part*3 + fx
const SND_MTX = 768;
// live-perform mute/solo (drum lanes reuse MUTE_A) + pre-fader send switch
const MUTE_SYN = 780, SOLO_LANE = 783, SOLO_SYN = 791, SND_PRE = 794;
// splice sampler (per synth): crop %, pitch mode, fine tune
const SPL_ST_A = 800, SPL_EN_A = 803, SPL_MODE_A = 806, SPL_TUNE_A = 809;
// synth drum voice (per lane): noise mix, pitch sweep, 30Hz sub, click
const DNSE_A = 812, DSWP_A = 820, DSUB_A = 828, DCLK_A = 836;
// global tempo wobble: amount (% depth) + period (beats per cycle)
const BPM_WOB = 844, BPM_WRT = 845;

// ---- scale / progression tables (mirror of the JSFX; keep in sync) ----
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
const PROG = [
  [1, 0],
  [2, 0, 500],
  [4, 0, 500, 700, 500],
  [4, 0, 900, 500, 700],
  [4, 0, 700, 900, 500],
  [3, 200, 700, 0],
  [12, 0, 0, 0, 0, 500, 500, 0, 0, 700, 500, 0, 700],
  [4, 0, 1000, 800, 700],
  [12, 0, 500, 1000, 300, 800, 100, 600, 1100, 400, 900, 200, 700],
  [4, 0, 300, 600, 900],
  [3, 0, 800, 400],
  [6, 700, 0, 300, 800, 1100, 400],
  [5, 0, 702, 386, 969, 551],
  [8, 0, 204, 386, 551, 702, 841, 969, 1088],
];

function degCents(dg, scix) {
  const s = SCL[scix], cnt = Math.max(1, s[0]);
  const oc = Math.floor(dg / cnt);
  return oc * 1200 + s[1 + (dg - oc * cnt)];
}

function centsToDegshift(cc, scix) {
  if (cc <= 0) return 0;
  const s = SCL[scix], cnt = Math.max(1, s[0]);
  let best = 100000, bi = 0;
  for (let k = 0; k < cnt; k++) {
    const d = Math.abs(s[1 + k] - cc);
    if (d < best) { best = d; bi = k; }
  }
  if (Math.abs(1200 - cc) < best) bi = cnt; // closer to the octave
  return bi;
}

function harmRaw(tb, epr, espd) {
  const p = PROG[epr], hln = Math.max(1, p[0]);
  let hix = Math.floor(tb / Math.max(0.25, espd));
  hix = ((hix % hln) + hln) % hln;
  return p[1 + hix];
}

// catch NaN/inf - NaN fails both comparisons -> 0
function sane(x) { return (x > -100000 && x < 100000) ? x : 0; }

const FEL_MULT = [1, 2 / 3, 1.5];

class SuperGnomeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.m = new Float64Array(MEM);
    this.numLanes = 3;
    this.haveState = false;

    this.playing = false;
    this.bpm = 120;
    this.gBeat = 0;
    this.wobPh = 0;   // tempo-wobble LFO phase

    // part gains: drums, bass, melody, chords + master (0..1)
    this.gPart = [1, 1, 1, 1];
    this.gMaster = 0.8;

    // per-lane sample slots: {data: Float32Array (interleaved), nch, sr, len} | null
    this.samples = new Array(LANES_CAP).fill(null);

    // ---- non-serialized scratch (names follow the JSFX) ----
    const F = n => new Float64Array(n);
    this.vDel = F(LANES_CAP); this.vPos = F(LANES_CAP); this.vOn = F(LANES_CAP);
    this.vGain = F(LANES_CAP); this.vRt = F(LANES_CAP);
    // synth drum voice (lanes set to SYN): amp env, noise env, body/sub phase,
    // per-hit decay coefs + control amounts, base freq
    this.dEnv = F(LANES_CAP); this.dNzE = F(LANES_CAP);
    this.dPh = F(LANES_CAP); this.dSubPh = F(LANES_CAP);
    this.dDecC = F(LANES_CAP); this.dNzDecC = F(LANES_CAP); this.dF0 = F(LANES_CAP);
    this.dNseA = F(LANES_CAP); this.dSwpA = F(LANES_CAP);
    this.dSubA = F(LANES_CAP); this.dClkA = F(LANES_CAP);
    // splice sampler: per-synth sample + play positions (0 bass, 1 melody,
    // 2..7 the chord voices)
    this.spl = [null, null, null];
    this.spPos = F(8);
    this.spSt = F(NSYN); this.spEnWin = F(NSYN);
    this.spFix = F(NSYN); this.spTrk = F(NSYN);
    this.fltLo = F(LANES_CAP); this.fltBp = F(LANES_CAP);
    this.fltLo2 = F(LANES_CAP); this.fltBp2 = F(LANES_CAP);
    this.fltF = F(LANES_CAP); this.fenv = F(LANES_CAP);
    this.shc = F(12); this.shv = F(12);

    this.svDel = F(NSYN); this.svNfreq = F(NSYN); this.svNgain = F(NSYN);
    this.svFreq = F(NSYN); this.svGain = F(NSYN); this.svStage = F(NSYN);
    this.svEnv = F(NSYN); this.svPh = F(NSYN); this.svPhs = F(NSYN);
    this.svLo = F(NSYN); this.svBp = F(NSYN); this.svAtk = F(NSYN);
    this.svDcm = F(NSYN); this.svCt = F(NSYN); this.svEa = F(NSYN);
    this.svDmp = F(NSYN); this.svFon = F(NSYN); this.svWv = F(NSYN);
    this.svGcoef = F(NSYN); this.svHold = F(NSYN); this.svTfreq = F(NSYN);
    this.ch4Freq = F(4); this.ch4Tfreq = F(4); this.ch4Nfreq = F(4);
    this.ch4Ph = F(4); this.chNv = 0;
    this.vlCents = F(4); this.vlHave = 0;

    // sounding pitch classes for the UI's pitch wheel (-1 = nothing yet)
    this.gsndB = -1; this.gsndM = -1; this.gsndC = F(4); this.gsndCn = 0;

    // ---- engine state ----
    // plucked-string (Karplus-Strong) delay lines. Voice slots: bass=0,
    // melody=1, chord voices 0..3 -> 2..5. Each up to KS_MAX samples.
    this.KS_SLOTS = 6; this.KS_MAX = 2048;
    this.ksBuf = new Float64Array(this.KS_SLOTS * this.KS_MAX);
    this.ksLen = F(this.KS_SLOTS); this.ksPos = F(this.KS_SLOTS);
    this.ksActive = F(this.KS_SLOTS);
    // blown-glass shimmer LFO phase + onset breath env, per synth
    this.glShim = F(NSYN); this.glBreath = F(NSYN);
    this.glShimC = F(4); this.glBreathC = F(4); // per chord voice
    // per-synth engine coefficients, refreshed each block
    this.svEng = F(NSYN); this.ksDecay = F(NSYN);
    this.ksBright = F(NSYN); this.glMix = F(NSYN);
    // glass per-partial emphasis (5 partials x 3 synths), 1 = flat/off
    this.glEmph = new Float64Array(NSYN * 5).fill(1);

    // ---- FX rack state ----
    this.FX_DLY_MAX = 96000; // ~2s at 48k
    this.dlyL = new Float64Array(this.FX_DLY_MAX);
    this.dlyR = new Float64Array(this.FX_DLY_MAX);
    this.dlyW = 0; this.dlyLoL = 0; this.dlyLoR = 0; this.dlyWow = 0;
    this.AVO_MAX = 16384;
    this.avoL = new Float64Array(this.AVO_MAX);
    this.avoR = new Float64Array(this.AVO_MAX);
    this.avoFrzL = new Float64Array(this.AVO_MAX);
    this.avoFrzR = new Float64Array(this.AVO_MAX);
    this.avoW = 0; this.avoSlice = -1; this.avoStut = 0; this.avoLen = 1;
    this.avoRd = 0; this.avoHoldL = 0; this.avoHoldR = 0; this.avoHoldCnt = 0;
    // delay pitch shifter (two-grain resampler over the delay taps)
    this.dlyGrain = 0;
    // Clouds granular reverb: circular buffer + a pool of grains
    this.CLD_MAX = 96000;               // ~2s at 48k
    this.cldL = new Float64Array(this.CLD_MAX);
    this.cldR = new Float64Array(this.CLD_MAX);
    this.cldW = 0; this.cldSpawn = 0;
    this.CLD_GRAINS = 24;
    this.gPos = new Float64Array(this.CLD_GRAINS);   // fractional read pos
    this.gAge = new Float64Array(this.CLD_GRAINS);
    this.gLen = new Float64Array(this.CLD_GRAINS);
    this.gRate = new Float64Array(this.CLD_GRAINS);
    this.gPan = new Float64Array(this.CLD_GRAINS);
    this.gOn = new Float64Array(this.CLD_GRAINS);
    this.cldFbL = 0; this.cldFbR = 0;

    // ---- recording: stream the master output to the main thread as PCM ----
    this.rec = false; this.REC_CHUNK = 4096;
    this.recBufL = new Float32Array(this.REC_CHUNK);
    this.recBufR = new Float32Array(this.REC_CHUNK);
    this.recPos = 0;

    this.tickN = 0;

    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  onMessage(d) {
    if (d.type === 'state') {
      this.m.set(d.mem);
      this.numLanes = d.numLanes;
      this.haveState = true;
    } else if (d.type === 'transport') {
      if (d.playing && !this.playing) {
        this.gBeat = 0; // phase-locked to beat 0, like the plugin in REAPER
        this.vlHave = 0;
        for (let s = 0; s < this.KS_SLOTS; s++) this.ksActive[s] = 0;
      }
      if (!d.playing && this.playing) {
        // release: un-latch held voices so tails ring out instead of droning
        for (let si = 0; si < NSYN; si++) {
          if (this.svStage[si] === 3) this.svStage[si] = 2;
          this.svHold[si] = 0; this.svDel[si] = 0;
        }
      }
      this.playing = d.playing;
      if (d.bpm) this.bpm = d.bpm;
    } else if (d.type === 'gains') {
      this.gPart = [d.drum, d.bass, d.mel, d.chd];
      this.gMaster = d.master;
    } else if (d.type === 'ping') {
      this.port.postMessage({
        type: 'pong', haveState: this.haveState, playing: this.playing,
        bpm: this.bpm, gBeat: this.gBeat, numLanes: this.numLanes,
        samples: this.samples.map(s => s ? s.len : null),
        pat0: Array.from(this.m.slice(0, 16)),
      });
    } else if (d.type === 'sample') {
      this.samples[d.lane] = d.synth ? { synth: true }
        : d.data ? { data: d.data, nch: d.nch, sr: d.sr, len: d.len } : null;
      this.vOn[d.lane] = 0;
      this.vPos[d.lane] = 0;
    } else if (d.type === 'ssmp') {
      // per-synth splice sample (mono)
      this.spl[d.si] = d.data ? { data: d.data, sr: d.sr, len: d.len } : null;
    } else if (d.type === 'record') {
      if (d.on) { this.rec = true; this.recPos = 0; }
      else { this.rec = false; this.flushRec(true); }
    }
  }

  // ship the captured PCM so far to the main thread; done => recording ended
  flushRec(done) {
    if (this.recPos > 0) {
      const l = this.recBufL.slice(0, this.recPos);
      const r = this.recBufR.slice(0, this.recPos);
      this.port.postMessage({ type: 'rec', l, r }, [l.buffer, r.buffer]);
      this.recPos = 0;
    }
    if (done) this.port.postMessage({ type: 'recdone', sr: sampleRate });
  }

  sget(si, k) {
    const m = this.m;
    if (k === 25) return m[SSW_A + si];
    if (k === 26) return m[SND_A + si];
    if (k === 27) return m[SFL_A + si];
    return m[(si === 0 ? BASS_P : si === 1 ? MEL_P : CHD_P) + k];
  }
  ronOff(si) { return si === 0 ? BASS_ON : si === 1 ? MEL2_ON : CHD_ON; }
  rdgOff(si) { return si === 0 ? BASS_DEG : si === 1 ? MEL2_DEG : CHD_DEG; }

  // ---- master key resolution ----
  effScale(si) { return this.m[LOCK_A + si] ? this.m[GKEY_SCALE] : this.sget(si, 1); }
  effBase(si) {
    if (this.m[LOCK_A + si]) {
      const gb = this.m[GKEY_NOTE];
      return gb + 12 * Math.floor((this.sget(si, 0) - gb) / 12 + 0.5);
    }
    return this.sget(si, 0);
  }
  effProg(si) { return this.m[LOCK_A + si] ? this.m[GKEY_PROG] : this.sget(si, 22); }
  effSpd(si) {
    if (this.m[LOCK_A + si]) {
      const h = this.m[HML_A + si];
      return this.m[GKEY_SPD] * (h === 0 ? 2 : h === 2 ? 0.5 : 1);
    }
    return this.sget(si, 23);
  }

  // beat-synced LFO, phase-locked to beat 0. si = S&H state slot.
  lfoVal(rt, shp, si) {
    const phv = this.gBeat / Math.max(0.25, rt);
    const cy = Math.floor(phv), fr = phv - cy;
    if (shp === 3) {
      if (cy !== this.shc[si]) { this.shc[si] = cy; this.shv[si] = Math.random() * 2 - 1; }
      return this.shv[si];
    }
    if (shp === 0) return Math.sin(2 * Math.PI * fr);
    if (shp === 1) return 1 - 4 * Math.abs(fr - 0.5);
    if (shp === 4) return 2 * fr - 1;   // saw up (inverse of the default saw)
    return 1 - 2 * fr;                  // saw down
  }

  // pluck a Karplus-Strong string: fill its delay line with a noise burst
  exciteString(slot, freq) {
    let len = Math.round(sampleRate / Math.max(1, freq));
    if (len < 2) len = 2;
    if (len > this.KS_MAX - 1) len = this.KS_MAX - 1;
    const base = slot * this.KS_MAX;
    for (let i = 0; i < len; i++) this.ksBuf[base + i] = Math.random() * 2 - 1;
    this.ksLen[slot] = len;
    this.ksPos[slot] = 0;
    this.ksActive[slot] = 1;
  }

  // fractional, wrapped read from a circular buffer
  frd(buf, pos, size) {
    pos = ((pos % size) + size) % size;
    const i = pos | 0, fr = pos - i, j = i + 1 < size ? i + 1 : 0;
    return buf[i] + (buf[j] - buf[i]) * fr;
  }

  // one sample of a Karplus-Strong string. bright: loop-filter blend
  // (0.5 = dark/heavy averaging, ~0.05 = bright). decay: loop sustain (<1).
  ksStep(slot, decay, bright) {
    if (!this.ksActive[slot]) return 0;
    const base = slot * this.KS_MAX, len = this.ksLen[slot], pos = this.ksPos[slot];
    const cur = this.ksBuf[base + pos];
    const nxt = this.ksBuf[base + (pos + 1 < len ? pos + 1 : 0)];
    this.ksBuf[base + pos] = (cur + bright * (nxt - cur)) * decay;
    this.ksPos[slot] = pos + 1 < len ? pos + 1 : 0;
    return cur;
  }

  // one sample of a blown-glass voice: stretched partials + a slow shimmer on
  // the upper ones + a decaying breath-noise onset. chord = per-voice state.
  glassVoice(si, ph, mix, chord, vv) {
    const TAU = 2 * Math.PI;
    let sh, br;
    if (chord) {
      this.glShimC[vv] += 4.6 / sampleRate;
      if (this.glShimC[vv] > TAU) this.glShimC[vv] -= TAU;
      sh = 0.5 + 0.5 * Math.sin(this.glShimC[vv]);
      br = this.glBreathC[vv];
    } else {
      this.glShim[si] += 4.398 / sampleRate;
      if (this.glShim[si] > TAU) this.glShim[si] -= TAU;
      sh = 0.5 + 0.5 * Math.sin(this.glShim[si]);
      br = this.glBreath[si];
    }
    const E = this.glEmph, b = si * 5;
    let s = E[b] * Math.sin(TAU * ph)
      + E[b + 1] * 0.5 * Math.sin(TAU * ph * 2)
      + E[b + 2] * mix * 0.32 * (0.4 + 0.6 * sh) * Math.sin(TAU * ph * 3.01)
      + E[b + 3] * mix * 0.22 * Math.sin(TAU * ph * 4.18)
      + E[b + 4] * mix * 0.13 * (0.6 + 0.4 * sh) * Math.sin(TAU * ph * 5.43);
    if (br > 0.0001) {
      s += (Math.random() * 2 - 1) * br * 0.5;
      if (chord) this.glBreathC[vv] = br * 0.9990; else this.glBreath[si] = br * 0.9990;
    }
    return s * 0.5;
  }

  // a synth with no splice sample of its own borrows another part's, so
  // switching an engine to SPL always sounds once ANY sample is loaded
  effSpl(si) { return this.spl[si] || this.spl[0] || this.spl[1] || this.spl[2]; }

  // splice sampler: one voice reading the synth's cropped sample. TRK mode
  // repitches from the voice's live frequency (C4 plays the file as-is), FIX
  // plays at the file's own pitch shifted by TUNE. The crop window loops, so
  // HOLD/LATCH envelopes can sustain past the sample's end.
  spliceStep(si, vix, freq) {
    const s = this.effSpl(si);
    if (!s) return 0;
    const rate = this.spTrk[si]
      ? (freq / 261.6256) * (s.sr / sampleRate)
      : this.spFix[si];
    let p = this.spPos[vix];
    const st = this.spSt[si], en = this.spEnWin[si];
    if (p < st || p >= s.len) p = st;
    const ip = Math.floor(p), fr = p - ip;
    const d = s.data;
    const v = d[ip] + ((ip + 1 < s.len ? d[ip + 1] : 0) - d[ip]) * fr;
    p += rate;
    if (p >= en) p = st + (p - en) % Math.max(1, en - st);
    this.spPos[vix] = p;
    return v;
  }

  process(inputs, outputs) {
    // a throw here kills the node silently; report the first one to the UI
    try { return this.render(outputs); }
    catch (e) {
      if (!this.errSent) {
        this.errSent = true;
        this.port.postMessage({ type: 'err', msg: String((e && e.stack) || e) });
      }
      return true;
    }
  }

  render(outputs) {
    const outL = outputs[0][0], outR = outputs[0][1];
    const nframes = outL.length;
    if (!this.haveState) return true;

    const m = this.m, srate = sampleRate;
    // tempo wobble: a slow sine breathes the effective bpm up and down
    // (depth up to ±12%, period in beats). Phase advances in musical time.
    let effBpm = this.bpm;
    if (m[BPM_WOB] > 0) {
      effBpm = this.bpm * (1 + m[BPM_WOB] / 100 * 0.12 * Math.sin(2 * Math.PI * this.wobPh));
      this.wobPh += (nframes / (srate * 60 / effBpm)) / Math.max(4, m[BPM_WRT]);
      if (this.wobPh >= 1) this.wobPh -= 1;
    }
    const bps = effBpm / 60;
    const spb = srate / bps;
    const blkStart = this.gBeat;
    const blkEnd = blkStart + nframes / spb;

    // sanitize state so any blow-up recovers instead of latching NaN silence
    for (let l = 0; l < LANES_CAP; l++) {
      this.fltLo[l] = sane(this.fltLo[l]); this.fltBp[l] = sane(this.fltBp[l]);
      this.fltLo2[l] = sane(this.fltLo2[l]); this.fltBp2[l] = sane(this.fltBp2[l]);
    }
    for (let si = 0; si < NSYN; si++) {
      this.svLo[si] = sane(this.svLo[si]); this.svBp[si] = sane(this.svBp[si]);
      this.svEnv[si] = sane(this.svEnv[si]); this.svFreq[si] = sane(this.svFreq[si]);
      this.svTfreq[si] = sane(this.svTfreq[si]);
      this.svPh[si] = sane(this.svPh[si]); this.svPh[si] -= Math.floor(this.svPh[si]);
      this.svPhs[si] = sane(this.svPhs[si]); this.svPhs[si] -= Math.floor(this.svPhs[si]);
    }
    for (let i = 0; i < 4; i++) {
      this.ch4Freq[i] = sane(this.ch4Freq[i]); this.ch4Tfreq[i] = sane(this.ch4Tfreq[i]);
      this.ch4Ph[i] = sane(this.ch4Ph[i]); this.ch4Ph[i] -= Math.floor(this.ch4Ph[i]);
      this.vlCents[i] = sane(this.vlCents[i]);
    }
    this.dlyLoL = sane(this.dlyLoL); this.dlyLoR = sane(this.dlyLoR);

    // ---- per-lane coefficients ----
    const fdecMul = Math.exp(-nframes / (0.12 * srate));
    for (let l = 0; l < LANES_CAP; l++) {
      const lv = this.lfoVal(m[LRATE_A + l], m[LSHAPE_A + l], l);
      this.vRt[l] = Math.pow(2, (m[PIT_A + l] + lv * m[LPT_A + l]) / 12);
      this.fenv[l] = sane(this.fenv[l]) * fdecMul;
      if (m[LPF_A + l] >= 100) this.fltF[l] = 2;
      else {
        const eff = Math.max(0, Math.min(99,
          m[LPF_A + l] + lv * m[LDEP_A + l] + this.fenv[l] * m[FENV_A + l]));
        let fcut = 20 * Math.pow(400, eff / 100);
        if (fcut > srate / 8) fcut = srate / 8;
        this.fltF[l] = 2 * Math.sin(Math.PI * fcut / srate);
      }
    }

    // ---- per-synth coefficients ----
    for (let si = 0; si < NSYN; si++) {
      const sp = (si === 0 ? BASS_P : si === 1 ? MEL_P : CHD_P);
      const eng = m[ENG_A + si];
      if (eng === 1) {
        // string: fast pluck attack; ring length tied to RES. Now goes through
        // the CUT low-pass like the other engines (RES only sets sustain).
        this.svAtk[si] = 1 / (0.002 * srate);
        const ringSec = 0.25 + m[sp + 13] / 100 * 4.0;
        this.svDcm[si] = Math.exp(-1 / (ringSec * srate));
      } else {
        this.svAtk[si] = 1 / (Math.max(m[sp + 8], 0.5) * 0.001 * srate);
        this.svDcm[si] = Math.exp(-1 / (Math.max(m[sp + 9], 5) * 0.001 * srate));
      }
      // every engine is now shaped by the CUT low-pass (string + glass too)
      this.svFon[si] = m[sp + 12] < 100 ? 1 : 0;
      this.svCt[si] = m[sp + 12] + this.lfoVal(m[sp + 16], m[sp + 18], 8 + si) * m[sp + 17];
      this.svEa[si] = m[sp + 14];
      this.svDmp[si] = 1.3 - m[sp + 13] / 100 * 1.15;
      this.svWv[si] = m[sp + 19];
      this.svGcoef[si] = m[sp + 21] <= 0 ? 1 : 1 - Math.exp(-1 / (m[sp + 21] * 0.001 * srate));
      this.svEng[si] = eng;
      // string: RES -> loop sustain (100 = lossless = infinite, for drones with
      // the LATCH envelope). CUT does the tone-shaping via the post low-pass,
      // so the loop filter stays a mild fixed damping.
      this.ksDecay[si] = m[sp + 13] >= 100 ? 1.0 : 0.965 + m[sp + 13] / 100 * 0.0349;
      this.ksBright[si] = 0.16;
      // glass: WAV -> upper-partial richness
      this.glMix[si] = 0.25 + m[sp + 19] / 100 * 0.75;
      // splice: crop window in sample frames + the fixed-pitch rate. TRK mode
      // repitches per-sample from the voice's live frequency (C4 = original).
      const sspl = this.effSpl(si);
      if (sspl) {
        const st = Math.floor(m[SPL_ST_A + si] / 100 * sspl.len);
        const en = Math.floor(Math.max(m[SPL_ST_A + si] + 1, m[SPL_EN_A + si]) / 100 * sspl.len);
        this.spSt[si] = Math.min(st, sspl.len - 64);
        this.spEnWin[si] = Math.max(this.spSt[si] + 64, Math.min(en, sspl.len));
        this.spFix[si] = Math.pow(2, m[SPL_TUNE_A + si] / 12) * sspl.sr / srate;
        this.spTrk[si] = m[SPL_MODE_A + si] ? 0 : 1;
      }
      // glass harmonic cycle: sweep the emphasised partial for evolving drones
      if (eng === 2) {
        const amt = m[GLC_A + si] / 100;
        const period = amt <= 0 ? 1e12 : 34 - amt * 30;   // 34..4 beats / cycle
        const cyc = (this.gBeat / period) % 1;
        for (let p = 0; p < 5; p++) {
          const bump = 0.5 + 0.5 * Math.cos(2 * Math.PI * (cyc - p / 5));
          this.glEmph[si * 5 + p] = amt <= 0 ? 1 : 1 - amt + amt * bump * 2;
        }
      }
    }

    if (this.playing) {
      // ---- drum lanes ----
      for (let l = 0; l < this.numLanes; l++) {
        if (m[MUTE_A + l]) continue;
        const steps = m[STEPS_A + l];
        const stepdur = m[LMODE_A + l] ? m[SPAN_A + l] / 16 : m[SPAN_A + l] / steps;
        // scan one step of slack either side so swing/nudge shifts stay caught
        let n = Math.ceil((blkStart - stepdur) / stepdur - 1e-9);
        let t = n * stepdur;
        while (t < blkEnd + stepdur) {
          const stepidx = ((n % steps) + steps) % steps;
          const pv = m[PAT + l * MAX_STEPS + stepidx];
          if (pv && (pv !== 2 || Math.floor(n / steps) % 2 !== 0)) {
            const tsh = t + (m[NDG_A + l] / 100 + ((stepidx & 1) ? m[SWG_A + l] / 100 : 0)) * stepdur;
            if (tsh >= blkStart && tsh < blkEnd) {
              const ofs = Math.min(Math.max(0, Math.floor((tsh - blkStart) * spb)), nframes - 1);
              let hvel = m[VEL_A + l];
              if (m[VHM_A + l] > 0)
                hvel = Math.max(1, Math.floor(hvel * (1 - Math.random() * m[VHM_A + l] / 100 * 0.7)));
              if (this.samples[l]) {
                this.vDel[l] = ofs;
                this.vPos[l] = 0;
                this.vOn[l] = 1;
                this.vGain[l] = hvel / 127;
                this.fenv[l] = 1;
                if (this.samples[l].synth) {
                  // synth drum: capture the hit's voice settings now
                  this.dEnv[l] = 1; this.dNzE[l] = 1; this.dPh[l] = 0; this.dSubPh[l] = 0;
                  const tau = 0.02 + m[GATE_A + l] / 200 * 0.6;   // GATE = decay
                  this.dDecC[l] = Math.exp(-1 / (tau * srate));
                  this.dNzDecC[l] = Math.exp(-1 / (0.03 * srate));
                  this.dF0[l] = 55 * Math.pow(2, m[PIT_A + l] / 12);
                  this.dNseA[l] = m[DNSE_A + l] / 100;
                  this.dSwpA[l] = m[DSWP_A + l] / 100;
                  this.dSubA[l] = m[DSUB_A + l] / 100;
                  this.dClkA[l] = m[DCLK_A + l] / 100;
                }
              }
            }
          }
          n += 1;
          t = n * stepdur;
        }
      }

      // ---- synth sections: 0 bass, 1 melody, 2 chords (always internal) ----
      for (let si = 0; si < NSYN; si++) {
        const sp = (si === 0 ? BASS_P : si === 1 ? MEL_P : CHD_P);
        if (m[sp + 11]) continue;
        const ron = this.ronOff(si), rdg = this.rdgOff(si);
        const escale = this.effScale(si), ebase = this.effBase(si);
        const epr = this.effProg(si), espd = this.effSpd(si);
        const nst = m[sp + 2];
        const stepdur = (m[sp + 15] ? m[sp + 3] / 16 : m[sp + 3] / nst) * FEL_MULT[m[SFL_A + si]];
        let n = Math.ceil((blkStart - stepdur) / stepdur - 1e-9);
        let t = n * stepdur;
        while (t < blkEnd + stepdur) {
          const stepidx = ((n % nst) + nst) % nst;
          const sv2 = m[ron + stepidx];
          if (sv2 && (sv2 !== 2 || Math.floor(n / nst) % 2 !== 0)) {
            const tsh = t + (m[SND_A + si] / 100 + ((stepidx & 1) ? m[SSW_A + si] / 100 : 0)) * stepdur;
            if (tsh >= blkStart && tsh < blkEnd) {
              const ofs = Math.min(Math.max(0, Math.floor((tsh - blkStart) * spb)), nframes - 1);
              // harmony: diatonic degree shift for 12-TET progs, exact cents for JI
              let dsh = 0, hcents = 0;
              if (epr > 0) {
                const hc = harmRaw(t, epr, espd);
                if (epr >= 12) hcents = hc; else dsh = centsToDegshift(hc, escale);
              }
              if (si < 2) {
                // ---- mono voice (bass / melody) ----
                const cents = degCents(m[rdg + stepidx] + dsh, escale) + hcents;
                const pc = ((ebase * 100 + cents) % 1200 + 1200) % 1200;
                if (si === 0) this.gsndB = pc; else this.gsndM = pc;
                this.svNfreq[si] = Math.max(8, Math.min(12000,
                  440 * Math.pow(2, (ebase - 69) / 12 + cents / 1200)));
                this.svNgain[si] = m[sp + 6] / 127 * 0.3;
                this.svDel[si] = ofs + 1;
                this.svHold[si] = m[sp + 20] === 1 ? Math.floor(stepdur * m[sp + 7] / 100 * spb) :
                                  m[sp + 20] === 2 ? -1 : 0;
              } else {
                // ---- chord (paraphonic): diatonic stack + voice leading ----
                const nv = m[sp + 24] ? 4 : 3;
                for (let v = 0; v < nv; v++) {
                  const rcv = degCents(m[rdg + stepidx] + dsh + v * 2, escale) + hcents;
                  let tc = rcv;
                  if (this.vlHave) {
                    // nearest-octave pull = inversion; anchor within an octave
                    // of the raw voicing so voices can't wander off register
                    tc -= 1200 * Math.floor((tc - this.vlCents[v]) / 1200 + 0.5);
                    if (tc - rcv > 1200) tc -= 1200 * Math.floor((tc - rcv) / 1200);
                    else if (rcv - tc > 1200) tc += 1200 * Math.floor((rcv - tc) / 1200);
                  }
                  this.vlCents[v] = tc;
                  this.gsndC[v] = ((ebase * 100 + tc) % 1200 + 1200) % 1200;
                  this.ch4Nfreq[v] = Math.max(8, Math.min(12000,
                    440 * Math.pow(2, (ebase - 69) / 12 + tc / 1200)));
                }
                this.vlHave = 1;
                this.gsndCn = nv;
                this.chNv = nv;
                this.svNgain[2] = m[sp + 6] / 127 * 0.3;
                this.svDel[2] = ofs + 1;
                this.svHold[2] = m[sp + 20] === 1 ? Math.floor(stepdur * m[sp + 7] / 100 * spb) :
                                 m[sp + 20] === 2 ? -1 : 0;
              }
            }
          }
          n += 1;
          t = n * stepdur;
        }
      }

      this.gBeat = blkEnd;
    }

    // ---- render (@sample port) ----
    const gD = this.gPart[0] * this.gMaster;
    const gS = [this.gPart[1] * this.gMaster, this.gPart[2] * this.gMaster,
                this.gPart[3] * this.gMaster];

    // ---- FX rack coefficients ----
    const TAU = 2 * Math.PI;
    const fxOn = m[FX_ON] ? 1 : 0;
    const dlyOn = m[DLY_ON] ? 1 : 0;
    const avoOn = m[AVO_ON] ? 1 : 0;
    const DMAX = this.FX_DLY_MAX;
    const dlyTimeSamp = Math.min(DMAX - 4, Math.max(2, m[DLY_TIME] * spb));
    const dlyFb = Math.min(0.98, m[DLY_FB] / 100 * 0.98);
    const toneCoef = 0.04 + m[DLY_TONE] / 100 * 0.9;   // one-pole: higher = brighter
    const wowDepth = m[DLY_WOW] / 100 * 45;             // samples of pitch drift
    const wowInc = TAU * 0.27 / srate;
    const feed = m[FX_FEED] / 100;
    // routing matrix as fractions: mtx[part][fx] (part 0 drums..3 chords)
    const mtx = [];
    for (let p = 0; p < 4; p++)
      mtx[p] = [m[SND_MTX + p * 3] / 100, m[SND_MTX + p * 3 + 1] / 100,
                m[SND_MTX + p * 3 + 2] / 100];
    // pre-fader sends: fx taps a fixed nominal level (the default 90% fader)
    // so pulling a part's volume down leaves its fx wash in place
    const sndPre = m[SND_PRE] ? 1 : 0;
    const PRE_G = 0.81;
    // live mute/solo: if any channel is soloed, only soloed channels sound
    let anySolo = 0;
    for (let l = 0; l < this.numLanes; l++) if (m[SOLO_LANE + l]) anySolo = 1;
    for (let si2 = 0; si2 < NSYN; si2++) if (m[SOLO_SYN + si2]) anySolo = 1;
    const laneAud = [], synAud = [];
    for (let l = 0; l < this.numLanes; l++)
      laneAud[l] = anySolo ? (m[SOLO_LANE + l] ? 1 : 0) : (m[MUTE_A + l] ? 0 : 1);
    for (let si2 = 0; si2 < NSYN; si2++)
      synAud[si2] = anySolo ? (m[SOLO_SYN + si2] ? 1 : 0) : (m[MUTE_SYN + si2] ? 0 : 1);
    const avoAmt = m[AVO_AMT] / 100;
    const avoRate = Math.max(0.03125, m[AVO_RATE]);
    const avoCrush = m[AVO_CRUSH];
    const avoMix = m[AVO_MIX] / 100;
    const AMAX = this.AVO_MAX;
    // delay pitch shifter: reverse flips playback direction, pitch resamples
    const dlyRate = Math.pow(2, m[DLY_PITCH] / 12);
    const dlyREff = m[DLY_REV] ? -dlyRate : dlyRate;
    const dlyPitching = m[DLY_PITCH] !== 0 || m[DLY_REV];
    const PWIN = Math.min(6000, Math.max(512, Math.floor(dlyTimeSamp * 0.5)));
    // clouds granular reverb coefficients
    const cldOn = m[CLD_ON] ? 1 : 0;
    const cldMix = m[CLD_MIX] / 100;
    const cldGrainLen = Math.max(128, Math.floor((0.02 + m[CLD_SIZE] / 100 * 0.24) * srate));
    const cldDens = m[CLD_DENS] / 100;
    const cldRate = m[CLD_REVG] ? -Math.pow(2, m[CLD_PITCH] / 12) : Math.pow(2, m[CLD_PITCH] / 12);
    const cldSpread = m[CLD_SPREAD] / 100;
    const cldReverb = Math.min(0.94, m[CLD_REVERB] / 100 * 0.94);
    // density = how many grains overlap. Cap overlap under the pool size and
    // scale the interval to the grain length so grains stay continuous (no
    // gaps -> no drop-outs) and normalise the gain so louder overlap doesn't
    // just saturate. This is what fixes density 100% cutting out.
    const cldOverlap = 1 + cldDens * (this.CLD_GRAINS - 4);
    const cldInterval = Math.max(1, Math.floor(cldGrainLen / cldOverlap));
    const cldGain = 1.2 / Math.sqrt(cldOverlap);
    // The reverb tail is a feedback loop through the grain cloud whose gain
    // scales with how many grains overlap (~0.6*sqrt(overlap) per pass), so a
    // fixed CLD_REVERB goes unstable at high density: the buffer grows to
    // Infinity, a zero grain envelope makes 0*Inf = NaN, and the NaN poisons
    // the whole mix. Normalise the feedback by the overlap so TAIL means the
    // same decay at any density (and stays < 1).
    const cldFbG = cldReverb * Math.min(1, 1 / (0.6 * Math.sqrt(cldOverlap)));
    const CMAX = this.CLD_MAX;
    this.cldFbL = sane(this.cldFbL); this.cldFbR = sane(this.cldFbR);
    // recover a buffer already poisoned by Inf/NaN (old saves / mid-blowup)
    const lastW = (this.cldW - 1 + CMAX) % CMAX;
    if (!Number.isFinite(this.cldL[lastW]) || !Number.isFinite(this.cldR[lastW])) {
      this.cldL.fill(0); this.cldR.fill(0); this.cldFbL = 0; this.cldFbR = 0;
    }
    const fxActive = fxOn && (dlyOn || avoOn || cldOn);

    for (let f = 0; f < nframes; f++) {
      let spl0 = 0, spl1 = 0, dIn = 0, aIn = 0, cIn = 0;

      // drum voices (samples, or the synthesized drum when a lane is SYN)
      for (let c = 0; c < this.numLanes; c++) {
        if (this.vDel[c] > 0) { this.vDel[c] -= 1; continue; }
        if (!this.vOn[c]) continue;
        const s = this.samples[c];
        if (!s) { this.vOn[c] = 0; continue; }
        let smix, smix2;
        if (s.synth) {
          // synth drum: swept sine body + noise burst + click + 30Hz sub,
          // all gated by a fast decay (GATE) — then the shared lane filter
          const env = this.dEnv[c];
          if (env < 0.0008 && this.dNzE[c] < 0.0008) { this.vOn[c] = 0; continue; }
          const f = this.dF0[c] * (1 + 4 * this.dSwpA[c] * env * env);
          this.dPh[c] += f / srate; if (this.dPh[c] >= 1) this.dPh[c] -= 1;
          this.dSubPh[c] += 30 / srate; if (this.dSubPh[c] >= 1) this.dSubPh[c] -= 1;
          const nse = this.dNseA[c];
          const body = Math.sin(2 * Math.PI * this.dPh[c]) * env * (1 - nse * 0.5);
          const nz = (Math.random() * 2 - 1) * this.dNzE[c] * nse;
          const clk = this.vPos[c] < 3 ? this.dClkA[c] * 0.9 : 0;
          const sub = Math.sin(2 * Math.PI * this.dSubPh[c]) * this.dSubA[c] * env;
          smix = (body + nz + clk + sub) * this.vGain[c] * 0.9;
          smix2 = smix;
          this.dEnv[c] *= this.dDecC[c];
          this.dNzE[c] *= this.dNzDecC[c];
          this.vPos[c] += 1;
        } else {
          const vp = this.vPos[c];
          if (vp >= s.len) { this.vOn[c] = 0; continue; }
          const vrate = s.sr / srate * this.vRt[c];
          const ip = Math.floor(vp), frac = vp - ip;
          const d = s.data, nch = s.nch;
          const sa = d[ip * nch];
          const sb = ip + 1 < s.len ? d[(ip + 1) * nch] : 0;
          smix = (sa + (sb - sa) * frac) * this.vGain[c];
          if (nch >= 2) {
            const sa2 = d[ip * nch + 1];
            const sb2 = ip + 1 < s.len ? d[(ip + 1) * nch + 1] : 0;
            smix2 = (sa2 + (sb2 - sa2) * frac) * this.vGain[c];
          } else smix2 = smix;
          this.vPos[c] = vp + vrate;
        }
        { // shared lane filter + output (both drum voice kinds)
          if (this.fltF[c] < 1.99) {
            const fl2 = this.fltF[c] * 0.5;
            let hp;
            this.fltLo[c] += fl2 * this.fltBp[c];
            hp = smix - this.fltLo[c] - 0.8 * this.fltBp[c];
            this.fltBp[c] += fl2 * hp;
            this.fltLo[c] += fl2 * this.fltBp[c];
            hp = smix - this.fltLo[c] - 0.8 * this.fltBp[c];
            this.fltBp[c] += fl2 * hp;
            smix = this.fltLo[c];
            this.fltLo2[c] += fl2 * this.fltBp2[c];
            hp = smix2 - this.fltLo2[c] - 0.8 * this.fltBp2[c];
            this.fltBp2[c] += fl2 * hp;
            this.fltLo2[c] += fl2 * this.fltBp2[c];
            hp = smix2 - this.fltLo2[c] - 0.8 * this.fltBp2[c];
            this.fltBp2[c] += fl2 * hp;
            smix2 = this.fltLo2[c];
          }
          const la = laneAud[c];
          spl0 += smix * gD * la;
          spl1 += smix2 * gD * la;
          const dc = (smix + smix2) * 0.5 * (sndPre ? PRE_G : gD) * la;
          dIn += dc * mtx[0][0]; aIn += dc * mtx[0][1]; cIn += dc * mtx[0][2];
        }
      }

      // synth voices
      for (let si2 = 0; si2 < NSYN; si2++) {
        if (this.svDel[si2] > 0) {
          this.svDel[si2] -= 1;
          if (this.svDel[si2] === 0) {
            const eng = m[ENG_A + si2];
            if (si2 < 2) {
              this.svTfreq[si2] = this.svNfreq[si2];
              if (this.svGcoef[si2] >= 1 || this.svEnv[si2] < 0.001)
                this.svFreq[si2] = this.svNfreq[si2];
              if (eng === 1) this.exciteString(si2, this.svNfreq[si2]);
              else if (eng === 2) this.glBreath[si2] = 1;
              else if (eng === 3) this.spPos[si2] = this.spSt[si2];
            } else {
              for (let vv = 0; vv < this.chNv; vv++) {
                this.ch4Tfreq[vv] = this.ch4Nfreq[vv];
                if (this.svGcoef[2] >= 1 || this.svEnv[2] < 0.001)
                  this.ch4Freq[vv] = this.ch4Nfreq[vv];
                if (eng === 1) this.exciteString(2 + vv, this.ch4Nfreq[vv]);
                else if (eng === 2) this.glBreathC[vv] = 1;
                else if (eng === 3) this.spPos[2 + vv] = this.spSt[2];
              }
            }
            this.svGain[si2] = this.svNgain[si2];
            this.svStage[si2] = 1;
          }
        }
        if (this.svHold[si2] > 0) this.svHold[si2] -= 1;
        if (!this.svStage[si2]) continue;

        if (this.svStage[si2] === 1) {
          this.svEnv[si2] += this.svAtk[si2];
          if (this.svEnv[si2] >= 1) {
            this.svEnv[si2] = 1;
            this.svStage[si2] = this.svHold[si2] !== 0 ? 3 : 2;
          }
        } else if (this.svStage[si2] === 3) {
          if (this.svHold[si2] === 0) this.svStage[si2] = 2;
        } else {
          this.svEnv[si2] *= this.svDcm[si2];
          if (this.svEnv[si2] < 0.0001) { this.svStage[si2] = 0; this.svEnv[si2] = 0; }
        }

        const wv = this.svWv[si2];
        const eng = this.svEng[si2];
        let so;
        if (si2 < 2) {
          this.svFreq[si2] += (this.svTfreq[si2] - this.svFreq[si2]) * this.svGcoef[si2];
          this.svPh[si2] += this.svFreq[si2] / srate;
          if (this.svPh[si2] >= 1) this.svPh[si2] -= 1;
          const ph = this.svPh[si2];
          let osc;
          if (eng === 1) {
            osc = this.ksStep(si2, this.ksDecay[si2], this.ksBright[si2]);
          } else if (eng === 2) {
            osc = this.glassVoice(si2, ph, this.glMix[si2], false, 0);
          } else if (eng === 3) {
            osc = this.spliceStep(si2, si2, this.svFreq[si2]);
          } else {
            this.svPhs[si2] += this.svFreq[si2] * 0.5 / srate;
            if (this.svPhs[si2] >= 1) this.svPhs[si2] -= 1;
            const osin = (Math.sin(TAU * ph) * 0.8
              + Math.sin(TAU * this.svPhs[si2]) * 0.5
              + Math.sin(2 * TAU * ph) * 0.18) / 1.1;
            const otri = 1 - 4 * Math.abs(ph - 0.5);
            const osaw = 2 * ph - 1;
            osc = wv < 50 ? osin + (otri - osin) * (wv / 50)
                          : otri + (osaw - otri) * ((wv - 50) / 50);
          }
          so = osc * this.svEnv[si2] * this.svGain[si2];
        } else {
          let csum = 0;
          for (let vv = 0; vv < this.chNv; vv++) {
            this.ch4Freq[vv] += (this.ch4Tfreq[vv] - this.ch4Freq[vv]) * this.svGcoef[2];
            this.ch4Ph[vv] += this.ch4Freq[vv] / srate;
            if (this.ch4Ph[vv] >= 1) this.ch4Ph[vv] -= 1;
            const cph = this.ch4Ph[vv];
            if (eng === 1) {
              csum += this.ksStep(2 + vv, this.ksDecay[2], this.ksBright[2]);
            } else if (eng === 2) {
              csum += this.glassVoice(2, cph, this.glMix[2], true, vv);
            } else if (eng === 3) {
              csum += this.spliceStep(2, 2 + vv, this.ch4Freq[vv]);
            } else {
              const osin = Math.sin(TAU * cph) + 0.15 * Math.sin(2 * TAU * cph);
              const otri = 1 - 4 * Math.abs(cph - 0.5);
              const osaw = 2 * cph - 1;
              csum += wv < 50 ? osin + (otri - osin) * (wv / 50)
                             : otri + (osaw - otri) * ((wv - 50) / 50);
            }
          }
          so = csum * (eng === 1 || eng === 3 ? 0.5 : 0.35) * this.svEnv[2] * this.svGain[2];
        }

        if (this.svFon[si2]) {
          let sct = this.svCt[si2] + this.svEa[si2] * this.svEnv[si2];
          if (sct < 0) sct = 0;
          if (sct > 100) sct = 100;
          let sfc = 20 * Math.pow(400, sct / 100);
          if (sfc > srate / 8) sfc = srate / 8;
          const sf = Math.sin(Math.PI * sfc / srate);
          let sHp;
          this.svLo[si2] += sf * this.svBp[si2];
          sHp = so - this.svLo[si2] - this.svDmp[si2] * this.svBp[si2];
          this.svBp[si2] += sf * sHp;
          this.svLo[si2] += sf * this.svBp[si2];
          sHp = so - this.svLo[si2] - this.svDmp[si2] * this.svBp[si2];
          this.svBp[si2] += sf * sHp;
          so = this.svLo[si2];
        }
        const ps = so * gS[si2] * synAud[si2];
        spl0 += ps;
        spl1 += ps;
        const pt = si2 + 1;
        const px = so * (sndPre ? PRE_G : gS[si2]) * synAud[si2];
        dIn += px * mtx[pt][0]; aIn += px * mtx[pt][1]; cIn += px * mtx[pt][2];
      }

      // ---- FX rack: floaty delay -> avocado glitch -> clouds ----
      // Each part routes to a stage's input (dIn/aIn/cIn); FEED taps the whole
      // mix into the head of the chain. Injections happen at each stage so an
      // instrument sent to CLOUDS only enters the granulator, etc.
      if (fxActive) {
        dIn += (spl0 + spl1) * 0.5 * feed;
        const fxIn = dIn;
        let sigL = fxIn, sigR = fxIn;
        if (dlyOn) {
          let rL, rR;
          if (dlyPitching) {
            // two-grain resampler over the delay tap: pitch shifts (and can
            // reverse) the feedback, so repeats climb / fall / play backward
            this.dlyGrain += (1 - dlyREff);
            if (this.dlyGrain >= PWIN) this.dlyGrain -= PWIN;
            if (this.dlyGrain < 0) this.dlyGrain += PWIN;
            const ph1 = this.dlyGrain, ph2 = (ph1 + PWIN * 0.5) % PWIN;
            const e1 = Math.sin(Math.PI * ph1 / PWIN), e2 = Math.sin(Math.PI * ph2 / PWIN);
            const w1 = e1 * e1, w2 = e2 * e2;
            const c1 = this.dlyW - dlyTimeSamp - ph1, c2 = this.dlyW - dlyTimeSamp - ph2;
            rL = this.frd(this.dlyL, c1, DMAX) * w1 + this.frd(this.dlyL, c2, DMAX) * w2;
            rR = this.frd(this.dlyR, c1, DMAX) * w1 + this.frd(this.dlyR, c2, DMAX) * w2;
          } else {
            this.dlyWow += wowInc;
            if (this.dlyWow > TAU) this.dlyWow -= TAU;
            const wm = Math.sin(this.dlyWow) * wowDepth;
            // L/R drift in opposite directions = stereo width
            rL = this.frd(this.dlyL, this.dlyW - dlyTimeSamp - wm, DMAX);
            rR = this.frd(this.dlyR, this.dlyW - dlyTimeSamp + wm, DMAX);
          }
          this.dlyLoL += toneCoef * (rL - this.dlyLoL);
          this.dlyLoR += toneCoef * (rR - this.dlyLoR);
          this.dlyL[this.dlyW] = fxIn + this.dlyLoL * dlyFb;
          this.dlyR[this.dlyW] = fxIn + this.dlyLoR * dlyFb;
          this.dlyW = this.dlyW + 1 < DMAX ? this.dlyW + 1 : 0;
          sigL = rL; sigR = rR;
        }
        if (avoOn) {
          sigL += aIn; sigR += aIn;   // instruments routed straight to glitch
          // rolling capture of the chain signal
          this.avoL[this.avoW] = sigL; this.avoR[this.avoW] = sigR;
          const beat = blkStart + f / spb;
          const slice = Math.floor(beat / avoRate);
          if (slice !== this.avoSlice) {
            this.avoSlice = slice;
            if (Math.random() < avoAmt) {
              this.avoStut = 1;
              const sliceSamp = avoRate * spb;
              let rl = Math.floor(sliceSamp * (0.5 - 0.4 * avoAmt));
              if (rl < 64) rl = 64; if (rl > AMAX - 1) rl = AMAX - 1;
              this.avoLen = rl;
              // freeze the most recent rl samples so the loop can't be overwritten
              for (let k = 0; k < rl; k++) {
                const src = (this.avoW - rl + k + AMAX) % AMAX;
                this.avoFrzL[k] = this.avoL[src]; this.avoFrzR[k] = this.avoR[src];
              }
              this.avoRd = 0;
            } else this.avoStut = 0;
          }
          this.avoW = this.avoW + 1 < AMAX ? this.avoW + 1 : 0;
          let gl = sigL, gr = sigR;
          if (this.avoStut) {
            gl = this.avoFrzL[this.avoRd]; gr = this.avoFrzR[this.avoRd];
            this.avoRd = this.avoRd + 1 < this.avoLen ? this.avoRd + 1 : 0;
          }
          if (avoCrush > 0) {
            const hold = 1 + Math.floor(avoCrush * 0.3);
            if (this.avoHoldCnt <= 0) {
              this.avoHoldL = gl; this.avoHoldR = gr; this.avoHoldCnt = hold;
            }
            this.avoHoldCnt--;
            gl = this.avoHoldL; gr = this.avoHoldR;
            const levels = Math.max(2, Math.round(64 - avoCrush * 0.6));
            gl = Math.round(gl * levels) / levels;
            gr = Math.round(gr * levels) / levels;
          }
          sigL = sigL + (gl - sigL) * avoMix;
          sigR = sigR + (gr - sigR) * avoMix;
        }
        if (cldOn) {
          sigL += cIn; sigR += cIn;   // instruments routed straight to clouds
          // Clouds-style granulator: spray windowed grains from recent audio,
          // pitch-shiftable and reversible, with a feedback tail = reverb
          // tanh bounds the fed-back energy so the loop can never reach Inf
          this.cldL[this.cldW] = sigL + Math.tanh(this.cldFbL * cldFbG);
          this.cldR[this.cldW] = sigR + Math.tanh(this.cldFbR * cldFbG);
          if (--this.cldSpawn <= 0) {
            this.cldSpawn = cldInterval;
            for (let gi = 0; gi < this.CLD_GRAINS; gi++) {
              if (!this.gOn[gi]) {
                this.gOn[gi] = 1; this.gAge[gi] = 0; this.gLen[gi] = cldGrainLen;
                const off = 240 + Math.random() * (240 + cldSpread * srate * 0.5);
                this.gPos[gi] = (this.cldW - off + CMAX) % CMAX;
                this.gRate[gi] = cldRate; this.gPan[gi] = Math.random();
                break;
              }
            }
          }
          this.cldW = this.cldW + 1 < CMAX ? this.cldW + 1 : 0;
          let wetL = 0, wetR = 0;
          for (let gi = 0; gi < this.CLD_GRAINS; gi++) {
            if (!this.gOn[gi]) continue;
            const len = this.gLen[gi], age = this.gAge[gi];
            const e = Math.sin(Math.PI * age / len), env = e * e;
            const gs = (this.frd(this.cldL, this.gPos[gi], CMAX)
              + this.frd(this.cldR, this.gPos[gi], CMAX)) * 0.5 * env;
            const pan = this.gPan[gi];
            wetL += gs * (1 - pan); wetR += gs * pan;
            this.gPos[gi] += this.gRate[gi];
            if (++this.gAge[gi] >= len) this.gOn[gi] = 0;
          }
          // sane() maps NaN/Inf to 0 (NaN fails both comparisons), so a grain
          // that read a poisoned ring cell can't NaN the mix or the feedback;
          // the ring then heals as new finite writes overwrite the poison.
          wetL = sane(wetL * cldGain); wetR = sane(wetR * cldGain);
          this.cldFbL = wetL; this.cldFbR = wetR;
          sigL = sigL + (wetL - sigL) * cldMix;
          sigR = sigR + (wetR - sigR) * cldMix;
        }
        spl0 += sigL;
        spl1 += sigR;
      }

      // gentle safety limiter (protects against delay-feedback runaway)
      const oL = Math.tanh(spl0), oR = Math.tanh(spl1);
      outL[f] = oL; outR[f] = oR;
      if (this.rec) {
        this.recBufL[this.recPos] = oL;
        this.recBufR[this.recPos] = oR;
        if (++this.recPos >= this.REC_CHUNK) this.flushRec(false);
      }
    }

    // UI heartbeat: beat position + sounding pitch classes, ~every 8 blocks
    if (++this.tickN >= 8) {
      this.tickN = 0;
      this.port.postMessage({
        type: 'tick', beat: this.gBeat, playing: this.playing,
        gsndB: this.gsndB, gsndM: this.gsndM,
        gsndC: Array.from(this.gsndC), gsndCn: this.gsndCn,
      });
    }
    return true;
  }
}

registerProcessor('supergnome', SuperGnomeProcessor);
