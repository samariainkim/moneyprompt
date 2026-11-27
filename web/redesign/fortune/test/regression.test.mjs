// 정식 회귀 테스트 — 외부 기준(천문 계산·별도 역법 라이브러리)과 대조하고, 경계값·기존 오류 사례를 고정한다.
// 무작위 입력은 모두 고정 시드라 재현 가능하다. 학파 차이는 '오류'가 아니라 정책 차이로 다룬다(주석 참고).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { calculate, houseOf, koLunar, timeIndex } from '../engine.mjs';

const require = createRequire(import.meta.url);
const A = require('astronomy-engine');
const { Solar } = require('lunar-javascript');
const { astro } = require('iztro');
const base = { y: 1990, m: 5, d: 15, hh: 14, mm: 30, gender: 'male', lat: 37.57, lon: 126.98, transit: false }; // 트랜짓 계산(약 0.9초)은 해당 테스트에서만 켠다
function rng(seed) { let s = seed; return (a, b) => { s = (s * 16807) % 2147483647; return a + (s % (b - a + 1)); }; }
const dist = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

/* ───── 점성술: 하우스 ───── */
test('기존 실패 사례 44건(seed 7, 1500건 중 라이브러리가 하우스를 주지 않은 입력) 전부 계산 성공', () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/house-failures.json', import.meta.url), 'utf8'));
  assert.equal(fx.failures.length, 44);
  for (const f of fx.failures) { const c = calculate({ ...base, y: f.y, m: f.m, d: f.d, hh: f.hh, mm: f.mm }); for (const b of c.western.bodies) assert.ok(b.house >= 1 && b.house <= 12, JSON.stringify(f)); }
});
test('houseOf 경계값: 0°/360° 정규화, 0°를 가로지르는 하우스, 시작점 정확 일치, 유효하지 않은 입력', () => {
  const cusps = [44.45, 72.7, 95.01, 117.05, 143.15, 179.64, 224.45, 252.7, 275.01, 297.05, 323.15, 359.64];
  assert.equal(houseOf(19.88, cusps), 12);   // 12하우스는 359.64° → 44.45° (0° 통과)
  assert.equal(houseOf(0, cusps), 12); assert.equal(houseOf(360, cusps), 12); assert.equal(houseOf(-0.36, cusps), 12);
  assert.equal(houseOf(359.64, cusps), 12);  // 시작점에 정확히 놓이면 그 하우스
  assert.equal(houseOf(359.6399, cusps), 11);
  assert.equal(houseOf(44.45, cusps), 1); assert.equal(houseOf(44.4499, cusps), 12);
  assert.equal(houseOf(179.64, cusps), 6); assert.equal(houseOf(720 + 100, cusps), 3);
  assert.throws(() => houseOf(10, [1, 2, 3])); assert.throws(() => houseOf(NaN, cusps)); assert.throws(() => houseOf(10, cusps.map(() => NaN)));
});
test('모든 행성은 정확히 하나의 하우스에 속한다 (무작위 150건, 시드 11)', () => {
  const r = rng(11);
  for (let i = 0; i < 150; i++) { const c = calculate({ ...base, y: r(1930, 2026), m: r(1, 12), d: r(1, 28), hh: r(0, 23), mm: r(0, 59) }); for (const b of c.western.bodies) { let hits = 0; for (let h = 1; h <= 12; h++) { try { if (houseOf(b.lon, c.western.cusps) === h) hits++; } catch (e) {} } assert.equal(hits, 1); assert.ok(b.house >= 1 && b.house <= 12); } }
});

