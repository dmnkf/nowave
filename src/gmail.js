// Everything nowave knows about Gmail's DOM and key handling lives here.
// docs/gmail-contract.md lists each selector with its source.
import { formatSequence, syntheticKeyEvents } from './keys.js';
import { closePaneHash, parseRoute, labelName } from './route.js';

const SELECTORS = {
  threadList: '[gh="tl"]',
  checkedBox: '[role="checkbox"][aria-checked="true"]',
  row: 'tr',
  cursorRow: 'tr.zA.btb',
  overlay: '[role="menu"], [role="dialog"], [role="alertdialog"], [role="listbox"]',
  labelLink: '[role="navigation"] a[href*="#label/"]',
  selectAllMatching: '[role="main"] .ya [role="link"]',
  subject: 'h2.hP',
  splitToggle: '[aria-label="Toggle split pane mode"]',
  settingsTab: 'a[href$="#settings/general"]',
  shortcutsTab: 'a[href$="#settings/shortcuts"]',
};

const UNREAD_ROW_CLASS = 'zE';

// The Gmail shortcuts behind each action nowave sends, keyed by nowave's command id. Gmail's custom keyboard
// shortcuts (Settings › Advanced) can change any of them and give an action a second key, so each action holds
// its alternatives and nowave sends the first. settings.gmailKeys holds the user's overrides.
export const GMAIL_KEYS = {
  archive: [['e']],
  delete: [['#']],
  spam: [['!']],
  mute: [['m']],
  snooze: [['b']],
  move: [['v']],
  label: [['l']],
  'mark-read': [['shift+i']],
  'mark-unread': [['shift+u']],
  select: [['x']],
  'select-all': [['*', 'a']],
  'deselect-all': [['*', 'n']],
  back: [['u']],
  open: [['o']],
  undo: [['z']],
};

export const gmailKeyMap = (overrides) => ({ ...GMAIL_KEYS, ...overrides });

const GMAIL_CHORD = /^(?:shift\+[a-z]|[^\sA-Z+])$/u;

const isGmailSequence = (seq) =>
  Array.isArray(seq) && seq.length > 0 && seq.every((chord) => typeof chord === 'string' && GMAIL_CHORD.test(chord));

// Stored settings from before an action could have two keys hold a single sequence.
export function gmailAlternatives(raw) {
  if (isGmailSequence(raw)) return [[...raw]];
  return Array.isArray(raw) ? raw.filter(isGmailSequence).map((seq) => [...seq]) : [];
}

// Gmail archives, deletes, reports spam and mutes only on a real key press, never on a synthetic key or a scripted
// click, so nowave cannot send these. Each action's verb is for the notice that says which key to press.
const REAL_KEY_VERBS = { archive: 'archives', delete: 'deletes', spam: 'reports spam', mute: 'mutes' };

export const SHORTCUTS_HASH = '#settings/shortcuts';

// The English labels of Gmail's custom shortcuts page, by GMAIL_KEYS action.
const SHORTCUT_LABELS = {
  Archive: 'archive',
  Delete: 'delete',
  'Report as spam': 'spam',
  'Mute conversation': 'mute',
  Snooze: 'snooze',
  'Open "move to" menu': 'move',
  'Open "label as" menu': 'label',
  'Mark as read': 'mark-read',
  'Mark as unread': 'mark-unread',
  'Select conversation': 'select',
  'Select all conversations': 'select-all',
  'Deselect all conversations': 'deselect-all',
  'Back to threadlist': 'back',
  'Open conversation': 'open',
  'Undo last action': 'undo',
};

const ACTION_LABELS = Object.fromEntries(Object.entries(SHORTCUT_LABELS).map(([label, action]) => [action, label]));

// Gmail writes a sequence as its characters ("*a") and Shift as a capital letter ("I").
export function gmailSequence(text) {
  const seq = [...text.trim()].map((ch) => (ch >= 'A' && ch <= 'Z' ? `shift+${ch.toLowerCase()}` : ch));
  return isGmailSequence(seq) ? seq : null;
}

const gmailNotation = (alternatives) =>
  alternatives
    .map((seq) => seq.map((chord) => (chord.startsWith('shift+') ? chord.slice(6).toUpperCase() : chord)).join(''))
    .join(' or ');

