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
  - a global **FX rack** (`FX_*`), dub delay → glitch → granulator (names
    are ours; the granular design is inspired by the open Mutable Instruments
    code but deliberately does not reuse Mutable module names), with a
    per-instrument → per-fx **routing matrix** (`SND_MTX`: part 0-3 drums/bass/
    melody/chords × fx 0-2 delay/glitch/clouds). Each fx stage has its own
    DR/BS/ML/CH sends, so any instrument can be dropped into just the delay,
    just the glitch, just the clouds, or any mix; `FX_FEED` still taps the
    whole mix into the head of the chain. The chain stays series, but sends
    inject at their stage (a part sent to CLOUDS only enters the granulator).
    Pre-routing (768-length) saves migrate their old single-bus sends onto the
    delay column.
    - dub delay with `DLY_PITCH` (repeats climb/fall — a two-grain
      resampler in the feedback path) and `DLY_REV` (reversed echoes); wow
      drift applies only when neither is engaged.
    - glitch (beat-synced stutter + bit/sample-rate crush).
    - granulator (`CLD_*`): a grain pool sprayed from recent
      audio, pitch-shiftable/reversible, with a feedback tail for the wash.
      Density maps to grain overlap (capped under the pool size) with a
      matched spawn interval + gain, so high density stays continuous.
  - **Perform mute/solo** (`MUTE_A` per drum lane, `MUTE_SYN`, `SOLO_LANE`,
    `SOLO_SYN`): the pocket KEY·MIX tab has a live mixer with M/S per channel.
    If any channel is soloed only soloed channels sound. Gated at the audio
    render so it responds instantly.
  - **Undo/redo** (canvas ⤺/⤼ buttons + Ctrl/Cmd+Z/Y, pocket transport
    chips): a burst of edits (one drag) coalesces into a single history entry
    committed shortly after you stop. **Named notes**: placing a roll note
    shows its note name (C#4, F6) or, on the chords part, the chord it builds
    (e.g. Bbm7) in the status line.
  - **Two generators, two buttons.** RND (per part, `synGenerate`) is purely
    random and key-independent — random rhythm + scale-degree scatter. GEN KEY
    (`synKeyGen`, on the canvas KEY row / "in key" in the pocket) writes a
    musical part that matches the master key and the **GEN style**
    (`GEN_STYLE`, `setStyle`): free / Appalachian / West African / Gamelan /
    Blues / Andalusian / Middle Eastern (each swaps the master scale to an
    idiomatic choice and steers the contour). GEN-KEY bass stays
    root/fifth-anchored and chords collapse to one held root chord while a
    progression is rotating the key.

  The canvas scales to fit the viewport width (no sideways scroll), so the
  mixer knobs (top-right) and the FX box (bottom) are always reachable, and
  drag-to-draw isn't swallowed by an overflow container. Drum lanes keep a
  per-lane sample picker (`SMP` field on the canvas; a Sample selector in the
  pocket drums tab), persisted per lane.
  Drum lanes are permanently paired with a sample via `LANE_SAMPLE` (no
  per-lane picker). Changing the memory layout or these offsets means bumping
  `MEM` and `STORE_KEY` in gnome.js and the mirrored constants in the worklet.

  **Sheet music (PDF)**: `gnome-score.js` renders the current pattern as staff
  notation — one system per pitched part (clef auto-picked from each part's
  pitch range so notes land on the staff, not stacks of ledger lines), plus a
  drum grid (x = hit, ◆ = accent). `buildScoreModel` in gnome.js does the
  musical mapping (pitches match playback at the nearest semitone — microtonal
  scales are labelled as approximated; rhythm is the step grid, beats per step
  = span ÷ steps). The **time signature is guessed** (`guessMeter`) from where
  the kick and bass put their weight — candidate meters that divide the spans
  are scored by average downbeat emphasis — and parts whose span disagrees
  with the global meter carry their own signature (polymeter notated as-is).
  It's drawn as inline SVG into an on-screen preview and saved via the
  browser's print-to-PDF (`window.print`), so it works the same on desktop and
  iOS. The canvas has a ♪ PDF header button; the pocket has a "Sheet music
  (PDF)" action on the KEY·MIX tab.

  **Presets** (A/B/C): full-groove slots stored in their own localStorage key,
  recallable live mid-playback (recall is a single undoable step). Canvas: tap
  A/B/C to recall, ALT/right-click to store, ⇩/⇧ save/load the current groove
  as a .json file. Pocket (KEY·MIX tab): per-slot load / save / ⇩ file / ⇧
  file. Groove files from the pre-routing layout migrate on import.

  **Solo/mute everywhere**: the canvas has an S button beside every lane and
  synth M (amber = soloed; any solo means only soloed channels sound); the
  pocket keeps the perform mixer. Sends can be switched **pre-fader** (PRE on
  the canvas FX row, "Sends tap" in the pocket rack): a part's fx wash then
  survives pulling its volume down. Live send cells glow in the FX box so the
  routing is visible at a glance.

  **Splice** (per-synth engine 4, `SPL_*`): a sampler voice for bass / melody
  / chords. Load a local audio file (ALT-tap ENG on the canvas, "load audio
  file" in the pocket) — it's persisted in IndexedDB — then crop it
  (`CRP◀/▶`; the window loops under HOLD/LATCH envelopes) and choose TRK
  (repitched per note, C4 = as recorded, glide works) or FIX + TUNE (plays at
  its own pitch, nudged ±12 semitones to sit with the tune). Chords play one
  splice voice per chord note.

  **Synth drums** (`SMP` = SYN, `D*_A` regions): a lane can synthesize its
  drum instead of playing a sample — swept-sine body (PIT = tuning, GATE =
  decay, sweep drops 808-style), noise mix, a fixed **30Hz sub** layer to
  beef up transients, and a click, all through the lane's filter. On the
  canvas the four LFO fields relabel to NSE/SWP/SUB/CLK for SYN lanes.

  **Crate digs**: WIKI pulls free audio from Wikimedia Commons (documented
  anonymous CORS; licence on each file's page), 78s pulls a public-domain
  78rpm snippet from the Internet Archive (1900–1922; the IA bot-blocks some
  networks, so this one may fail where WIKI works) — into a lane (USR) or a
  splice slot. Every import (file or dig) is peak-normalized. USR lanes get a
  `CRP` field (sample start %, LFO-able for slice motion).

  **3D space** (`PAN_AZ_A`, `PAN_FRC_A`): each part (drums/bass/melody/
  chords) has an azimuth — equal-power L/R plus a back-of-head lowpass so
  180° genuinely sounds behind you — on the SPACE cells / the pocket's
  "3D space" group. Azimuth is an LFO target (a saw orbits the part around
  your head); FRC uses the part's own energy as a physics force that shoves
  its angle around with damping, so loud hits send it wandering. Parts also
  **repel each other** when their angles crowd (scaled by the pair's FRC),
  and **BNC (bounciness)** sets how elastically a crowding pair trades
  momentum — 0 clumps, 100 is a full billiard bounce with less drag, so
  shoves carry the balls further around the head.

  **Two-column desktop canvas**: each synth section stacks its control rows
  with the piano roll directly beneath (left column), and the right column
  carries the captions plus a visual per section — an **XY oscilloscope** for
  the bass (the waveform plotted against a delayed copy of itself: sines make
  ellipses, saws make angular figures; fed by a worklet tap in the tick
  message), a paintable **Game of Life** for the melody (HighLife B36/S23 on
  a torus; the melody seeds cells as it plays, CLR clears, the ×N button sets
  the speed from ¼ to 4 generations per beat, and the GROW toggle lets the
  colony occasionally rewrite melody notes — undoably), and the **harmonic
  pitch wheel** for the chords. The scope is also **an instrument**: dragging
  the figure drives a tanh waveshaper on the bass (up = drive/fold, right =
  skew/asymmetric bias — even harmonics), right-click resets it clean, and
  because the worklet shapes the signal before the scope tap, the figure on
  screen is exactly the waveform you hear (drive and skew are LFO targets;
  the pocket exposes them as Shape drive / Shape skew on the bass). The wheel
  gets a **SPIN** button (off / 4 / 2 / every beat): the chord root walks the
  wheel one scale degree at a time as it plays, with voice leading smoothing
  the inversions (pocket: "Wheel spin" on the chords tab).
  The FX band's right side holds the **3D dome** (top-down head view, one
  ball per part at its live azimuth, sized by energy, draggable to re-place a
  part) beside the SENDS mini-knob matrix and the SPACE / MOD cells. The
  header volume knobs stay where they were.

  **Mod LFOs** (`MLFO_A`, `MOD_TGT_A`/`MOD_MSK_A`): two global assignable
  LFOs with rate / depth / shape each. Canvas: ARM L1 or L2 on the FX box's
  MOD row, then tap any value field to toggle it as a target (tap again to
  remove; amber/teal corner ticks mark assigned fields); pocket: pick a
  target from the list and assign. Up to 16 assignments, stored in the
  shared memory block so they persist and ride presets/groove files. The
  worklet overwrites each target with its modulated value at block start
  (swing = ±depth/2 of the target's range) and restores the base afterwards,
  so the UI always shows and edits base values. Targets include lane
  pitch/filter/velocity/swing, synth cutoff/resonance/wave/velocity/gate,
  splice crop/tune, every fx parameter, the send matrix, and the tempo
  wobble. A **tempo wobble** (`BPM_WOB/BPM_WRT`) breathes the master bpm
  against a slow sine, and LFO shapes include an invertible saw (`SW↑`).

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
