/* GA4 안전 이벤트(대출 중도상환): 금액·날짜·요율 등 입력값은 절대 전송하지 않음 */
(function (root) {
  'use strict';
  var ERR = ['required_missing', 'out_of_range', 'unsupported', 'exception'];
  function send(name, params) {
    try {
      if (typeof root.gtag !== 'function') return;
      var p = { calculator_id: 'loan-prepay', category: 'loan' };
      for (var k in (params || {})) p[k] = params[k];
      root.gtag('event', name, p);
    } catch (e) {}
  }
  root.LoanAnalytics = {
    track: send,
    error: function (type) { send('calc_error', { error_type: ERR.indexOf(type) >= 0 ? type : 'exception' }); }
  };
})(typeof self !== 'undefined' ? self : this);
