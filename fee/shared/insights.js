/* 돈버프 인사이트: 조건(JSON)·문구(JSON) 분리, 문구에 사용자의 실제 계산값을 채움. 허용 연산 eq,neq,gt,gte,lt,lte,between,in */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./format.js'));
  else root.FeeInsights = factory(root.FeeFormat);
})(typeof self !== 'undefined' ? self : this, function (F) {
  'use strict';
  function test(c, ctx) {
    var v = ctx[c.field], x = c.value;
    switch (c.op) {
      case 'eq': return v === x;
      case 'neq': return v !== x;
      case 'gt': return v !== null && v !== undefined && v > x;
      case 'gte': return v !== null && v !== undefined && v >= x;
      case 'lt': return v !== null && v !== undefined && v < x;
      case 'lte': return v !== null && v !== undefined && v <= x;
      case 'between': return v >= x[0] && v <= x[1];
      case 'in': return Array.isArray(x) && x.indexOf(v) >= 0;
      default: return false;
    }
  }
  function context(r) {
    var assumed = (r.scenarios || []).filter(function (s) { return s.kind === 'assumed'; });
    var ctx = {}; for (var k in r) ctx[k] = r[k];
    ctx.assumed_count = assumed.length;
    ctx.rules_verified = r.rules_status === 'verified';
    var amt = F.man(r.transaction_amount_krw);
    var vars = {
      max_fee: F.man(r.max_fee_krw),
      cap_label: ctx.rules_verified ? '법정 상한액' : '계산기 적용 상한액',
      user_rate: r.negotiated_rate_bps === null ? '' : F.pct(r.negotiated_rate_bps),
      user_diff: r.difference_krw === null ? '' : F.man(r.difference_krw),
      step_pct: assumed.length ? (assumed[0].delta_bps / 100).toFixed(2) : '',
      step_diff: assumed.length ? F.man(assumed[0].diff_krw) : '',
      basis: r.transaction_type === 'sale' ? amt + ' 거래' : (r.transaction_type === 'jeonse' ? '전세 보증금 ' + amt : '월세 환산 거래금액 ' + amt)
    };
    return { ctx: ctx, vars: vars };
  }
  function fill(t, vars) { return t.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; }); }
  function evaluate(result, insights, copy) {
    if (!result || result.status !== 'success') return [];
    var c = context(result);
    var list = insights.rules.slice().sort(function (a, b) { return a.priority - b.priority; });
    var out = [];
    for (var i = 0; i < list.length && out.length < insights.max_items; i++) {
      var rule = list[i];
      if (!rule.when.every(function (w) { return test(w, c.ctx); })) continue;
      var t = copy.insights[rule.copy_id];
      if (!t) continue;
      out.push({ id: rule.id, title: fill(t.title, c.vars), desc: fill(t.desc, c.vars) });
    }
    return out;
  }
  return { evaluate: evaluate };
});
