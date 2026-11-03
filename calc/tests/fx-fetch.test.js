'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../../.github/scripts/fetch-fx.js');
const E = require('../shared/fx-engine.js');

const row = (cu, ttb, tts, b) => ({ result: 1, cur_unit: cu, ttb, tts, deal_bas_r: b, cur_nm: cu });
const GOOD = [row('USD', '1,323.82', '1,350.57', '1,337.2'), row('JPY(100)', '839.72', '856.69', '848.21'), row('EUR', '1,477.79', '1,507.64', '1,492.72'), row('GBP', '1,772.73', '1,808.54', '1,790.64'), row('CNH', '198.92', '202.93', '200.93'), row('THB', '39.2', '39.99', '39.6')];
const EMPTY = null;
const AUTH = [{ result: 3, cur_unit: null, ttb: null, tts: null, deal_bas_r: null, cur_nm: null }];
const LIMIT = [{ result: 4 }];
const NOW = Date.parse('2026-11-02T12:30:00+09:00'); // 월요일 낮 12:30 KST (UTC 03:30)
const json = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

function harness(byDate, prev = null) {
  const calls = []; let written = null;
  const fetchFn = async (url) => {
    const m = /searchdate=(\d{8})/.exec(url); const day = m[1]; calls.push(day);
    const v = byDate[day]; if (v instanceof Error) throw v; if (typeof v === 'function') return v();
    return json(v === undefined ? EMPTY : v);
  };
  const run = () => F.run({ fetchFn, key: 'TESTKEY', nowMs: NOW, readPrev: () => prev, write: (o) => { written = o; }, log: () => {}, fetchOpts: { retries: 1, backoffMs: 1, timeoutMs: 1000 } });
  return { run, calls, written: () => written };
}

