// 자미두수 유년 경계가 프롬프트에 적은 기간(중국식 음력 설)과 같은지 엔진(iztro)으로 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { astro } from 'iztro';
import { calculate } from '../engine.mjs';

const zw = astro.bySolar('1985-3-15', 5, '男', true, 'ko-KR');
const yr = (d) => { const h = zw.horoscope(d); return h.yearly.heavenlyStem + h.yearly.earthlyBranch; };

test('유년 경계: 2027-02-06 시작, 2028-01-25 끝(중국식 음력 설)', () => {
  assert.equal(yr('2027-2-5'), '병오');
  assert.equal(yr('2027-2-6'), '정미');
  assert.equal(yr('2028-1-25'), '정미');
  assert.equal(yr('2028-1-26'), '무신');
});

test('프롬프트·화면의 유년 적용 기간 문구가 엔진 경계와 일치', () => {
  const c = calculate({ y: 1990, m: 5, d: 15, hh: 12, mm: 0, gender: 'male', lat: 37.5665, lon: 126.978, transit: false });
  assert.match(c.basis.periods.yearly, /2027-02-06 ~ 2028-01-25/);
  assert.match(c.basisPublic.periods.yearly, /2027-02-06 ~ 2028-01-25/);
});
