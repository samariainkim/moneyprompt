'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../shared/dsr-engine.js');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'dsr.rules.v1.0.0.json'), 'utf8'));
const vectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'dsr-vectors.json'), 'utf8'));
const base = { incomeKrw: '60,000,000', loanType: 'mortgage', region: 'metro', repayment: 'annuity', ratePercent: '4.2', years: 30, asOf: '2026-11-17' };
const run = (o, r = rules) => E.calculate({ ...base, ...o }, r);
const ok = (r) => { assert.equal(r.status, 'success', JSON.stringify(r)); return r; };
const err = (o, code, status = 'invalid_input') => { const r = run(o); assert.equal(r.status, status, JSON.stringify(r)); assert.equal(r.error.code, code); return r; };

// ── 독립 검산(파이썬 Decimal): 96건 × (스트레스 미적용·적용) ──
test('독립 검산 기준값 일치(오차 ±1원)', () => {
  assert.ok(vectors.length >= 90);
  for (const v of vectors) {
    const r = ok(E.calculate({ incomeKrw: v.incomeKrw, loanType: v.loanType, region: v.region, repayment: v.repayment, ratePercent: v.ratePercent, years: v.years, asOf: v.asOf }, rules));
    assert.ok(Math.abs(r.limit_no_stress_krw - v.limit_no_stress_krw) <= 1, `미적용 ${JSON.stringify(v)} 엔진 ${r.limit_no_stress_krw}`);
    assert.ok(Math.abs(r.limit_with_stress_krw - v.limit_with_stress_krw) <= 1, `적용 ${JSON.stringify(v)} 엔진 ${r.limit_with_stress_krw}`);
  }
});

// ── 공식 사례 수치 재현(금융위 2023.12.27 별첨, 30년·분할상환·변동형, 기준금리 4.5% 역산 가정) ──
test('공식 사례 8건 수치 재현(±0.005억)', () => {
  const official = [[50000000, 0, 3.29], [50000000, 37.5, 3.15], [50000000, 75, 3.02], [50000000, 150, 2.78], [100000000, 0, 6.58], [100000000, 37.5, 6.30], [100000000, 75, 6.04], [100000000, 150, 5.56]];
  for (const [inc, stBp, off] of official) {
    // 스트레스 금리를 직접 지정하기 위해 규칙 기간을 임시로 바꾼 복사본 사용(신용대출 경로가 아닌 지방 주담대 값만 교체)
    const rr = JSON.parse(JSON.stringify(rules)); rr.stress_periods = [{ from: '2026-01-01', to: '2026-12-31', default_bp: 0, metro_mortgage_bp: stBp, non_metro_mortgage_bp: 0 }];
    const r = ok(run({ incomeKrw: inc, ratePercent: '4.5', years: 30 }, rr));
    assert.ok(Math.abs(r.limit_krw / 1e8 - off) <= 0.005, `${inc} ${stBp}bp 공식 ${off} 엔진 ${r.limit_krw / 1e8}`);
  }
});

// ── 합성: 연소득 6천만·4.2%·30년(UI 시안 조건) ──
test('시안 조건: 수도권 주담대 원리금균등', () => {
  const r = ok(run({}));
  assert.equal(r.limit_no_stress_krw, 408983591); assert.equal(r.limit_krw, 294642713);
  assert.equal(r.annual_capacity_krw, 24000000); assert.equal(r.stress_bp, 300); assert.equal(r.review_rate_bps, 720);
  assert.equal(E.approxLabel(r.limit_krw), '약 2억 9,464만 원'); assert.equal(E.approxLabel(r.limit_no_stress_krw), '약 4억 898만 원');
});
test('지방 주담대는 0.75%p', () => { const r = ok(run({ region: 'non_metro' })); assert.equal(r.stress_bp, 75); assert.ok(r.limit_krw > ok(run({})).limit_krw); });
test('원금균등은 같은 조건에서 원리금균등보다 한도가 낮다(첫해 상환액이 더 큼)', () => { assert.ok(ok(run({ repayment: 'principal_equal' })).limit_krw < ok(run({})).limit_krw); });
test('무이자(0.10% 최소)·1년 만기 경계', () => { const r = ok(run({ ratePercent: '0.1', years: 1 })); assert.ok(r.limit_krw > 0); });

