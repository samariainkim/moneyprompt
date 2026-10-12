'use strict';
// 실행: node --test fee/tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { calculate, getBands, percentToBps } = require('../shared/engine.js');

const RULES_FILE = path.join(__dirname, '..', 'data', 'brokerage-fee.rules.v1.0.0.json');
const rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
const DEV = { env: 'development' };
const PROD = { env: 'production' };

const run = (input, o = DEV, r = rules) => calculate({ propertyType: 'housing', ...input }, r, o);
const ok = (res) => { assert.equal(res.status, 'success', JSON.stringify(res)); return res; };

test('정상값: 매매 5억 → 2,000,000 (0.4%)', () => {
  const r = ok(run({ transactionType: 'sale', amountKrw: 500000000 }));
  assert.equal(r.max_fee_krw, 2000000);
  assert.equal(r.applied_max_rate_bps, 40);
  assert.equal(r.band_id, 'sale_3');
  assert.equal(r.cap_applied, false);
  assert.equal(r.vat_status, 'not_calculated');
});

test('정상값: 매매 4천만 → 240,000 (한도액 미적용)', () => {
  const r = ok(run({ transactionType: 'sale', amountKrw: 40000000 }));
  assert.equal(r.max_fee_krw, 240000);
  assert.equal(r.cap_applied, false);
});

test('정상값: 매매 1억 9천만 → 800,000 (한도액 적용)', () => {
  const r = ok(run({ transactionType: 'sale', amountKrw: 190000000 }));
  assert.equal(r.max_fee_krw, 800000);
  assert.equal(r.cap_applied, true);
});

test('정상값: 전세 3억 → 900,000', () => {
  const r = ok(run({ transactionType: 'jeonse', amountKrw: 300000000 }));
  assert.equal(r.max_fee_krw, 900000);
  assert.equal(r.band_id, 'lease_3');
});

test('월세: 보증금 1천만·월세 30만 → 환산 31,000,000 / 상한액 155,000', () => {
  const r = ok(run({ transactionType: 'rent', depositKrw: 10000000, monthlyKrw: 300000 }));
  assert.equal(r.transaction_amount_krw, 31000000);
  assert.equal(r.converted_from_rent, true);
  assert.equal(r.max_fee_krw, 155000); // 0.5% = 155,000 < 한도 200,000
});

test('월세 경계: 100배 합계가 정확히 5천만 → 100배 유지(70배 아님)', () => {
  // 보증금 2천만 + 월세 30만×100 = 5천만 (정확히)
  const r = ok(run({ transactionType: 'rent', depositKrw: 20000000, monthlyKrw: 300000 }));
  assert.equal(r.transaction_amount_krw, 50000000);
  // 5천만은 lease_2 (0.4%, 한도 30만) = 200,000
  assert.equal(r.band_id, 'lease_2');
  assert.equal(r.max_fee_krw, 200000);
});

test('월세 경계: 100배 합계 5천만 − 1원 → 70배 적용', () => {
  // 보증금 19,999,901 ... 합계 49,999,901이 되도록: 보증금 19,999,901 + 300,000×100 = 49,999,901 (<5천만)
  const r = ok(run({ transactionType: 'rent', depositKrw: 19999901, monthlyKrw: 300000 }));
  assert.equal(r.transaction_amount_krw, 19999901 + 300000 * 70);
});

test('월세: 보증금 0 허용, 월세 0 은 오류', () => {
  ok(run({ transactionType: 'rent', depositKrw: 0, monthlyKrw: 500000 }));
  ok(run({ transactionType: 'rent', monthlyKrw: 500000 })); // 보증금 생략
  const bad = run({ transactionType: 'rent', depositKrw: 10000000, monthlyKrw: 0 });
  assert.equal(bad.status, 'invalid_input');
  assert.equal(bad.errors[0].field, 'monthlyKrw');
});

test('협의 비교: 매매 5억·0.30% → 1,500,000 / 차이 500,000', () => {
  const r = ok(run({ transactionType: 'sale', amountKrw: 500000000, negotiatedRatePercent: '0.30' }));
  assert.equal(r.negotiated_fee_krw, 1500000);
  assert.equal(r.difference_krw, 500000);
  assert.equal(r.negotiated_rate_bps, 30);
});

test('협의 요율이 상한 초과(0.50% > 0.40%) → rate_exceeds_limit', () => {
  const r = run({ transactionType: 'sale', amountKrw: 500000000, negotiatedRatePercent: '0.50' });
  assert.equal(r.status, 'rate_exceeds_limit');
});

