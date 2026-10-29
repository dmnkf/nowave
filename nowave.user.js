// ==UserScript==
// @name         nowave
// @namespace    https://github.com/dmnkf/nowave
// @version      1.0.1
// @description  Shortwave-style keys, a command palette and split inbox tabs for Gmail. No AI.
// @author       Dominik Filliger
// @license      MIT
// @homepageURL  https://github.com/dmnkf/nowave
// @downloadURL  https://raw.githubusercontent.com/dmnkf/nowave/main/dist/nowave.user.js
// @updateURL    https://raw.githubusercontent.com/dmnkf/nowave/main/dist/nowave.user.js
// @match        https://mail.google.com/*
// @run-at       document-start
// @inject-into  page
// @noframes
// @grant        none
// ==/UserScript==

import { bindingsFor, buildCommands } from './src/commands.js';
import {
  CALM_CLASS,
  CALM_CSS,
  SHORTCUTS_HASH,
  SPLITS_MOUNTED_CLASS,
  anyChecked,
  checkEverything,
  everythingNotice,
  findThreadList,
  gmailKeyMap,
  gmailKeysFromShortcuts,
  isOwnEvent,
  isTyping,
  labels,
  openShortcutPage,
  overlayOpen,
  paneOpen,
  readShortcutTable,
  shortcutNotice,
} from './src/gmail.js';
import { createKeySequence } from './src/keys.js';
import { createPalette } from './src/palette.js';
import {
  SKIN_CLASS,
  SKIN_CSS,
  clickMainMenu,
  createRailPin,
  inboxUnread,
  isNavExpanded,
  leaveRows,
  mainMenu,
  navToggle,
  splitBarAnchor,
} from './src/skin.js';
import { createActionQueue } from './src/queue.js';
import { activeSplitIndex, cycleSplitIndex, parseRoute, splitHash } from './src/route.js';
import { STORAGE_KEY, addSplit, parseSettings, recordRecent, removeSplit } from './src/settings.js';
import { createSplitBar } from './src/splitbar.js';

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const keySequence = createKeySequence(isMac);
const loading = () => document.readyState === 'loading';

function loadSettings() {
  try {
    return parseSettings(localStorage.getItem(STORAGE_KEY));
  } catch {
    return parseSettings(null);
  }
}

let settings = loadSettings();

function update(next) {
  settings = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be blocked; nowave keeps working for this page load.
  }
  sync();
}

const app = {
  navigate(hash) {
    location.hash = hash;
  },
  switchAccount(n) {
    location.assign(`/mail/u/${n}/`);
  },
  goToSplit(index) {
    const split = settings.splits[index];
    if (split) location.hash = splitHash(split.query);
  },
  cycleSplit(delta) {
    const active = activeSplitIndex(settings.splits, location.hash);
    app.goToSplit(cycleSplitIndex(settings.splits.length, active, delta));
  },
  async saveSplit() {
    const current = parseRoute(location.hash).query;
    const query = await palette.prompt({ placeholder: 'Search query for the split', value: current ?? '' });
    if (!query) return;
    const name = await palette.prompt({ placeholder: 'Name this split' });
    if (!name) return;
    update(addSplit(settings, { name, query }));
    app.goToSplit(settings.splits.length - 1);
  },
  removeSplit(index) {
    update(removeSplit(settings, index));
  },
  selectEverything() {
    if (parseRoute(location.hash).view !== 'list') return;
    app.enqueue(async (live) => {
      if (!(await checkEverything(gmailKeys(), live))) return;
      everythingSelectedAt = location.hash;
      palette.notice({ ...everythingNotice(gmailKeys().archive, isMac), through: true });
    });
  },
  async detectGmailKeys() {
    const back = location.hash;
    const page = await openShortcutPage();
    const found = page === 'off' ? 'off' : page && gmailKeysFromShortcuts(page);
    if (found === 'off') update({ ...settings, gmailKeys: {} });
    else if (found) saveGmailKeys(found);
    if (location.hash.startsWith('#settings') && location.hash !== back) location.hash = back;
    palette.notice(shortcutNotice(found));
  },
  toggleCalm() {
    update({ ...settings, calm: !settings.calm });
  },
  toggleSkin() {
    navClicked = false;
    update({ ...settings, skin: !settings.skin });
  },
  openPalette(cheatSheet) {
    if (loading()) return;
    palette.open({ commands: commands(labels()), recent: cheatSheet ? [] : settings.recent });
  },
  enqueue: createActionQueue(() => (palette.isOpen() ? null : location.hash)),
  leaveRows: (rows) => (settings.skin ? leaveRows(rows) : undefined),
  notice: (notice) => palette.notice(notice),
};

const gmailKeys = () => gmailKeyMap(settings.gmailKeys);

const commands = (labelLinks = []) =>
  buildCommands(app, { splits: settings.splits, labels: labelLinks, gmail: gmailKeys(), isMac });

