import { test } from 'node:test';
import assert from 'node:assert/strict';
import { everythingNotice, gmailKeysFromShortcuts, gmailSequence, shortcutNotice, shouldDeselect } from '../src/gmail.js';

const after = { byNowave: true, checked: true, focusHeld: false };

test('shouldDeselect clears the row nowave checked once the action is done, also after an ignored archive', () => {
  assert.equal(shouldDeselect(after), true);
});

test('shouldDeselect leaves a selection the user made', () => {
  assert.equal(shouldDeselect({ ...after, byNowave: false }), false);
});

test('shouldDeselect does nothing once the row is gone or while a menu or field has focus', () => {
  assert.equal(shouldDeselect({ ...after, checked: false }), false);
  assert.equal(shouldDeselect({ ...after, focusHeld: true }), false);
});

test('everythingNotice names Gmail\'s archive keys', () => {
  assert.deepEqual(everythingNotice([['d'], ['e']], true), {
    title: 'Everything here is selected. Press D or E to mark it done, Esc to clear.',
    lines: [],
  });
  assert.equal(
    everythingNotice([['shift+e']], false).title,
    'Everything here is selected. Press Shift+E to mark it done, Esc to clear.',
  );
});

// Rows of one user's custom shortcuts page, read live on 2026-10-27, with some rows nowave does not use. Each row
// has two inputs, and this user gave Archive a second key.
const USER_SHORTCUTS = [
  ['Back to threadlist', 'u', ''],
  ['Select conversation', 'x', ''],
  ['Remove label', 'y', ''],
  ['Mute conversation', 'm', ''],
  ['Report as spam', '!', ''],
  ['Delete', '#', ''],
  ['Select all conversations', '*a', ''],
  ['Deselect all conversations', '*n', ''],
  ['Archive and go to previous conversation', '}', ''],
  ['Archive and go to next conversation', '{', ''],
  ['Undo last action', 'z', ''],
  ['Mark as read', 'I', ''],
  ['Mark as unread', 'U', ''],
  ['Mark as not important', '', ''],
  ['Archive', 'd', 'e'],
  ['Open "move to" menu', 'v', ''],
  ['Open "label as" menu', 'l', ''],
  ['Snooze', 'b', ''],
  ['Open conversation', 'o', ''],
];

test('gmailSequence reads Gmail\'s notation: a capital is Shift and a sequence is its characters', () => {
  assert.deepEqual(gmailSequence('d'), ['d']);
  assert.deepEqual(gmailSequence('I'), ['shift+i']);
  assert.deepEqual(gmailSequence('*a'), ['*', 'a']);
  assert.deepEqual(gmailSequence('#'), ['#']);
  assert.equal(gmailSequence(''), null);
  assert.equal(gmailSequence('* a'), null);
});

test('gmailKeysFromShortcuts maps the English labels to nowave\'s actions with both keys of a row', () => {
  assert.deepEqual(gmailKeysFromShortcuts(USER_SHORTCUTS), {
    back: [['u']],
    select: [['x']],
    mute: [['m']],
    spam: [['!']],
    delete: [['#']],
    'select-all': [['*', 'a']],
    'deselect-all': [['*', 'n']],
    undo: [['z']],
    'mark-read': [['shift+i']],
    'mark-unread': [['shift+u']],
    archive: [['d'], ['e']],
    move: [['v']],
    label: [['l']],
    snooze: [['b']],
    open: [['o']],
  });
});

test('gmailKeysFromShortcuts takes a key from the second input alone and skips unbound or unknown rows', () => {
  assert.deepEqual(gmailKeysFromShortcuts([['Archive', '', 'e'], ['Delete', '', ''], ['Snooze', 'b']]), {
    archive: [['e']],
    snooze: [['b']],
  });
  assert.deepEqual(gmailKeysFromShortcuts([['Archiver', 'd'], ['constructor', 'c']]), {});
});

test('shortcutNotice names each key that is not Gmail\'s default', () => {
  assert.deepEqual(shortcutNotice(gmailKeysFromShortcuts(USER_SHORTCUTS)), {
    title: "Saved 15 Gmail shortcuts, 1 not Gmail's default",
    lines: ['Archive: d or e (default e)'],
  });
  assert.deepEqual(shortcutNotice({ 'mark-read': [['shift+i']], 'select-all': [['*', 'a']] }), {
    title: 'Gmail uses its default keys for the 2 actions nowave sends',
    lines: [],
  });
});

test('shortcutNotice says when custom shortcuts are off or the page could not be read', () => {
  assert.equal(shortcutNotice('off').title, 'Custom keyboard shortcuts are off in Gmail');
  assert.equal(shortcutNotice(null).title, "Could not read Gmail's keyboard shortcuts");
  assert.equal(shortcutNotice({}).title, "Could not read Gmail's keyboard shortcuts");
});