test('협의 요율 = 상한, 한도액 구간 → 금액은 한도액으로 제한 + 표시', () => {
  // 1억 9천만, 0.50%: 950,000 → 한도 800,000
  const r = ok(run({ transactionType: 'sale', amountKrw: 190000000, negotiatedRatePercent: '0.50' }));
  assert.equal(r.negotiated_fee_krw, 800000);
  assert.equal(r.negotiated_cap_applied, true);
  assert.equal(r.difference_krw, 0);
});

test('협의 요율 0.00% 허용, 소수 셋째 자리/음수/문자 차단', () => {
  const z = ok(run({ transactionType: 'sale', amountKrw: 500000000, negotiatedRatePercent: '0.00' }));
  assert.equal(z.negotiated_fee_krw, 0);
  for (const bad of ['0.123', '-0.1', 'abc', '1e2', '0.3%']) {
    const r = run({ transactionType: 'sale', amountKrw: 500000000, negotiatedRatePercent: bad });
    assert.equal(r.status, 'invalid_input', bad);
  }
});

test('percentToBps: 부동소수점 없이 변환', () => {
  assert.equal(percentToBps('0.4'), 40n);
  assert.equal(percentToBps('0.35'), 35n);
  assert.equal(percentToBps('0.07'), 7n);
  assert.equal(percentToBps('1'), 100n);
  assert.equal(percentToBps('0.123'), null);
});

test('경계: 매매 5천만 전후 (한도액 연속)', () => {
  assert.equal(ok(run({ transactionType: 'sale', amountKrw: 49999999 })).max_fee_krw, 250000);
  assert.equal(ok(run({ transactionType: 'sale', amountKrw: 50000000 })).max_fee_krw, 250000);
});

test('경계: 매매 2억 전후 / 절사', () => {
  assert.equal(ok(run({ transactionType: 'sale', amountKrw: 199999999 })).max_fee_krw, 800000);
  assert.equal(ok(run({ transactionType: 'sale', amountKrw: 200000000 })).max_fee_krw, 800000);
  const r = ok(run({ transactionType: 'sale', amountKrw: 200000001 })); // 800,000.004 → 절사
  assert.equal(r.max_fee_krw, 800000);
});

test('절사: 원 단위 미만이 생기는 금액은 내림', () => {
  // 3억 3,333,333원 × 0.4% = 1,333,333.332 → 1,333,333
  const r = ok(run({ transactionType: 'sale', amountKrw: 333333333 }));
  assert.equal(r.max_fee_krw, 1333333);
});

// 모든 구간의 경계(−1원 / 경계 / +1원)를 자동 생성해 band_id 를 검증
for (const [kind, ttype] of [['sale', 'sale'], ['lease', 'jeonse']]) {
  test(`경계 자동 테스트: ${kind} 전 구간 band 판정`, () => {
    const bands = getBands(rules, 'housing', kind);
    bands.forEach((b, i) => {
      if (b.min_krw > 0) {
        const below = ok(run({ transactionType: ttype, amountKrw: b.min_krw - 1 }));
        assert.equal(below.band_id, bands[i - 1].band_id, `${b.band_id} −1원`);
      }
      const at = ok(run({ transactionType: ttype, amountKrw: Math.max(b.min_krw, 1) }));
      assert.equal(at.band_id, b.band_id, `${b.band_id} 경계`);
      const above = ok(run({ transactionType: ttype, amountKrw: Math.max(b.min_krw, 1) + 1 }));
      assert.equal(above.band_id, b.band_id, `${b.band_id} +1원`);
    });
  });
}

test('전세 경계: 5천만, 1억 전후', () => {
  assert.equal(ok(run({ transactionType: 'jeonse', amountKrw: 49999999 })).band_id, 'lease_1');
  assert.equal(ok(run({ transactionType: 'jeonse', amountKrw: 50000000 })).band_id, 'lease_2');
  assert.equal(ok(run({ transactionType: 'jeonse', amountKrw: 99999999 })).band_id, 'lease_2');
  assert.equal(ok(run({ transactionType: 'jeonse', amountKrw: 100000000 })).band_id, 'lease_3');
});

test('입력 검증: 빈 값/0/음수/소수/문자/상한 초과', () => {
  assert.equal(run({ transactionType: 'sale' }).errors[0].code, 'required_missing');
  assert.equal(run({ transactionType: 'sale', amountKrw: 0 }).errors[0].code, 'must_be_positive');
  assert.equal(run({ transactionType: 'sale', amountKrw: -5 }).errors[0].code, 'must_be_positive');
  assert.equal(run({ transactionType: 'sale', amountKrw: '-5' }).errors[0].code, 'not_integer');
  assert.equal(run({ transactionType: 'sale', amountKrw: '12.5' }).errors[0].code, 'not_integer');
  assert.equal(run({ transactionType: 'sale', amountKrw: 'abc' }).errors[0].code, 'not_integer');
  assert.equal(run({ transactionType: 'sale', amountKrw: 100000000001 }).errors[0].code, 'out_of_range');
});

