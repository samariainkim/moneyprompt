'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../shared/engine.js');
const P = require('../shared/prompt.js');
const rules = require('../data/brokerage-fee.rules.v1.0.0.json');
const data = require('../data/brokerage-fee.prompt.v2.0.0.json');

const calc = (i, r = rules) => E.calculate(Object.assign({ propertyType: 'housing' }, i), r, { env: 'development' });
const verifiedRules = Object.assign({}, rules, { status: 'verified', effective_from: '2021-10-19', verified_at: '2026-10-20' });

test('시나리오: 협의 요율 미입력 → 상한, −0.10%p, −0.20%p (엔진 산출)', () => {
  const r = calc({ transactionType: 'sale', amountKrw: 500000000 });
  assert.deepEqual(r.scenarios.map(s => [s.rate_bps, s.fee_krw, s.diff_krw, s.is_assumption]),
    [[40, 2000000, 0, false], [30, 1500000, 500000, true], [20, 1000000, 1000000, true]]);
});

test('시나리오: 협의 요율 입력 → 법정 상한과 입력 요율만 비교(자동 가정 없음)', () => {
  const r = calc({ transactionType: 'sale', amountKrw: 500000000, negotiatedRatePercent: '0.25' });
  assert.deepEqual(r.scenarios.map(s => [s.kind, s.rate_bps, s.fee_krw]), [['legal_max', 40, 2000000], ['user_input', 25, 1250000]]);
});

test('시나리오: 0% 미만 제외', () => {
  const tiny = JSON.parse(JSON.stringify(rules));
  tiny.property_types.housing.sale.bands[2].max_rate_bps = 15; // 0.15%
  const r = calc({ transactionType: 'sale', amountKrw: 500000000 }, tiny);
  assert.deepEqual(r.scenarios.map(s => s.rate_bps), [15, 5]); // −0.20%p(=−5bp)는 제외
});

test('시나리오: 한도액 적용 후 금액이 같으면 중복 제거', () => {
  const cap = JSON.parse(JSON.stringify(rules));
  cap.property_types.housing.sale.bands[1].cap_krw = 700000; // 1.9억: 0.50%→950,000→한도 700,000, 0.40%=760,000→700,000(동일), 0.30%=570,000
  const r = calc({ transactionType: 'sale', amountKrw: 190000000 }, cap);
  assert.deepEqual(r.scenarios.map(s => [s.rate_bps, s.fee_krw]), [[50, 700000], [30, 570000]]);
});

test('월세: 환산 정보가 결과에 포함', () => {
  const r = calc({ transactionType: 'rent', depositKrw: 10000000, monthlyKrw: 300000 });
  assert.equal(r.rent_multiplier, 70);
  assert.equal(r.rent_deposit_krw, 10000000);
  const r2 = calc({ transactionType: 'rent', depositKrw: 50000000, monthlyKrw: 500000 });
  assert.equal(r2.rent_multiplier, 100);
});

test('프롬프트: 기본 3개 모듈, 선택 안 한 항목은 프롬프트·형식에서 제외', () => {
  const t = P.build(calc({ transactionType: 'sale', amountKrw: 500000000 }), null, data, rules);
  assert.match(t, /중개보수 검증/); assert.match(t, /협의 시나리오/); assert.match(t, /실행 체크리스트/);
  assert.doesNotMatch(t, /총거래비용/); assert.doesNotMatch(t, /계약 위험/);
  assert.match(t, /5줄 이내/);
});

test('프롬프트: 협의 시나리오 미선택이면 SIMULATE 표 없음', () => {
  const t = P.build(calc({ transactionType: 'sale', amountKrw: 500000000 }), ['verify'], data, rules);
  assert.doesNotMatch(t, /SIMULATE/); assert.doesNotMatch(t, /\| 법정 상한/);
});

