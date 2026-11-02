'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../shared/loan-engine.js');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'loan-prepay.rules.v1.0.0.json'), 'utf8'));
const base = { amountKrw: '100000000', executionDate: '2020-03-01', repaymentDate: '2021-03-01', periodMonths: 36, ratePercent: '1.0' };
const run = (o) => E.calculate({ ...base, ...o }, rules);
const ok = (r) => { assert.equal(r.status, 'success', JSON.stringify(r)); return r; };
const err = (o, code, status = 'invalid_input') => { const r = run(o); assert.equal(r.status, status); assert.equal(r.error.code, code); return r; };

// ── 수학: 합성 5건 (전체 1,095일: 실행 2020-03-01 + 3년 = 2023-03-01) ──
test('합성: 1억·1%·잔여 730일 → 666,666', () => { const r = ok(run({})); assert.equal(r.total_days, 1095); assert.equal(r.remaining_days, 730); assert.equal(r.fee_krw, 666666); });
test('합성: 잔여 547일 → 499,543', () => { const r = ok(run({ repaymentDate: '2021-08-31' })); assert.equal(r.remaining_days, 547); assert.equal(r.fee_krw, 499543); });
test('합성: 부과 종료일 상환 → 0', () => { const r = ok(run({ repaymentDate: '2023-03-01' })); assert.equal(r.fee_krw, 0); assert.equal(r.period_ended, true); });
test('합성: 1,000만 원 일부 → 66,666', () => assert.equal(ok(run({ amountKrw: '10,000,000' })).fee_krw, 66666));
test('합성: 요율 0% → 0', () => assert.equal(ok(run({ ratePercent: '0' })).fee_krw, 0));

// ── 검증 문서 검산표 ──
test('3,000만·1%·잔여 365/전체 1,096 → 99,908', () => {
  // 실행 2025-03-10, 3년 → 2028-03-10(1,096일), 상환 2027-03-10 → 잔여 366이라 365가 되는 날: 2027-03-11
  const r = ok(run({ amountKrw: 30000000, executionDate: '2025-03-10', repaymentDate: '2027-03-10', periodMonths: 36, ratePercent: '1' }));
  assert.equal(r.total_days, 1096); assert.equal(r.remaining_days, 366);
  const r2 = ok(run({ amountKrw: 30000000, executionDate: '2025-03-10', repaymentDate: '2027-03-11', periodMonths: 36, ratePercent: '1' }));
  assert.equal(r2.remaining_days, 365); assert.equal(r2.fee_krw, 99908);
});
test('3,000만·0.65%·잔여 451/전체 1,096 → 80,241', () => {
  const r = ok(run({ amountKrw: 30000000, executionDate: '2025-03-10', repaymentDate: '2026-12-15', ratePercent: '0.65' }));
  assert.equal(r.remaining_days, 451); assert.equal(r.total_days, 1096); assert.equal(r.fee_krw, 80241);
});
test('실행일 당일 상환 → 잔여=전체, 수수료=상환금액×요율', () => {
  const r = ok(run({ repaymentDate: '2020-03-01', ratePercent: '1' }));
  assert.equal(r.remaining_days, r.total_days); assert.equal(r.fee_krw, 1000000);
});

// ── 날짜 정책 ──
const endOf = (ex, m) => ok(run({ executionDate: ex, repaymentDate: ex, periodMonths: m })).end_date;
test('3년이 윤일 포함이면 1,096일', () => {
  assert.equal(ok(run({ executionDate: '2022-03-01', repaymentDate: '2022-03-01' })).total_days, 1096);
  assert.equal(ok(run({ executionDate: '2025-03-10', repaymentDate: '2025-03-10' })).total_days, 1096);
  assert.equal(ok(run({ executionDate: '2025-03-01', repaymentDate: '2025-03-01', periodMonths: 12 })).total_days, 365);
});
test('월말·윤일 가산', () => {
  assert.equal(endOf('2024-01-31', 1), '2024-02-29');
  assert.equal(endOf('2025-01-31', 1), '2025-02-28');
  assert.equal(endOf('2025-08-31', 6), '2026-02-28');
  assert.equal(endOf('2024-02-29', 12), '2025-02-28');
  assert.equal(endOf('2024-02-29', 36), '2027-02-28');
  assert.equal(endOf('2025-03-10', 36), '2028-03-10');
  assert.equal(endOf('2025-12-31', 2), '2026-02-28');
});
test('부과종료일 경계: E−1일 / E / E+1일', () => {
  const o = { executionDate: '2020-03-01', periodMonths: 12 }; // E = 2021-03-01, 365일
  const a = ok(run({ ...o, repaymentDate: '2021-02-28' })); assert.equal(a.remaining_days, 1); assert.equal(a.period_ended, false);
  const b = ok(run({ ...o, repaymentDate: '2021-03-01' })); assert.equal(b.fee_krw, 0); assert.equal(b.period_ended, true);
  const c = ok(run({ ...o, repaymentDate: '2021-03-02' })); assert.equal(c.fee_krw, 0); assert.equal(c.period_ended, true);
});
test('원 미만 버림 · BigInt 정밀도', () => {
  assert.equal(ok(run({ amountKrw: '1', ratePercent: '5' })).fee_krw, 0);
  const big = ok(run({ amountKrw: '10000000000000', ratePercent: '5', repaymentDate: '2020-03-01' }));
  assert.equal(big.fee_krw, 500000000000);
  assert.equal(ok(run({ amountKrw: '999999999999', ratePercent: '0.01', repaymentDate: '2020-03-01' })).fee_krw, 99999999);
});

