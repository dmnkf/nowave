import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, labelName, splitHash, activeSplitIndex, cycleSplitIndex, closePaneHash } from '../src/route.js';
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

test('closePaneHash adds page 1 and the nonce to a first-page list hash', () => {
  assert.equal(closePaneHash('#inbox', 7), '#inbox/p1?nw=7');
  assert.equal(closePaneHash('', 7), '#inbox/p1?nw=7');
  assert.equal(closePaneHash('#search/is%3Aread+-in%3Ainbox', 8), '#search/is%3Aread+-in%3Ainbox/p1?nw=8');
  assert.equal(closePaneHash('#label/p2', 9), '#label/p2/p1?nw=9');
});

test('closePaneHash has nothing to close past page 1, in a thread, on other pages or with compose open', () => {
  assert.equal(closePaneHash('#inbox/p2', 1), null);
  assert.equal(closePaneHash('#search/from%3Aamy/p3', 1), null);
  assert.equal(closePaneHash(`#inbox/${THREAD}`, 1), null);
  assert.equal(closePaneHash('#settings/general', 1), null);
  assert.equal(closePaneHash('#inbox?compose=new', 1), null);
});