// rows: [label, ...values] from the shortcuts page, one value per input. Empty values leave the action unbound in
// Gmail, and nowave then keeps what it had.
export function gmailKeysFromShortcuts(rows) {
  const keys = {};
  for (const [label, ...values] of rows) {
    const action = Object.hasOwn(SHORTCUT_LABELS, label) ? SHORTCUT_LABELS[label] : null;
    const alternatives = action ? values.map(gmailSequence).filter(Boolean) : [];
    if (alternatives.length > 0) keys[action] = alternatives;
  }
  return keys;
}

// found: the keys read from the page, 'off' when Gmail has no shortcuts page, or null when nowave could not read it.
export function shortcutNotice(found) {
  if (found === 'off') {
    return { title: 'Custom keyboard shortcuts are off in Gmail', lines: ["nowave sends Gmail's default keys."] };
  }
  const count = found ? Object.keys(found).length : 0;
  if (count === 0) {
    return {
      title: "Could not read Gmail's keyboard shortcuts",
      lines: ['nowave kept its keys. It reads the page only when Gmail is in English.'],
    };
  }
  const changed = Object.entries(found).filter(([action, seq]) => gmailNotation(seq) !== gmailNotation(GMAIL_KEYS[action]));
  return {
    title:
      changed.length === 0
        ? `Gmail uses its default keys for the ${count} actions nowave sends`
        : `Saved ${count} Gmail shortcuts, ${changed.length} not Gmail's default`,
    lines: changed.map(
      ([action, seq]) => `${ACTION_LABELS[action]}: ${gmailNotation(seq)} (default ${gmailNotation(GMAIL_KEYS[action])})`,
    ),
  };
}

const keyChoice = (alternatives, isMac) => alternatives.map((seq) => formatSequence(seq, isMac)).join(' or ');

// pressed: the key that is not one of Gmail's for the action, or undefined when the palette ran it.
export function realKeyNotice(action, alternatives, pressed, isMac) {
  const keys = keyChoice(alternatives, isMac);
  const title = `Gmail only ${REAL_KEY_VERBS[action]} on its own shortcut. Press ${keys}.`;
  if (!pressed) return { title, lines: [] };
  const label = ACTION_LABELS[action];
  const slot = alternatives.length < 2 ? `add it as a second ${label} shortcut` : `make it one of the ${label} shortcuts`;
  const key = formatSequence(pressed, isMac);
  return { title, lines: [`To use ${key} too, ${slot} in Gmail's keyboard shortcut settings.`] };
}

// archive: Gmail's archive keys.
export const everythingNotice = (archive, isMac) => ({
  title: `Everything here is selected. Press ${keyChoice(archive, isMac)} to mark it done, Esc to clear.`,
  lines: [],
});

export const CALM_CLASS = 'nowave-calm';
export const SPLITS_MOUNTED_CLASS = 'nowave-splits';

export const CALM_CSS = `
html.${CALM_CLASS} :is(a, button, [role="button"], [role="link"])[aria-label*="Gemini"],
html.${CALM_CLASS} [data-tooltip*="Gemini"],
html.${CALM_CLASS} :has(> [data-is-tooltip-wrapper] > button[aria-label*="Gemini"]),
html.${CALM_CLASS} header a[href*="one.google.com"],
html.${CALM_CLASS}.${SPLITS_MOUNTED_CLASS} [role="main"] [role="tablist"] {
  display: none !important;
}
`;

const ownEvents = new WeakSet();

export function isOwnEvent(e) {
  return ownEvents.has(e);
}

const isShown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

export function isTyping(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') return !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(el.type);
  return ['textbox', 'combobox', 'searchbox'].includes(el.getAttribute('role'));
}

// Focus-based on purpose: Gmail keeps closed menus in the DOM, and a visible but unfocused
// dialog (a compose window) should not swallow nowave's keys.
export function overlayOpen() {
  return document.activeElement?.closest(SELECTORS.overlay) != null;
}

