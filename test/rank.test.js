import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyScore, rankCommands } from '../src/rank.js';

test('fuzzyScore rejects text that does not contain the query as a subsequence', () => {
  assert.equal(fuzzyScore('zz', 'Archive'), null);
  assert.equal(fuzzyScore('evi', 'Archive'), null);
});

test('fuzzyScore prefers word starts and runs over scattered letters', () => {
  assert.ok(fuzzyScore('gi', 'Go to Inbox') > fuzzyScore('gi', 'Toggle read'));
  assert.ok(fuzzyScore('arch', 'Archive') > fuzzyScore('arch', 'Search mail'));
});

const commands = [
  { id: 'archive', title: 'Mark done', section: 'Triage' },
  { id: 'inbox', title: 'Go to Inbox', section: 'Navigate' },
  { id: 'spam', title: 'Report spam', section: 'Triage' },
  { id: 'calm', title: 'Toggle calm mode', section: 'View' },
];

const ids = (groups) => groups.map((g) => [g.title, g.commands.map((c) => c.id)]);

test('rankCommands groups by section on an empty query, recent first', () => {
  assert.deepEqual(ids(rankCommands(commands, '', ['calm', 'gone'])), [
    ['Recent', ['calm']],
    ['Triage', ['archive', 'spam']],
    ['Navigate', ['inbox']],
  ]);
});

test('rankCommands lists every section when there is no history', () => {
  assert.deepEqual(ids(rankCommands(commands, '', [])), [
    ['Triage', ['archive', 'spam']],
    ['Navigate', ['inbox']],
    ['View', ['calm']],
  ]);
});

test('rankCommands returns matches best first for a query', () => {
  assert.deepEqual(ids(rankCommands(commands, 'inb', [])), [['Results', ['inbox']]]);
  assert.deepEqual(ids(rankCommands(commands, 'mo', [])), [['Results', ['calm', 'archive']]]);
  assert.deepEqual(rankCommands(commands, 'qqq', []), []);
});
