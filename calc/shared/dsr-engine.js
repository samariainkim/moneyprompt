/* DSR 기준 추정 대출 한도 엔진 (순수 함수, UI 비의존)
   DSR = 연간 원리금 ÷ 연소득 (원리금은 대출금리 + 스트레스 금리로 산정), 은행 40%.
   한도 = (연소득 × 40%) ÷ (대출 1원당 연간 원리금). BigInt 고정소수점(1e36)으로 계산하고 원 단위로 절사한다.
   - 원리금균등: 월 상환액 × 12
   - 원금균등: 첫 12개월 실제 상환액(원금 + 이자) 합 — 상환액이 가장 큰 해 기준의 보수적 추정
   - 스트레스 금리: 기준일에 해당하는 적용기간 규칙에서 선택. 등록된 기간 밖이면 계산하지 않는다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DsrEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var STATUS = { SUCCESS: 'success', INVALID: 'invalid_input', UNSUPPORTED: 'unsupported' };
  var S = 10n ** 36n; // 고정소수점 스케일

  function bad(code, field, status) { return { status: status || STATUS.INVALID, error: { code: code, field: field } }; }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function isoOk(s, lim) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s.trim() : '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (y < lim.date_year_min || y > lim.date_year_max || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return m[1] + '-' + m[2] + '-' + m[3];
  }
  function rateToBps(str, decimals) { // "4.2" → 420 (0.01% 단위)
    var s = String(str === undefined || str === null ? '' : str).replace(/[\s%]/g, '').replace(',', '.');
    if (s === '') return { empty: true };
    var m = new RegExp('^(\\d{1,3})(?:\\.(\\d{1,' + decimals + '}))?$').exec(s);
    if (!m) return { bad: true };
    return { bps: Number(BigInt(m[1]) * 100n + BigInt(((m[2] || '') + '00').slice(0, 2))) };
  }
  function pow(base, n) { // base^n (고정소수점)
    var r = S, b = base, e = n;
    while (e > 0) { if (e & 1) r = r * b / S; b = b * b / S; e >>= 1; }
    return r;
  }
  // 원 단위 절사 한도. rateMilli = 연 금리(0.001% 단위, 스트레스 포함), years, 연 상환 여력 annualCapKrw(BigInt)
  function limitKrw(rateMilli, years, annualCap, repayment) {
    var n = BigInt(years * 12), rBp = BigInt(rateMilli);
    if (repayment === 'principal_equal') { // 연간(첫 12개월) 원리금 / 원금 = 12/n + r × (12 − 66/n)
      var r1 = rBp * S / 1200000n; // 월 이자율
      var f = 12n * S / n + r1 * (12n * S - 66n * S / n) / S; // 원금 1원당 첫해 원리금
      return annualCap * S / f;
    }
    if (rBp === 0n) return annualCap * n / 12n; // 무이자: 연 상환액 × 년수
    var r = rBp * S / 1200000n, p = pow(S + r, Number(n));
    // 한도 = (연 여력/12) × (1 − (1+r)^−n) / r
    return annualCap * (p - S) / (12n * r * p / S);
  }
  function stressFor(period, loanType, region) {
    if (loanType === 'mortgage') return region === 'metro' ? period.metro_mortgage_bp : period.non_metro_mortgage_bp;
    return period.default_bp;
  }

  function calculate(input, rules) {
    var lim = rules.limits, i = input || {};
    var incS = String(i.incomeKrw === undefined || i.incomeKrw === null ? '' : i.incomeKrw).replace(/[,\s]/g, '');
    if (incS === '') return bad('income_required', 'income');
    if (!/^\d+$/.test(incS)) return bad('income_format', 'income');
    var inc = BigInt(incS);
    if (inc < BigInt(lim.income_min_krw) || inc > BigInt(lim.income_max_krw)) return bad('income_range', 'income');
    var type = i.loanType;
    if (type !== 'mortgage' && type !== 'credit') return bad('loan_type', 'loanType');
    var region = null;
    if (type === 'mortgage') { region = i.region; if (region !== 'metro' && region !== 'non_metro') return bad('region_required', 'region'); }
    var rep = i.repayment;
    if (rep !== 'annuity' && rep !== 'principal_equal') return bad('repayment_unsupported', 'repayment', STATUS.UNSUPPORTED);
    var r = rateToBps(i.ratePercent, lim.rate_decimals);
    if (r.empty) return bad('rate_required', 'rate');
    if (r.bad) return bad('rate_format', 'rate');
    if (r.bps < lim.rate_min_bps || r.bps > lim.rate_max_bps) return bad('rate_range', 'rate');
    var yS = String(i.years === undefined || i.years === null ? '' : i.years).trim();
    if (yS === '') return bad('years_required', 'years');
    if (!/^\d+$/.test(yS)) return bad('years_range', 'years');
    var years = Number(yS), ymax = type === 'mortgage' ? lim.years_max_mortgage : lim.years_max_credit;
    if (years < lim.years_min || years > ymax) return bad('years_range', 'years');
    var asOf = isoOk(i.asOf, lim);
    if (!asOf) return bad('date_invalid', 'asOf');
    var per = null;
    for (var k = 0; k < rules.stress_periods.length; k++) { var p = rules.stress_periods[k]; if (asOf >= p.from && asOf <= p.to) { per = p; break; } }
    if (!per) {
      var last = rules.stress_periods[rules.stress_periods.length - 1], first = rules.stress_periods[0];
      return bad(asOf > last.to ? 'rules_expired' : 'before_supported', 'asOf', STATUS.UNSUPPORTED);
    }
    var ratio = rules.stress_apply.floating_ratio_percent;
    var stressFull = stressFor(per, type, region);                       // 0.01% 단위(0.375% = 37.5)
    var stressBp = stressFull * ratio / 100;
    var stressMilli = Math.round(stressBp * 10);                          // 0.001% 단위 정수
    var annualCap = inc * BigInt(rules.dsr_limit.bank_percent) / 100n;   // 원 미만 절사
    var base = Number(r.bps);
    var capNo = limitKrw(base * 10, years, annualCap, rep);
    var capSt = limitKrw(base * 10 + stressMilli, years, annualCap, rep);
    var limit = capSt, applied = true, boundary = 'none';
    if (type === 'credit') {
      var th = BigInt(rules.stress_apply.credit_balance_threshold_krw);
      if (capNo <= th) { limit = capNo; applied = false; boundary = 'below_threshold'; }       // 신규 신용대출만으로 총잔액이 1억 이하 → 스트레스 미적용
      else if (capSt >= th) { limit = capSt; applied = true; }
      else { limit = th; applied = false; boundary = 'at_threshold'; }                         // 1억 이하는 가산이 없어 통과, 초과분은 적용 한도를 넘음
    }
    return {
      status: STATUS.SUCCESS,
      limit_krw: Number(limit), limit_no_stress_krw: Number(capNo), limit_with_stress_krw: Number(capSt),
      diff_krw: Number(capNo - limit),
      annual_capacity_krw: Number(annualCap),
      loan_rate_bps: base, stress_bp: applied ? stressBp : 0, stress_full_bp: stressBp, review_rate_bps: base + (applied ? stressBp : 0),
      stress_applied: applied, credit_boundary: boundary,
      repayment: rep, loan_type: type, region: region, years: years, income_krw: Number(inc),
      as_of: asOf, rule_version: rules.version, rule_period: { from: per.from, to: per.to, announced: per.announced }
    };
  }

  // 화면 표시용: 만원 미만 절사 후 "약 N억 N,NNN만 원" (올림하지 않는다). 엔진 결과를 대체하지 않는다.
  function approxLabel(krw) {
    var man = Math.floor(krw / 10000), eok = Math.floor(man / 10000), rest = man % 10000;
    if (eok > 0 && rest > 0) return '약 ' + eok + '억 ' + String(rest).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만 원';
    if (eok > 0) return '약 ' + eok + '억 원';
    return '약 ' + String(man).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '만 원';
  }
  return { calculate: calculate, approxLabel: approxLabel, STATUS: STATUS };
});