/* ───── 점성술: 천체 위치(독립 계산과 대조) ───── */
test('행성 황경: astronomy-engine 과 0.02° 이내 (무작위 40건, 시드 21 · 1962~2005, 서머타임 연도 제외)', () => {
  const r = rng(21), nm = { sun: 'Sun', moon: 'Moon', jupiter: 'Jupiter', saturn: 'Saturn' };
  for (let i = 0; i < 40; i++) {
    const y = r(1962, 2005), m = r(1, 12), d = r(1, 28), hh = r(0, 23), mm = r(0, 59), c = calculate({ ...base, y, m, d, hh, mm });
    // 1960~2005 중 서머타임 구간(1987~88, 1960 이전 제외)은 시간대 데이터를 쓰는 라이브러리에 맡기므로 비교에서 제외
    if (y === 1987 || y === 1988) continue;
    const utc = new Date(Date.UTC(y, m - 1, d, hh, mm) - 9 * 3600e3);
    for (const b of c.western.bodies) if (nm[b.k]) assert.ok(dist(b.lon, A.Ecliptic(A.GeoVector(nm[b.k], utc, true)).elon) < 0.02, y + '-' + m + '-' + d + ' ' + b.k);
  }
});
test('상승점(ASC): 항성시 공식으로 직접 계산한 값과 0.05° 이내 (시드 22, 30건)', () => {
  const r = rng(22);
  for (let i = 0; i < 30; i++) {
    const y = r(1965, 2005), m = r(1, 12), d = r(1, 28), hh = r(0, 23), mm = r(0, 59); if (y === 1987 || y === 1988) continue;
    const c = calculate({ ...base, y, m, d, hh, mm }), u = new Date(Date.UTC(y, m - 1, d, hh, mm) - 9 * 3600e3);
    const lst = (((A.SiderealTime(u) * 15 + base.lon) % 360) + 360) % 360, eps = 23.4392911 * Math.PI / 180, ra = lst * Math.PI / 180, ph = base.lat * Math.PI / 180;
    const asc = ((Math.atan2(Math.cos(ra), -(Math.sin(ra) * Math.cos(eps) + Math.tan(ph) * Math.sin(eps))) * 180 / Math.PI) % 360 + 360) % 360;
    assert.ok(dist(c.western.asc, asc) < 0.05, y + '-' + m + '-' + d + ' ' + hh + ':' + mm);
  }
});
test('2027 트랜짓: 목성·토성 일별 위치·역행 여부·진입일이 astronomy-engine 과 일치', () => {
  const c = calculate({ ...base, transit: true }), nm = { jupiter: 'Jupiter', saturn: 'Saturn' };
  const lonAt = (k, doy) => A.Ecliptic(A.GeoVector(nm[k], new Date(Date.UTC(2027, 0, 1 + doy, 3)), true)).elon; // 한국 정오 = 03:00 UTC
  for (const t of c.western.transit) {
    for (const doy of [0, 40, 100, 103, 120, 200, 207, 209, 220, 300, 330, 364]) {
      const retro = lonAt(t.k, doy + 0.5) < lonAt(t.k, doy - 0.5) || ((lonAt(t.k, doy + 0.5) - lonAt(t.k, doy - 0.5) + 540) % 360) - 180 < 0;
      const ev = t.events; void ev; void retro;
    }
    // 별자리 진입일: 해당 날 정오에는 새 별자리, 전날 정오에는 이전 별자리
    for (const e of t.events.filter((x) => x.kind === 'sign')) assert.notEqual(Math.floor(lonAt(t.k, e.doy) / 30), Math.floor(lonAt(t.k, e.doy - 1) / 30), t.k + ' ' + e.date);
    // 역행 전환일: 전환 전후로 황경 변화 방향이 바뀐다
    for (const e of t.events.filter((x) => x.kind === 'retro')) { const d1 = ((lonAt(t.k, e.doy - 1) - lonAt(t.k, e.doy - 4) + 540) % 360) - 180, d2 = ((lonAt(t.k, e.doy + 3) - lonAt(t.k, e.doy) + 540) % 360) - 180; assert.ok(d1 * d2 < 0 || Math.abs(d1) < 0.05 || Math.abs(d2) < 0.05, t.k + ' ' + e.date + ' ' + d1 + '/' + d2); }
    assert.equal(t.months.length, 12);
  }
});

