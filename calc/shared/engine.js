/*
 * CALC BUFF · 부동산 중개보수 계산 엔진
 * - 모든 금액 연산은 BigInt. 반환 객체의 *_krw 는 안전 정수 범위(<=1,000억 입력 기준)라 Number 로 반환.
 * - 규칙(요율·구간·한도·환산)은 rules JSON 에서만 읽는다. 코드에 수치를 두지 않는다.
 * - 검증되지 않은 규칙(status !== 'verified')은 env === 'production' 에서 계산을 차단한다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FeeEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STATUS = {
    SUCCESS: 'success',
    RULE_UNVERIFIED: 'rule_unverified',
    INVALID_INPUT: 'invalid_input',
    RATE_EXCEEDS_LIMIT: 'rate_exceeds_limit',
    UNSUPPORTED: 'unsupported'
  };

  // 사용자 입력 → BigInt (정수 문자열/숫자/BigInt 만 허용). 실패 시 null.
  function toBigInt(v) {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return Number.isSafeInteger(v) ? BigInt(v) : null;
    if (typeof v === 'string' && /^\d{1,15}$/.test(v.trim())) return BigInt(v.trim());
    return null;
  }

  // "0.30" → 30 (bp). 소수 둘째 자리까지. 문자열 연산만 사용(부동소수점 금지).
  function percentToBps(str) {
    if (typeof str === 'number') str = String(str);
    if (typeof str !== 'string') return null;
    var s = str.trim();
    var m = /^(\d{1,2})(?:\.(\d{1,2}))?$/.exec(s);
    if (!m) return null;
    var frac = (m[2] || '').padEnd(2, '0');
    return BigInt(m[1]) * 100n + BigInt(frac);
  }

  function fail(status, field, code, extra) {
    var r = { status: status, errors: [{ field: field, code: code }], vat_status: 'not_calculated' };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }

  // 상한액 계산: floor(amount*bps/10000) 후 한도액 적용
  function feeFor(amount, bps, cap) {
    var fee = (amount * bps) / 10000n; // BigInt 나눗셈 = 절사
    var capApplied = false;
    if (cap !== null && fee > cap) { fee = cap; capApplied = true; }
    return { fee: fee, capApplied: capApplied };
  }

  // 협의 시나리오: 모든 금액은 엔진이 산출. 사용자가 협의 요율을 넣었으면 [법정 상한, 입력 요율], 아니면 [상한, -0.10%p, -0.20%p] (0% 미만 제외, 한도액 적용 후 금액이 같으면 중복 제거).
  var AUTO_DELTAS_BPS = [0n, 10n, 20n];
  function buildScenarios(amount, bps, cap, userBps) {
    var legal = feeFor(amount, bps, cap);
    var out = [{ id: 'legal_max', kind: 'legal_max', rate_bps: Number(bps), delta_bps: 0, fee_krw: Number(legal.fee), cap_applied: legal.capApplied, diff_krw: 0, is_assumption: false }];
    if (userBps !== null) {
      var u = feeFor(amount, userBps, cap);
      out.push({ id: 'user_input', kind: 'user_input', rate_bps: Number(userBps), delta_bps: Number(bps - userBps), fee_krw: Number(u.fee), cap_applied: u.capApplied, diff_krw: Number(legal.fee - u.fee), is_assumption: false });
      return out;
    }
    var seen = [legal.fee];
    for (var i = 1; i < AUTO_DELTAS_BPS.length; i++) {
      var r = bps - AUTO_DELTAS_BPS[i];
      if (r < 0n) continue;
      var f = feeFor(amount, r, cap);
      if (seen.indexOf(f.fee) >= 0) continue;
      seen.push(f.fee);
      out.push({ id: 'assumed_' + String(AUTO_DELTAS_BPS[i]), kind: 'assumed', rate_bps: Number(r), delta_bps: Number(AUTO_DELTAS_BPS[i]), fee_krw: Number(f.fee), cap_applied: f.capApplied, diff_krw: Number(legal.fee - f.fee), is_assumption: true });
    }
    return out;
  }

  function findBand(bands, amount) {
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var min = BigInt(b.min_krw);
      var max = b.max_exclusive_krw === null ? null : BigInt(b.max_exclusive_krw);
      if (amount >= min && (max === null || amount < max)) return b;
    }
    return null;
  }

  /**
   * calculate(input, rules, opts)
   * input: {
   *   propertyType: 'housing' | 'officetel' | 'other'  (officetel 은 officetelAreaOk, officetelFacilityOk boolean 필수),
   *   transactionType: 'sale' | 'jeonse' | 'rent',
   *   amountKrw:  매매가격 / 전세보증금 (sale, jeonse)
   *   depositKrw, monthlyKrw: 월세 (rent)
   *   negotiatedRatePercent: "0.30" (선택)
   * }
   * opts: { env: 'production' | 'development' }
   */
  function calculate(input, rules, opts) {
    opts = opts || {};
    var env = opts.env || 'production';

    if (!rules || !rules.property_types) return fail(STATUS.RULE_UNVERIFIED, 'rules', 'missing_rules');
    if (env === 'production' && rules.status !== 'verified') {
      return fail(STATUS.RULE_UNVERIFIED, 'rules', 'status_not_verified', { rules_version: rules.rules_version });
    }

    var ptype = input && input.propertyType;
    var ttype = input && input.transactionType;
    // 오피스텔: 면적·시설 요건 입력으로 적용 규칙 키를 결정 (둘 다 true → officetel_qualified)
    var officetelInput = null;
    if (ptype === 'officetel') {
      if (typeof input.officetelAreaOk !== 'boolean') return fail(STATUS.INVALID_INPUT, 'officetelAreaOk', 'required_missing');
      if (typeof input.officetelFacilityOk !== 'boolean') return fail(STATUS.INVALID_INPUT, 'officetelFacilityOk', 'required_missing');
      officetelInput = { area_ok: input.officetelAreaOk, facility_ok: input.officetelFacilityOk };
      ptype = (input.officetelAreaOk && input.officetelFacilityOk) ? 'officetel_qualified' : 'officetel_unqualified';
    }
    var group = rules.property_types[ptype];
    if (!group) return fail(STATUS.UNSUPPORTED, 'propertyType', 'unsupported_property_type');
    var kind = ttype === 'sale' ? 'sale' : (ttype === 'jeonse' || ttype === 'rent') ? 'lease' : null;
    if (!kind) return fail(STATUS.UNSUPPORTED, 'transactionType', 'unsupported_transaction_type');
    var table = group[kind];
    if (!table) return fail(STATUS.UNSUPPORTED, 'propertyType', 'rules_not_available');
    if (!table.bands || table.bands.length === 0) {
      return fail(STATUS.RULE_UNVERIFIED, 'bands', 'bands_empty', { rules_version: rules.rules_version });
    }

    var max = BigInt(rules.limits.max_amount_krw);
    var amount;
    var converted = false;
    var depOut = null, monOut = null, multOut = null;

    if (ttype === 'rent') {
      var dep = (input.depositKrw === undefined || input.depositKrw === null || input.depositKrw === '') ? 0n : toBigInt(input.depositKrw);
      if (dep === null) return fail(STATUS.INVALID_INPUT, 'depositKrw', 'not_integer');
      if (input.monthlyKrw === undefined || input.monthlyKrw === null || input.monthlyKrw === '') return fail(STATUS.INVALID_INPUT, 'monthlyKrw', 'required_missing');
      var mon = toBigInt(input.monthlyKrw);
      if (mon === null) return fail(STATUS.INVALID_INPUT, 'monthlyKrw', 'not_integer');
      if (mon <= 0n) return fail(STATUS.INVALID_INPUT, 'monthlyKrw', 'must_be_positive');
      if (dep > max) return fail(STATUS.INVALID_INPUT, 'depositKrw', 'out_of_range');
      if (mon > max) return fail(STATUS.INVALID_INPUT, 'monthlyKrw', 'out_of_range');
      var mr = rules.monthly_rent;
      var primary = dep + mon * BigInt(mr.primary_multiplier);
      var useFallback = primary < BigInt(mr.fallback_threshold_krw);
      amount = useFallback ? dep + mon * BigInt(mr.fallback_multiplier) : primary;
      converted = true; depOut = Number(dep); monOut = Number(mon); multOut = useFallback ? mr.fallback_multiplier : mr.primary_multiplier;
    } else {
      if (input.amountKrw === undefined || input.amountKrw === null || input.amountKrw === '') return fail(STATUS.INVALID_INPUT, 'amountKrw', 'required_missing');
      amount = toBigInt(input.amountKrw);
      if (amount === null) return fail(STATUS.INVALID_INPUT, 'amountKrw', 'not_integer');
      if (amount <= 0n) return fail(STATUS.INVALID_INPUT, 'amountKrw', 'must_be_positive');
    }
    if (amount > max) return fail(STATUS.INVALID_INPUT, 'amountKrw', 'out_of_range');

    var band = findBand(table.bands, amount);
    if (!band) return fail(STATUS.RULE_UNVERIFIED, 'bands', 'band_not_found', { rules_version: rules.rules_version });
    if (band.max_rate_bps === null || band.max_rate_bps === undefined) {
      return fail(STATUS.RULE_UNVERIFIED, 'bands', 'rate_not_set', { rules_version: rules.rules_version });
    }

    var bps = BigInt(band.max_rate_bps);
    var cap = band.cap_krw === null || band.cap_krw === undefined ? null : BigInt(band.cap_krw);
    var base = feeFor(amount, bps, cap);

    var result = {
      status: STATUS.SUCCESS,
      region: rules.region,
      region_label: rules.region_label,
      property_type: ptype,
      transaction_type: ttype,
      transaction_amount_krw: Number(amount),
      converted_from_rent: converted,
      rent_deposit_krw: depOut,
      rent_monthly_krw: monOut,
      rent_multiplier: multOut,
      band_id: band.band_id,
      applied_max_rate_bps: Number(bps),
      cap_krw: cap === null ? null : Number(cap),
      cap_applied: base.capApplied,
      max_fee_krw: Number(base.fee),
      negotiated_rate_bps: null,
      negotiated_fee_krw: null,
      negotiated_cap_applied: false,
      difference_krw: null,
      scenarios: null,
      vat_status: 'not_calculated',
      rules_version: rules.rules_version,
      source_ids: [band.source_id],
      effective_from: rules.effective_from,
      verified_at: rules.verified_at,
      rules_status: rules.status
    };

    // 주택 외 유형(오피스텔·주택 외)만 표시용 정보를 추가 — 주택 결과 객체는 그대로 둠
    if (group.label) {
      result.property_label = group.label;
      result.property_group = group.group;
      result.basis_kind = group.basis_kind || 'regulation';
      if (officetelInput) { result.officetel_area_ok = officetelInput.area_ok; result.officetel_facility_ok = officetelInput.facility_ok; }
    }

    // 협의 요율 비교 (선택)
    var userBps = null;
    var np = input.negotiatedRatePercent;
    if (np !== undefined && np !== null && String(np).trim() !== '') {
      var nbps = percentToBps(np);
      if (nbps === null) return fail(STATUS.INVALID_INPUT, 'negotiatedRatePercent', 'invalid_rate_format');
      if (nbps > bps) {
        return fail(STATUS.RATE_EXCEEDS_LIMIT, 'negotiatedRatePercent', 'exceeds_max_rate', {
          applied_max_rate_bps: Number(bps), band_id: band.band_id, rules_version: rules.rules_version
        });
      }
      var neg = feeFor(amount, nbps, cap);
      result.negotiated_rate_bps = Number(nbps);
      result.negotiated_fee_krw = Number(neg.fee);
      result.negotiated_cap_applied = neg.capApplied;
      result.difference_krw = Number(base.fee - neg.fee);
      userBps = nbps;
    }
    result.scenarios = buildScenarios(amount, bps, cap, userBps);
    return result;
  }

  // 요율 기준표용 조회: 같은 규칙 JSON 을 그대로 반환(표시와 계산의 단일 출처)
  function getBands(rules, propertyType, kind) {
    var g = rules && rules.property_types && rules.property_types[propertyType];
    var t = g && g[kind];
    return t && t.bands ? t.bands : null;
  }

  return { calculate: calculate, getBands: getBands, percentToBps: percentToBps, STATUS: STATUS };
});
