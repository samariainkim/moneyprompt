import test from 'node:test';
import assert from 'node:assert/strict';
import { toSolar, monthDays } from '../lunar.mjs';
import { koLunar, koSolar } from '../engine.mjs';

test('음력 1990-4-21 → 양력 1990-5-15', () => assert.deepEqual(toSolar(1990, 4, 21, false), { ok: true, y: 1990, m: 5, d: 15 }));
test('윤2월 2023-2-10 → 양력 2023-3-31', () => assert.deepEqual(toSolar(2023, 2, 10, true), { ok: true, y: 2023, m: 3, d: 31 }));
test('없는 날짜·없는 윤달은 오류', () => {
  assert.equal(toSolar(1990, 4, 30, false).ok, false);
  assert.equal(toSolar(1990, 4, 1, true).ok, false);
  assert.equal(monthDays(1990, 4, false), 29);
});
// 한국 음력과 중국식 음력의 설날이 다른 해 (한국천문연구원 자료 기반 한국 음력 기준)
test('설날: 한국 음력 기준 날짜 (중국식과 하루 다른 해 포함)', () => {
  const seol = { 1944: '1944-1-26', 1954: '1954-2-4', 1958: '1958-2-19', 1966: '1966-1-22', 1988: '1988-2-18', 1997: '1997-2-8', 2006: '2006-1-29', 2027: '2027-2-7' };
  for (const [y, ymd] of Object.entries(seol)) { const s = koSolar(+y, 1, 1, false); assert.equal(s.y + '-' + s.m + '-' + s.d, ymd, y + ' 설날'); }
});
test('양력→음력→양력 왕복 (1930~2026 전체 날짜)', () => {
  for (let t = Date.UTC(1930, 0, 1); t <= Date.UTC(2026, 11, 31); t += 864e5 * 7) {
    const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate(), l = koLunar(y, m, dd);
    assert.ok(l, y + '-' + m + '-' + dd); const r = toSolar(l.y, l.m, l.d, l.leap);
    assert.deepEqual([r.y, r.m, r.d], [y, m, dd], y + '-' + m + '-' + dd);
  }
});
