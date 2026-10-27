const SEQUENCE_TIMEOUT_MS = 1000;

const MODIFIER_ORDER = ['mod', 'ctrl', 'meta', 'alt', 'shift'];

export function chordFromEvent(e, isMac) {
  const mods = new Set();
  if (isMac ? e.metaKey : e.ctrlKey) mods.add('mod');
  if (isMac && e.ctrlKey) mods.add('ctrl');
  if (!isMac && e.metaKey) mods.add('meta');
  let key = e.key;
  if (key.length === 1) {
    const isLetter = key.toLowerCase() !== key.toUpperCase();
    if (isLetter) {
      if (e.altKey) mods.add('alt');
      if (e.shiftKey) mods.add('shift');
      key = key.toLowerCase();
    }
    // Symbols like # or ? need shift or alt on many layouts (# is option+3 on Swiss Mac),
    // so those modifiers are part of producing the character, not of the chord.
  } else {
    if (e.altKey) mods.add('alt');
    if (e.shiftKey) mods.add('shift');
    key = key.toLowerCase();
  }
  return [...MODIFIER_ORDER.filter((m) => mods.has(m)), key].join('+');
}

function startsWith(seq, typed) {
  return typed.every((chord, i) => seq[i] === chord);
}

// mode: what the key handler does with a bound key.
//   native: lets it through to Gmail untouched.
//   assist: runs command.assist() during the keydown, then lets the key through to Gmail untouched.
//   run: takes it from Gmail and runs command.run(seq).
// bindings: [{ seq: string[], command, mode }]
// state: { chords: string[], at: number }
export function resolveKey(bindings, state, chord, now) {
  const pending = now - state.at > SEQUENCE_TIMEOUT_MS ? [] : state.chords;
  const typed = [...pending, chord];
  const matches = bindings.filter((b) => b.seq.length >= typed.length && startsWith(b.seq, typed));
  if (matches.length === 0) {
    return pending.length > 0 ? resolveKey(bindings, { chords: [], at: now }, chord, now) : { kind: 'none' };
  }
  const exact = matches.find((b) => b.seq.length === typed.length);
  if (exact) return { kind: 'run', command: exact.command, mode: exact.mode, seq: exact.seq };
  const passes = matches.some((b) => b.mode !== 'run');
  return { kind: 'pending', state: { chords: typed, at: now }, mode: passes ? 'native' : 'run' };
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'Fn', 'OS']);

export const isModifierKey = (e) => MODIFIER_KEYS.has(e.key);

const IDLE = { chords: [], at: 0 };

// Holds the pending sequence between keydowns. press() returns resolveKey's result.
export function createKeySequence(isMac) {
  let state = IDLE;
  return {
    press(bindings, e, now) {
      // Typing # or ! takes a shift or option keydown first, which must not break a pending g.
      if (isModifierKey(e)) return { kind: 'none' };
      const result = resolveKey(bindings, state, chordFromEvent(e, isMac), now);
      state = result.kind === 'pending' ? result.state : IDLE;
      return result;
    },
    reset() {
      state = IDLE;
    },
  };
}

const SPECIAL_KEYS = {
  enter: { key: 'Enter', code: 'Enter', keyCode: 13, charCode: 13, shift: false },
  '/': { key: '/', code: 'Slash', keyCode: 191, charCode: 47, shift: false },
  '?': { key: '?', code: 'Slash', keyCode: 191, charCode: 63, shift: true },
  '#': { key: '#', code: 'Digit3', keyCode: 51, charCode: 35, shift: true },
  '!': { key: '!', code: 'Digit1', keyCode: 49, charCode: 33, shift: true },
  '*': { key: '*', code: 'Digit8', keyCode: 56, charCode: 42, shift: true },
};

// The keydown/keypress/keyup triple a US keyboard produces for one chord.
// keyCode and charCode follow what Chromium reports for real keys; which mirrors keyCode.
export function syntheticKeyEvents(chord) {
  const parts = chord.split('+');
  const name = parts.pop();
  const shift = parts.includes('shift');
  let spec = SPECIAL_KEYS[name];
  if (!spec) {
    const upper = name.toUpperCase();
    const lower = name.toLowerCase();
    spec = {
      key: shift ? upper : lower,
      code: `Key${upper}`,
      keyCode: upper.charCodeAt(0),
      charCode: (shift ? upper : lower).charCodeAt(0),
      shift,
    };
  }
  const base = { key: spec.key, code: spec.code, shiftKey: spec.shift || shift };
  return [
    { type: 'keydown', ...base, keyCode: spec.keyCode, charCode: 0 },
    { type: 'keypress', ...base, keyCode: spec.charCode, charCode: spec.charCode },
    { type: 'keyup', ...base, keyCode: spec.keyCode, charCode: 0 },
  ];
}

const KEY_LABELS = {
  escape: 'Esc',
  enter: '↵',
  tab: 'Tab',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  ' ': 'Space',
};

export function formatChord(chord, isMac) {
  const parts = chord.split('+');
  const name = parts.pop();
  const labels = isMac
    ? { mod: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' }
    : { mod: 'Ctrl', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Win' };
  const key = KEY_LABELS[name] ?? name.toUpperCase();
  const mods = parts.map((m) => labels[m]);
  return isMac ? [...mods, key].join('') : [...mods, key].join('+');
}

export const formatSequence = (seq, isMac) => seq.map((chord) => formatChord(chord, isMac)).join(' then ');
