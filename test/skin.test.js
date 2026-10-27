import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navToggle } from '../src/skin.js';

const fresh = { skin: true, expanded: true, collapsedBySkin: false, clicked: false };

test('navToggle folds an expanded nav into the rail when the Shortwave look is on', () => {
  assert.equal(navToggle(fresh), 'collapse');
});

test('navToggle clicks at most once until the look is toggled again', () => {
  assert.equal(navToggle({ ...fresh, clicked: true }), null);
});

test('navToggle leaves a nav the user already collapsed', () => {
  assert.equal(navToggle({ ...fresh, expanded: false }), null);
});

test('navToggle unfolds the nav on the way out only if nowave folded it', () => {
  const off = { skin: false, expanded: false, clicked: false };
  assert.equal(navToggle({ ...off, collapsedBySkin: true }), 'expand');
  assert.equal(navToggle({ ...off, collapsedBySkin: false }), null);
  assert.equal(navToggle({ ...off, expanded: true, collapsedBySkin: true }), null);
});
