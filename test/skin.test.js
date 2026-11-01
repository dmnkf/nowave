import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navToggle } from '../src/skin.js';

const off = { skin: false, expanded: false, collapsedBySkin: true, clicked: false };

test('navToggle never folds the nav, which the Shortwave look hides', () => {
  assert.equal(navToggle({ skin: true, expanded: true, collapsedBySkin: false, clicked: false }), null);
  assert.equal(navToggle({ ...off, skin: true }), null);
});

test('navToggle unfolds a nav that an earlier nowave folded once the look is off', () => {
  assert.equal(navToggle(off), 'expand');
  assert.equal(navToggle({ ...off, collapsedBySkin: false }), null);
  assert.equal(navToggle({ ...off, expanded: true }), null);
});

test('navToggle clicks at most once until the look is toggled again', () => {
  assert.equal(navToggle({ ...off, clicked: true }), null);
});