test('KST 날짜·시각 계산', () => {
  assert.equal(F.kstDate(Date.parse('2026-11-01T16:00:00Z')), '2026-11-02'); // UTC 16:00 = KST 다음날 01:00
  assert.equal(F.kstStamp(NOW), '2026-11-02T12:30:00+09:00');
  assert.equal(F.dateBack('2026-11-02', 3), '2026-10-30'); assert.equal(F.dateBack('2026-03-01', 1), '2026-02-28');
});
test('영업일 낮: 오늘 데이터가 있으면 base_date = 오늘', async () => {
  const h = harness({ 20261102: GOOD }); const r = await h.run();
  assert.equal(r.status, 'updated'); assert.equal(r.base_date, '2026-11-02'); assert.deepEqual(h.calls, ['20261102']);
  const w = h.written(); assert.equal(w.base_date, '2026-11-02'); assert.equal(w.checked_at, '2026-11-02T12:30:00+09:00'); assert.equal(w.currencies.USD.base, '1337.2');
});
test('11시 이전 등 오늘이 빈 응답이면 전일로 이동', async () => {
  const h = harness({ 20261102: EMPTY, 20261101: EMPTY, 20261031: EMPTY, 20261030: GOOD }); const r = await h.run();
  assert.equal(r.base_date, '2026-10-30'); assert.deepEqual(h.calls, ['20261102', '20261101', '20261031', '20261030']); // 주말 건너뜀
});
test('연휴 길이만큼 거슬러 올라감 (최대 8일)', async () => {
  const h = harness({ 20261026: GOOD }); const r = await h.run(); assert.equal(r.base_date, '2026-10-26'); assert.equal(h.calls.length, 8);
});
test('8일 연속 빈 응답은 비정상으로 실패 처리, 파일 변경 없음', async () => {
  const h = harness({}); const r = await h.run(); assert.equal(r.status, 'error'); assert.equal(r.reason, 'no_data_in_lookback'); assert.equal(h.written(), null);
});
test('인증 오류(result 3)·한도(4)는 빈 응답으로 넘기지 않고 즉시 실패, 파일 변경 없음', async () => {
  for (const [body, reason] of [[AUTH, 'auth'], [LIMIT, 'limit'], [[{ result: 2 }], 'bad_request']]) {
    const h = harness({ 20261102: body, 20261101: GOOD }); const r = await h.run();
    assert.equal(r.status, 'error'); assert.equal(r.reason, reason); assert.equal(h.written(), null); assert.deepEqual(h.calls, ['20261102']);
  }
});
test('HTTP 오류·형식 이상·네트워크 오류는 실패', async () => {
  let h = harness({ 20261102: () => json({}, false, 403) }); let r = await h.run(); assert.equal(r.reason, 'http'); assert.equal(h.written(), null);
  h = harness({ 20261102: () => ({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } }) }); r = await h.run(); assert.equal(r.reason, 'invalid');
  h = harness({ 20261102: { not: 'array' } }); r = await h.run(); assert.equal(r.reason, 'invalid');
  h = harness({ 20261102: new Error('ECONNRESET') }); r = await h.run(); assert.equal(r.reason, 'network'); assert.equal(h.written(), null);
});
test('일시적 5xx는 재시도 후 성공', async () => {
  let n = 0; const h = harness({ 20261102: () => (++n === 1 ? json({}, false, 503) : json(GOOD)) }); const r = await h.run();
  assert.equal(r.status, 'updated'); assert.equal(n, 2);
});
test('키가 없으면 실패', async () => { const r = await F.run({ fetchFn: async () => json(GOOD), key: '', nowMs: NOW, readPrev: () => null, write() {}, log() {} }); assert.equal(r.reason, 'no_key'); });
test('이상값 차단: 통화 수 부족·핵심 통화 누락·USD 급변', async () => {
  let h = harness({ 20261102: [row('USD', '1', '2', '1.5')] }); assert.equal((await h.run()).reason, 'too_few_currencies');
  h = harness({ 20261102: GOOD.filter((x) => x.cur_unit !== 'JPY(100)').concat([row('AUD', '930', '949', '940'), row('CAD', '947', '966', '957')]) }); assert.equal((await h.run()).reason, 'missing_core_currency');
  const prev = { base_date: '2026-10-30', currencies: { USD: { base: '1337.2' } } };
  const spike = GOOD.map((x) => (x.cur_unit === 'USD' ? row('USD', '1,900', '1,950', '1,925') : x));
  h = harness({ 20261102: spike }, prev); const r = await h.run(); assert.equal(r.reason, 'usd_move_too_large'); assert.equal(h.written(), null);
});
test('기준일 역행(기존보다 과거 데이터)은 차단', async () => {
  const prev = { base_date: '2026-11-02', currencies: { USD: { base: '1337.2' } } };
  const h = harness({ 20261102: EMPTY, 20261101: EMPTY, 20261031: EMPTY, 20261030: GOOD }, prev); assert.equal((await h.run()).reason, 'base_date_regression');
});
test('같은 기준일 재수집은 허용(checked_at만 갱신)', async () => {
  const prev = { base_date: '2026-11-02', currencies: { USD: { base: '1337.2' } } };
  const h = harness({ 20261102: GOOD }, prev); const r = await h.run(); assert.equal(r.status, 'updated'); assert.equal(h.written().base_date, '2026-11-02');
});
test('기록된 파일은 엔진 신선도·검증을 통과하는 형식', async () => {
  const h = harness({ 20261102: GOOD }); await h.run(); const w = h.written(); const rules = require('../data/fx.rules.v1.0.0.json');
  assert.equal(E.evaluateFreshness(w, NOW + 3600e3, rules).ok, true); assert.equal(E.available(w, 'USD', 'wire', 'out', rules), true); assert.equal(w.schema, 1);
});
test('인증키가 결과/로그에 노출되지 않는다', async () => {
  const logs = []; const r = await F.run({ fetchFn: async () => json(AUTH), key: 'SECRETKEY123', nowMs: NOW, readPrev: () => null, write() {}, log: (m) => logs.push(m) });
  assert.equal(JSON.stringify(r).includes('SECRETKEY123'), false); assert.equal(logs.join('').includes('SECRETKEY123'), false);
});
