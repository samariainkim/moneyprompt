/* FEE BUFF 공통 설정 — 호스팅 확인 후 확정 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FeeConfig = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var PROD_HOSTS = ['donbuff.com', 'www.donbuff.com'];
  // 오픈 전 실서버 테스트용 스위치. 정식 오픈 시 false 로 바꾸면 미검증 규칙은 다시 차단됩니다.
  var PREVIEW_UNVERIFIED = true;
  function env(hostname) {
    if (PROD_HOSTS.indexOf(hostname) >= 0) return PREVIEW_UNVERIFIED ? 'preview' : 'production';
    return 'development';
  }
  return {
    PROD_HOSTS: PROD_HOSTS,
    PREVIEW_UNVERIFIED: PREVIEW_UNVERIFIED,
    env: env,
    RULES_FILE: '/fee/data/brokerage-fee.rules.v1.0.0.json',
    INSIGHTS_FILE: '/fee/data/brokerage-fee.insights.json',
    COPY_FILE: '/fee/data/brokerage-fee.copy.json',
    CALCULATOR_ID: 'brokerage-fee',
    CATEGORY: 'real_estate',
    ERROR_REPORT_URL: null // TODO(O-gate): 실제 환경 확인 후 확정
  };
});
