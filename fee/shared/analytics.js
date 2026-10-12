/* GA4 안전 이벤트: 금액·입력값은 절대 전송하지 않음 */
(function (root) {
  'use strict';
  var ERR = ['required_missing', 'out_of_range', 'exception'];
  function send(name, params) {
    try {
      if (typeof root.gtag !== 'function') return;
      var p = { calculator_id: 'brokerage-fee', category: 'real_estate' };
      for (var k in (params || {})) p[k] = params[k];
      root.gtag('event', name, p);
    } catch (e) {}
  }
  root.FeeAnalytics = {
    track: send,
    error: function (type) { send('calc_error', { error_type: ERR.indexOf(type) >= 0 ? type : 'exception' }); }
  };
})(typeof self !== 'undefined' ? self : this);
