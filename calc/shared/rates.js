/* 요율 기준표 렌더러: 계산과 같은 rules JSON을 그대로 사용 */
(function (root) {
  'use strict';
  function won(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'; }
  function range(b) {
    return won(b.min_krw) + ' 이상 ~ ' + (b.max_exclusive_krw === null ? '' : won(b.max_exclusive_krw) + ' 미만');
  }
  function table(bands, caption) {
    var h = '<table class="rt"><caption>' + caption + '</caption><thead><tr><th scope="col">거래금액</th><th scope="col">상한 요율</th><th scope="col">한도액</th></tr></thead><tbody>';
    bands.forEach(function (b) {
      h += '<tr><td>' + range(b) + '</td><td>' + (b.max_rate_bps / 100).toFixed(2) + '%</td><td>' + (b.cap_krw === null ? '없음' : won(b.cap_krw)) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }
  function render(rules) {
    var g = rules.property_types.housing;
    var verified = rules.verified_at ? '최종 검증: ' + rules.verified_at : '검증 진행 중';
    return '<p class="rt-meta">요율 기준: ' + rules.region_label + ' · ' + verified + '</p>' +
      table(g.sale.bands, '주택 매매') + table(g.lease.bands, '주택 임대차(전세·월세)');
  }
  root.FeeRates = { render: render };
})(typeof self !== 'undefined' ? self : this);
