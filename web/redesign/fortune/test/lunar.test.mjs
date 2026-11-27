import test from 'node:test';
import assert from 'node:assert/strict';
import { toSolar } from '../lunar.mjs';
test('음력 1990-4-21 → 양력 1990-5-15', () => assert.deepEqual(toSolar(1990, 4, 21, false), { ok: true, y: 1990, m: 5, d: 15 }));
test('윤2월 2023-2-10 → 양력 2023-3-31', () => assert.deepEqual(toSolar(2023, 2, 10, true), { ok: true, y: 2023, m: 3, d: 31 }));
test('없는 날짜·없는 윤달은 오류', () => {
  assert.equal(toSolar(1990, 4, 30, false).ok, false);
  assert.equal(toSolar(1990, 4, 1, true).ok, false);
});