// ── 스트레스 금리 기간·날짜 경계 ──
test('날짜 경계: 2025.10.15 / 10.16 (수도권 1.5%p → 3.0%p)', () => {
  assert.equal(ok(run({ asOf: '2025-10-15' })).stress_bp, 150); assert.equal(ok(run({ asOf: '2025-10-16' })).stress_bp, 300);
});
test('날짜 경계: 2026.6.30 / 7.1 / 12.31 은 같은 값, 규칙 기간 표시', () => {
  assert.equal(ok(run({ asOf: '2026-06-30' })).rule_period.announced, '2025-12-31');
  assert.equal(ok(run({ asOf: '2026-07-01' })).rule_period.announced, '2026-06-30');
  assert.equal(ok(run({ asOf: '2026-12-31' })).rule_period.to, '2026-12-31');
});
test('2027.1.1 이후는 계산하지 않음(마지막 값 재사용 금지)', () => { err({ asOf: '2027-01-01' }, 'rules_expired', 'unsupported'); });
test('지원 이전 기준일은 계산하지 않음', () => { err({ asOf: '2025-06-30' }, 'before_supported', 'unsupported'); });

// ── 신용대출: 1억 원 경계 ──
test('신용대출: 한도가 1억 이하(스트레스 미적용 구간)', () => {
  const r = ok(run({ loanType: 'credit', region: undefined, incomeKrw: 20000000, years: 5 }));
  assert.equal(r.stress_applied, false); assert.equal(r.credit_boundary, 'below_threshold'); assert.equal(r.limit_krw, r.limit_no_stress_krw);
  assert.ok(r.limit_krw <= 100000000);
});
test('신용대출: 적용 한도도 1억 이상 → 스트레스 적용', () => {
  const r = ok(run({ loanType: 'credit', region: undefined, incomeKrw: 100000000, years: 10 }));
  assert.equal(r.stress_applied, true); assert.equal(r.stress_bp, 150); assert.ok(r.limit_krw >= 100000000); assert.equal(r.limit_krw, r.limit_with_stress_krw);
});
test('신용대출: 적용 한도 < 1억 < 미적용 한도 → 1억 원', () => {
  let found = null;
  for (let inc = 20000000; inc <= 80000000 && !found; inc += 1000000) {
    const r = run({ loanType: 'credit', region: undefined, incomeKrw: inc, years: 5, ratePercent: '5' });
    if (r.status === 'success' && r.credit_boundary === 'at_threshold') found = r;
  }
  assert.ok(found, '경계 구간을 찾지 못함'); assert.equal(found.limit_krw, 100000000); assert.ok(found.limit_with_stress_krw < 100000000 && found.limit_no_stress_krw > 100000000);
});
test('신용대출은 5년 만기로 고정(입력 기간 무시)', () => { const a = ok(run({ loanType: 'credit', region: undefined, incomeKrw: 100000000, years: 30 })); const b = ok(run({ loanType: 'credit', region: undefined, incomeKrw: 100000000, years: '' })); assert.equal(a.years, 5); assert.equal(a.limit_krw, b.limit_krw); });
test('신용대출 원금균등도 5년 첫해 기준', () => { const a = ok(run({ loanType: 'credit', region: undefined, incomeKrw: 100000000, repayment: 'principal_equal' })); const b = ok(run({ loanType: 'credit', region: undefined, incomeKrw: 100000000 })); assert.ok(a.limit_krw < b.limit_krw); });

// ── 입력 오류·미지원 ──
test('소득 미입력/형식/범위', () => { err({ incomeKrw: '' }, 'income_required'); err({ incomeKrw: '-1' }, 'income_format'); err({ incomeKrw: '0' }, 'income_range'); err({ incomeKrw: '5,000,000,000' }, 'income_range'); });
test('금리·기간 오류', () => { err({ ratePercent: '' }, 'rate_required'); err({ ratePercent: 'abc' }, 'rate_format'); err({ ratePercent: '25' }, 'rate_range'); err({ years: 0 }, 'years_range'); err({ years: 41 }, 'years_range'); err({ years: '' }, 'years_required'); });
test('주담대는 지역 필수, 종류 오류', () => { err({ region: undefined }, 'region_required'); err({ loanType: 'x' }, 'loan_type'); });
test('지원하지 않는 상환방식은 계산하지 않음', () => { err({ repayment: 'bullet' }, 'repayment_unsupported', 'unsupported'); err({ repayment: undefined }, 'repayment_unsupported', 'unsupported'); });
test('기준일 형식 오류', () => err({ asOf: '2026-13-01' }, 'date_invalid'));

// ── 표시 정책(엔진 결과와 분리) ──
test('표시: 만원 미만 절사, 올림 없음', () => {
  assert.equal(E.approxLabel(294999999), '약 2억 9,499만 원'); assert.equal(E.approxLabel(300000000), '약 3억 원'); assert.equal(E.approxLabel(95500000), '약 9,550만 원'); assert.equal(E.approxLabel(99999), '약 9만 원');
});
