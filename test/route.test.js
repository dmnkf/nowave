import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, labelName, splitHash, activeSplitIndex, cycleSplitIndex, viewOf } from '../src/route.js';
import { DEFAULT_SPLITS } from '../src/settings.js';

const THREAD = 'ThreadIdForTests0000000000000002';

test('parseRoute treats list roots as lists', () => {
  assert.deepEqual(parseRoute('#inbox'), { view: 'list', query: 'in:inbox' });
  assert.deepEqual(parseRoute(''), { view: 'list', query: 'in:inbox' });
  assert.deepEqual(parseRoute('#label/Receipts'), { view: 'list', query: null });
  assert.deepEqual(parseRoute('#category/social'), { view: 'list', query: null });
});

test('parseRoute keeps paginated lists as lists', () => {
  assert.deepEqual(parseRoute('#inbox/p2'), { view: 'list', query: 'in:inbox' });
  assert.deepEqual(parseRoute('#search/from%3Aamy/p3'), { view: 'list', query: 'from:amy' });
});

test('parseRoute detects an open thread after the root', () => {
  assert.deepEqual(parseRoute(`#inbox/${THREAD}`), { view: 'thread', query: 'in:inbox' });
  assert.deepEqual(parseRoute(`#label/Receipts/${THREAD}`), { view: 'thread', query: null });
  assert.deepEqual(parseRoute(`#search/in%3Ainbox+category%3Asocial/${THREAD}`), {
    view: 'thread',
    query: 'in:inbox category:social',
  });
});

test('parseRoute marks settings and unknown roots as other', () => {
  assert.deepEqual(parseRoute('#settings/general'), { view: 'other', query: null });
  assert.deepEqual(parseRoute('#search'), { view: 'other', query: null });
});

test('parseRoute decodes both + and %20 spaces in a search', () => {
  assert.equal(parseRoute('#search/in%3Ainbox+category%3Aprimary').query, 'in:inbox category:primary');
  assert.equal(parseRoute('#search/in%3Ainbox%20category%3Aprimary').query, 'in:inbox category:primary');
  assert.equal(parseRoute('#search/100%').query, '100%');
});

test('splitHash goes to #inbox for the inbox query and to a search otherwise', () => {
  assert.equal(splitHash('in:inbox'), '#inbox');
  assert.equal(splitHash('in:inbox category:primary'), '#search/in%3Ainbox%20category%3Aprimary');
});

test('activeSplitIndex finds the split for the current search', () => {
  assert.equal(activeSplitIndex(DEFAULT_SPLITS, '#inbox'), 0);
  assert.equal(activeSplitIndex(DEFAULT_SPLITS, '#search/in%3Ainbox+category%3Apromotions'), 2);
  assert.equal(activeSplitIndex(DEFAULT_SPLITS, `#search/IN%3Ainbox++category%3Asocial/${THREAD}`), 3);
  assert.equal(activeSplitIndex(DEFAULT_SPLITS, '#search/from%3Aamy'), -1);
  assert.equal(activeSplitIndex(DEFAULT_SPLITS, '#starred'), -1);
});

test('cycleSplitIndex wraps both ways and starts from the edge with no active split', () => {
  assert.equal(cycleSplitIndex(5, 4, 1), 0);
  assert.equal(cycleSplitIndex(5, 0, -1), 4);
  assert.equal(cycleSplitIndex(5, 2, 1), 3);
  assert.equal(cycleSplitIndex(5, -1, 1), 0);
  assert.equal(cycleSplitIndex(5, -1, -1), 4);
  assert.equal(cycleSplitIndex(0, -1, 1), -1);
});

test('labelName decodes nested and spaced label names from a nav link hash', () => {
  assert.equal(labelName('#label/Parent%2FChild+Two'), 'Parent/Child Two');
  assert.equal(labelName(`#label/Receipts/${THREAD}`), 'Receipts');
  assert.equal(labelName('#inbox'), null);
});

test('viewOf names the folder switcher after the view, a split or a label', () => {
  assert.deepEqual(viewOf('#inbox', DEFAULT_SPLITS), { name: 'Inbox', icon: 'inbox' });
  assert.deepEqual(viewOf('', DEFAULT_SPLITS), { name: 'Inbox', icon: 'inbox' });
  assert.deepEqual(viewOf(`#sent/${THREAD}`, DEFAULT_SPLITS), { name: 'Sent', icon: 'send' });
  assert.deepEqual(viewOf('#all/p2', DEFAULT_SPLITS), { name: 'Done', icon: 'done' });
  assert.deepEqual(viewOf('#search/in%3Ainbox+category%3Aupdates', DEFAULT_SPLITS), { name: 'Updates', icon: 'inbox' });
  assert.deepEqual(viewOf('#search/from%3Aamy', DEFAULT_SPLITS), { name: 'Search', icon: 'search' });
  assert.deepEqual(viewOf('#label/Receipts%2F2026', DEFAULT_SPLITS), { name: 'Receipts/2026', icon: 'label' });
  assert.deepEqual(viewOf('#category/social', DEFAULT_SPLITS), { name: 'Social', icon: 'inbox' });
  assert.deepEqual(viewOf('#settings/general', DEFAULT_SPLITS), { name: 'Settings', icon: 'settings' });
});