const palette = createPalette({
  isMac,
  onOpenChange: keySequence.reset,
  onRun(command) {
    update(recordRecent(settings, command.id));
    command.run();
  },
});

const splitBar = createSplitBar({ onSelect: app.goToSplit });
const railPin = createRailPin();

const style = document.createElement('style');
style.id = 'nowave-style';
style.textContent = CALM_CSS + SKIN_CSS;

function saveGmailKeys(found) {
  const gmailKeys = { ...settings.gmailKeys, ...found };
  if (JSON.stringify(gmailKeys) !== JSON.stringify(settings.gmailKeys)) update({ ...settings, gmailKeys });
}

// Read once per visit to the shortcuts page, so keys the user is still editing there are not taken.
let shortcutsRead = false;

function syncGmailKeys() {
  if (location.hash !== SHORTCUTS_HASH) {
    shortcutsRead = false;
    return;
  }
  if (shortcutsRead) return;
  const found = gmailKeysFromShortcuts(readShortcutTable());
  if (Object.keys(found).length === 0) return;
  shortcutsRead = true;
  saveGmailKeys(found);
}

let navClicked = false;

function syncNav() {
  const button = mainMenu();
  if (!button) return;
  const toggle = navToggle({
    skin: settings.skin,
    expanded: isNavExpanded(button),
    collapsedBySkin: settings.navCollapsedBySkin,
    clicked: navClicked,
  });
  if (!toggle) return;
  navClicked = true;
  clickMainMenu(button).then((ok) => {
    if (ok) update({ ...settings, navCollapsedBySkin: toggle === 'collapse' });
  });
}

function sync() {
  if (loading()) return;
  const html = document.documentElement;
  if (!style.isConnected) document.head.append(style);
  html.classList.toggle(CALM_CLASS, settings.calm);
  // Gmail sizes its panes from the header height on resize, and the skin changes that height.
  if (html.classList.contains(SKIN_CLASS) !== settings.skin) {
    html.classList.toggle(SKIN_CLASS, settings.skin);
    window.dispatchEvent(new Event('resize'));
  }
  syncNav();
  palette.setSkin(settings.skin);
  railPin.sync(settings.skin);
  syncGmailKeys();
  const view = parseRoute(location.hash).view;
  const shownList = view === 'list' ? findThreadList() : null;
  const list = settings.splits.length > 0 ? shownList : null;
  if (list) {
    const counts = settings.skin ? settings.splits.map((s) => (s.query === 'in:inbox' ? inboxUnread() : null)) : [];
    splitBar.setSkin(settings.skin);
    splitBar.render(settings.splits, activeSplitIndex(settings.splits, location.hash), counts);
    splitBar.mountBefore(splitBarAnchor(list) || list);
  } else {
    splitBar.unmount();
  }
  html.classList.toggle(SPLITS_MOUNTED_CLASS, list !== null);
}

let syncQueued = false;
function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(() => {
    syncQueued = false;
    sync();
  });
}

// The view where Select everything here last checked every row.
let everythingSelectedAt = null;

function context() {
  if (isTyping(document.activeElement) || overlayOpen()) return 'typing';
  if (everythingSelectedAt === location.hash && anyChecked()) return 'everything';
  return paneOpen() ? 'pane' : parseRoute(location.hash).view;
}

const claimedCodes = new Set();

function onKeydown(e) {
  if (isOwnEvent(e)) return;
  if (palette.isOpen() && palette.letsThrough(e)) palette.close();
  if (palette.isOpen()) {
    e.stopImmediatePropagation();
    claimedCodes.add(e.code);
    // Enter and Esc during IME composition commit or cancel the text, not the palette.
    if (!e.isComposing) palette.handleKey(e);
    return;
  }
  if (e.isComposing) return;
  const result = keySequence.press(bindingsFor(commands(), context()), e, Date.now());
  if (result.kind === 'none' || result.mode === 'native') return;
  if (result.mode === 'assist') {
    if (!e.repeat) result.command.assist();
    return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  claimedCodes.add(e.code);
  if (result.kind === 'run' && !e.repeat) result.command.run(result.seq);
}

// Keys typed into the palette must not reach Gmail's shortcut handler, which would
// see them as coming from a plain div (the shadow host) and act on them.
function onKeyOther(e) {
  if (isOwnEvent(e)) return;
  const claimed = e.type === 'keyup' && claimedCodes.delete(e.code);
  if (claimed || palette.isOpen()) e.stopImmediatePropagation();
}

// Attached at document-start, before Gmail's scripts run, so these capture listeners run before any of Gmail's.
window.addEventListener('keydown', onKeydown, true);
window.addEventListener('keypress', onKeyOther, true);
window.addEventListener('keyup', onKeyOther, true);
window.addEventListener('hashchange', keySequence.reset);
window.addEventListener('hashchange', scheduleSync);

function start() {
  new MutationObserver(scheduleSync).observe(document.body, { childList: true, subtree: true });
  sync();
}

if (loading()) document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
