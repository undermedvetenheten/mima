// SuperGnome web — pocket layout (touch-first tabs).
// Thin layer over gnome-ui.js: one tab per part (drums / bass / melody /
// chords / fx / key·mix), stacked vertically for a phone. All widgets and
// section content come from the shared UI kit.

'use strict';
(function () {
  const G = window.gnome;
  if (!G || !G.usePocket) return;
  const UI = window.createGnomeUI(G);
  const h = UI.h;
  const root = document.getElementById('pocket');

  let curLane = 0, curTab = 'drums';
  let statusEl;
  const say = s => { if (statusEl) statusEl.textContent = s; };

  const T = UI.transport(say);
  UI.setSay(say);
  statusEl = h('div', 'pk-status', 'tap ▶ to wake the gnome and play');

  const TABS = [
    { id: 'drums', label: 'DRUMS' }, { id: 0, label: 'BASS' },
    { id: 1, label: 'MELODY' }, { id: 2, label: 'CHORDS' },
    { id: 'fx', label: 'FX' }, { id: 'mix', label: 'KEY·MIX' },
  ];
  const tabBar = h('div', 'pk-tabs');
  const tabBtns = TABS.map(t => {
    const b = h('button', 'pk-tab', t.label);
    b.addEventListener('click', () => { curTab = t.id; renderTab(); });
    tabBar.append(b);
    return { b, id: t.id };
  });

  const view = h('div', 'pk-view');
  root.append(
    h('div', 'pk-head',
      h('div', 'pk-topbar',
        h('div', 'pk-topctl', T.play, T.bpmBox, T.undoBox, T.rec, T.save),
        statusEl),
      tabBar),
    view);

  function drumsTab() {
    curLane = Math.min(curLane, G.numLanes - 1);
    view.append(
      h('div', 'pk-group', h('h3', '', `drum lanes — editing lane ${curLane + 1}`),
        UI.laneStrip(curLane,
          i => { curLane = i; renderTab(); },
          () => { G.setNumLanes(G.numLanes + 1); renderTab(); },
          () => { G.setNumLanes(G.numLanes - 1); curLane = Math.min(curLane, G.numLanes - 1); renderTab(); })),
      UI.drumMain(curLane, say),
      ...UI.drumParams(curLane));
  }

  function synthTab(si) {
    view.append(...UI.synthMain(si, say, renderTab), ...UI.synthParams(si));
  }

  function mixTab() {
    view.append(
      UI.performSection(),
      UI.masterKeySection(), UI.locksSection(), UI.volumesSection(),
      UI.group('export', 'render the current pattern as staff notation, then Save PDF / Print',
        h('div', 'pk-actions',
          UI.action('♪ Sheet music (PDF)', () => G.exportScore()))),
      UI.group('tempo & reset', null,
        UI.stepper('Tempo', 40, 240, 1, () => G.bpm, v => G.setBpm(v), v => Math.round(v) + ' bpm'),
        h('div', 'pk-actions',
          UI.action('🔄 INIT — fresh starter groove', () => {
            G.resetAll(); curLane = 0; renderTab(); say('fresh gnome: starter groove restored');
          }, 'danger'))));
  }

  function renderTab() {
    UI.beginRender();
    view.innerHTML = '';
    tabBtns.forEach(t => t.b.classList.toggle('sel', t.id === curTab));
    if (curTab === 'drums') drumsTab();
    else if (curTab === 'fx') view.append(...UI.fxSections());
    else if (curTab === 'mix') mixTab();
    else synthTab(curTab);
  }
  renderTab();

  function tick() { T.upd(); UI.frame(); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
})();
