import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActionQueue } from '../src/queue.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('rapid actions run one at a time in the order they were pressed', async () => {
  const enqueue = createActionQueue(() => '#inbox');
  const log = [];
  const archive = (n) => async () => {
    log.push(`check ${n}`);
    await sleep(10);
    log.push(`archive ${n}`);
  };
  await Promise.all([enqueue(archive(1)), enqueue(archive(2)), enqueue(archive(3))]);
  assert.deepEqual(log, ['check 1', 'archive 1', 'check 2', 'archive 2', 'check 3', 'archive 3']);
});

test('navigating stops the running action and drops actions queued in the old view', async () => {
  let hash = '#inbox';
  const enqueue = createActionQueue(() => hash);
  const log = [];
  const running = enqueue(async (live) => {
    log.push('check row');
    await sleep(20);
    if (live()) log.push('archive');
  });
  const queuedBefore = enqueue(async () => log.push('delete'));
  await sleep(5);
  hash = '#starred';
  const queuedAfter = enqueue(async () => log.push('mute'));
  await Promise.all([running, queuedBefore, queuedAfter]);
  assert.deepEqual(log, ['check row', 'mute']);
});

test('opening the palette stops the running action', async () => {
  let paletteOpen = false;
  const enqueue = createActionQueue(() => (paletteOpen ? null : '#inbox'));
  const log = [];
  const running = enqueue(async (live) => {
    log.push('check row');
    await sleep(20);
    if (live()) log.push('archive');
  });
  await sleep(5);
  paletteOpen = true;
  await running;
  paletteOpen = false;
  await enqueue(async (live) => log.push(`delete, live ${live()}`));
  assert.deepEqual(log, ['check row', 'delete, live true']);
});

test('an action that throws does not stall the queue', async () => {
  const enqueue = createActionQueue(() => '#inbox');
  const failed = enqueue(async () => {
    throw new Error('Gmail changed');
  });
  await assert.rejects(failed, /Gmail changed/);
  assert.equal(await enqueue(async () => 'archived'), 'archived');
});
