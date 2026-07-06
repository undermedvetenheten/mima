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
  layout exactly. If you change the plugin's sequencing/DSP, port the same
  change to the worklet; the tables (scales, progressions, euclid presets)
  are duplicated in both `gnome.js` and `gnome-worklet.js` and must stay in
  sync with the JSFX.

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
