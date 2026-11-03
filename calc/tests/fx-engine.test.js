'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../shared/fx-engine.js');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fx.rules.v1.0.0.json'), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'fx', 'rates.json'), 'utf8'));
const vectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'fx-vectors.json'), 'utf8'));
const NOW = Date.parse('2026-11-02T23:30:00+09:00'); // 시드 데이터 기준 신선한 시각
const rates = seed;
const base = { mode: 'wire', direction: 'out', currency: 'USD', amount: '1000', prefPercent: '90' };
const run = (o, r = rates, now = NOW) => E.calculate({ ...base, ...o }, r, rules, { now });
const ok = (r) => { assert.equal(r.status, 'success', JSON.stringify(r)); return r; };
const err = (o, code, status = 'invalid_input', r = rates, now = NOW) => { const x = run(o, r, now); assert.equal(x.status, status, JSON.stringify(x)); assert.equal(x.error.code, code); return x; };

// ── 독립 오라클(Python Fraction)과 전수 대조 ──
test('독립 오라클 벡터 전수 일치 (현찰·송금 × 방향 × 통화 × 금액 × 우대율)', () => {
  assert.ok(vectors.cases.length > 600);
  for (const [mode, dir, cur, amt, pref, total, baseTotal, diff] of vectors.cases) {
    const r = ok(run({ mode, direction: dir, currency: cur, amount: amt, prefPercent: pref }));
    assert.deepEqual([r.total_krw, r.base_total_krw, r.diff_krw], [total, baseTotal, diff], [mode, dir, cur, amt, pref].join(' '));
  }
});

// ── 개별 검산 (시드 환율: USD 매매기준율 1,337.2 / TTS 1,350.57 / TTB 1,323.82) ──
test('송금 보낼 때 USD 1,000·우대 90% → 1,338,537 / 기준 1,337,200 / 차액 1,337', () => {
  const r = ok(run({})); assert.deepEqual([r.total_krw, r.base_total_krw, r.diff_krw], [1338537, 1337200, 1337]); assert.equal(r.diff_direction, 'more');
});
test('송금 받을 때 USD 100·우대 90% → 133,586 / 기준 133,720 / 차액 134', () => {
  const r = ok(run({ direction: 'in', amount: '100' })); assert.deepEqual([r.total_krw, r.base_total_krw, r.diff_krw], [133586, 133720, 134]); assert.equal(r.diff_direction, 'less');
});
test('현찰 살 때 USD 100·우대 90% → 133,954 / 차액 234', () => {
  const r = ok(run({ mode: 'cash', amount: '100' })); assert.deepEqual([r.total_krw, r.diff_krw], [133954, 234]); assert.equal(r.spread_bp, 175);
});
test('현찰 팔 때 CNY 100·우대 90% → 19,992 / 차액 101', () => {
  const r = ok(run({ mode: 'cash', direction: 'in', currency: 'CNH', amount: '100' })); assert.deepEqual([r.total_krw, r.diff_krw], [19992, 101]);
});
test('JPY는 100엔 단위: 10,000엔 송금 보낼 때 우대 50% → 85,245 / 차액 424', () => {
  const r = ok(run({ currency: 'JPY', amount: '10000', prefPercent: '50' })); assert.equal(r.unit, 100); assert.deepEqual([r.total_krw, r.diff_krw], [85245, 424]);
});
test('우대율 100% → 적용환율=기준환율, 차액 0', () => {
  for (const m of ['cash', 'wire']) for (const d of ['out', 'in']) { const r = ok(run({ mode: m, direction: d, prefPercent: '100' })); assert.equal(r.total_krw, r.base_total_krw); assert.equal(r.diff_krw, 0); assert.equal(r.diff_direction, 'none'); }
});
test('극소액 0.01 USD·우대 0% → 13원, 차액 0원(원 미만)', () => {
  const r = ok(run({ amount: '0.01', prefPercent: '0' })); assert.equal(r.total_krw, 13); assert.equal(r.diff_krw, 0);
});
test('우대율이 낮을수록 보낼 때는 더 내고 받을 때는 덜 받는다 (단조성)', () => {
  const prefs = ['0', '25', '50', '75', '100'];
  for (const m of ['cash', 'wire']) {
    const out = prefs.map((p) => ok(run({ mode: m, direction: 'out', prefPercent: p })).total_krw);
    const inn = prefs.map((p) => ok(run({ mode: m, direction: 'in', prefPercent: p })).total_krw);
    for (let i = 1; i < prefs.length; i++) { assert.ok(out[i] <= out[i - 1]); assert.ok(inn[i] >= inn[i - 1]); }
  }
});
test('부동소수 오차 없음: 소수 금액·소수 우대율을 정수 연산으로 처리', () => {
  const r = ok(run({ amount: '1000.55', prefPercent: '33.33' }));
  assert.deepEqual([r.total_krw, r.base_total_krw, r.diff_krw], [1346854, 1337935, 8919]); // Python Fraction 검산
});

