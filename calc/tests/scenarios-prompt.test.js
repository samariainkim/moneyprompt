'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../shared/engine.js');
const P = require('../shared/prompt.js');
const rules = require('../data/brokerage.rules.v1.0.0.json');
const data = require('../data/brokerage.prompt.v2.1.0.json');

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
  assert.doesNotMatch(t, /적용 규정 시행일:|최종 요율 검증일:|근거:|ydp\.go\.kr|\[공식|삽입\]/);
  assert.doesNotMatch(t, /검증 완료/);
});

test('프롬프트: 검증 완료 규칙이면 시행일·검증일·출처 포함', () => {
  const t = P.build(calc({ transactionType: 'sale', amountKrw: 500000000 }, verifiedRules), null, data, verifiedRules);
  assert.match(t, /법령 검증 상태: 검증 완료/); assert.match(t, /2021-10-19/); assert.match(t, /2026-10-20/); assert.match(t, /ydp\.go\.kr/);
  assert.doesNotMatch(t, /미검증/);
});

test('프롬프트: 시나리오 금액은 엔진 값과 일치, 사용자 입력 시 가정 문구 대신 입력 비교', () => {
  const a = P.build(calc({ transactionType: 'sale', amountKrw: 500000000 }), null, data, rules);
  assert.match(a, /1,500,000원/); assert.match(a, /1,000,000원/); assert.match(a, /가정/);
  const b = P.build(calc({ transactionType: 'sale', amountKrw: 500000000, negotiatedRatePercent: '0.25' }), null, data, rules);
  assert.match(b, /입력 협의 요율/); assert.match(b, /1,250,000원/); assert.doesNotMatch(b, /가정 1/);
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

const F = require('../shared/format.js');
const I = require('../shared/insights.js');
const ins = require('../data/brokerage.insights.json');
const copy = require('../data/brokerage.copy.json');
const sale5 = (r = rules, extra = {}) => calc(Object.assign({ transactionType: 'sale', amountKrw: 500000000 }, extra), r);

test('v2.1-1: 미검증이면 "계산기 적용 상한", 검증 완료일 때만 "법정 상한" (표·FACT)', () => {
  const u = P.build(sale5(), null, data, rules);
  assert.match(u, /\| 계산기 적용 상한 \|/); assert.doesNotMatch(u, /\| 법정 상한 \|/);
  assert.match(u, /- 계산기 적용 상한 중개보수: 2,000,000원/);
  const v = P.build(sale5(verifiedRules), null, data, verifiedRules);
  assert.match(v, /\| 법정 상한 \|/); assert.match(v, /- 법정 상한 중개보수: 2,000,000원/);
  assert.doesNotMatch(v, /계산기 적용 상한 중개보수/);
});

test('v2.1-2: 산술 검증 상태와 법령 검증 상태가 분리되어 표기', () => {
  const t = P.build(sale5(), null, data, rules);
  assert.match(t, /산술 검증 상태:/); assert.match(t, /법령 검증 상태: 미검증/);
});

test('v2.1-3: 반복 지시는 공통 규칙으로 — 모듈에 중복 문구 없음', () => {
  const t = P.build(sale5(), ['verify', 'negotiate', 'risk'], data, rules);
  const count = (re) => (t.match(re) || []).length;
  assert.equal(count(/임의로 추정하지 마세요/g), 1);
  assert.equal(count(/실제 합의된 계약 조건으로 취급하지 마세요/g), 1);
});

test('v2.1-4: 가정 요율은 시장 통상·협의 가능 요율이 아님', () => {
  assert.match(P.build(sale5(), null, data, rules), /시장의 통상 요율이나 실제 협의 가능한 요율을 의미하지 않으며/);
});

test('v2.1-5: 법령 조회 시 규정명·시행일·조회일·적용 지역·거래 시점 일치 확인', () => {
  assert.match(P.build(sale5(), null, data, rules), /규정명, 시행일, 조회일, 적용 지역, 거래 시점이 이 거래와 일치하는지/);
});

test('v2.1-6: FACT에 계산 규칙 버전, 검증 완료 시 출처·검증일', () => {
  assert.match(P.build(sale5(), null, data, rules), /계산 규칙 버전: 1\.0\.0/);
  const v = P.build(sale5(verifiedRules), null, data, verifiedRules);
  assert.match(v, /최종 요율 검증일: 2026-10-20/); assert.match(v, /근거: .*ydp\.go\.kr/);
});

test('v2.1-7: 비용 부담 주체 구분, 단정 금지 (매매·임대차)', () => {
  assert.match(P.build(sale5(), null, data, rules), /매수인·매도인 중 어느 쪽인지 제공되지 않았습니다[\s\S]*반드시 발생한다고 단정하지 마세요/);
  assert.match(P.build(calc({ transactionType: 'jeonse', amountKrw: 300000000 }), null, data, rules), /임차인·임대인 중 어느 쪽인지 제공되지 않았습니다/);
});

test('v2.1-8: 핵심 요약 5줄 이내 + 핵심 항목 중심·위험 생략 금지', () => {
  const t = P.build(sale5(), null, data, rules);
  assert.match(t, /5줄 이내/); assert.match(t, /중요한 위험이나 필수 확인사항은 생략하지 마세요/);
});

test('화면 라벨: 시나리오 행 라벨이 프롬프트와 동일 (가정 1, 가정 2 + 가정 배지)', () => {
  const rows = P.scenarioRows(sale5());
  assert.deepEqual(rows.map(r => [r.label, r.sub, r.badge]), [['계산기 적용 상한', '', ''], ['가정 1', '상한 −0.10%p', '가정'], ['가정 2', '상한 −0.20%p', '가정']]);
  assert.equal(P.scenarioRows(sale5(verifiedRules))[0].label, '법정 상한');
});

test('금액 표기: 만 원 단위 / 억 / 원 단위', () => {
  assert.equal(F.man(2000000), '200만 원'); assert.equal(F.man(500000), '50만 원'); assert.equal(F.man(100000000), '1억 원');
  assert.equal(F.man(150000000), '1억 5,000만 원'); assert.equal(F.man(155000), '155,000원'); assert.equal(F.man(31000), '31,000원');
});

test('인사이트: 사용자의 계산값으로 문구 생성 (가정 / 입력 / 라벨)', () => {
  const a = I.evaluate(sale5(), ins, copy);
  assert.equal(a.length, 3);
  assert.equal(a[0].title, '200만 원은 반드시 내야 하는 금액이 아니에요.');
  assert.match(a[0].desc, /계산기 적용 상한액이며/);
  assert.equal(a[1].title, '요율이 0.10%p 낮아지면 50만 원 차이가 나요.');
  assert.match(a[1].desc, /5억 원 거래 기준으로 계산한 예시/);
  assert.equal(a[2].title, '부가세는 별도로 확인해야 해요.');
  assert.match(I.evaluate(sale5(verifiedRules), ins, copy)[0].desc, /법정 상한액이며/);
  const b = I.evaluate(sale5(rules, { negotiatedRatePercent: '0.30' }), ins, copy);
  assert.equal(b[1].title, '입력하신 협의 요율 0.30%를 적용하면 50만 원 적어요.');
});

test('인사이트: 최대 3개, 실패 결과는 빈 배열', () => {
  assert.ok(I.evaluate(sale5(), ins, copy).length <= 3);
  assert.deepEqual(I.evaluate({ status: 'invalid_input' }, ins, copy), []);
});