// ── 입력 검증 ──
test('금액', () => {
  err({ amountKrw: '' }, 'amount_required'); err({ amountKrw: '0' }, 'amount_required');
  err({ amountKrw: '-5' }, 'amount_format'); err({ amountKrw: '12a' }, 'amount_format');
  err({ amountKrw: '10000000000001' }, 'amount_range');
  assert.equal(ok(run({ amountKrw: '10,000,000' })).amount_krw, 10000000);
});
test('날짜', () => {
  err({ executionDate: '' }, 'date_invalid'); err({ repaymentDate: '2021-02-30' }, 'date_invalid');
  err({ executionDate: '2021-13-01' }, 'date_invalid'); err({ repaymentDate: '20210301' }, 'date_invalid');
  err({ repaymentDate: '2020-02-29' }, 'date_order');
});
test('부과기간', () => {
  err({ periodMonths: null }, 'period_required'); err({ periodMonths: '' }, 'period_required');
  err({ periodMonths: 0 }, 'period_range'); err({ periodMonths: '1.5' }, 'period_range'); err({ periodMonths: -3 }, 'period_range');
  err({ periodMonths: 37 }, 'period_too_long', 'unsupported');
  assert.equal(ok(run({ periodMonths: '18' })).period_months, 18);
  assert.equal(ok(run({ periodMonths: 36 })).period_months, 36);
});
test('수수료율', () => {
  err({ ratePercent: '' }, 'rate_required'); err({ ratePercent: 'abc' }, 'rate_format'); err({ ratePercent: '0.655' }, 'rate_format');
  err({ ratePercent: '-1' }, 'rate_format'); err({ ratePercent: '5.01' }, 'rate_too_high'); err({ ratePercent: '65' }, 'rate_too_high');
  assert.equal(ok(run({ ratePercent: '5' })).rate_bps, 500);
  assert.equal(ok(run({ ratePercent: '0,65' })).rate_bps, 65);
  assert.equal(ok(run({ ratePercent: '0.65%' })).rate_bps, 65);
  assert.equal(ok(run({ ratePercent: '0.6' })).rate_bps, 60);
});

// ── 상환일 비교 ──
test('비교: 종료일 이전이면 기준 / +30 / +90 / 종료일', () => {
  const res = ok(run({ amountKrw: 30000000, executionDate: '2025-03-10', repaymentDate: '2026-12-15', ratePercent: '0.65' }));
  const rows = E.compare(res, rules);
  assert.deepEqual(rows.map(r => r.kind), ['base', 'offset', 'offset', 'end']);
  assert.equal(rows[0].fee_krw, 80241); assert.equal(rows[1].remaining_days, 421); assert.equal(rows[3].fee_krw, 0);
  assert.equal(rows[1].diff_krw, rows[0].fee_krw - rows[1].fee_krw);
});
test('비교: +30/+90이 종료일 이후면 해당 행 생략, 종료일 이후 상환이면 빈 배열', () => {
  const near = ok(run({ executionDate: '2020-03-01', repaymentDate: '2021-02-01', periodMonths: 12 })); // 잔여 28일
  assert.deepEqual(E.compare(near, rules).map(r => r.kind), ['base', 'end']);
  const mid = ok(run({ executionDate: '2020-03-01', repaymentDate: '2020-12-15', periodMonths: 12 })); // 잔여 76일
  assert.deepEqual(E.compare(mid, rules).map(r => r.kind), ['base', 'offset', 'end']);
  const ended = ok(run({ repaymentDate: '2023-03-01' }));
  assert.deepEqual(E.compare(ended, rules), []);
  assert.deepEqual(E.compare({ status: 'invalid_input' }, rules), []);
});
test('규칙 JSON: 법령 검증일·시행일 임의 기입 금지', () => { assert.equal(rules.effective_from, null); assert.equal(rules.verified_at, null); });
