import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSettings, addSplit, removeSplit, recordRecent } from '../src/settings.js';

test('parseSettings falls back to the documented defaults: four inbox splits, calm and the Shortwave look on', () => {
  const settings = parseSettings(null);
  assert.deepEqual(
    settings.splits.map((s) => s.name),
    ['Inbox', 'Updates', 'Promotions', 'Social'],
  );
  assert.equal(settings.calm, true);
  assert.equal(settings.skin, true);
  assert.equal(settings.navCollapsedBySkin, false);
  assert.deepEqual(settings.recent, []);
  assert.deepEqual(settings.gmailKeys, {});
});

test('parseSettings survives corrupt storage', () => {
  assert.equal(parseSettings('{not json').splits.length, 4);
});

test('parseSettings keeps valid stored values and drops malformed splits', () => {
  const raw = JSON.stringify({
    splits: [{ name: 'VIP', query: 'from:boss' }, { name: '', query: 'x' }, { name: 'No query' }, null],
    calm: false,
    skin: false,
    navCollapsedBySkin: true,
    recent: ['archive', 7, 'inbox'],
    gmailKeys: { archive: [['d'], ['e']], 'select-all': [['*', 'a']] },
  });
  assert.deepEqual(parseSettings(raw), {
    splits: [{ name: 'VIP', query: 'from:boss' }],
    calm: false,
    skin: false,
    navCollapsedBySkin: true,
    recent: ['archive', 'inbox'],
    gmailKeys: { archive: [['d'], ['e']], 'select-all': [['*', 'a']] },
  });
});

test('parseSettings keeps a deliberately empty split list', () => {
  assert.deepEqual(parseSettings('{"splits":[]}').splits, []);
});

test('addSplit and removeSplit round-trip through storage', () => {
  const start = parseSettings('{"splits":[{"name":"A","query":"a"}]}');
  const added = addSplit(start, { name: ' VIP ', query: ' from:boss ' });
  const reloaded = parseSettings(JSON.stringify(added));
  assert.deepEqual(reloaded.splits, [
    { name: 'A', query: 'a' },
    { name: 'VIP', query: 'from:boss' },
  ]);
  assert.deepEqual(removeSplit(reloaded, 0).splits, [{ name: 'VIP', query: 'from:boss' }]);
});

test('recordRecent moves a command to the front without duplicates', () => {
  const settings = parseSettings('{"recent":["a","b","c"]}');
  assert.deepEqual(recordRecent(settings, 'b').recent, ['b', 'a', 'c']);
});

test('parseSettings ignores a malformed skin or nav memory', () => {
  const settings = parseSettings('{"skin":"no","navCollapsedBySkin":"yes"}');
  assert.equal(settings.skin, true);
  assert.equal(settings.navCollapsedBySkin, false);
});

test('parseSettings drops Gmail key overrides for unknown actions or that are not chord sequences', () => {
  const raw = JSON.stringify({
    gmailKeys: {
      'mark-read': ['shift+i'],
      archive: 'd',
      delete: [],
      spam: ['I'],
      mute: ['ctrl+m'],
      snooze: ['b', 7],
      move: [['v'], ['ctrl+v'], 'w'],
      compose: [['c']],
    },
  });
  assert.deepEqual(parseSettings(raw).gmailKeys, { 'mark-read': [['shift+i']], move: [['v']] });
  assert.deepEqual(parseSettings('{"gmailKeys":["d"]}').gmailKeys, {});
});

test('parseSettings reads a key map stored before an action could have two keys', () => {
  const raw = JSON.stringify({ gmailKeys: { archive: ['d'], 'select-all': ['*', 'a'] } });
  assert.deepEqual(parseSettings(raw).gmailKeys, { archive: [['d']], 'select-all': [['*', 'a']] });
});
