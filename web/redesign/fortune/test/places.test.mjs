import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const P = createRequire(import.meta.url)('../../pages/fortune-places.js');
test('좌표가 국내 범위 안', () => { for (const p of P.PLACES) { assert.ok(p.lat > 33 && p.lat < 38.7 && p.lon > 124.5 && p.lon < 131, p.label); } });
test('이름+도 조합이 유일', () => { const s = new Set(P.PLACES.map((p) => p.label + p.prov)); assert.equal(s.size, P.PLACES.length); });
test('예시 입력: 서울시, 고성군', () => {
  assert.equal(P.find('서울시')[0].label, '서울특별시');
  const g = P.find('고성군'); assert.equal(g.length, 2); assert.deepEqual(g.map((p) => p.prov).sort(), ['강원', '경남']);
});
test('광주는 광역시와 경기 광주시 둘 다', () => { assert.equal(P.find('광주').length, 2); });
test('빠른 선택은 서울+5대 광역시이고 모두 목록에 있음', () => { for (const q of P.QUICK) assert.ok(P.PLACES.some((p) => p.label === q), q); assert.equal(P.QUICK.length, 6); });
test('없는 곳은 빈 결과', () => { assert.equal(P.find('런던').length, 0); assert.equal(P.find('').length, 0); });
