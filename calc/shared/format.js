/* 표시용 금액 포맷: 만 원 단위로 떨어지면 "200만 원", 아니면 "155,000원" */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FeeFormat = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function man(n) {
    n = Number(n);
    if (n >= 10000 && n % 10000 === 0) {
      var m = n / 10000, eok = Math.floor(m / 10000), rest = m % 10000, s = '';
      if (eok) s += eok + '억';
      if (rest) s += (eok ? ' ' : '') + comma(rest) + '만';
      return s + ' 원';
    }
    return comma(n) + '원';
  }
  function pct(bps) { return (bps / 100).toFixed(2) + '%'; }
  return { comma: comma, man: man, pct: pct };
});