function sendKey(chord) {
  const target = document.activeElement ?? document.body;
  let downCanceled = false;
  for (const init of syntheticKeyEvents(chord)) {
    // A browser sends no keypress after a canceled keydown; doing the same keeps Gmail
    // from acting twice when it handles the shortcut on keydown.
    if (init.type === 'keypress' && downCanceled) continue;
    // Chromium takes the legacy keyCode/charCode from the init dictionary and derives which
    // from keyCode, so no read-only property needs redefining.
    const e = new KeyboardEvent(init.type, { ...init, bubbles: true, cancelable: true, composed: true });
    ownEvents.add(e);
    const notCanceled = target.dispatchEvent(e);
    if (init.type === 'keydown') downCanceled = !notCanceled;
  }
}

export function sendSequence(seq) {
  for (const chord of seq) sendKey(chord);
}

const send = (keys, action) => sendSequence(keys[action][0]);

const firstShown = (selector) => [...document.querySelectorAll(selector)].find(isShown) ?? null;

export function findThreadList() {
  return firstShown(SELECTORS.threadList);
}

// Gmail's split pane opens a conversation without changing the list's hash, so a shown subject on a list route is
// the pane.
export function paneOpen() {
  return parseRoute(location.hash).view === 'list' && firstShown(SELECTORS.subject) !== null;
}

// replace: Gmail's rewrite back to the list already adds a history entry, and an assignment would add a second.
export function closePane() {
  const hash = closePaneHash(location.hash, Date.now());
  if (hash && paneOpen()) location.replace(hash);
}

// Gmail's toolbar button ignores a scripted click() and acts on the mouse events around it.
export function toggleSplitPane() {
  const button = firstShown(SELECTORS.splitToggle);
  if (!button) return;
  const r = button.getBoundingClientRect();
  const at = { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
  for (const type of ['mouseover', 'mousedown', 'mouseup', 'click']) {
    button.dispatchEvent(new MouseEvent(type, { ...at, button: 0, bubbles: true, cancelable: true, composed: true, view: window }));
  }
}

function checkedRows() {
  const list = findThreadList();
  if (!list) return [];
  return [...list.querySelectorAll(SELECTORS.checkedBox)].map((box) => box.closest(SELECTORS.row)).filter(Boolean);
}

export const anyChecked = () => checkedRows().length > 0;

const isUnread = (row) => row.classList.contains(UNREAD_ROW_CLASS);

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, timeoutMs, step) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await step();
  }
  return predicate();
}

// Gmail's list actions need a checked row. Resolves to { byNowave } or null when no row got checked.
async function selectCursorRowIfNone(keys) {
  if (checkedRows().length > 0) return { byNowave: false };
  send(keys, 'select');
  const ok = await waitFor(() => checkedRows().length > 0, 400, nextFrame);
  return ok ? { byNowave: true } : null;
}

const focusHeld = () => overlayOpen() || isTyping(document.activeElement);

// A selection nowave leaves behind would redirect the user's next action, but one the user made is theirs.
// Sending * while a menu or field has focus would type it.
export function shouldDeselect({ byNowave, checked, focusHeld }) {
  return byNowave && checked && !focusHeld;
}

// * then n deselects every row; x would toggle whichever row the cursor is on by now.
async function clearOwnSelection(keys, selection, live) {
  await nextFrame();
  if (!live()) return;
  if (shouldDeselect({ byNowave: selection.byNowave, checked: checkedRows().length > 0, focusHeld: focusHeld() })) {
    send(keys, 'deselect-all');
    // Gmail unchecks a moment later; the next queued action would otherwise take the row as the user's selection.
    await waitFor(() => checkedRows().length === 0, 300, nextFrame);
  }
}

// Triage runs through the action queue; live() is false once the user navigated or opened the palette.
// keys: the Gmail key map; action: the GMAIL_KEYS entry to send.
// after: 'keeps' (row stays) or 'menu' (opens a menu the user can cancel)
export async function triage(keys, action, after, live) {
  if (parseRoute(location.hash).view !== 'list') {
    send(keys, action);
    return;
  }
  const selection = await selectCursorRowIfNone(keys);
  if (!selection || !live()) return;
  send(keys, action);
  if (!selection.byNowave) return;
  if (after === 'menu') {
    if (!(await waitFor(focusHeld, 500, nextFrame)) || !live()) return;
    await waitFor(() => !focusHeld(), 120000, () => sleep(200));
  }
  await clearOwnSelection(keys, selection, live);
}

