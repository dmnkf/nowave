import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chordFromEvent, resolveKey, syntheticKeyEvents, formatChord } from '../src/keys.js';

const ev = (key, mods = {}) => ({ key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...mods });

test('chordFromEvent lowercases letters and keeps shift as a modifier', () => {
  assert.equal(chordFromEvent(ev('U', { shiftKey: true }), true), 'shift+u');
  assert.equal(chordFromEvent(ev('e'), true), 'e');
});

test('chordFromEvent maps cmd on Mac and ctrl elsewhere to mod', () => {
  assert.equal(chordFromEvent(ev('k', { metaKey: true }), true), 'mod+k');
  assert.equal(chordFromEvent(ev('k', { ctrlKey: true }), false), 'mod+k');
  assert.equal(chordFromEvent(ev('j', { ctrlKey: true }), true), 'ctrl+j');
});

test('chordFromEvent drops the shift or option used to type a symbol', () => {
  assert.equal(chordFromEvent(ev('#', { shiftKey: true }), false), '#');
  assert.equal(chordFromEvent(ev('#', { altKey: true }), true), '#');
  assert.equal(chordFromEvent(ev('?', { shiftKey: true }), true), '?');
});

test('chordFromEvent names special keys in lowercase with shift kept', () => {
  assert.equal(chordFromEvent(ev('Tab', { shiftKey: true }), true), 'shift+tab');
  assert.equal(chordFromEvent(ev('Escape'), true), 'escape');
});

const bindings = [
  { seq: ['e'], command: 'archive', mode: 'run' },
  { seq: ['g', 'i'], command: 'go-inbox', mode: 'native' },
  { seq: ['g', 'h'], command: 'go-snoozed', mode: 'run' },
  { seq: ['j'], command: 'next', mode: 'native' },
];
const idle = { chords: [], at: 0 };

test('resolveKey runs a single-chord binding', () => {
  assert.deepEqual(resolveKey(bindings, idle, 'e', 5000), { kind: 'run', command: 'archive', mode: 'run', seq: ['e'] });
});

test('resolveKey holds a prefix and lets it through when a binding that reaches Gmail shares it', () => {
  assert.deepEqual(resolveKey(bindings, idle, 'g', 5000), {
    kind: 'pending',
    state: { chords: ['g'], at: 5000 },
    mode: 'native',
  });
  const assisted = [{ seq: ['g', 'x'], command: 'archive', mode: 'assist' }, bindings[2]];
  assert.equal(resolveKey(assisted, idle, 'g', 5000).mode, 'native');
  assert.equal(resolveKey([bindings[2]], idle, 'g', 5000).mode, 'run');
});

test('resolveKey completes a two-step sequence within the timeout', () => {
  const pending = { chords: ['g'], at: 5000 };
  assert.deepEqual(resolveKey(bindings, pending, 'h', 5600), {
    kind: 'run',
    command: 'go-snoozed',
    mode: 'run',
    seq: ['g', 'h'],
  });
});

test('resolveKey drops a stale prefix after the timeout', () => {
  const pending = { chords: ['g'], at: 5000 };
  assert.deepEqual(resolveKey(bindings, pending, 'h', 6500), { kind: 'none' });
});

test('resolveKey retries the chord alone when the sequence breaks', () => {
  const pending = { chords: ['g'], at: 5000 };
  assert.deepEqual(resolveKey(bindings, pending, 'j', 5100), { kind: 'run', command: 'next', mode: 'native', seq: ['j'] });
});

test('resolveKey ignores unbound chords', () => {
  assert.deepEqual(resolveKey(bindings, idle, 'q', 5000), { kind: 'none' });
});

test('syntheticKeyEvents builds the US keyboard triple for a letter', () => {
  assert.deepEqual(syntheticKeyEvents('x'), [
    { type: 'keydown', key: 'x', code: 'KeyX', shiftKey: false, keyCode: 88, charCode: 0 },
    { type: 'keypress', key: 'x', code: 'KeyX', shiftKey: false, keyCode: 120, charCode: 120 },
    { type: 'keyup', key: 'x', code: 'KeyX', shiftKey: false, keyCode: 88, charCode: 0 },
  ]);
});

test('syntheticKeyEvents sends an uppercase charCode for shifted letters', () => {
  const [down, press] = syntheticKeyEvents('shift+u');
  assert.deepEqual(down, { type: 'keydown', key: 'U', code: 'KeyU', shiftKey: true, keyCode: 85, charCode: 0 });
  assert.deepEqual(press, { type: 'keypress', key: 'U', code: 'KeyU', shiftKey: true, keyCode: 85, charCode: 85 });
});

test('syntheticKeyEvents types # as shift+3', () => {
  const [down, press] = syntheticKeyEvents('#');
  assert.deepEqual(down, { type: 'keydown', key: '#', code: 'Digit3', shiftKey: true, keyCode: 51, charCode: 0 });
  assert.deepEqual(press, { type: 'keypress', key: '#', code: 'Digit3', shiftKey: true, keyCode: 35, charCode: 35 });
});

test('syntheticKeyEvents types * as shift+8', () => {
  const [down, press] = syntheticKeyEvents('*');
  assert.deepEqual(down, { type: 'keydown', key: '*', code: 'Digit8', shiftKey: true, keyCode: 56, charCode: 0 });
  assert.deepEqual(press, { type: 'keypress', key: '*', code: 'Digit8', shiftKey: true, keyCode: 42, charCode: 42 });
});

test('formatChord renders Mac glyphs and spelled-out names elsewhere', () => {
  assert.equal(formatChord('mod+k', true), '⌘K');
  assert.equal(formatChord('mod+k', false), 'Ctrl+K');
  assert.equal(formatChord('shift+u', true), '⇧U');
  assert.equal(formatChord('escape', true), 'Esc');
  assert.equal(formatChord('#', false), '#');
});