// ── 입력 검증 ──
test('금액: 필수·형식·소수·범위', () => {
  err({ amount: '' }, 'amount_required'); err({ amount: 'abc' }, 'amount_format'); err({ amount: '-5' }, 'amount_format');
  err({ amount: '1.234' }, 'amount_decimals'); err({ amount: '0' }, 'amount_min'); err({ amount: '0.00' }, 'amount_min');
  err({ amount: '100000000.01' }, 'amount_max'); ok(run({ amount: '100000000' })); ok(run({ amount: '0.01' }));
});
test('쉼표: 정상 3자리 구분만 허용', () => {
  ok(run({ amount: '1,234' })); ok(run({ amount: '1,234,567.89' }));
  err({ amount: '1,2,3' }, 'amount_format'); err({ amount: '12,34' }, 'amount_format'); err({ amount: ',123' }, 'amount_format'); err({ amount: '1,23' }, 'amount_format');
});
test('우대율: 필수(자동 기본값 없음)·형식·범위', () => {
  err({ prefPercent: '' }, 'pref_required'); err({ prefPercent: undefined }, 'pref_required'); err({ prefPercent: 'x' }, 'pref_format');
  err({ prefPercent: '90.123' }, 'pref_format'); err({ prefPercent: '100.01' }, 'pref_range'); err({ prefPercent: '101' }, 'pref_range'); err({ prefPercent: '-1' }, 'pref_format');
  ok(run({ prefPercent: '0' })); ok(run({ prefPercent: '90%' })); ok(run({ prefPercent: '33.33' }));
});
test('거래 방식·방향·통화 형식 검증', () => {
  err({ mode: 'x' }, 'mode_invalid'); err({ direction: 'x' }, 'direction_invalid'); err({ currency: '' }, 'currency_invalid'); err({ currency: 'US' }, 'currency_invalid');
});
test('데이터 없는 통화·현찰 미지원 통화', () => {
  err({ currency: 'VND' }, 'currency_unavailable', 'unsupported');
  err({ mode: 'cash', currency: 'THB' }, 'cash_unsupported', 'unsupported'); // 스프레드 정책값 없음 → 임의 대입 금지
  err({ mode: 'cash', currency: 'HKD', direction: 'in' }, 'cash_unsupported', 'unsupported');
  ok(run({ mode: 'wire', currency: 'THB' })); ok(run({ mode: 'wire', currency: 'HKD' }));
});
test('현찰 스프레드는 방향별로 분리 적용(buy/sell)', () => {
  const r2 = JSON.parse(JSON.stringify(rules)); r2.cash_spread.USD = { buy: '1.00', sell: '3.00' };
  const o = E.calculate({ ...base, mode: 'cash', direction: 'out', amount: '100', prefPercent: '0' }, rates, r2, { now: NOW });
  const i = E.calculate({ ...base, mode: 'cash', direction: 'in', amount: '100', prefPercent: '0' }, rates, r2, { now: NOW });
  assert.equal(o.total_krw, Math.floor(100 * 1337.2 * 1.01)); assert.equal(i.total_krw, Math.floor(100 * 1337.2 * 0.97));
  const r3 = JSON.parse(JSON.stringify(rules)); r3.cash_spread.USD = { buy: '1.75' }; // sell 값 없음 → 그 방향만 제한
  assert.equal(E.calculate({ ...base, mode: 'cash', direction: 'in' }, rates, r3, { now: NOW }).error.code, 'cash_unsupported');
  assert.equal(E.calculate({ ...base, mode: 'cash', direction: 'out' }, rates, r3, { now: NOW }).status, 'success');
});

