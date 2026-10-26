// 오피스텔·주택 외(상가, 토지 등) 신규 계산식. 실행: node --test tests/property-types.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../shared/engine.js');
const P = require('../shared/prompt.js');
const I = require('../shared/insights.js');
const rules = require('../data/brokerage.rules.v1.0.0.json');
const promptData = require('../data/brokerage.prompt.v2.1.0.json');
const ins = require('../data/brokerage.insights.json');
const copy = require('../data/brokerage.copy.json');
const DEV = { env: 'development' };
const OK = { officetelAreaOk: true, officetelFacilityOk: true };
const calc = (i) => E.calculate(i, rules, DEV);

test('오피스텔(요건 충족) 매매 3억 → 0.5%, 한도액 없음', () => {
  const r = calc({ propertyType: 'officetel', ...OK, transactionType: 'sale', amountKrw: 300000000 });
  assert.equal(r.status, 'success');
  assert.equal(r.property_type, 'officetel_qualified');
  assert.equal(r.applied_max_rate_bps, 50);
  assert.equal(r.cap_krw, null);
  assert.equal(r.max_fee_krw, 1500000);
});

test('오피스텔(요건 충족) 전세 2억 → 0.4% = 800,000', () => {
  const r = calc({ propertyType: 'officetel', ...OK, transactionType: 'jeonse', amountKrw: 200000000 });
  assert.equal(r.applied_max_rate_bps, 40);
  assert.equal(r.max_fee_krw, 800000);
});

test('오피스텔 요건 하나라도 미충족 → 0.9% 이내(상한 0.9%)', () => {
  for (const f of [{ officetelAreaOk: false, officetelFacilityOk: true }, { officetelAreaOk: true, officetelFacilityOk: false }, { officetelAreaOk: false, officetelFacilityOk: false }]) {
    const r = calc({ propertyType: 'officetel', ...f, transactionType: 'sale', amountKrw: 300000000 });
    assert.equal(r.property_type, 'officetel_unqualified');
    assert.equal(r.applied_max_rate_bps, 90);
    assert.equal(r.max_fee_krw, 2700000);
  }
});

test('오피스텔 요건 입력 누락/비불리언 → invalid_input required_missing', () => {
  for (const bad of [{}, { officetelAreaOk: true }, { officetelFacilityOk: true }, { officetelAreaOk: 'true', officetelFacilityOk: true }]) {
    const r = calc({ propertyType: 'officetel', transactionType: 'sale', amountKrw: 300000000, ...bad });
    assert.equal(r.status, 'invalid_input');
    assert.equal(r.errors[0].code, 'required_missing');
  }
});

test('주택 외 매매 10억 → 0.9% = 9,000,000, 한도액 없음', () => {
  const r = calc({ propertyType: 'other', transactionType: 'sale', amountKrw: 1000000000 });
  assert.equal(r.property_type, 'other');
  assert.equal(r.max_fee_krw, 9000000);
  assert.equal(r.cap_krw, null);
  assert.equal(r.property_group, 'other');
});

test('월세 환산: 5천만 원 이상은 ×100, 미만은 ×70 (주택과 같은 방식)', () => {
  const a = calc({ propertyType: 'other', transactionType: 'rent', depositKrw: 50000000, monthlyKrw: 1000000 });
  assert.equal(a.transaction_amount_krw, 150000000); assert.equal(a.rent_multiplier, 100); assert.equal(a.max_fee_krw, 1350000);
  const b = calc({ propertyType: 'other', transactionType: 'rent', depositKrw: 10000000, monthlyKrw: 300000 });
  assert.equal(b.transaction_amount_krw, 31000000); assert.equal(b.rent_multiplier, 70); assert.equal(b.max_fee_krw, 279000);
});

test('협의 요율이 상한 초과 → rate_exceeds_limit (오피스텔 0.5% 초과, 주택 외 0.9% 초과)', () => {
  assert.equal(calc({ propertyType: 'officetel', ...OK, transactionType: 'sale', amountKrw: 300000000, negotiatedRatePercent: '0.60' }).status, 'rate_exceeds_limit');
  assert.equal(calc({ propertyType: 'other', transactionType: 'sale', amountKrw: 300000000, negotiatedRatePercent: '0.91' }).status, 'rate_exceeds_limit');
  assert.equal(calc({ propertyType: 'other', transactionType: 'sale', amountKrw: 300000000, negotiatedRatePercent: '0.90' }).status, 'success');
});