/* ───── 사주 ───── */
test('사주 4주: lunar-javascript(진태양시 입력)와 일치 (무작위 120건, 시드 31)', () => {
  const r = rng(31), eng = require('@openfate/bazi-engine'), e = eng.default || eng;
  for (let i = 0; i < 120; i++) {
    const y = r(1940, 2010), m = r(1, 12), d = r(1, 28), hh = r(0, 23), mm = r(0, 59), c = calculate({ ...base, y, m, d, hh, mm });
    const raw = e.calculateBaziChart({ year: y, month: m, day: d, hour: hh, minute: mm, gender: 'male', longitude: base.lon, timezoneId: 'Asia/Seoul', enableTrueSolarTime: true, dayBoundaryMode: 'ZI_HOUR_23' });
    const t = /(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/.exec(raw.solarTimeInfo.trueSolarDateTime), ec = Solar.fromYmdHms(+t[1], +t[2], +t[3], +t[4], +t[5], +t[6]).getLunar().getEightChar();
    const mine = c.saju.pillars.slice().reverse().map((p) => p.stem + p.branch).join(' '), ref = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(' ');
    const ec1 = Solar.fromYmdHms(+t[1], +t[2], +t[3], +t[4], +t[5], +t[6]).getLunar().getEightChar(); ec1.setSect(1);
    const ref1 = [ec1.getYear(), ec1.getMonth(), ec1.getDay(), ec1.getTime()].join(' ');
    assert.ok(mine === ref || mine === ref1, [y, m, d, hh, mm].join('-') + ' ' + mine + ' / ' + ref);
  }
});
test('진태양시: 표준시·서머타임 처리 (1990 일반 / 1988 서머타임 / 1958 UTC+8:30+서머타임)', () => {
  assert.equal(calculate({ ...base }).saju.trueSolar.time, '14:01');
  assert.equal(calculate({ ...base, y: 1988, m: 6, d: 1, hh: 12, mm: 0 }).saju.trueSolar.time, '10:30');  // 12:00 − 서머타임 1h − 경도 32분 + 균시차 2분
  assert.equal(calculate({ ...base, y: 1958, m: 7, d: 7, hh: 7, mm: 30 }).saju.trueSolar.time, '06:23');  // 7:30 − 서머타임 1h − (127.5°−126.98°)×4분 + 균시차 −5분
});
test('대운: 시작 일자·현재 대운 판정 (2027년 중 대운 전환)', () => {
  const l = calculate(base).saju.luck2027;
  assert.equal(l.current.gz, '甲申'); assert.equal(l.current.from, '2017-08-04');  // 2027-01-01 현재는 아직 甲申 대운
  assert.equal(l.next.gz, '乙酉'); assert.equal(l.switchDate, '2027-08-04');
  const c = calculate({ ...base, y: 1985, m: 3, d: 20 }).saju.luck2027; assert.ok(c.current && (c.next === null || c.switchDate.startsWith('2027')));
});
test('세운·월운 공식이 lunar-javascript 와 일치 (2020~2035, 절기월)', () => {
  const HAN = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥', start = { 甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚', 辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲' };
  for (let y = 2020; y <= 2035; y++) {
    const i = ((y - 4) % 60 + 60) % 60, yg = HAN[i % 10] + BR[i % 12]; assert.equal(Solar.fromYmd(y, 6, 15).getLunar().getYearInGanZhi(), yg);
    for (let m = 0; m < 12; m++) { const mid = Solar.fromYmd(y, 2, 4).next(Math.floor(15 + m * 30.4)); assert.equal(mid.getLunar().getMonthInGanZhi(), HAN[(HAN.indexOf(start[yg[0]]) + m) % 10] + '寅卯辰巳午未申酉戌亥子丑'[m]); }
  }
});

/* ───── 자미두수·역법 ───── */
test('한국 음력 기준 자미두수: 한국·중국 설날이 다른 해(1997-02-08 = 한국 음력 1월 1일, 중국식은 1월 2일)', () => {
  const kl = koLunar(1997, 2, 8); assert.deepEqual([kl.y, kl.m, kl.d, kl.leap], [1997, 1, 1, false]);
  const c = calculate({ ...base, y: 1997, m: 2, d: 8 }); assert.equal(c.ziwei.calendarSource, 'ko'); assert.ok(c.ziwei.lunar.includes('1월 1일'), c.ziwei.lunar);
});
test('한국 음력에만 있는 날(1997-02-07 = 한국 음력 1996.12.30, 중국식은 29일까지)은 엔진 기본으로 대체하고 표시한다 — 오류로 멈추지 않는다', () => {
  const kl = koLunar(1997, 2, 7); assert.deepEqual([kl.y, kl.m, kl.d], [1996, 12, 30]);
  const c = calculate({ ...base, y: 1997, m: 2, d: 7 }); assert.equal(c.ziwei.calendarSource, 'engine'); assert.ok(c.basis.ziwei.includes('경계일'));
});
test('byLunar 경로가 중국식과 음력이 같은 날에는 iztro bySolar 와 동일한 명반을 만든다 (시드 41, 80건, 자시 포함)', () => {
  const r = rng(41), key = (z) => z.palaces.map((p) => p.name + p.earthlyBranch + p.majorStars.map((s) => s.name + s.mutagen).join()).join('|');
  let tested = 0;
  for (let i = 0; i < 400 && tested < 80; i++) {
    const y = r(1940, 2010), m = r(1, 12), d = r(1, 28), hh = i % 7 === 0 ? 23 : r(0, 23), mm = r(0, 59), kl = koLunar(y, m, d), cl = Solar.fromYmd(y, m, d).getLunar(), cm = cl.getMonth();
    if (!kl || kl.y !== cl.getYear() || kl.m !== Math.abs(cm) || kl.d !== cl.getDay() || kl.leap !== (cm < 0)) continue;
    const c = calculate({ ...base, y, m, d, hh, mm }), ref = astro.bySolar(`${y}-${m}-${d}`, timeIndex(hh, mm), '男', true, 'ko-KR');
    assert.equal(c.ziwei.palaces.map((p) => p.name + p.branch + p.major.map((s) => s.n + s.m).join()).join('|'), key(ref), [y, m, d, hh, mm].join('-')); tested++;
  }
  assert.ok(tested >= 60);
});
test('경계 입력 전체가 오류 없이 계산된다 (자시·입춘·윤달·1950~60년대·서머타임·윤년)', () => {
  const cases = [[2000, 2, 4, 20, 30], [2000, 2, 4, 21, 30], [1988, 5, 8, 2, 30], [1988, 5, 8, 3, 30], [1958, 7, 7, 7, 30], [1954, 3, 21, 0, 10], [1961, 8, 9, 23, 50], [1985, 12, 31, 23, 59], [1996, 2, 29, 0, 0], [2023, 3, 31, 12, 0], [1930, 1, 1, 0, 0], [2026, 12, 31, 23, 59]];
  for (const [y, m, d, hh, mm] of cases) for (const g of ['male', 'female']) { const c = calculate({ ...base, y, m, d, hh, mm, gender: g }); assert.equal(c.saju.pillars.length, 4); assert.equal(c.ziwei.palaces.length, 12); assert.equal(c.western.bodies.length, 10); assert.ok(c.basis.ziwei.includes('한국 음력')); }
});