test('프롬프트: 역할·절사·한도액 규칙·FACT/VERIFY/SIMULATE/ACT', () => {
  const t = P.build(calc({ transactionType: 'sale', amountKrw: 500000000 }), null, data, rules);
  assert.match(t, /부동산 중개보수 검토를 돕는 분석 도우미/);
  assert.match(t, /원 단위 미만은 절사/); assert.match(t, /한도액이 있으면/);
  for (const k of ['FACT', 'VERIFY', 'SIMULATE', 'ACT']) assert.match(t, new RegExp(k));
});

test('프롬프트: 미검증 규칙 → 미검증 명시, 시행일·검증일·출처·placeholder 없음', () => {
  const t = P.build(calc({ transactionType: 'sale', amountKrw: 500000000 }), null, data, rules);
  assert.match(t, /미검증/); assert.match(t, /검증이 끝났다고 표현하지 마세요/);
  assert.doesNotMatch(t, /시행일|검증일|근거:|ydp\.go\.kr|\[공식|삽입\]/);
  assert.doesNotMatch(t, /검증 완료/);
});

test('프롬프트: 검증 완료 규칙이면 시행일·검증일·출처 포함', () => {
  const t = P.build(calc({ transactionType: 'sale', amountKrw: 500000000 }, verifiedRules), null, data, verifiedRules);
  assert.match(t, /검증 완료/); assert.match(t, /2021-10-19/); assert.match(t, /2026-10-20/); assert.match(t, /ydp\.go\.kr/);
  assert.doesNotMatch(t, /미검증/);
});

test('프롬프트: 시나리오 금액은 엔진 값과 일치, 사용자 입력 시 가정 문구 대신 입력 비교', () => {
  const a = P.build(calc({ transactionType: 'sale', amountKrw: 500000000 }), null, data, rules);
  assert.match(a, /1,500,000원/); assert.match(a, /1,000,000원/); assert.match(a, /가정/);
  const b = P.build(calc({ transactionType: 'sale', amountKrw: 500000000, negotiatedRatePercent: '0.25' }), null, data, rules);
  assert.match(b, /입력 협의 요율/); assert.match(b, /1,250,000원/); assert.doesNotMatch(b, /−0\.20%p \|/);
});

test('프롬프트: 매매 vs 전세·월세 문구 분리', () => {
  const sale = P.build(calc({ transactionType: 'sale', amountKrw: 500000000 }), ['cost', 'risk', 'checklist'], data, rules);
  assert.match(sale, /취득세/); assert.match(sale, /잔금 및 소유권 이전/);
  const lease = P.build(calc({ transactionType: 'jeonse', amountKrw: 300000000 }), ['cost', 'risk', 'checklist'], data, rules);
  assert.match(lease, /확정일자/); assert.match(lease, /보증금 보호/); assert.doesNotMatch(lease, /취득세/);
});

test('프롬프트: 월세는 보증금·월세·환산 산식 포함', () => {
  const t = P.build(calc({ transactionType: 'rent', depositKrw: 10000000, monthlyKrw: 300000 }), null, data, rules);
  assert.match(t, /보증금: 10,000,000원/); assert.match(t, /월세: 300,000원/);
  assert.match(t, /보증금 \+ 월세 × 100/); assert.match(t, /10,000,000 \+ 300,000 × 70 = 31,000,000원/);
  assert.match(t, /환산 산식\(FACT 참고\)|월세 환산 산식/);
});

test('프롬프트: 실패 결과는 빈 문자열', () => {
  assert.equal(P.build(E.calculate({ propertyType: 'housing', transactionType: 'sale' }, rules, { env: 'development' }), null, data, rules), '');
});

test('게이트 유지: 프로덕션 + 미검증 → 계산 자체가 차단되어 프롬프트 불가', () => {
  const r = E.calculate({ propertyType: 'housing', transactionType: 'sale', amountKrw: 500000000 }, rules, { env: 'production' });
  assert.equal(r.status, 'rule_unverified');
  assert.equal(P.build(r, null, data, rules), '');
});