// ── 환율 데이터 이상값 차단 ──
const withUsd = (patch) => ({ ...seed, currencies: { ...seed.currencies, USD: { ...seed.currencies.USD, ...patch } } });
test('비정상 환율 데이터는 계산 전에 차단', () => {
  err({}, 'rate_invalid', 'data_unavailable', withUsd({ base: '0' }));
  err({}, 'rate_invalid', 'data_unavailable', withUsd({ tts: '0' }));
  err({}, 'rate_invalid', 'data_unavailable', withUsd({ ttb: null }));
  err({}, 'rate_invalid', 'data_unavailable', withUsd({ tts: '1300' }));          // TTS < 기준
  err({}, 'rate_invalid', 'data_unavailable', withUsd({ ttb: '1400' }));          // TTB > 기준
  err({}, 'rate_invalid', 'data_unavailable', withUsd({ unit: 50 }));             // 허용되지 않은 단위
  err({}, 'rate_invalid', 'data_unavailable', withUsd({ base: '1,337.123456' })); // 소수 4자리 초과
  err({}, 'rate_invalid', 'data_unavailable', withUsd({ base: 'abc' }));
});

// ── 신선도: checked_at(수집 장애) / base_date(고시 정체) 구분 ──
const kst = (s) => Date.parse(s);
test('신선도 정상·경계', () => {
  assert.equal(E.evaluateFreshness(seed, kst('2026-11-02T23:30:00+09:00'), rules).ok, true);
  assert.equal(E.evaluateFreshness(seed, kst('2026-11-05T23:00:00+09:00'), rules).ok, true);   // checked 2.99일
  assert.equal(E.evaluateFreshness(seed, kst('2026-11-05T23:10:00+09:00'), rules).reason, 'checked_stale'); // 3일 초과
});
test('연휴: base_date가 4일 전이어도 checked_at이 신선하면 허용·경고 없음, 5일부터 경고', () => {
  const at = (nowIso, baseIso) => E.evaluateFreshness({ ...seed, base_date: baseIso, checked_at: nowIso }, kst(nowIso), rules);
  const f4 = at('2026-11-03T12:30:00+09:00', '2026-10-30'); assert.equal(f4.ok, true); assert.equal(f4.base_age_days, 4); assert.equal(f4.warn, false);
  const f5 = at('2026-11-04T12:30:00+09:00', '2026-10-30'); assert.equal(f5.ok, true); assert.equal(f5.base_age_days, 5); assert.equal(f5.warn, true);
});
test('경고 임계(5일) 이상이면 warn, 7일 초과면 차단 — 수집은 성공했는데 고시가 정체된 경우', () => {
  const mk = (base, now) => E.evaluateFreshness({ ...seed, base_date: base, checked_at: new Date(now).toISOString() }, now, rules);
  const now = kst('2026-11-06T12:00:00+09:00');
  assert.equal(mk('2026-11-01', now).warn, true);          // 5일
  assert.equal(mk('2026-10-30', now).ok, true);            // 7일 경계 허용
  assert.equal(mk('2026-10-29', now).reason, 'base_stale'); // 8일 차단
});
test('신선도: 데이터 없음·형식 오류·미래 날짜', () => {
  assert.equal(E.evaluateFreshness(null, NOW, rules).reason, 'no_data');
  assert.equal(E.evaluateFreshness({ currencies: {} }, NOW, rules).reason, 'invalid');
  assert.equal(E.evaluateFreshness({ ...seed, base_date: '2026-13-40' }, NOW, rules).reason, 'invalid');
  assert.equal(E.evaluateFreshness({ ...seed, checked_at: 'x' }, NOW, rules).reason, 'invalid');
  assert.equal(E.evaluateFreshness({ ...seed, base_date: '2026-12-25' }, NOW, rules).reason, 'invalid');
});
test('오래된 데이터로는 계산 차단', () => {
  err({}, 'data_checked_stale', 'data_unavailable', rates, kst('2026-11-20T12:00:00+09:00'));
  err({}, 'data_no_data', 'data_unavailable', null);
});

