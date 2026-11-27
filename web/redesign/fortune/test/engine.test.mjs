// node --test redesign/fortune/test
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, timeIndex } from '../engine.mjs';

const base = { y: 1990, m: 5, d: 15, hh: 14, mm: 30, gender: 'male', lat: 37.57, lon: 126.98 };

test('1990-05-15 14:30 서울 남성 — 사주 기둥', () => {
  const c = calculate(base);
  const gz = c.saju.pillars.map((p) => p.stem + p.branch).join(' '); // 시 일 월 년
  assert.equal(gz, '癸未 庚辰 辛巳 庚午');
  assert.equal(c.saju.pillars.length, 4);
  assert.equal(c.saju.sewoon.gz, '丁未');
});
test('자미두수 12궁·재물 3궁', () => {
  const c = calculate(base);
  assert.equal(c.ziwei.palaces.length, 12);
  for (const n of ['재백', '복덕', '전택']) assert.ok(c.ziwei.palaces.some((p) => p.name === n));
});
test('점성술 10행성·12하우스', () => {
  const c = calculate(base);
  assert.equal(c.western.bodies.length, 10);
  assert.equal(c.western.houseSign.length, 12);
});
test('시진 번호: 자시 경계', () => {
  assert.equal(timeIndex(23, 0), 12);
  assert.equal(timeIndex(0, 0), 0);
  assert.equal(timeIndex(1, 0), 1);
  assert.equal(timeIndex(14, 30), 7);
  assert.equal(timeIndex(22, 59), 11);
});
test('경계 입력이 오류 없이 계산된다 (입춘 전후·자시·과거·윤년)', () => {
  const cases = [
    { y: 2000, m: 2, d: 4, hh: 20, mm: 30 }, { y: 2000, m: 2, d: 4, hh: 21, mm: 30 },
    { y: 1988, m: 6, d: 1, hh: 12, mm: 0 }, { y: 1958, m: 7, d: 7, hh: 7, mm: 30 },
    { y: 1985, m: 12, d: 31, hh: 23, mm: 30 }, { y: 1996, m: 2, d: 29, hh: 0, mm: 10 },
    { y: 1950, m: 1, d: 1, hh: 6, mm: 0 }, { y: 2010, m: 10, d: 10, hh: 10, mm: 10 },
  ];
  for (const k of cases) for (const g of ['male', 'female']) {
    const c = calculate({ ...base, ...k, gender: g });
    assert.equal(c.saju.pillars.length, 4); assert.equal(c.ziwei.palaces.length, 12); assert.equal(c.western.bodies.length, 10);
  }
});
test('재물 신호는 샘플 표시가 붙는다', () => {
  assert.equal(calculate(base).signals.sample, true);
});

test('2027 목성·토성 연초·연말 위치와 하우스', () => {
  const c = calculate(base);
  assert.equal(c.western.transit.length, 2);
  for (const t of c.western.transit) for (const k of ['start', 'end']) { assert.ok(t[k].house >= 1 && t[k].house <= 12); assert.ok(t[k].lon >= 0 && t[k].lon < 360); }
  assert.equal(c.western.transit[1].start.sign, '양자리'); // 토성 2027-01 양자리
  assert.equal(c.western.transit[0].end.sign, '처녀자리'); // 목성 2027-12 처녀자리
});

test('하우스가 0°를 가로지르는 출생도 오류 없이 계산된다 (라이브러리 House.id 누락 회피)', () => {
  for (const k of [[1993, 3, 14, 9, 2], [1986, 3, 25, 7, 15], [1934, 10, 11, 18, 57], [1951, 12, 19, 13, 21], [1932, 7, 4, 1, 9]]) {
    const c = calculate({ ...base, transit: false, y: k[0], m: k[1], d: k[2], hh: k[3], mm: k[4] });
    for (const b of c.western.bodies) assert.ok(b.house >= 1 && b.house <= 12, k.join('-') + ' ' + b.k);
  }
});
test('무작위 출생 300건 모두 계산 성공', () => {
  let s = 7; const r = (a, b) => { s = (s * 16807) % 2147483647; return a + (s % (b - a + 1)); };
  for (let i = 0; i < 300; i++) { const c = calculate({ ...base, transit: false, y: r(1930, 2026), m: r(1, 12), d: r(1, 28), hh: r(0, 23), mm: r(0, 59), gender: i % 2 ? 'male' : 'female' }); assert.equal(c.western.bodies.length, 10); }
});
