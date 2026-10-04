import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekForDate } from './week.js';

// Same anchor as backend/tests/test_week.py.
const ANCHOR = '2026-09-07';

test('anchor is a Monday', () => {
  assert.equal(new Date(ANCHOR + 'T12:00:00').getDay(), 1);
});

test('anchor week is A (Monday and Sunday)', () => {
  assert.equal(weekForDate(ANCHOR, '2026-09-07'), 'A');
  assert.equal(weekForDate(ANCHOR, '2026-09-13'), 'A');
});

test('following week is B', () => {
  assert.equal(weekForDate(ANCHOR, '2026-09-14'), 'B');
  assert.equal(weekForDate(ANCHOR, '2026-09-20'), 'B');
});

test('two weeks on is A again', () => {
  assert.equal(weekForDate(ANCHOR, '2026-09-21'), 'A');
});

test('dates before the anchor alternate correctly', () => {
  assert.equal(weekForDate(ANCHOR, '2026-09-06'), 'B'); // Sunday before → week -1
  assert.equal(weekForDate(ANCHOR, '2026-08-31'), 'B'); // Monday, week -1
  assert.equal(weekForDate(ANCHOR, '2026-08-24'), 'A'); // Monday, week -2
});

test('Sunday to Monday boundary flips the week', () => {
  assert.equal(weekForDate(ANCHOR, '2026-09-13'), 'A');
  assert.equal(weekForDate(ANCHOR, '2026-09-14'), 'B');
});

test('UK clocks going forward (29 Mar 2026) do not shift the week', () => {
  // Anchor is the Monday before the change; the Monday after is week 1.
  assert.equal(weekForDate('2026-03-23', '2026-03-30'), 'B');
  assert.equal(weekForDate('2026-03-23', '2026-04-06'), 'A');
});

test('UK clocks going back (25 Oct 2026) do not shift the week', () => {
  assert.equal(weekForDate('2026-10-19', '2026-10-26'), 'B');
  assert.equal(weekForDate('2026-10-19', '2026-11-02'), 'A');
});
