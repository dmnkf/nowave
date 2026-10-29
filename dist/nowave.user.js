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

(() => {
  // src/keys.js
  var SEQUENCE_TIMEOUT_MS = 1e3;
  var MODIFIER_ORDER = ["mod", "ctrl", "meta", "alt", "shift"];
  function chordFromEvent(e, isMac2) {
    const mods = /* @__PURE__ */ new Set();
    if (isMac2 ? e.metaKey : e.ctrlKey) mods.add("mod");
    if (isMac2 && e.ctrlKey) mods.add("ctrl");
    if (!isMac2 && e.metaKey) mods.add("meta");
    let key = e.key;
    if (key.length === 1) {
      const isLetter = key.toLowerCase() !== key.toUpperCase();
      if (isLetter) {
        if (e.altKey) mods.add("alt");
        if (e.shiftKey) mods.add("shift");
        key = key.toLowerCase();
      }
    } else {
      if (e.altKey) mods.add("alt");
      if (e.shiftKey) mods.add("shift");
      key = key.toLowerCase();
    }
    return [...MODIFIER_ORDER.filter((m) => mods.has(m)), key].join("+");
  }
  function startsWith(seq, typed) {
    return typed.every((chord, i) => seq[i] === chord);
  }
  function resolveKey(bindings, state, chord, now) {
    const pending = now - state.at > SEQUENCE_TIMEOUT_MS ? [] : state.chords;
    const typed = [...pending, chord];
    const matches = bindings.filter((b) => b.seq.length >= typed.length && startsWith(b.seq, typed));
    if (matches.length === 0) {
      return pending.length > 0 ? resolveKey(bindings, { chords: [], at: now }, chord, now) : { kind: "none" };
    }
    const exact = matches.find((b) => b.seq.length === typed.length);
    if (exact) return { kind: "run", command: exact.command, mode: exact.mode, seq: exact.seq };
    const passes = matches.some((b) => b.mode !== "run");
    return { kind: "pending", state: { chords: typed, at: now }, mode: passes ? "native" : "run" };
  }
  var MODIFIER_KEYS = /* @__PURE__ */ new Set(["Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock", "Fn", "OS"]);
  var isModifierKey = (e) => MODIFIER_KEYS.has(e.key);
  var IDLE = { chords: [], at: 0 };
  function createKeySequence(isMac2) {
    let state = IDLE;
    return {
      press(bindings, e, now) {
        if (isModifierKey(e)) return { kind: "none" };
        const result = resolveKey(bindings, state, chordFromEvent(e, isMac2), now);
        state = result.kind === "pending" ? result.state : IDLE;
        return result;
      },
      reset() {
        state = IDLE;
      }
    };
  }
  var SPECIAL_KEYS = {
    enter: { key: "Enter", code: "Enter", keyCode: 13, charCode: 13, shift: false },
    "/": { key: "/", code: "Slash", keyCode: 191, charCode: 47, shift: false },
    "?": { key: "?", code: "Slash", keyCode: 191, charCode: 63, shift: true },
    "#": { key: "#", code: "Digit3", keyCode: 51, charCode: 35, shift: true },
    "!": { key: "!", code: "Digit1", keyCode: 49, charCode: 33, shift: true },
    "*": { key: "*", code: "Digit8", keyCode: 56, charCode: 42, shift: true }
  };
  function syntheticKeyEvents(chord) {
    const parts = chord.split("+");
    const name = parts.pop();
    const shift = parts.includes("shift");
    let spec = SPECIAL_KEYS[name];
    if (!spec) {
      const upper = name.toUpperCase();
      const lower = name.toLowerCase();
      spec = {
        key: shift ? upper : lower,
        code: `Key${upper}`,
        keyCode: upper.charCodeAt(0),
        charCode: (shift ? upper : lower).charCodeAt(0),
        shift
      };
    }
    const base = { key: spec.key, code: spec.code, shiftKey: spec.shift || shift };
    return [
      { type: "keydown", ...base, keyCode: spec.keyCode, charCode: 0 },
      { type: "keypress", ...base, keyCode: spec.charCode, charCode: spec.charCode },
      { type: "keyup", ...base, keyCode: spec.keyCode, charCode: 0 }
    ];
  }
  var KEY_LABELS = {
    escape: "Esc",
    enter: "↵",
    tab: "Tab",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
    " ": "Space"
  };
  function formatChord(chord, isMac2) {
    const parts = chord.split("+");
    const name = parts.pop();
    const labels2 = isMac2 ? { mod: "⌘", ctrl: "⌃", alt: "⌥", shift: "⇧", meta: "⌘" } : { mod: "Ctrl", ctrl: "Ctrl", alt: "Alt", shift: "Shift", meta: "Win" };
    const key = KEY_LABELS[name] ?? name.toUpperCase();
    const mods = parts.map((m) => labels2[m]);
    return isMac2 ? [...mods, key].join("") : [...mods, key].join("+");
  }
  var formatSequence = (seq, isMac2) => seq.map((chord) => formatChord(chord, isMac2)).join(" then ");

  // src/route.js
  var LIST_ROOT_ARITY = {
    inbox: 1,
    starred: 1,
    snoozed: 1,
    sent: 1,
    drafts: 1,
    all: 1,
    spam: 1,
    trash: 1,
    imp: 1,
    scheduled: 1,
    search: 2,
    label: 2,
    category: 2,
    "advanced-search": 2
  };
  var THREAD_ID = /^[0-9a-zA-Z]{16,}$/;
  var INBOX_QUERY = "in:inbox";
  function decodeQuery(segment) {
    const spaced = segment.replace(/\+/g, " ");
    try {
      return decodeURIComponent(spaced);
    } catch {
      return spaced;
    }
  }
  function normalizeQuery(query) {
    return query.trim().replace(/\s+/g, " ").toLowerCase();
  }
  function parseRoute(hash) {
    const path = hash.replace(/^#/, "").split("?")[0] || "inbox";
    const parts = path.split("/");
    const arity = LIST_ROOT_ARITY[parts[0]];
    if (!arity || parts.length < arity) return { view: "other", query: null };
    const view = parts.slice(arity).some((s) => THREAD_ID.test(s)) ? "thread" : "list";
    let query = null;
    if (parts[0] === "inbox") query = INBOX_QUERY;
    else if (parts[0] === "search") query = normalizeQuery(decodeQuery(parts[1]));
    return { view, query };
  }
  function labelName(hash) {
    const match = /^#label\/([^/?]+)/.exec(hash);
    return match ? decodeQuery(match[1]) : null;
  }
  function splitHash(query) {
    return normalizeQuery(query) === INBOX_QUERY ? "#inbox" : `#search/${encodeURIComponent(query)}`;
  }
  function activeSplitIndex(splits, hash) {
    const { query } = parseRoute(hash);
    if (query === null) return -1;
    return splits.findIndex((s) => normalizeQuery(s.query) === query);
  }
  function cycleSplitIndex(count, active, delta) {
    if (count === 0) return -1;
    if (active < 0) return delta > 0 ? 0 : count - 1;
    return (active + delta + count) % count;
  }
  function closePaneHash(hash, nonce) {
    if (parseRoute(hash).view !== "list" || hash.includes("?")) return null;
    const path = hash.replace(/^#/, "") || "inbox";
    const parts = path.split("/");
    return parts.length === LIST_ROOT_ARITY[parts[0]] ? `#${path}/p1?nw=${nonce}` : null;
  }

  // src/gmail.js
  var SELECTORS = {
    threadList: '[gh="tl"]',
    checkedBox: '[role="checkbox"][aria-checked="true"]',
    row: "tr",
    cursorRow: "tr.zA.btb",
    overlay: '[role="menu"], [role="dialog"], [role="alertdialog"], [role="listbox"]',
    labelLink: '[role="navigation"] a[href*="#label/"]',
    selectAllMatching: '[role="main"] .ya [role="link"]',
    subject: "h2.hP",
    splitToggle: '[aria-label="Toggle split pane mode"]',
    settingsTab: 'a[href$="#settings/general"]',
    shortcutsTab: 'a[href$="#settings/shortcuts"]'
  };
  var UNREAD_ROW_CLASS = "zE";
  var GMAIL_KEYS = {
    archive: [["e"]],
    delete: [["#"]],
    spam: [["!"]],
    mute: [["m"]],
    snooze: [["b"]],
    move: [["v"]],
    label: [["l"]],
    "mark-read": [["shift+i"]],
    "mark-unread": [["shift+u"]],
    select: [["x"]],
    "select-all": [["*", "a"]],
    "deselect-all": [["*", "n"]],
    back: [["u"]],
    open: [["o"]],
    undo: [["z"]]
  };
  var gmailKeyMap = (overrides) => ({ ...GMAIL_KEYS, ...overrides });
  var GMAIL_CHORD = /^(?:shift\+[a-z]|[^\sA-Z+])$/u;
  var isGmailSequence = (seq) => Array.isArray(seq) && seq.length > 0 && seq.every((chord) => typeof chord === "string" && GMAIL_CHORD.test(chord));
  function gmailAlternatives(raw) {
    if (isGmailSequence(raw)) return [[...raw]];
    return Array.isArray(raw) ? raw.filter(isGmailSequence).map((seq) => [...seq]) : [];
  }
  var REAL_KEY_VERBS = { archive: "archives", delete: "deletes", spam: "reports spam", mute: "mutes" };
  var SHORTCUTS_HASH = "#settings/shortcuts";
  var SHORTCUT_LABELS = {
    Archive: "archive",
    Delete: "delete",
    "Report as spam": "spam",
    "Mute conversation": "mute",
    Snooze: "snooze",
    'Open "move to" menu': "move",
    'Open "label as" menu': "label",
    "Mark as read": "mark-read",
    "Mark as unread": "mark-unread",
    "Select conversation": "select",
    "Select all conversations": "select-all",
    "Deselect all conversations": "deselect-all",
    "Back to threadlist": "back",
    "Open conversation": "open",
    "Undo last action": "undo"
  };
  var ACTION_LABELS = Object.fromEntries(Object.entries(SHORTCUT_LABELS).map(([label, action]) => [action, label]));
  function gmailSequence(text) {
    const seq = [...text.trim()].map((ch) => ch >= "A" && ch <= "Z" ? `shift+${ch.toLowerCase()}` : ch);
    return isGmailSequence(seq) ? seq : null;
  }
  var gmailNotation = (alternatives) => alternatives.map((seq) => seq.map((chord) => chord.startsWith("shift+") ? chord.slice(6).toUpperCase() : chord).join("")).join(" or ");
  function gmailKeysFromShortcuts(rows) {
    const keys = {};
    for (const [label, ...values] of rows) {
      const action = Object.hasOwn(SHORTCUT_LABELS, label) ? SHORTCUT_LABELS[label] : null;
      const alternatives = action ? values.map(gmailSequence).filter(Boolean) : [];
      if (alternatives.length > 0) keys[action] = alternatives;
    }
    return keys;
  }
  function shortcutNotice(found) {
    if (found === "off") {
      return { title: "Custom keyboard shortcuts are off in Gmail", lines: ["nowave sends Gmail's default keys."] };
    }
    const count = found ? Object.keys(found).length : 0;
    if (count === 0) {
      return {
        title: "Could not read Gmail's keyboard shortcuts",
        lines: ["nowave kept its keys. It reads the page only when Gmail is in English."]
      };
    }
    const changed = Object.entries(found).filter(([action, seq]) => gmailNotation(seq) !== gmailNotation(GMAIL_KEYS[action]));
    return {
      title: changed.length === 0 ? `Gmail uses its default keys for the ${count} actions nowave sends` : `Saved ${count} Gmail shortcuts, ${changed.length} not Gmail's default`,
      lines: changed.map(
        ([action, seq]) => `${ACTION_LABELS[action]}: ${gmailNotation(seq)} (default ${gmailNotation(GMAIL_KEYS[action])})`
      )
    };
  }
  var keyChoice = (alternatives, isMac2) => alternatives.map((seq) => formatSequence(seq, isMac2)).join(" or ");
  function realKeyNotice(action, alternatives, pressed, isMac2) {
    const keys = keyChoice(alternatives, isMac2);
    const title = `Gmail only ${REAL_KEY_VERBS[action]} on its own shortcut. Press ${keys}.`;
    if (!pressed) return { title, lines: [] };
    const label = ACTION_LABELS[action];
    const slot = alternatives.length < 2 ? `add it as a second ${label} shortcut` : `make it one of the ${label} shortcuts`;
    const key = formatSequence(pressed, isMac2);
    return { title, lines: [`To use ${key} too, ${slot} in Gmail's keyboard shortcut settings.`] };
  }
  var everythingNotice = (archive, isMac2) => ({
    title: `Everything here is selected. Press ${keyChoice(archive, isMac2)} to mark it done, Esc to clear.`,
    lines: []
  });
  var CALM_CLASS = "nowave-calm";
  var SPLITS_MOUNTED_CLASS = "nowave-splits";
  var CALM_CSS = `
html.${CALM_CLASS} :is(a, button, [role="button"], [role="link"])[aria-label*="Gemini"],
html.${CALM_CLASS} [data-tooltip*="Gemini"],
html.${CALM_CLASS} :has(> [data-is-tooltip-wrapper] > button[aria-label*="Gemini"]),
html.${CALM_CLASS} header a[href*="one.google.com"],
html.${CALM_CLASS}.${SPLITS_MOUNTED_CLASS} [role="main"] [role="tablist"] {
  display: none !important;
}
`;
  var ownEvents = /* @__PURE__ */ new WeakSet();
  function isOwnEvent(e) {
    return ownEvents.has(e);
  }
  var isShown = (el2) => el2.getClientRects().length > 0 && getComputedStyle(el2).visibility !== "hidden";
  function isTyping(el2) {
    if (!el2) return false;
    if (el2.isContentEditable) return true;
    if (el2.tagName === "TEXTAREA" || el2.tagName === "SELECT") return true;
    if (el2.tagName === "INPUT") return !["checkbox", "radio", "button", "submit", "reset"].includes(el2.type);
    return ["textbox", "combobox", "searchbox"].includes(el2.getAttribute("role"));
  }
  function overlayOpen() {
    return document.activeElement?.closest(SELECTORS.overlay) != null;
  }
  function sendKey(chord) {
    const target = document.activeElement ?? document.body;
    let downCanceled = false;
    for (const init of syntheticKeyEvents(chord)) {
      if (init.type === "keypress" && downCanceled) continue;
      const e = new KeyboardEvent(init.type, { ...init, bubbles: true, cancelable: true, composed: true });
      ownEvents.add(e);
      const notCanceled = target.dispatchEvent(e);
      if (init.type === "keydown") downCanceled = !notCanceled;
    }
  }
  function sendSequence(seq) {
    for (const chord of seq) sendKey(chord);
  }
  var send = (keys, action) => sendSequence(keys[action][0]);
  var firstShown = (selector) => [...document.querySelectorAll(selector)].find(isShown) ?? null;
  function findThreadList() {
    return firstShown(SELECTORS.threadList);
  }
  function paneOpen() {
    return parseRoute(location.hash).view === "list" && firstShown(SELECTORS.subject) !== null;
  }
  function closePane() {
    const hash = closePaneHash(location.hash, Date.now());
    if (hash && paneOpen()) location.replace(hash);
  }
  function toggleSplitPane() {
    const button = firstShown(SELECTORS.splitToggle);
    if (!button) return;
    const r = button.getBoundingClientRect();
    const at = { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
    for (const type of ["mouseover", "mousedown", "mouseup", "click"]) {
      button.dispatchEvent(new MouseEvent(type, { ...at, button: 0, bubbles: true, cancelable: true, composed: true, view: window }));
    }
  }
  function checkedRows() {
    const list = findThreadList();
    if (!list) return [];
    return [...list.querySelectorAll(SELECTORS.checkedBox)].map((box) => box.closest(SELECTORS.row)).filter(Boolean);
  }
  var anyChecked = () => checkedRows().length > 0;
  var isUnread = (row) => row.classList.contains(UNREAD_ROW_CLASS);
  var nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function waitFor(predicate, timeoutMs, step) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (predicate()) return true;
      await step();
    }
    return predicate();
  }
  async function selectCursorRowIfNone(keys) {
    if (checkedRows().length > 0) return { byNowave: false };
    send(keys, "select");
    const ok = await waitFor(() => checkedRows().length > 0, 400, nextFrame);
    return ok ? { byNowave: true } : null;
  }
  var focusHeld = () => overlayOpen() || isTyping(document.activeElement);
  function shouldDeselect({ byNowave, checked, focusHeld: focusHeld2 }) {
    return byNowave && checked && !focusHeld2;
  }
  async function clearOwnSelection(keys, selection, live) {
    await nextFrame();
    if (!live()) return;
    if (shouldDeselect({ byNowave: selection.byNowave, checked: checkedRows().length > 0, focusHeld: focusHeld() })) {
      send(keys, "deselect-all");
      await waitFor(() => checkedRows().length === 0, 300, nextFrame);
    }
  }
  async function triage(keys, action, after, live) {
    if (parseRoute(location.hash).view !== "list") {
      send(keys, action);
      return;
    }
    const selection = await selectCursorRowIfNone(keys);
    if (!selection || !live()) return;
    send(keys, action);
    if (!selection.byNowave) return;
    if (after === "menu") {
      if (!await waitFor(focusHeld, 500, nextFrame) || !live()) return;
      await waitFor(() => !focusHeld(), 12e4, () => sleep(200));
    }
    await clearOwnSelection(keys, selection, live);
  }
  var ASSIST_CLEANUP_MS = 600;
  var assistCleanup;
  function assistRealKey(keys, leave) {
    const list = findThreadList();
    if (!list || anyChecked()) return;
    send(keys, "select");
    const cursor = list.querySelector(SELECTORS.cursorRow);
    if (cursor) leave?.([cursor]);
    const hash = location.hash;
    clearTimeout(assistCleanup);
    assistCleanup = setTimeout(() => {
      if (location.hash === hash && shouldDeselect({ byNowave: true, checked: anyChecked(), focusHeld: focusHeld() })) {
        send(keys, "deselect-all");
      }
    }, ASSIST_CLEANUP_MS);
  }
  async function checkEverything(keys, live) {
    send(keys, "select-all");
    if (!await waitFor(anyChecked, 1e3, nextFrame) || !live()) return false;
    const link = firstShown(SELECTORS.selectAllMatching);
    if (!link) return true;
    const text = link.textContent;
    link.click();
    if (await waitFor(() => !isShown(link) || link.textContent !== text, 1500, nextFrame)) return live();
    if (live()) send(keys, "deselect-all");
    return false;
  }
  async function toggleRead(keys, live) {
    if (parseRoute(location.hash).view !== "list") {
      send(keys, "mark-unread");
      return;
    }
    const selection = await selectCursorRowIfNone(keys);
    if (!selection || !live()) return;
    send(keys, checkedRows().some(isUnread) ? "mark-read" : "mark-unread");
    await clearOwnSelection(keys, selection, live);
  }
  function readShortcutTable() {
    const rows = /* @__PURE__ */ new Map();
    for (const el2 of document.body.querySelectorAll("*")) {
      if (el2.childElementCount > 0) continue;
      const label = el2.textContent.trim();
      if (!Object.hasOwn(SHORTCUT_LABELS, label) || rows.has(label) || !isShown(el2)) continue;
      let row = el2.parentElement;
      while (row && !row.querySelector("input")) row = row.parentElement;
      const values = [...row?.querySelectorAll("input") ?? []].slice(0, 2).map((input) => input.value.trim());
      if (values.some(Boolean)) rows.set(label, values);
    }
    return [...rows].map(([label, values]) => [label, ...values]);
  }
  function shortcutPage() {
    if (location.hash !== SHORTCUTS_HASH) return location.hash.startsWith("#settings") ? "off" : "gone";
    const rows = readShortcutTable();
    if (rows.length > 0) return rows;
    return firstShown(SELECTORS.settingsTab) && !firstShown(SELECTORS.shortcutsTab) ? "off" : null;
  }
  async function openShortcutPage() {
    location.hash = SHORTCUTS_HASH;
    let page = null;
    await waitFor(() => (page = shortcutPage()) !== null, 1e4, () => sleep(200));
    return page === "gone" ? null : page;
  }
  function labels() {
    const seen = /* @__PURE__ */ new Map();
    for (const a of document.querySelectorAll(SELECTORS.labelLink)) {
      const hash = new URL(a.href).hash;
      const name = labelName(hash);
      if (name && !seen.has(hash)) seen.set(hash, { name, hash });
    }
    return [...seen.values()];
  }

  // src/commands.js
  var DEFAULT_CONTEXTS = ["list", "thread"];
  var EVERYWHERE = ["list", "thread", "other", "typing"];
  var ACCOUNTS = [0, 1, 2, 3];
  function gmailKey(id, title, section, keys, contexts, gmailSeqs = [keys[0]]) {
    const run = () => sendSequence(gmailSeqs[0]);
    return { id, title, section, keys, contexts, native: true, gmailKeys: gmailSeqs, run };
  }
  function listAction(id, title, chords, after, app2, gmail) {
    return {
      id,
      title,
      section: "Triage",
      keys: chords.map((chord) => [chord]),
      native: ["thread"],
      gmailKeys: gmail[id],
      run: () => app2.enqueue((live) => triage(gmail, id, after, live))
    };
  }
  var sameSeq = (a, b) => a.join(" ") === b.join(" ");
  function realKeyAction(id, title, chords, app2, gmail, isMac2) {
    const own = chords.map((chord) => [chord]).filter((seq) => !gmail[id].some((g) => sameSeq(g, seq)));
    return {
      id,
      title,
      section: "Triage",
      keys: [...gmail[id], ...own],
      chips: gmail[id],
      contexts: ["list", "pane", "thread"],
      native: ["pane", "thread"],
      assisted: ["list"],
      gmailKeys: gmail[id],
      assist: () => assistRealKey(gmail, app2.leaveRows),
      run: (pressed) => app2.notice(realKeyNotice(id, gmail[id], pressed, isMac2))
    };
  }
  function goTo(id, title, keys, hash, app2) {
    return { id, title, section: "Navigate", keys, run: () => app2.navigate(hash) };
  }
  function buildCommands(app2, { splits, labels: labels2, gmail = GMAIL_KEYS, isMac: isMac2 = false }) {
    return [
      realKeyAction("archive", "Mark done (archive)", ["e", "d"], app2, gmail, isMac2),
      {
        id: "select-everything",
        title: "Select everything here",
        section: "Triage",
        keys: [["shift+d"]],
        contexts: ["list"],
        run: app2.selectEverything
      },
      realKeyAction("delete", "Delete", ["#"], app2, gmail, isMac2),
      realKeyAction("spam", "Report spam", ["!"], app2, gmail, isMac2),
      realKeyAction("mute", "Mute", ["m"], app2, gmail, isMac2),
      listAction("snooze", "Snooze", ["b"], "menu", app2, gmail),
      listAction("move", "Move to…", ["v"], "menu", app2, gmail),
      listAction("label", "Label…", [], "menu", app2, gmail),
      listAction("mark-read", "Mark as read", ["shift+i"], "keeps", app2, gmail),
      listAction("mark-unread", "Mark as unread", ["shift+u"], "keeps", app2, gmail),
      {
        id: "toggle-read",
        title: "Toggle read / unread",
        section: "Triage",
        keys: [["u"]],
        run: () => app2.enqueue((live) => toggleRead(gmail, live))
      },
      gmailKey("star", "Star", "Triage", [["s"]]),
      gmailKey("select", "Select conversation", "Triage", [["x"]], ["list"], gmail.select),
      {
        id: "clear-selection",
        title: "Clear selection",
        section: "Triage",
        keys: [["escape"]],
        contexts: ["everything"],
        run: () => sendSequence(gmail["deselect-all"][0])
      },
      gmailKey("undo", "Undo", "Triage", [["z"]], void 0, gmail.undo),
      gmailKey("next", "Next conversation", "Navigate", [["j"]]),
      gmailKey("previous", "Previous conversation", "Navigate", [["k"]]),
      {
        id: "open",
        title: "Open conversation",
        section: "Navigate",
        keys: [["o"], ["enter"], ["l"]],
        contexts: ["list"],
        native: true,
        gmailKeys: [...gmail.open, ["enter"]],
        inert: { thread: [["l"]] },
        run: () => sendSequence(gmail.open[0])
      },
      {
        id: "back",
        title: "Back to list",
        section: "Navigate",
        keys: [["escape"], ["h"]],
        contexts: ["thread"],
        inert: { list: [["h"]] },
        run: () => sendSequence(gmail.back[0])
      },
      {
        id: "close-pane",
        title: "Close reading pane",
        section: "Navigate",
        keys: [["escape"], ["h"]],
        contexts: ["pane"],
        run: closePane
      },
      gmailKey("search", "Search mail", "Navigate", [["/"]]),
      gmailKey("go-inbox", "Go to Inbox", "Navigate", [["g", "i"]]),
      gmailKey("go-starred", "Go to Starred", "Navigate", [["g", "s"]]),
      gmailKey("go-sent", "Go to Sent", "Navigate", [["g", "t"]]),
      gmailKey("go-drafts", "Go to Drafts", "Navigate", [["g", "d"]]),
      goTo("go-snoozed", "Go to Snoozed", [["g", "h"]], "#snoozed", app2),
      goTo("go-done", "Go to Done (All Mail)", [["g", "e"], ["g", "a"]], "#all", app2),
      goTo("go-spam", "Go to Spam", [["g", "!"]], "#spam", app2),
      goTo("go-trash", "Go to Trash", [["g", "#"]], "#trash", app2),
      ...labels2.map((l) => goTo(`label:${l.hash}`, `Go to label: ${l.name}`, void 0, l.hash, app2)),
      { id: "next-split", title: "Next split", section: "Splits", keys: [["tab"]], run: () => app2.cycleSplit(1) },
      {
        id: "previous-split",
        title: "Previous split",
        section: "Splits",
        keys: [["shift+tab"]],
        run: () => app2.cycleSplit(-1)
      },
      ...splits.map((s, i) => ({
        id: `split:${s.name}`,
        title: `Go to split: ${s.name}`,
        section: "Splits",
        keys: i < 9 ? [["g", String(i + 1)]] : void 0,
        run: () => app2.goToSplit(i)
      })),
      { id: "save-split", title: "Save search as split…", section: "Splits", run: app2.saveSplit },
      ...splits.map((s, i) => ({
        id: `remove-split:${s.name}`,
        title: `Remove split: ${s.name}`,
        section: "Splits",
        run: () => app2.removeSplit(i)
      })),
      gmailKey("compose", "Compose", "Compose", [["c"]]),
      gmailKey("reply", "Reply", "Compose", [["r"]], ["thread"]),
      gmailKey("reply-all", "Reply all", "Compose", [["a"]], ["thread"]),
      gmailKey("forward", "Forward", "Compose", [["f"]], ["thread"]),
      {
        id: "palette",
        title: "Command palette",
        section: "View",
        keys: [["mod+k"]],
        contexts: EVERYWHERE,
        run: () => app2.openPalette(false)
      },
      {
        id: "shortcuts",
        title: "Keyboard shortcuts",
        section: "View",
        keys: [["?"]],
        contexts: ["list", "thread", "other"],
        run: () => app2.openPalette(true)
      },
      { id: "calm", title: "Toggle calm mode", section: "View", run: app2.toggleCalm },
      { id: "skin", title: "Toggle Shortwave look", section: "View", run: app2.toggleSkin },
      { id: "split-view", title: "Toggle split view", section: "View", run: toggleSplitPane },
      ...ACCOUNTS.map((n) => ({
        id: `account:${n}`,
        title: `Switch to account ${n}`,
        section: "Account",
        run: () => app2.switchAccount(n)
      })),
      {
        id: "shortcut-settings",
        title: "Open Gmail keyboard shortcut setting",
        section: "Account",
        run: () => app2.navigate("#settings/general")
      },
      { id: "detect-gmail-keys", title: "Detect Gmail keyboard shortcuts", section: "Account", run: app2.detectGmailKeys }
    ];
  }
  var isNativeIn = (command, context2) => command.native === true || Array.isArray(command.native) && command.native.includes(context2);
  var isGmailKey = (command, seq) => command.gmailKeys?.some((keys) => sameSeq(keys, seq)) ?? false;
  function modeIn(command, context2, seq) {
    if (!isGmailKey(command, seq)) return "run";
    if (isNativeIn(command, context2)) return "native";
    return command.assisted?.includes(context2) ? "assist" : "run";
  }
  var SWALLOW = { id: "swallow", run: () => {
  } };
  var REFINES = { pane: "list", everything: "list" };
  function bindingsFor(commands2, context2) {
    const live = commands2.filter((c) => c.keys && (c.contexts ?? DEFAULT_CONTEXTS).includes(context2)).flatMap((c) => c.keys.map((seq) => ({ seq, command: c, mode: modeIn(c, context2, seq) })));
    const inert = commands2.flatMap(
      (c) => (c.inert?.[context2] ?? []).map((seq) => ({ seq, command: SWALLOW, mode: "run" }))
    );
    const own = [...live, ...inert];
    if (!REFINES[context2]) return own;
    const taken = new Set(own.map((b) => b.seq.join(" ")));
    return [...own, ...bindingsFor(commands2, REFINES[context2]).filter((b) => !taken.has(b.seq.join(" ")))];
  }

  // src/rank.js
  var SECTIONS = ["Triage", "Navigate", "Splits", "Compose", "View", "Account"];
  var RECENT_SHOWN = 5;
  function greedyScore(q, t, start2) {
    let score = 0;
    let from = start2;
    let prev = start2 - 2;
    for (const ch of q) {
      const i = t.indexOf(ch, from);
      if (i < 0) return null;
      if (i === prev + 1) score += 3;
      if (i === 0 || !/[a-z0-9]/.test(t[i - 1])) score += 2;
      score -= Math.min(i - from, 5) * 0.1;
      prev = i;
      from = i + 1;
    }
    return score;
  }
  function fuzzyScore(query, text) {
    const q = query.toLowerCase().replace(/\s+/g, "");
    const t = text.toLowerCase();
    if (q === "") return 0;
    let best = null;
    for (let s = t.indexOf(q[0]); s >= 0; s = t.indexOf(q[0], s + 1)) {
      const score = greedyScore(q, t, s);
      if (score !== null && (best === null || score > best)) best = score;
    }
    return best;
  }
  function rankCommands(commands2, query, recentIds) {
    if (query.trim() !== "") {
      const hits = commands2.map((command, order) => ({ command, order, score: fuzzyScore(query, command.title) })).filter((h) => h.score !== null).sort((a, b) => b.score - a.score || a.order - b.order).map((h) => h.command);
      return hits.length > 0 ? [{ title: "Results", commands: hits }] : [];
    }
    const byId = new Map(commands2.map((c) => [c.id, c]));
    const recent = recentIds.map((id) => byId.get(id)).filter(Boolean).slice(0, RECENT_SHOWN);
    const shown = new Set(recent);
    const groups = recent.length > 0 ? [{ title: "Recent", commands: recent }] : [];
    for (const section of SECTIONS) {
      const inSection = commands2.filter((c) => c.section === section && !shown.has(c));
      if (inSection.length > 0) groups.push({ title: section, commands: inSection });
    }
    return groups;
  }

  // src/skin.js
  var SKIN_CLASS = "nowave-skin";
  var S = `html.${SKIN_CLASS}`;
  var SELECTORS2 = {
    mainMenu: 'header#gb div[role="button"][aria-expanded]',
    appReady: '[role="main"]',
    toolbar: '[gh="tm"]',
    toolbarActions: '[gh="mtb"]',
    inboxLink: '[role="navigation"] a[href$="#inbox"]',
    navItem: ".TO",
    navCount: ".bsU",
    threadId: "[data-thread-id]",
    subject: "h2.hP",
    view: '[role="main"]',
    nav: '[role="navigation"].aeN'
  };
  var RAIL_CLASS = "bhZ";
  var HOVER_EXPAND_CLASSES = ["bym", "aaj", "bjB"];
  var SPLIT = `${S} [gh="tl"].Nm`;
  var LEAVING_ATTR = "data-nowave-leaving";
  var LEAVE_MS = 140;
  var EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
  var reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SKIN_CSS = `
${S} {
  --nw-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", Roboto, sans-serif;
  --nw-text: #1c1d1f;
  --nw-surface: #ffffff;
  --nw-secondary: #5f636b;
  --nw-tertiary: #6b7280;
  --nw-hairline: rgba(0, 0, 0, 0.06);
  --nw-chrome: #f7f7f8;
  --nw-accent: #3d63f2;
  --nw-wash: #eef2fe;
  --nw-hover: #f5f6f8;
  --nw-selected: #e2e8fd;
  --nw-ease: ${EASE};
  color-scheme: light;
}
${S} body,
${S} .wl { background: var(--nw-chrome) !important; }
${S} .bkK { margin-right: 8px; }
${S} .bkK > .nH {
  border-radius: 12px;
  background: var(--nw-surface);
  box-shadow: 0 0 0 1px var(--nw-hairline);
}

${S} header#gb { min-height: 52px; height: auto; }
${S} header#gb > div:has([role="search"]) { height: 52px; padding-block: 0; align-items: center; }
${S} header#gb div:has(> div[role="button"][aria-expanded]) { flex: none !important; min-width: 0 !important; }
${S} header#gb a[href$="#inbox"] {
  display: none !important;
}
${S} header#gb form[role="search"] {
  max-width: 560px;
  height: auto;
  min-height: 36px;
  margin: 6px 0 6px -19px;
  border: 0;
  border-radius: 10px;
  background: #eceef1;
  box-shadow: none;
}
${S} header#gb form[role="search"] > :is(div, button) { height: 36px; }
${S} header#gb form[role="search"] input { font: 14px var(--nw-font); color: var(--nw-text); }
${S} header#gb form[role="search"]:focus-within {
  background: var(--nw-surface);
  box-shadow: 0 0 0 2px var(--nw-accent);
}
${S} header#gb a[href*="accounts.google.com/SignOutOptions"] { transform: scale(0.8); }

${S} [role="navigation"].aeN {
  background: var(--nw-chrome);
  box-shadow: inset -1px 0 var(--nw-hairline);
}
${S} [role="navigation"] .TO { border-radius: 8px; }
${S} [role="navigation"] .TO a { font-family: var(--nw-font); }
${S} [role="navigation"] .TO:hover { background: var(--nw-hover); }
${S} [role="navigation"] .TO:has(a[aria-current="page"]) { background: var(--nw-wash); }
${S} [role="navigation"] .bsU { font: 500 11px var(--nw-font); color: var(--nw-secondary); }
${S} [gh="cm"] {
  interpolate-size: allow-keywords;
  box-sizing: border-box;
  width: fit-content !important;
  min-width: 0 !important;
  height: 40px !important;
  margin: 4px 0 12px 12px !important;
  padding: 0 16px 0 14px !important;
  justify-content: flex-start;
  overflow: hidden;
  white-space: nowrap;
  border-radius: 10px !important;
  background: var(--nw-surface);
  color: var(--nw-text);
  font: 500 14px/20px var(--nw-font) !important;
  box-shadow: 0 0 0 1px var(--nw-hairline), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: width 160ms var(--nw-ease), padding 160ms var(--nw-ease), background-color 80ms var(--nw-ease);
}
${S} [gh="cm"]::before {
  flex: none;
  width: 20px !important;
  min-width: 0 !important;
  height: 20px !important;
  margin: 0 10px 0 0 !important;
  background-size: 20px auto !important;
  background-position: center !important;
}
${S} ${SELECTORS2.nav}.${RAIL_CLASS} [gh="cm"] { width: 40px !important; padding: 0 10px !important; }
${S} [gh="cm"]:hover { background: var(--nw-hover); }

${S} ${SELECTORS2.toolbar} { min-height: 44px; background: var(--nw-surface); }
${S} ${SELECTORS2.toolbar} :has(> #nowave-splits) { align-items: center; }
${S} #nowave-splits {
  flex: none;
  min-width: 0;
  margin: 0 12px 0 -8px;
  padding-right: 12px;
  border-right: 1px solid var(--nw-hairline);
  background: var(--nw-surface);
}

${S} tr.zA > td.PF { display: none !important; }
${S} tr.zA > :is(td.oZ-x3, td.apU, td.WA) { opacity: 0.6; }
${S} tr.zA:is(:hover, :focus-within, .x7) > :is(td.oZ-x3, td.apU, td.WA),
${S} tr.zA > :is(td.oZ-x3, td.apU, td.WA):has([aria-checked="true"]) { opacity: 1; }
${S} tr.zA {
  margin-inline: 8px;
  border-radius: 8px;
  background: transparent !important;
  box-shadow: none !important;
  font: 14px var(--nw-font);
  transition: opacity ${LEAVE_MS}ms var(--nw-ease),
    transform ${LEAVE_MS}ms var(--nw-ease);
}
${S} tr.zA[${LEAVING_ATTR}] { opacity: 0; transform: translateX(12px); }
@media (prefers-reduced-motion: reduce) {
  ${S} tr.zA[${LEAVING_ATTR}] { transform: none; }
}
${S} tr.zA > td:not(.bq4),
${S} tr.zA > td:not(.bq4) * { font-family: var(--nw-font) !important; }
${S} tr.zA > td.yX { padding-left: 12px; }
${S} tr.zA:hover { background: var(--nw-hover) !important; }
${S} tr.zA:has(td.oZ-x3 [role="checkbox"][aria-checked="true"]) { background: var(--nw-selected) !important; }
${S} tr.zA.btb {
  background: var(--nw-wash) !important;
  box-shadow: inset 3px 0 var(--nw-accent) !important;
}
${S} ${SELECTORS2.subject} { font: 600 22px/1.3 var(--nw-font) !important; color: var(--nw-text); }
${S} h3.Wr { min-height: 0 !important; height: 28px !important; padding: 12px 0 0 12px !important; }
${S} h3.Wr .qh {
  font: 600 11px/16px var(--nw-font) !important;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--nw-tertiary) !important;
}
${S} h3.Wr img.qi { opacity: 0.4; transform: scale(0.75); }
${S} .Wg .Dj,
${S} .Wg .Dj * { font: 500 11px/16px var(--nw-font) !important; color: var(--nw-tertiary) !important; }
${S} tr.zA :is(td.yX, .bog),
${S} tr.zA :is(td.yX, .bog) * { font-weight: 400 !important; color: var(--nw-text) !important; }
${S} tr.zA.yO .bog,
${S} tr.zA.yO .bog * { color: var(--nw-secondary) !important; }
${S} tr.zA.zE :is(td.yX, .bog, td.xW),
${S} tr.zA.zE :is(td.yX, .bog, td.xW) * { font-weight: 600 !important; color: var(--nw-text) !important; }
${S} tr.zA .y2,
${S} tr.zA .y2 * { color: var(--nw-tertiary) !important; }
${S} tr.zA td.xW * { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--nw-secondary); }
${S} tr.zA .at { border-radius: 4px; }
${S} tr.zA .at .av { font-size: 11px; font-weight: 500; }

${S} .adn .gE { font-family: var(--nw-font); color: var(--nw-secondary); }
${S} .adn .gD { font-family: var(--nw-font); color: var(--nw-text); }
${S} .adn .gH { color: var(--nw-secondary); }

${S} .AD:has([g_editable="true"]) .M9 {
  border-radius: 12px 12px 0 0;
  background: var(--nw-surface);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
}
${S} .AD:has([g_editable="true"]) .aYF {
  background: var(--nw-chrome);
  color: var(--nw-text);
  font-family: var(--nw-font);
}
${S} .AD input[name="subjectbox"] {
  color: var(--nw-text);
  font: 500 14px var(--nw-font);
}
${S} .J-M,
${S} .Kj-JD {
  border: 1px solid var(--nw-hairline);
  border-radius: 12px;
  background: var(--nw-surface);
  color: var(--nw-text);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
  font-family: var(--nw-font);
}
${S} .J-M .J-N { border-radius: 6px; }
${S} .J-M .J-N:is(:hover, .J-N-JT) { background: var(--nw-wash); }
${S} :is([gh="cm"], [gh="tm"] [role="button"], .TO a):focus-visible {
  outline: 2px solid var(--nw-accent);
  outline-offset: -2px;
}

${SPLIT} > .Nt {
  border-color: transparent !important;
  background: linear-gradient(var(--nw-hairline), var(--nw-hairline)) center / 1px 100% no-repeat !important;
}
${SPLIT} > .Nu.S3 :is(.apc, .apO) { display: none !important; }
${SPLIT} > .Nu.S3 .aia > :has(.apb) { flex: 1; }
${SPLIT} > .Nu.S3 .apb {
  padding: clamp(24px, 20vh, 180px) 16px 24px;
  text-align: center;
  font: 14px var(--nw-font);
  color: var(--nw-tertiary);
}
${SPLIT} > .Nu.S3 .a98 { padding: 12px 28px 32px 12px !important; }
${SPLIT} tr.zA { flex-wrap: wrap; height: auto !important; padding-block: 8px !important; row-gap: 2px; }
${SPLIT} tr.zA > td.yX { margin-right: auto; }
${SPLIT} tr.zA > :is(td.yf, td.xW, td.bq4) { order: 2; }
${SPLIT} tr.zA > td.a4W { order: 3; flex: 0 0 100% !important; box-sizing: border-box; padding-left: 12px; }
@media (max-width: 900px) {
  ${S} .bkK { margin-right: 4px; }
  ${S} #nowave-splits { padding-inline: 8px; }
  ${S} header#gb form[role="search"] { width: auto; min-width: 0; }
  ${SPLIT} > .Nu.S3 .a98 { padding-inline: 12px !important; }
}
@media (prefers-reduced-motion: reduce) {
  ${S} tr.zA, ${S} [gh="cm"] { transition: none; }
}
`;
  var SPLIT_PILLS_CSS = `
:host(.${SKIN_CLASS}) .bar {
  position: relative;
  gap: 2px;
  height: 32px;
  padding: 0;
  border: 0;
  align-items: center;
  color: var(--nw-text);
  font: 500 14px var(--nw-font);
}
:host(.${SKIN_CLASS}) .tab {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 5px 10px;
  border: 0;
  border-radius: 8px;
  opacity: 1;
  color: var(--nw-secondary);
  line-height: 20px;
}
:host(.${SKIN_CLASS}) .tab:hover,
:host(.${SKIN_CLASS}) .tab[aria-selected="true"] { color: var(--nw-text); }
:host(.${SKIN_CLASS}) .count {
  margin-left: 6px;
  color: var(--nw-tertiary);
  font-variant-numeric: tabular-nums;
}
.pill { display: none; }
:host(.${SKIN_CLASS}) .pill {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 8px;
  background: var(--nw-hairline);
  pointer-events: none;
}
:host(.${SKIN_CLASS}) .pill[hidden] { display: none; }
`;
  function splitBarAnchor(list) {
    const view = list.closest(SELECTORS2.view) ?? document;
    const toolbar = [...view.querySelectorAll(SELECTORS2.toolbar)].find((el2) => el2.getClientRects().length > 0);
    return toolbar?.querySelector(SELECTORS2.toolbarActions) ?? toolbar ?? null;
  }
  function inboxUnread() {
    const item = document.querySelector(SELECTORS2.inboxLink)?.closest(SELECTORS2.navItem);
    const count = item?.querySelector(SELECTORS2.navCount)?.textContent.trim();
    return count || null;
  }
  var threadId = (row) => row.querySelector(SELECTORS2.threadId)?.getAttribute("data-thread-id") ?? null;
  async function leaveRows(rows) {
    let leaving = rows.map((row) => ({ row, id: threadId(row) }));
    for (const { row } of leaving) row.setAttribute(LEAVING_ATTR, "");
    const deadline = performance.now() + LEAVE_MS + 600;
    while (leaving.length > 0) {
      await nextFrame2();
      const expired = performance.now() > deadline;
      leaving = leaving.filter(({ row, id }) => {
        const stays = row.isConnected && !expired && threadId(row) === id;
        if (!stays) row.removeAttribute(LEAVING_ATTR);
        return stays;
      });
    }
  }
  function navToggle({ skin, expanded, collapsedBySkin, clicked }) {
    if (clicked) return null;
    if (skin && expanded) return "collapse";
    if (!skin && !expanded && collapsedBySkin) return "expand";
    return null;
  }
  var nextFrame2 = () => new Promise((resolve) => requestAnimationFrame(resolve));
  function mainMenu() {
    return document.querySelector(SELECTORS2.appReady) ? document.querySelector(SELECTORS2.mainMenu) : null;
  }
  function createRailPin() {
    const observer = new MutationObserver(unexpand);
    let nav = null;
    function unexpand() {
      const hovered = HOVER_EXPAND_CLASSES.filter((c) => nav.classList.contains(c));
      if (nav.classList.contains(RAIL_CLASS) && hovered.length > 0) nav.classList.remove(...hovered);
    }
    return {
      sync(skin) {
        const next = skin ? document.querySelector(SELECTORS2.nav) : null;
        if (next === nav) return;
        observer.disconnect();
        nav = next;
        if (!nav) return;
        observer.observe(nav, { attributes: true, attributeFilter: ["class"] });
        unexpand();
      }
    };
  }
  var isNavExpanded = (button) => button.getAttribute("aria-expanded") === "true";
  async function clickMainMenu(button) {
    const before = isNavExpanded(button);
    button.click();
    const deadline = Date.now() + 1e3;
    while (Date.now() < deadline) {
      if (isNavExpanded(button) !== before) return true;
      await nextFrame2();
    }
    return false;
  }

  // src/palette.js
  var CSS = `
:host {
  all: initial;
  --bg: #ffffff;
  --fg: #1f1f1f;
  --muted: #5f6368;
  --line: rgba(0, 0, 0, 0.08);
  --selected: rgba(11, 87, 208, 0.09);
  --chip: #f1f3f4;
}
@media (prefers-color-scheme: dark) {
  :host {
    --bg: #202124;
    --fg: #e8eaed;
    --muted: #9aa0a6;
    --line: rgba(255, 255, 255, 0.1);
    --selected: rgba(168, 199, 250, 0.14);
    --chip: #303134;
  }
}
:host(.${SKIN_CLASS}) {
  color-scheme: light;
  --bg: var(--nw-surface);
  --fg: var(--nw-text);
  --muted: var(--nw-secondary);
  --line: var(--nw-hairline);
  --selected: var(--nw-wash);
  --chip: var(--nw-chrome);
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: rgba(0, 0, 0, 0.32);
}
.backdrop[hidden] { display: none; }
.card {
  outline: 0;
  margin-top: 20vh;
  width: min(640px, calc(100vw - 32px));
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: var(--bg);
  color: var(--fg);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.12);
  font: 14px/1.4 "Google Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
}
.input {
  border: 0;
  border-bottom: 1px solid var(--line);
  outline: 0;
  padding: 16px 18px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 16px;
}
.input::placeholder { color: var(--muted); }
.list { overflow-y: auto; padding: 6px 0 8px; }
.section {
  padding: 10px 18px 4px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 36px;
  margin: 0 6px;
  padding: 0 12px;
  border-radius: 8px;
  cursor: default;
}
.row[aria-selected="true"] { background: var(--selected); }
.title { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.note { height: auto; min-height: 36px; padding-block: 8px; box-sizing: border-box; }
.note .title { white-space: normal; }
.keys { display: flex; flex-shrink: 0; align-items: center; gap: 4px; }
kbd {
  min-width: 12px;
  padding: 1px 6px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--chip);
  color: var(--fg);
  font: 500 11px/18px "Google Sans", system-ui, sans-serif;
  text-align: center;
}
.sep { color: var(--muted); font-size: 11px; }
.hint { padding: 12px 18px; color: var(--muted); }
`;
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function createPalette({ isMac: isMac2, onRun, onOpenChange }) {
    const host = el("div");
    host.id = "nowave-palette";
    const root = host.attachShadow({ mode: "closed" });
    const style2 = el("style");
    style2.textContent = CSS;
    const backdrop = el("div", "backdrop");
    backdrop.hidden = true;
    const card = el("div", "card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "nowave command palette");
    card.tabIndex = -1;
    const input = el("input", "input");
    input.spellcheck = false;
    input.autocomplete = "off";
    const list = el("div", "list");
    list.setAttribute("role", "listbox");
    card.append(input, list);
    backdrop.append(card);
    root.append(style2, backdrop);
    let mode = null;
    let items = [];
    let rows = [];
    let selected = 0;
    let returnFocus = null;
    function cardFrames() {
      const from = reducedMotion() ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px) scale(0.985)" };
      return [from, { opacity: 1, transform: "none" }];
    }
    function animateIn() {
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 60, easing: EASE });
      card.animate(cardFrames(), { duration: 90, easing: EASE });
    }
    function animateOut() {
      backdrop.style.pointerEvents = "none";
      const reverse = { duration: 60, easing: EASE, direction: "reverse", fill: "forwards" };
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], reverse);
      card.animate(cardFrames(), reverse).onfinish = () => {
        if (isOpen()) return;
        backdrop.hidden = true;
        for (const a of [...backdrop.getAnimations(), ...card.getAnimations()]) a.cancel();
      };
    }
    function select(index) {
      if (rows.length === 0) return;
      selected = (index + rows.length) % rows.length;
      rows.forEach((row, i) => row.setAttribute("aria-selected", String(i === selected)));
      rows[selected].scrollIntoView({ block: "nearest" });
    }
    function keyChips(keys) {
      const box = el("span", "keys");
      keys.forEach((seq, s) => {
        if (s > 0) box.append(el("span", "sep", "or"));
        seq.forEach((chord, c) => {
          if (c > 0) box.append(el("span", "sep", "then"));
          box.append(el("kbd", null, formatChord(chord, isMac2)));
        });
      });
      return box;
    }
    function render() {
      list.replaceChildren();
      if (mode.kind === "prompt") {
        items = [];
        rows = [];
        list.append(el("div", "hint", "Enter to save, Esc to cancel"));
        return;
      }
      if (mode.kind === "notice") {
        items = [];
        rows = [];
        for (const text of [mode.title, ...mode.lines]) {
          const row = el("div", "row note");
          row.append(el("span", "title", text));
          list.append(row);
        }
        list.append(el("div", "hint", "Enter or Esc to close"));
        return;
      }
      const groups = rankCommands(mode.commands, input.value, mode.recent);
      items = groups.flatMap((g) => g.commands);
      rows = [];
      for (const group of groups) {
        list.append(el("div", "section", group.title));
        for (const command of group.commands) {
          const row = el("div", "row");
          row.setAttribute("role", "option");
          const index = rows.length;
          row.append(el("span", "title", command.title));
          const chips = command.chips ?? command.keys;
          if (chips) row.append(keyChips(chips));
          row.addEventListener("mousemove", () => index !== selected && select(index));
          row.addEventListener("click", () => run(index));
          rows.push(row);
          list.append(row);
        }
      }
      if (rows.length === 0) list.append(el("div", "hint", "No matching commands"));
      select(0);
    }
    function show(nextMode, placeholder, value) {
      if (!host.isConnected) document.body.append(host);
      if (!isOpen()) {
        returnFocus = document.activeElement;
        onOpenChange();
      }
      mode = nextMode;
      input.placeholder = placeholder;
      input.value = value;
      input.hidden = mode.kind === "notice";
      backdrop.style.pointerEvents = "";
      for (const a of [...backdrop.getAnimations(), ...card.getAnimations()]) a.cancel();
      if (backdrop.hidden) {
        backdrop.hidden = false;
        animateIn();
      }
      render();
      (input.hidden ? card : input).focus();
    }
    function close(answer = null) {
      if (!isOpen()) return;
      const closing = mode;
      mode = null;
      animateOut();
      onOpenChange();
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
      closing.resolve?.(answer);
    }
    function run(index) {
      const command = items[index];
      if (!command) return;
      close();
      onRun(command);
    }
    function submit() {
      if (mode.kind === "commands") run(selected);
      else if (mode.kind === "notice") close();
      else close(input.value.trim() || null);
    }
    function isOpen() {
      return mode !== null;
    }
    input.addEventListener("input", () => mode && render());
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop) close();
      else if (e.target !== input) e.preventDefault();
    });
    const moveDown = /* @__PURE__ */ new Set(["arrowdown", isMac2 ? "ctrl+j" : "mod+j"]);
    const moveUp = /* @__PURE__ */ new Set(["arrowup", isMac2 ? "ctrl+k" : "mod+k"]);
    function handleKey(e) {
      const chord = chordFromEvent(e, isMac2);
      const closes = chord === "escape" || isMac2 && chord === "mod+k";
      if (e.repeat && (closes || chord === "enter")) {
        e.preventDefault();
        return;
      }
      let handled = true;
      if (closes) close();
      else if (chord === "enter") submit();
      else if (moveDown.has(chord)) select(selected + 1);
      else if (moveUp.has(chord)) select(selected - 1);
      else if (chord === "tab" || chord === "shift+tab") select(selected + (chord === "tab" ? 1 : -1));
      else handled = false;
      if (handled) e.preventDefault();
    }
    const letsThrough = (e) => mode?.kind === "notice" && mode.through && !isModifierKey(e) && e.key !== "Enter";
    return {
      setSkin(on) {
        host.classList.toggle(SKIN_CLASS, on);
      },
      isOpen,
      close,
      handleKey,
      letsThrough,
      open({ commands: commands2, recent }) {
        show({ kind: "commands", commands: commands2, recent }, "Type a command", "");
      },
      prompt({ placeholder, value = "" }) {
        return new Promise((resolve) => show({ kind: "prompt", resolve }, placeholder, value));
      },
      notice({ title, lines, through = false }) {
        show({ kind: "notice", title, lines, through }, "", "");
      }
    };
  }

  // src/queue.js
  function createActionQueue(currentScope) {
    let tail = Promise.resolve();
    return (action) => {
      const scope = currentScope();
      const live = () => scope !== null && currentScope() === scope;
      const run = tail.then(() => live() ? action(live) : void 0);
      tail = run.catch(() => {
      });
      return run;
    };
  }

  // src/settings.js
  var STORAGE_KEY = "nowave";
  var RECENT_LIMIT = 8;
  var DEFAULT_SPLITS = [
    { name: "Inbox", query: "in:inbox" },
    { name: "Updates", query: "in:inbox category:updates" },
    { name: "Promotions", query: "in:inbox category:promotions" },
    { name: "Social", query: "in:inbox category:social" }
  ];
  var isText = (v) => typeof v === "string" && v.trim() !== "";
  var isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
  var parseGmailKeys = (raw) => isObject(raw) ? Object.fromEntries(
    Object.entries(raw).filter(([action]) => Object.hasOwn(GMAIL_KEYS, action)).map(([action, value]) => [action, gmailAlternatives(value)]).filter(([, alternatives]) => alternatives.length > 0)
  ) : {};
  function parseSettings(raw) {
    let data = null;
    try {
      data = JSON.parse(raw ?? "null");
    } catch {
      data = null;
    }
    const splits = Array.isArray(data?.splits) ? data.splits.filter((s) => isText(s?.name) && isText(s?.query)).map((s) => ({ name: s.name, query: s.query })) : DEFAULT_SPLITS;
    return {
      splits,
      calm: typeof data?.calm === "boolean" ? data.calm : true,
      skin: typeof data?.skin === "boolean" ? data.skin : true,
      navCollapsedBySkin: data?.navCollapsedBySkin === true,
      recent: Array.isArray(data?.recent) ? data.recent.filter(isText).slice(0, RECENT_LIMIT) : [],
      gmailKeys: parseGmailKeys(data?.gmailKeys)
    };
  }
  function addSplit(settings2, split) {
    return { ...settings2, splits: [...settings2.splits, { name: split.name.trim(), query: split.query.trim() }] };
  }
  function removeSplit(settings2, index) {
    return { ...settings2, splits: settings2.splits.filter((_, i) => i !== index) };
  }
  function recordRecent(settings2, id) {
    return { ...settings2, recent: [id, ...settings2.recent.filter((r) => r !== id)].slice(0, RECENT_LIMIT) };
  }

  // src/splitbar.js
  var CSS2 = `
:host {
  display: block;
  min-width: 0;
  max-width: 100%;
  --accent: #0b57d0;
  --line: rgba(0, 0, 0, 0.08);
}
@media (prefers-color-scheme: dark) {
  :host {
    --accent: #a8c7fa;
    --line: rgba(255, 255, 255, 0.12);
  }
}
.bar {
  display: flex;
  align-items: stretch;
  gap: 24px;
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
  scrollbar-width: none;
  font: 500 14px "Google Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
}
.tab {
  all: unset;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  opacity: 0.66;
  cursor: pointer;
  white-space: nowrap;
}
.tab:hover { opacity: 0.9; }
.tab:focus-visible { outline: 2px solid var(--nw-accent, var(--accent)); outline-offset: -2px; border-radius: 8px; }
.tab[aria-selected="true"] {
  opacity: 1;
  border-bottom-color: var(--accent);
}
`;
  function createSplitBar({ onSelect }) {
    const host = document.createElement("div");
    host.id = "nowave-splits";
    const root = host.attachShadow({ mode: "closed" });
    const style2 = document.createElement("style");
    style2.textContent = CSS2 + SPLIT_PILLS_CSS;
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", "Splits");
    root.append(style2, bar);
    bar.addEventListener("mousedown", (e) => e.preventDefault());
    bar.addEventListener("keydown", (e) => {
      const tabs = [...bar.querySelectorAll(".tab")];
      const index = tabs.indexOf(root.activeElement);
      if (index < 0) return;
      let next;
      if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      else return;
      e.preventDefault();
      e.stopPropagation();
      tabs[next].focus({ preventScroll: true });
      onSelect(next);
    });
    const pill = document.createElement("div");
    pill.className = "pill";
    let rendered = "";
    let placed = null;
    let needsPlace = false;
    let frame = null;
    const observer = new ResizeObserver(() => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        if (host.isConnected) place();
      });
    });
    function observe() {
      observer.disconnect();
      observer.observe(bar);
      for (const tab of bar.querySelectorAll(".tab")) observer.observe(tab);
    }
    function place() {
      needsPlace = false;
      const tab = bar.querySelector('[aria-selected="true"]');
      pill.hidden = !tab || !host.classList.contains(SKIN_CLASS);
      if (tab) {
        const left = tab.getBoundingClientRect().left - bar.getBoundingClientRect().left + bar.scrollLeft;
        if (left < bar.scrollLeft) bar.scrollLeft = left;
        else if (left + tab.offsetWidth > bar.scrollLeft + bar.clientWidth) {
          bar.scrollLeft = left + tab.offsetWidth - bar.clientWidth;
        }
      }
      if (pill.hidden) {
        placed = null;
        return;
      }
      const next = { transform: `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`, width: `${tab.offsetWidth}px` };
      if (placed?.transform === next.transform && placed.width === next.width) return;
      Object.assign(pill.style, next, { height: `${tab.offsetHeight}px` });
      for (const animation of pill.getAnimations()) animation.cancel();
      if (placed && !reducedMotion()) pill.animate([placed, next], { duration: 120, easing: EASE });
      placed = next;
    }
    return {
      setSkin(on) {
        if (host.classList.contains(SKIN_CLASS) === on) return;
        host.classList.toggle(SKIN_CLASS, on);
        needsPlace = true;
      },
      render(splits, active, counts = []) {
        const key = JSON.stringify([splits, active, counts]);
        if (key === rendered) return;
        rendered = key;
        needsPlace = true;
        const focused = bar.contains(root.activeElement);
        bar.replaceChildren(
          pill,
          ...splits.map((split, i) => {
            const tab = document.createElement("button");
            tab.className = "tab";
            tab.type = "button";
            tab.tabIndex = i === (active < 0 ? 0 : active) ? 0 : -1;
            tab.setAttribute("role", "tab");
            tab.setAttribute("aria-selected", String(i === active));
            tab.textContent = split.name;
            if (counts[i]) {
              const count = document.createElement("span");
              count.className = "count";
              count.textContent = counts[i];
              tab.append(count);
            }
            tab.title = split.query;
            tab.addEventListener("click", () => onSelect(i));
            return tab;
          })
        );
        if (focused) bar.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
        if (host.isConnected) observe();
      },
      // Idempotent: Gmail re-renders constantly and this runs on every settled mutation batch.
      mountBefore(anchor) {
        if (host.parentNode !== anchor.parentNode || host.nextSibling !== anchor) {
          anchor.parentNode.insertBefore(host, anchor);
          observe();
          needsPlace = true;
        }
        if (needsPlace) place();
      },
      unmount() {
        observer.disconnect();
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        placed = null;
        needsPlace = true;
        host.remove();
      }
    };
  }

  // nowave.user.js
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  var keySequence = createKeySequence(isMac);
  var loading = () => document.readyState === "loading";
  function loadSettings() {
    try {
      return parseSettings(localStorage.getItem(STORAGE_KEY));
    } catch {
      return parseSettings(null);
    }
  }
  var settings = loadSettings();
  function update(next) {
    settings = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
    }
    sync();
  }
  var app = {
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
      const query = await palette.prompt({ placeholder: "Search query for the split", value: current ?? "" });
      if (!query) return;
      const name = await palette.prompt({ placeholder: "Name this split" });
      if (!name) return;
      update(addSplit(settings, { name, query }));
      app.goToSplit(settings.splits.length - 1);
    },
    removeSplit(index) {
      update(removeSplit(settings, index));
    },
    selectEverything() {
      if (parseRoute(location.hash).view !== "list") return;
      app.enqueue(async (live) => {
        if (!await checkEverything(gmailKeys(), live)) return;
        everythingSelectedAt = location.hash;
        palette.notice({ ...everythingNotice(gmailKeys().archive, isMac), through: true });
      });
    },
    async detectGmailKeys() {
      const back = location.hash;
      const page = await openShortcutPage();
      const found = page === "off" ? "off" : page && gmailKeysFromShortcuts(page);
      if (found === "off") update({ ...settings, gmailKeys: {} });
      else if (found) saveGmailKeys(found);
      if (location.hash.startsWith("#settings") && location.hash !== back) location.hash = back;
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
    enqueue: createActionQueue(() => palette.isOpen() ? null : location.hash),
    leaveRows: (rows) => settings.skin ? leaveRows(rows) : void 0,
    notice: (notice) => palette.notice(notice)
  };
  var gmailKeys = () => gmailKeyMap(settings.gmailKeys);
  var commands = (labelLinks = []) => buildCommands(app, { splits: settings.splits, labels: labelLinks, gmail: gmailKeys(), isMac });
  var palette = createPalette({
    isMac,
    onOpenChange: keySequence.reset,
    onRun(command) {
      update(recordRecent(settings, command.id));
      command.run();
    }
  });
  var splitBar = createSplitBar({ onSelect: app.goToSplit });
  var railPin = createRailPin();
  var style = document.createElement("style");
  style.id = "nowave-style";
  style.textContent = CALM_CSS + SKIN_CSS;
  function saveGmailKeys(found) {
    const gmailKeys2 = { ...settings.gmailKeys, ...found };
    if (JSON.stringify(gmailKeys2) !== JSON.stringify(settings.gmailKeys)) update({ ...settings, gmailKeys: gmailKeys2 });
  }
  var shortcutsRead = false;
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
  var navClicked = false;
  function syncNav() {
    const button = mainMenu();
    if (!button) return;
    const toggle = navToggle({
      skin: settings.skin,
      expanded: isNavExpanded(button),
      collapsedBySkin: settings.navCollapsedBySkin,
      clicked: navClicked
    });
    if (!toggle) return;
    navClicked = true;
    clickMainMenu(button).then((ok) => {
      if (ok) update({ ...settings, navCollapsedBySkin: toggle === "collapse" });
    });
  }
  function sync() {
    if (loading()) return;
    const html = document.documentElement;
    if (!style.isConnected) document.head.append(style);
    html.classList.toggle(CALM_CLASS, settings.calm);
    if (html.classList.contains(SKIN_CLASS) !== settings.skin) {
      html.classList.toggle(SKIN_CLASS, settings.skin);
      window.dispatchEvent(new Event("resize"));
    }
    syncNav();
    palette.setSkin(settings.skin);
    railPin.sync(settings.skin);
    syncGmailKeys();
    const view = parseRoute(location.hash).view;
    const shownList = view === "list" ? findThreadList() : null;
    const list = settings.splits.length > 0 ? shownList : null;
    if (list) {
      const counts = settings.skin ? settings.splits.map((s) => s.query === "in:inbox" ? inboxUnread() : null) : [];
      splitBar.setSkin(settings.skin);
      splitBar.render(settings.splits, activeSplitIndex(settings.splits, location.hash), counts);
      splitBar.mountBefore(splitBarAnchor(list) || list);
    } else {
      splitBar.unmount();
    }
    html.classList.toggle(SPLITS_MOUNTED_CLASS, list !== null);
  }
  var syncQueued = false;
  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      sync();
    });
  }
  var everythingSelectedAt = null;
  function context() {
    if (isTyping(document.activeElement) || overlayOpen()) return "typing";
    if (everythingSelectedAt === location.hash && anyChecked()) return "everything";
    return paneOpen() ? "pane" : parseRoute(location.hash).view;
  }
  var claimedCodes = /* @__PURE__ */ new Set();
  function onKeydown(e) {
    if (isOwnEvent(e)) return;
    if (palette.isOpen() && palette.letsThrough(e)) palette.close();
    if (palette.isOpen()) {
      e.stopImmediatePropagation();
      claimedCodes.add(e.code);
      if (!e.isComposing) palette.handleKey(e);
      return;
    }
    if (e.isComposing) return;
    const result = keySequence.press(bindingsFor(commands(), context()), e, Date.now());
    if (result.kind === "none" || result.mode === "native") return;
    if (result.mode === "assist") {
      if (!e.repeat) result.command.assist();
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    claimedCodes.add(e.code);
    if (result.kind === "run" && !e.repeat) result.command.run(result.seq);
  }
  function onKeyOther(e) {
    if (isOwnEvent(e)) return;
    const claimed = e.type === "keyup" && claimedCodes.delete(e.code);
    if (claimed || palette.isOpen()) e.stopImmediatePropagation();
  }
  window.addEventListener("keydown", onKeydown, true);
  window.addEventListener("keypress", onKeyOther, true);
  window.addEventListener("keyup", onKeyOther, true);
  window.addEventListener("hashchange", keySequence.reset);
  window.addEventListener("hashchange", scheduleSync);
  function start() {
    new MutationObserver(scheduleSync).observe(document.body, { childList: true, subtree: true });
    sync();
  }
  if (loading()) document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
