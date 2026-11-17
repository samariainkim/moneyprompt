/* GA4 안전 이벤트(DSR 한도): 소득·금리·기간·한도 등 입력·결과 값은 절대 전송하지 않음 */
(function (root) {
  'use strict';
  var ERR = ['required_missing', 'out_of_range', 'unsupported', 'exception'];
  function send(name, params) {
    try {
      if (typeof root.gtag !== 'function') return;
      var p = { calculator_id: 'dsr', category: 'loan' };
      for (var k in (params || {})) p[k] = params[k];
      root.gtag('event', name, p);
    } catch (e) {}
  }
  root.DsrAnalytics = {
    track: send,
    error: function (type) { send('calc_error', { error_type: ERR.indexOf(type) >= 0 ? type : 'exception' }); }
  };
})(typeof self !== 'undefined' ? self : this);