// ── 통화 목록 ──
test('송금 통화: 우선순위 → 데이터 없는 통화(VND·PHP·TWD·MXN)는 대체 통화로, 최대 10개', () => {
  assert.deepEqual(E.pickCurrencies(rates, rules, 'wire'), ['USD', 'JPY', 'EUR', 'CNH', 'THB', 'HKD', 'GBP', 'AUD', 'CAD', 'SGD']);
});
test('현찰 통화: 스프레드 정책값이 있는 통화만', () => {
  assert.deepEqual(E.pickCurrencies(rates, rules, 'cash'), ['USD', 'JPY', 'EUR', 'CNH', 'GBP', 'AUD', 'CAD']);
});
test('데이터가 생기면 자동으로 우선순위 자리에 들어가고 대체 통화는 밀려난다', () => {
  const r = { ...seed, currencies: { ...seed.currencies, VND: { name: '베트남 동', unit: 1, ttb: '0.05', tts: '0.06', base: '0.055' } } };
  const l = E.pickCurrencies(r, rules, 'wire'); assert.equal(l.length, 10); assert.equal(l[5], 'VND'); assert.equal(l.includes('SGD'), false);
});
test('방향 지정 시 그 방향 스프레드만 있으면 목록에 포함', () => {
  const r3 = JSON.parse(JSON.stringify(rules)); r3.cash_spread.THB = { buy: '5.94' };
  assert.equal(E.pickCurrencies(rates, r3, 'cash', 'out').includes('THB'), true);
  assert.equal(E.pickCurrencies(rates, r3, 'cash', 'in').includes('THB'), false);
  assert.equal(E.pickCurrencies(rates, r3, 'cash').includes('THB'), false);
});

// ── API 응답 정규화 ──
const row = (o) => ({ result: 1, cur_unit: 'USD', ttb: '1,323.82', tts: '1,350.57', deal_bas_r: '1,337.2', cur_nm: '미국 달러', ...o });
test('API 정규화: 쉼표·단위·KRW·0값 처리', () => {
  const r = E.normalizeApi([row({}), row({ cur_unit: 'JPY(100)', ttb: '839.72', tts: '856.69', deal_bas_r: '848.21', cur_nm: '일본 옌' }), row({ cur_unit: 'KRW', ttb: '0', tts: '0', deal_bas_r: '1' }), row({ cur_unit: 'ATS', ttb: '0', tts: '0', deal_bas_r: '93.52' })]);
  assert.equal(r.kind, 'ok'); assert.deepEqual(Object.keys(r.currencies).sort(), ['JPY', 'USD']);
  assert.deepEqual(r.currencies.USD, { name: '미국 달러', unit: 1, ttb: '1323.82', tts: '1350.57', base: '1337.2' });
  assert.equal(r.currencies.JPY.unit, 100);
});
test('API 정규화: 빈 응답(비영업일·11시 이전)', () => {
  for (const x of [null, undefined, [], [row({ cur_unit: null, ttb: null, tts: null, deal_bas_r: null })], [row({ ttb: '0', tts: '0' })]]) assert.equal(E.normalizeApi(x).kind, 'empty', JSON.stringify(x));
});
test('API 정규화: 오류 코드는 빈 응답과 구분 (2 요청오류 / 3 인증오류 / 4 한도)', () => {
  const e = (c) => E.normalizeApi([{ result: c, cur_unit: null, ttb: null, tts: null, deal_bas_r: null }]).kind;
  assert.equal(e(2), 'bad_request'); assert.equal(e(3), 'auth'); assert.equal(e(4), 'limit'); assert.equal(e(9), 'invalid');
  assert.equal(E.normalizeApi({ a: 1 }).kind, 'invalid'); assert.equal(E.normalizeApi('x').kind, 'invalid');
});
test('시드 rates.json은 정규화 규칙을 통과한 값이며 구조가 올바르다', () => {
  assert.equal(seed.schema, 1); assert.match(seed.base_date, /^\d{4}-\d{2}-\d{2}$/); assert.ok(!isNaN(Date.parse(seed.checked_at)));
  for (const c of ['USD', 'JPY', 'EUR', 'CNH', 'THB', 'HKD', 'GBP', 'AUD', 'CAD', 'SGD']) assert.ok(E.available(seed, c, 'wire', 'out', rules), c);
});
test('날짜 포맷', () => { assert.equal(E.formatDate('2026-10-30', 'dot'), '2026.10.30'); assert.equal(E.formatDate('2026-10-30', 'ko'), '2026년 10월 30일'); assert.equal(E.formatDate('x', 'ko'), ''); });
