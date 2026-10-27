import { chordFromEvent, formatChord, isModifierKey } from './keys.js';
import { rankCommands } from './rank.js';
import { EASE, reducedMotion } from './skin.js';

const CSS = `
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
  transition: background-color 60ms ${EASE};
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
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createPalette({ isMac, onRun, onOpenChange }) {
  const host = el('div');
  host.id = 'nowave-palette';
  const root = host.attachShadow({ mode: 'closed' });
  const style = el('style');
  style.textContent = CSS;
  const backdrop = el('div', 'backdrop');
  backdrop.hidden = true;
  const card = el('div', 'card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'nowave command palette');
  card.tabIndex = -1;
  const input = el('input', 'input');
  input.spellcheck = false;
  input.autocomplete = 'off';
  const list = el('div', 'list');
  list.setAttribute('role', 'listbox');
  card.append(input, list);
  backdrop.append(card);
  root.append(style, backdrop);

  // mode: { kind: 'commands', commands, recent } | { kind: 'prompt', resolve } | { kind: 'notice', title, lines, through }
  //   through: a notice that any key but Enter closes, and that key then goes on as if the palette were closed.
  let mode = null;
  let items = [];
  let rows = [];
  let selected = 0;
  let returnFocus = null;

  function cardFrames() {
    const from = reducedMotion() ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px) scale(0.985)' };
    return [from, { opacity: 1, transform: 'none' }];
  }

  function animateIn() {
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: EASE });
    card.animate(cardFrames(), { duration: 150, easing: EASE });
  }

  // The palette is closed (keys, focus, answers) as soon as close() runs; only the picture lingers for the fade.
  function animateOut() {
    backdrop.style.pointerEvents = 'none';
    const reverse = { duration: 100, easing: EASE, direction: 'reverse', fill: 'forwards' };
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
    rows.forEach((row, i) => row.setAttribute('aria-selected', String(i === selected)));
    rows[selected].scrollIntoView({ block: 'nearest' });
  }

  function keyChips(keys) {
    const box = el('span', 'keys');
    keys.forEach((seq, s) => {
      if (s > 0) box.append(el('span', 'sep', 'or'));
      seq.forEach((chord, c) => {
        if (c > 0) box.append(el('span', 'sep', 'then'));
        box.append(el('kbd', null, formatChord(chord, isMac)));
      });
    });
    return box;
  }

  function render() {
    list.replaceChildren();
    if (mode.kind === 'prompt') {
      items = [];
      rows = [];
      list.append(el('div', 'hint', 'Enter to save, Esc to cancel'));
      return;
    }
    if (mode.kind === 'notice') {
      items = [];
      rows = [];
      for (const text of [mode.title, ...mode.lines]) {
        const row = el('div', 'row note');
        row.append(el('span', 'title', text));
        list.append(row);
      }
      list.append(el('div', 'hint', 'Enter or Esc to close'));
      return;
    }
    const groups = rankCommands(mode.commands, input.value, mode.recent);
    items = groups.flatMap((g) => g.commands);
    rows = [];
    for (const group of groups) {
      list.append(el('div', 'section', group.title));
      for (const command of group.commands) {
        const row = el('div', 'row');
        row.setAttribute('role', 'option');
        const index = rows.length;
        row.append(el('span', 'title', command.title));
        const chips = command.chips ?? command.keys;
        if (chips) row.append(keyChips(chips));
        row.addEventListener('mousemove', () => index !== selected && select(index));
        row.addEventListener('click', () => run(index));
        rows.push(row);
        list.append(row);
      }
    }
    if (rows.length === 0) list.append(el('div', 'hint', 'No matching commands'));
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
    input.hidden = mode.kind === 'notice';
    backdrop.style.pointerEvents = '';
    // Reopening mid-fade (a prompt that follows a prompt) keeps the card in place instead of flashing it.
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
    if (mode.kind === 'commands') run(selected);
    else if (mode.kind === 'notice') close();
    else close(input.value.trim() || null);
  }

  function isOpen() {
    return mode !== null;
  }

  input.addEventListener('input', () => mode && render());
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
    else if (e.target !== input) e.preventDefault();
  });

  const moveDown = new Set(['arrowdown', isMac ? 'ctrl+j' : 'mod+j']);
  const moveUp = new Set(['arrowup', isMac ? 'ctrl+k' : 'mod+k']);

  function handleKey(e) {
    const chord = chordFromEvent(e, isMac);
    const closes = chord === 'escape' || (isMac && chord === 'mod+k');
    // A held ⌘K or Enter repeats; the repeat must not close the palette it opened or submit a fresh prompt.
    if (e.repeat && (closes || chord === 'enter')) {
      e.preventDefault();
      return;
    }
    let handled = true;
    if (closes) close();
    else if (chord === 'enter') submit();
    else if (moveDown.has(chord)) select(selected + 1);
    else if (moveUp.has(chord)) select(selected - 1);
    else if (chord === 'tab' || chord === 'shift+tab') select(selected + (chord === 'tab' ? 1 : -1));
    else handled = false;
    if (handled) e.preventDefault();
  }

  const letsThrough = (e) => mode?.kind === 'notice' && mode.through && !isModifierKey(e) && e.key !== 'Enter';

  return {
    isOpen,
    close,
    handleKey,
    letsThrough,
    open({ commands, recent }) {
      show({ kind: 'commands', commands, recent }, 'Type a command', '');
    },
    prompt({ placeholder, value = '' }) {
      return new Promise((resolve) => show({ kind: 'prompt', resolve }, placeholder, value));
    },
    notice({ title, lines, through = false }) {
      show({ kind: 'notice', title, lines, through }, '', '');
    },
  };
}
