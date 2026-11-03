/* GA4 안전 이벤트(환전수수료): 금액·우대율 등 입력값은 절대 전송하지 않음 (거래 방식·방향·통화만) */
(function (root) {
  'use strict';
  var ERR = ['required_missing', 'out_of_range', 'unsupported', 'data_unavailable', 'exception'];
  function send(name, params) {
    try {
      if (typeof root.gtag !== 'function') return;
      var p = { calculator_id: 'fx', category: 'fx' };
      for (var k in (params || {})) p[k] = params[k];
      root.gtag('event', name, p);
    } catch (e) {}
  }
  root.FxAnalytics = {
    track: send,
    error: function (type) { send('calc_error', { error_type: ERR.indexOf(type) >= 0 ? type : 'exception' }); }
  };
})(typeof self !== 'undefined' ? self : this);