test('입력 최대값: 1,000억 원 허용, 1원 초과는 오류', () => {
  const r = ok(run({ transactionType: 'sale', amountKrw: 100000000000 }));
  assert.equal(r.band_id, 'sale_6');
  assert.equal(r.max_fee_krw, 700000000); // 1,000억 × 0.7%
  assert.equal(run({ transactionType: 'sale', amountKrw: '100000000001' }).status, 'invalid_input');
});

test('월세 환산 후 금액이 상한을 넘으면 오류', () => {
  const r = run({ transactionType: 'rent', depositKrw: 99999999999, monthlyKrw: 1000000 });
  assert.equal(r.status, 'invalid_input');
});

test('프로덕션: status !== verified 이면 계산 차단 (rule_unverified)', () => {
  const r = run({ transactionType: 'sale', amountKrw: 500000000 }, PROD);
  assert.equal(r.status, 'rule_unverified');
  assert.equal(r.errors[0].code, 'status_not_verified');
});

test('프로덕션: verified 규칙은 계산 허용', () => {
  const verified = { ...rules, status: 'verified' };
  const r = calculate({ propertyType: 'housing', transactionType: 'sale', amountKrw: 500000000 }, verified, PROD);
  assert.equal(r.status, 'success');
});

test('개발 환경에서는 pending 규칙으로도 계산 가능', () => {
  assert.equal(run({ transactionType: 'sale', amountKrw: 500000000 }, DEV).status, 'success');
});

test('오피스텔·기타 부동산 → unsupported (규칙 null)', () => {
  for (const p of ['officetel_qualified', 'officetel_unqualified', 'other']) {
    const r = calculate({ propertyType: p, transactionType: 'sale', amountKrw: 500000000 }, rules, DEV);
    assert.equal(r.status, 'unsupported', p);
  }
  assert.equal(calculate({ propertyType: 'land', transactionType: 'sale', amountKrw: 1 }, rules, DEV).status, 'unsupported');
});

test('bands 비어있음 / 요율 null → rule_unverified (null 을 0으로 해석하지 않음)', () => {
  const emptyBands = JSON.parse(JSON.stringify(rules));
  emptyBands.property_types.housing.sale.bands = [];
  assert.equal(run({ transactionType: 'sale', amountKrw: 500000000 }, DEV, emptyBands).status, 'rule_unverified');

  const nullRate = JSON.parse(JSON.stringify(rules));
  nullRate.property_types.housing.sale.bands[2].max_rate_bps = null;
  const r = run({ transactionType: 'sale', amountKrw: 500000000 }, DEV, nullRate);
  assert.equal(r.status, 'rule_unverified');
  assert.equal(r.errors[0].code, 'rate_not_set');
});

test('규칙 JSON 무결성: 구간 연속·겹침 없음·source_id 존재', () => {
  const sourceIds = new Set(rules.sources.map((s) => s.id));
  for (const kind of ['sale', 'lease']) {
    const bands = getBands(rules, 'housing', kind);
    assert.equal(bands[0].min_krw, 0);
    assert.equal(bands[bands.length - 1].max_exclusive_krw, null);
    for (let i = 0; i < bands.length - 1; i++) {
      assert.equal(bands[i].max_exclusive_krw, bands[i + 1].min_krw, `${kind} 구간 연속`);
    }
    for (const b of bands) assert.ok(sourceIds.has(b.source_id), `${b.band_id} source`);
  }
});

test('규칙 JSON: 서울 기준 공식 안내 페이지 값과 일치(회귀 방지)', () => {
  const s = getBands(rules, 'housing', 'sale').map((b) => [b.max_rate_bps, b.cap_krw]);
  assert.deepEqual(s, [[60, 250000], [50, 800000], [40, null], [50, null], [60, null], [70, null]]);
  const l = getBands(rules, 'housing', 'lease').map((b) => [b.max_rate_bps, b.cap_krw]);
  assert.deepEqual(l, [[50, 200000], [40, 300000], [30, null], [40, null], [50, null], [60, null]]);
});

test('결과 객체 계약: 필수 필드 존재', () => {
  const r = ok(run({ transactionType: 'sale', amountKrw: 500000000 }));
  for (const k of ['status', 'region', 'property_type', 'transaction_type', 'transaction_amount_krw', 'converted_from_rent',
    'band_id', 'applied_max_rate_bps', 'cap_krw', 'cap_applied', 'max_fee_krw', 'negotiated_rate_bps', 'negotiated_fee_krw',
    'difference_krw', 'vat_status', 'rules_version', 'source_ids', 'effective_from', 'verified_at']) {
    assert.ok(k in r, k);
  }
});
