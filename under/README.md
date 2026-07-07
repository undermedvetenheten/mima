# under/ — ReaPack repository for mima.chat/under

This folder is a hand-rolled [ReaPack](https://reapack.com/) repository served by
GitHub Pages. Friends import `https://mima.chat/under/index.xml` in REAPER
(Extensions → ReaPack → Import repositories…) and install from there.

- `index.xml` — the ReaPack index. Hand-edited, no generator needed.
- `index.html` — the secret landing page with install instructions (noindex'd).
- `supergnome/` — the actual files ReaPack downloads: the JSFX and the
  DR-55 starter samples.
- `gnome/` — the Web Audio port of SuperGnome (mima.chat/under/gnome).
  `gnome-worklet.js` is a line-for-line port of the JSFX @block/@sample
  sections (MIDI and stems removed, per-part volume added); `gnome.js` ports
  @gfx to canvas and owns the state, which mirrors the JSFX serialized memory
  layout exactly. The **desktop layout is that canvas** — dense, all on one
  page, drag-fields + live grids + the mixer knobs, plus a per-synth ENG
  button and a demarcated FX box drawn at the bottom (sends / delay / glitch
  / clouds). The **pocket layout** (`gnome-mobile.js`, auto-activated on
  coarse-pointer narrow screens) is a tabbed DOM UI built from the shared
  widget kit `gnome-ui.js` (steppers, segmented toggles, selects, grids,
  transport, section builders) via `createGnomeUI(window.gnome)`. A footer
  link switches layouts. If you change the plugin's sequencing/DSP, port the same
  change to the worklet; the tables (scales, progressions, euclid presets)
  are duplicated in both `gnome.js` and `gnome-worklet.js` and must stay in
  sync with the JSFX.

  Web-only additions beyond the JSFX live in the `>= 728` region of the
  shared memory block (so they persist and cross the worklet boundary like
  everything else):
  - per-synth **engine** (`ENG_A`): 0 classic osc, 1 plucked string
    (Karplus-Strong — RES = sustain, 100 = lossless/infinite for LATCH
    drones; CUT drives the shared post low-pass like every engine), 2 blown
    glass (stretched partials + shimmer + breathy onset, with a per-synth
    harmonic-cycle rate `GLC_A` that sweeps the emphasised partial for
    evolving drones).
  - a global **FX rack** (`FX_*`), delay → glitch → clouds, fed by per-part
    sends (`SEND_A`) and/or the full mix (`FX_FEED`):
    - floaty tape delay with `DLY_PITCH` (repeats climb/fall — a two-grain
      resampler in the feedback path) and `DLY_REV` (reversed echoes); wow
      drift applies only when neither is engaged.
    - "avocado" glitch (beat-synced stutter + bit/sample-rate crush).
    - "clouds" granular reverb (`CLD_*`): a grain pool sprayed from recent
      audio, pitch-shiftable/reversible, with a feedback tail for the wash.
  Drum lanes are permanently paired with a sample via `LANE_SAMPLE` (no
  per-lane picker). Changing the memory layout or these offsets means bumping
  `MEM` and `STORE_KEY` in gnome.js and the mirrored constants in the worklet.

  **Recording**: the worklet streams its master output (post-FX, post-limiter)
  to the main thread as PCM chunks; gnome.js encodes a 16-bit stereo WAV on
  stop and hands it off via the Web Share API (iOS "Save to Files") with a
  download-link fallback. Both layouts expose a REC button; the save button
  fires from a fresh user tap so mobile browsers allow the share/download.

## Releasing an update

1. Edit `supergnome/sequencer_supergnome.jsfx` (or add/replace sample wavs).
2. In `index.xml`, add a **new** `<version>` block above nothing in particular —
   ReaPack picks the highest `name` — with a bumped version (e.g. `1.0.1`),
   fresh `time`, a changelog, and the same `<source>` lines (plus any new files).
   Keep old `<version>` blocks if you want downgrades to stay available;
   replacing the block also works.
3. Push to the default branch. Pages redeploys; users get the update on their
   next ReaPack synchronize.

Install targets (REAPER resource path): the JSFX lands in
`Effects/under/SuperGnome/`, the wavs in `Data/supergnome/` — the JSFX's
sample-picker sliders read `Data/supergnome/`, so that path must not change.
