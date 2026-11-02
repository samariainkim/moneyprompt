'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../shared/loan-engine.js');
const P = require('../shared/loan-prompt.js');
const d = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));
const rules = d('loan-prepay.rules.v1.0.0.json'), data = d('loan-prepay.prompt.v1.0.0.json'), copy = d('loan-prepay.copy.json');
const res = E.calculate({ amountKrw: '30000000', executionDate: '2025-03-10', repaymentDate: '2026-12-15', periodMonths: 36, ratePercent: '0.65' }, rules);
const rows = E.compare(res, rules);
const build = (sel, o = {}) => P.build(res, sel, data, { rows, today: '2026-11-02', ...o });

test('기본(검증) 프롬프트: 입력 출처 구분·미확인 정보·질문 규칙', () => {
  const t = build(['verify']);
  ['[사용자 입력]', '[계산기 산출 — 간편 비례식]', '[미확인 정보', '30,000,000원', '0.65%', '80,241원', '2028-03-10'].forEach(s => assert.ok(t.includes(s), s));
  data.missing_info.forEach(s => assert.ok(t.includes('- ' + s), s));
  assert.ok(t.includes('현재 정보만으로 설명할 수 있는 내용은 먼저 분석하세요. 개인별 정확한 계산에 반드시 필요한 정보만 최대 3개 질문하고, 정보가 부족한 계산만 보류하세요.'));
  assert.ok(!t.includes('먼저 질문으로 확인'));
  assert.ok(t.includes('독립 검산'));
  assert.ok(t.includes('약정서·상품설명서·법령을 직접 확인한 것이 아닙니다'));
});
test('SIMULATE는 compare 선택 시에만', () => {
  assert.ok(!build(['verify']).includes('SIMULATE'));
  const t = build(['verify', 'compare']);
  assert.ok(t.includes('SIMULATE') && t.includes('대출이자 미포함'));
  assert.ok(t.includes('30일 뒤 상환'));
});
test('ACT는 선택 메뉴만', () => {
  const t = build(['exempt']);
  assert.ok(t.includes('수수료 면제·감면 확인') && !t.includes('대출 갈아타기 분석') && !t.includes('내 수수료 정확성 확인'));
  assert.ok(build(['checklist']).includes('중도상환 전 체크리스트'));
});
test('부과기간 종료 후 상환: SIMULATE 생략', () => {
  const r2 = E.calculate({ amountKrw: '30000000', executionDate: '2020-03-01', repaymentDate: '2024-01-01', periodMonths: 36, ratePercent: '0.65' }, rules);
  const t = P.build(r2, ['verify', 'compare'], data, { rows: E.compare(r2, rules), today: '2026-11-02' });
  assert.ok(!t.includes('SIMULATE') && t.includes('0원으로 처리'));
});
test('과거 상환일: 과거 분석/현재 판단 구분 규칙 포함, 미래면 제외', () => {
  assert.ok(build(['verify'], { today: '2027-01-01' }).includes('이미 지난 상환'));
  assert.ok(!build(['verify'], { today: '2026-11-02' }).includes('이미 지난 상환'));
});
test('답변 형식: 핵심 요약 → 선택 분석 → 필수 질문(최대 3) → 다음 행동', () => {
  const t = build(['verify', 'refi']), i = (s) => t.indexOf(s);
  assert.ok(i('**핵심 요약**') < i('**선택한 분석 결과**') && i('**선택한 분석 결과**') < i('**꼭 필요한 질문**') && i('**꼭 필요한 질문**') < i('**다음 행동**'));
  assert.ok(t.includes('최대 3개'));
});
test('실패 결과는 빈 문자열', () => assert.equal(P.build({ status: 'invalid_input' }, ['verify'], data), ''));
test('copy JSON: 엔진 오류 코드마다 안내 문구 존재', () => {
  ['amount_required', 'amount_format', 'amount_range', 'date_invalid', 'date_order', 'period_required', 'period_range', 'period_too_long', 'rate_required', 'rate_format', 'rate_too_high', 'exception'].forEach(c => assert.ok(copy.errors[c], c));
});
