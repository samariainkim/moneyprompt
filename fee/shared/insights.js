/* 규칙 기반 인사이트: 조건(JSON)과 문구(JSON) 분리. 허용 연산 eq,neq,gt,gte,lt,lte,between,in */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FeeInsights = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function test(c, r) {
    var v = r[c.field], x = c.value;
    switch (c.op) {
      case 'eq': return v === x;
      case 'neq': return v !== x;
      case 'gt': return v !== null && v > x;
      case 'gte': return v !== null && v >= x;
      case 'lt': return v !== null && v < x;
      case 'lte': return v !== null && v <= x;
      case 'between': return v >= x[0] && v <= x[1];
      case 'in': return Array.isArray(x) && x.indexOf(v) >= 0;
      default: return false;
    }
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function evaluate(result, insights, copy) {
    if (!result || result.status !== 'success') return [];
    var list = insights.rules.slice().sort(function (a, b) { return a.priority - b.priority; });
    var out = [];
    for (var i = 0; i < list.length && out.length < insights.max_items; i++) {
      var rule = list[i];
      if (!rule.when.every(function (c) { return test(c, result); })) continue;
      var t = copy.insights[rule.copy_id];
      if (!t) continue;
      out.push({ id: rule.id, text: t.replace('{diff}', result.difference_krw === null ? '' : fmt(result.difference_krw)) });
    }
    return out;
  }
  return { evaluate: evaluate };
});