test('시나리오: 오피스텔 0.5% → 0.4%, 0.3% / 주택 외 0.9% → 0.8%, 0.7%', () => {
  const a = calc({ propertyType: 'officetel', ...OK, transactionType: 'sale', amountKrw: 300000000 });
  assert.deepEqual(a.scenarios.map((s) => [s.rate_bps, s.fee_krw]), [[50, 1500000], [40, 1200000], [30, 900000]]);
  const b = calc({ propertyType: 'other', transactionType: 'sale', amountKrw: 300000000 });
  assert.deepEqual(b.scenarios.map((s) => [s.rate_bps, s.fee_krw]), [[90, 2700000], [80, 2400000], [70, 2100000]]);
});

test('회귀: 주택 결과에는 새 표시 필드가 붙지 않고 값이 그대로', () => {
  const h = calc({ propertyType: 'housing', transactionType: 'sale', amountKrw: 500000000 });
  assert.equal(h.max_fee_krw, 2000000);
  for (const k of ['property_label', 'property_group', 'basis_kind', 'officetel_area_ok']) assert.ok(!(k in h), k);
});

test('production 환경에서는 미검증 규칙이면 새 유형도 계산 차단 (기존 게이트 동일)', () => {
  const r = E.calculate({ propertyType: 'other', transactionType: 'sale', amountKrw: 1 }, rules, { env: 'production' });
  assert.equal(r.status, 'rule_unverified');
});

test('프롬프트: 오피스텔 FACT에 요건 입력값, 주택 외에는 주택 문구가 섞이지 않음', () => {
  const o = calc({ propertyType: 'officetel', officetelAreaOk: true, officetelFacilityOk: false, transactionType: 'sale', amountKrw: 300000000 });
  const to = P.build(o, ['verify', 'cost', 'risk', 'negotiate', 'checklist'], promptData, rules);
  assert.match(to, /부동산 유형: 오피스텔 \(요건 미충족\)/);
  assert.match(to, /전용면적 85㎡ 이하 예, .*갖춤 아니오/);
  assert.match(to, /요건은 사용자 입력값이며 확인된 사실이 아닙니다/);
  assert.match(to, /오피스텔 요건\(전용면적 85㎡ 이하, 시설 갖춤\) 충족 여부는 사용자 입력값/);
  assert.doesNotMatch(to, /부동산 유형: 주택/);
  const x = calc({ propertyType: 'other', transactionType: 'rent', depositKrw: 30000000, monthlyKrw: 1000000 });
  const tx = P.build(x, ['verify', 'cost', 'risk', 'checklist'], promptData, rules);
  assert.match(tx, /부동산 유형: 주택 외 \(상가, 토지 등\)/);
  assert.match(tx, /상가·사무실 등 주택 외 부동산 임대차/);
  assert.doesNotMatch(tx, /주택 임대차 과정에서 발생/);
  assert.match(tx, /월세 환산 산식/);
  assert.match(tx, /계산기 적용 상한/);
  assert.doesNotMatch(tx, /법령 검증 상태: 검증 완료/);
});

test('프롬프트: 주택 출력은 기존과 동일(주택 문구 사용)', () => {
  const h = calc({ propertyType: 'housing', transactionType: 'sale', amountKrw: 500000000 });
  const t = P.build(h, ['cost'], promptData, rules);
  assert.match(t, /- 부동산 유형: 주택/);
  assert.match(t, /주택 매매 과정에서 발생할 수 있는 중개보수 외 비용 항목/);
});

test('인사이트: 오피스텔에는 요건 안내가 포함, 주택에는 없음, 최대 3개', () => {
  const o = calc({ propertyType: 'officetel', ...OK, transactionType: 'sale', amountKrw: 300000000 });
  const lo = I.evaluate(o, ins, copy);
  assert.ok(lo.some((x) => x.id === 'ins_officetel_req'));
  assert.ok(lo.length <= 3);
  const h = calc({ propertyType: 'housing', transactionType: 'sale', amountKrw: 500000000 });
  assert.ok(!I.evaluate(h, ins, copy).some((x) => x.id === 'ins_officetel_req'));
});

test('기준표: 주택 표 + 오피스텔·주택 외 표, 같은 규칙 JSON 사용', () => {
  global.self = global; eval(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'shared', 'rates.js'), 'utf8'));
  const html = global.FeeRates.render(rules);
  assert.match(html, /주택 매매/);
  assert.match(html, /오피스텔 · 주택 외\(상가, 토지 등\)/);
  assert.match(html, /0\.50%/); assert.match(html, /0\.40%/); assert.match(html, /0\.90% 이내 협의/);
});
