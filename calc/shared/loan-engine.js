/* 대출 중도상환수수료 간편 추정 엔진 (순수 함수, UI 비의존)
   산식: floor(상환금액 × 요율 × 잔여일수 ÷ 전체일수) — BigInt 정수 연산, 요율은 bps(0.01%) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LoanEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var STATUS = { SUCCESS: 'success', INVALID: 'invalid_input', UNSUPPORTED: 'unsupported' };

  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function parseDate(s, lim) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s.trim() : '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (lim && (y < lim.date_year_min || y > lim.date_year_max)) return null;
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return { y: y, m: mo, d: d, day: Date.UTC(y, mo - 1, d) / 864e5 };
  }
  // 달력 가산: 같은 일자가 없으면 해당 월 말일 (1/31+1개월=2월 말일, 2/29+12개월=다음해 2/28)
  function addMonths(o, n) {
    var t = o.y * 12 + (o.m - 1) + n, ny = Math.floor(t / 12), nm = t % 12 + 1;
    var nd = Math.min(o.d, daysInMonth(ny, nm));
    return { y: ny, m: nm, d: nd, day: Date.UTC(ny, nm - 1, nd) / 864e5 };
  }
  function iso(day) { return new Date(day * 864e5).toISOString().slice(0, 10); }
  function rateToBps(str, decimals) {
    var s = String(str === undefined || str === null ? '' : str).replace(/[\s%]/g, '').replace(',', '.');
    if (s === '') return { empty: true };
    var re = new RegExp('^(\\d{1,3})(?:\\.(\\d{1,' + decimals + '}))?$'), m = re.exec(s);
    if (!m) return { bad: true };
    var frac = ((m[2] || '') + '00000').slice(0, decimals);
    return { bps: Number(BigInt(m[1]) * 100n + BigInt(frac.slice(0, 2).padEnd(2, '0'))) };
  }
  function feeKrw(P, bps, rem, tot) {
    if (rem <= 0) return 0;
    return Number((BigInt(P) * BigInt(bps) * BigInt(rem)) / (10000n * BigInt(tot)));
  }
  function bad(code, field, status) { return { status: status || STATUS.INVALID, error: { code: code, field: field } }; }

  function calculate(input, rules) {
    var lim = rules.limits, i = input || {};
    var amtS = String(i.amountKrw === undefined || i.amountKrw === null ? '' : i.amountKrw).replace(/[,\s]/g, '');
    if (amtS === '') return bad('amount_required', 'amount');
    if (!/^\d+$/.test(amtS)) return bad('amount_format', 'amount');
    var P = BigInt(amtS);
    if (P <= 0n) return bad('amount_required', 'amount');
    if (P > BigInt(lim.amount_max_krw)) return bad('amount_range', 'amount');
    var ex = parseDate(i.executionDate, lim), rp = parseDate(i.repaymentDate, lim);
    if (!ex) return bad('date_invalid', 'executionDate');
    if (!rp) return bad('date_invalid', 'repaymentDate');
    if (rp.day < ex.day) return bad('date_order', 'repaymentDate');
    var mo = i.periodMonths;
    if (mo === undefined || mo === null || mo === '') return bad('period_required', 'period');
    if (!/^\d+$/.test(String(mo))) return bad('period_range', 'period');
    mo = Number(mo);
    if (mo < lim.period_months_min) return bad('period_range', 'period');
    if (mo > lim.period_months_max) return bad('period_too_long', 'period', STATUS.UNSUPPORTED);
    var r = rateToBps(i.ratePercent, lim.rate_decimals);
    if (r.empty) return bad('rate_required', 'rate');
    if (r.bad) return bad('rate_format', 'rate');
    if (r.bps > lim.rate_max_bps) return bad('rate_too_high', 'rate');

    var end = addMonths(ex, mo), total = end.day - ex.day;
    var ended = rp.day >= end.day, rem = ended ? 0 : end.day - rp.day;
    var amount = Number(P);
    return {
      status: STATUS.SUCCESS,
      rules_version: rules.version,
      amount_krw: amount,
      execution_date: iso(ex.day), repayment_date: iso(rp.day), end_date: iso(end.day),
      period_months: mo, rate_bps: r.bps,
      total_days: total, remaining_days: rem, period_ended: ended,
      fee_krw: feeKrw(P, r.bps, rem, total),
      assumptions: rules.assumptions.map(function (a) { return a.id; })
    };
  }

  // 상환 시점 비교(수수료만, 대출이자 미포함). 부과기간이 끝난 상환일이면 빈 배열
  function compare(res, rules) {
    if (!res || res.status !== STATUS.SUCCESS || res.period_ended) return [];
    var endDay = parseDate(res.end_date).day, repay = parseDate(res.repayment_date).day;
    var P = BigInt(res.amount_krw), rows = [];
    function row(kind, off, day, rem) {
      var f = feeKrw(P, res.rate_bps, rem, res.total_days);
      rows.push({ kind: kind, offset_days: off, date: iso(day), remaining_days: rem, fee_krw: f, diff_krw: res.fee_krw - f });
    }
    row('base', 0, repay, res.remaining_days);
    rules.compare.offsets_days.forEach(function (n) { if (repay + n < endDay) row('offset', n, repay + n, endDay - repay - n); });
    row('end', null, endDay, 0);
    return rows;
  }
  return { calculate: calculate, compare: compare, parseDate: parseDate, addMonths: addMonths, rateToBps: rateToBps, STATUS: STATUS };
});
