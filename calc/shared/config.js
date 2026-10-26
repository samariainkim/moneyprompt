/* CALC BUFF(돈버프 금융계산기) 공통 설정 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FeeConfig = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var PROD_HOSTS = ['donbuff.com', 'www.donbuff.com'];
  // 공개 여부는 운영자가 판단합니다. 기본값은 "검증 전 규칙도 계산 허용"이며(결과에는 계산기 적용 상한·참고용 안내가 표시됨),
  // 미검증 규칙을 다시 막고 싶을 때만 true 로 바꾸세요.
  var BLOCK_UNVERIFIED = false;
  function env(hostname) {
    if (PROD_HOSTS.indexOf(hostname) >= 0) return BLOCK_UNVERIFIED ? 'production' : 'preview';
    return 'development';
  }
  return {
    PROD_HOSTS: PROD_HOSTS,
    BLOCK_UNVERIFIED: BLOCK_UNVERIFIED,
    env: env,
    RULES_FILE: '/calc/data/brokerage.rules.v1.0.0.json?v=1.2',
    INSIGHTS_FILE: '/calc/data/brokerage.insights.json?v=1.2',
    PROMPT_FILE: '/calc/data/brokerage.prompt.v2.1.0.json?v=1.2',
    COPY_FILE: '/calc/data/brokerage.copy.json?v=1.2',
    REGISTRY_FILE: '/calc/data/calculators.json?v=1.2',
    CALCULATOR_ID: 'brokerage',
    CATEGORY: 'real_estate',
    ERROR_REPORT_URL: null // TODO(O-gate): 실제 환경 확인 후 확정
  };
});