const ASSIST_CLEANUP_MS = 600;
let assistCleanup;

// Runs during the keydown of the user's own key for a real-key-only action in the list, which then goes on to Gmail.
// Gmail acts only on checked rows there, and takes a synthetic select sent now in time for the real key. It cannot
// wait in the action queue, because the real key cannot wait.
// leave(rows): optional, fades out the row nowave checked.
export function assistRealKey(keys, leave) {
  const list = findThreadList();
  if (!list || anyChecked()) return;
  send(keys, 'select');
  const cursor = list.querySelector(SELECTORS.cursorRow);
  if (cursor) leave?.([cursor]);
  const hash = location.hash;
  clearTimeout(assistCleanup);
  // Gmail ignores the action where it does not apply (archive outside the inbox) and leaves the row checked, where
  // the next key would act on it.
  assistCleanup = setTimeout(() => {
    if (location.hash === hash && shouldDeselect({ byNowave: true, checked: anyChecked(), focusHeld: focusHeld() })) {
      send(keys, 'deselect-all');
    }
  }, ASSIST_CLEANUP_MS);
}

// Resolves to true once every conversation in the view is checked, also those on later pages.
export async function checkEverything(keys, live) {
  send(keys, 'select-all');
  if (!(await waitFor(anyChecked, 1000, nextFrame)) || !live()) return false;
  const link = firstShown(SELECTORS.selectAllMatching);
  if (!link) return true;
  const text = link.textContent;
  link.click();
  // Gmail may reuse the element for its "Clear selection" link, so a new text also counts.
  if (await waitFor(() => !isShown(link) || link.textContent !== text, 1500, nextFrame)) return live();
  if (live()) send(keys, 'deselect-all');
  return false;
}

export async function toggleRead(keys, live) {
  if (parseRoute(location.hash).view !== 'list') {
    send(keys, 'mark-unread');
    return;
  }
  const selection = await selectCursorRowIfNone(keys);
  if (!selection || !live()) return;
  send(keys, checkedRows().some(isUnread) ? 'mark-read' : 'mark-unread');
  await clearOwnSelection(keys, selection, live);
}

// Each row of the shortcuts page is a label cell and two inputs, each able to hold a key. Labels are read in
// English only.
export function readShortcutTable() {
  const rows = new Map();
  for (const el of document.body.querySelectorAll('*')) {
    if (el.childElementCount > 0) continue;
    const label = el.textContent.trim();
    if (!Object.hasOwn(SHORTCUT_LABELS, label) || rows.has(label) || !isShown(el)) continue;
    let row = el.parentElement;
    while (row && !row.querySelector('input')) row = row.parentElement;
    const values = [...(row?.querySelectorAll('input') ?? [])].slice(0, 2).map((input) => input.value.trim());
    if (values.some(Boolean)) rows.set(label, values);
  }
  return [...rows].map(([label, values]) => [label, ...values]);
}

// Gmail rewrites the hash of a settings tab it does not have to #settings and shows General.
function shortcutPage() {
  if (location.hash !== SHORTCUTS_HASH) return location.hash.startsWith('#settings') ? 'off' : 'gone';
  const rows = readShortcutTable();
  if (rows.length > 0) return rows;
  return firstShown(SELECTORS.settingsTab) && !firstShown(SELECTORS.shortcutsTab) ? 'off' : null;
}

// Resolves to the page's rows, 'off' when Gmail has no shortcuts tab (custom shortcuts are off), or null when the
// page did not load in time or the user went elsewhere.
export async function openShortcutPage() {
  location.hash = SHORTCUTS_HASH;
  let page = null;
  await waitFor(() => (page = shortcutPage()) !== null, 10000, () => sleep(200));
  return page === 'gone' ? null : page;
}

export function labels() {
  const seen = new Map();
  for (const a of document.querySelectorAll(SELECTORS.labelLink)) {
    const hash = new URL(a.href).hash;
    const name = labelName(hash);
    if (name && !seen.has(hash)) seen.set(hash, { name, hash });
  }
  return [...seen.values()];
}
