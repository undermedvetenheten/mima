// SuperGnome web — desktop dashboard.
// Thin layer over gnome-ui.js. Instead of the old dense drag-field canvas,
// everything is laid out as labelled cards that pack into columns, all visible
// at once: master/key/mix, each part (drums + the three synths, with engine
// switch and grid), and the FX rack. Same widgets as the pocket layout.

'use strict';
(function () {
  const G = window.gnome;
  if (!G || G.usePocket) return;
  const UI = window.createGnomeUI(G);
  const h = UI.h;
  const root = document.getElementById('desk');
  if (!root) return;

  let curLane = 0;
  const statusEl = h('div', 'pk-status', 'press ▶ to wake the gnome and play');
  const say = s => { statusEl.textContent = s; };
  const T = UI.transport(say);

  // top bar lives outside the rebuilt grid so transport keeps its state
  const topbar = h('div', 'desk-top',
    h('div', 'pk-topctl', T.play, T.bpmBox, T.rec, T.save),
    statusEl);
  const grid = h('div', 'desk-grid');
  root.append(topbar, grid);

  function card(title, ...sections) {
    return h('div', 'desk-card', h('h2', '', title), ...sections);
  }

  function render() {
    UI.beginRender();
    grid.innerHTML = '';
    curLane = Math.min(curLane, G.numLanes - 1);

    const master = card('MASTER · KEY · MIX',
      UI.masterKeySection(), UI.locksSection(), UI.volumesSection(),
      UI.group('tempo & reset', null,
        UI.stepper('Tempo', 40, 240, 1, () => G.bpm, v => G.setBpm(v), v => Math.round(v) + ' bpm'),
        h('div', 'pk-actions',
          UI.action('🔄 INIT — fresh starter groove', () => {
            G.resetAll(); curLane = 0; render(); say('fresh gnome: starter groove restored');
          }, 'danger'))));

    const drums = card('DRUMS',
      UI.group('', `editing lane ${curLane + 1} of ${G.numLanes}`,
        UI.laneStrip(curLane,
          i => { curLane = i; render(); },
          () => { G.setNumLanes(G.numLanes + 1); render(); },
          () => { G.setNumLanes(G.numLanes - 1); curLane = Math.min(curLane, G.numLanes - 1); render(); })),
      UI.drumMain(curLane, say),
      ...UI.drumParams(curLane));

    const synths = [0, 1, 2].map(si =>
      card(UI.SYN_LABELS[si], ...UI.synthMain(si, say, render), ...UI.synthParams(si)));

    const fx = card('FX RACK', ...UI.fxSections());

    grid.append(master, drums, ...synths, fx);
  }
  render();

  function tick() { T.upd(); UI.frame(); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
})();
