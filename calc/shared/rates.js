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
      table(g.sale.bands, '주택 매매') + table(g.lease.bands, '주택 임대차(전세·월세)') + flatTables(rules);
  }
  // 오피스텔·주택 외: 구간 없이 요율만 있는 유형 (규칙 JSON 에 있을 때만 표시)
  function pctOf(t, kind) { var b = t && t[kind] && t[kind].bands && t[kind].bands[0]; return b ? (b.max_rate_bps / 100).toFixed(2) + '%' : '-'; }
  function flatTables(rules) {
    var p = rules.property_types, q = p.officetel_qualified, u = p.officetel_unqualified, o = p.other;
    if (!q || !u || !o || !q.sale || !u.sale || !o.sale) return '';
    var h = '<table class="rt"><caption>오피스텔 · 주택 외(상가, 토지 등)</caption><thead><tr><th scope="col">구분</th><th scope="col">매매·교환</th><th scope="col">임대차 등</th><th scope="col">한도액</th></tr></thead><tbody>';
    h += '<tr><td>오피스텔 (전용 85㎡ 이하, 전용 입식 부엌·수세식 화장실·목욕시설 갖춤)</td><td>' + pctOf(q, 'sale') + '</td><td>' + pctOf(q, 'lease') + '</td><td>없음</td></tr>';
    h += '<tr><td>오피스텔 (위 요건 미충족)</td><td>' + pctOf(u, 'sale') + ' 이내 협의</td><td>' + pctOf(u, 'lease') + ' 이내 협의</td><td>없음</td></tr>';
    h += '<tr><td>주택 외 (상가, 토지 등)</td><td>' + pctOf(o, 'sale') + ' 이내 협의</td><td>' + pctOf(o, 'lease') + ' 이내 협의</td><td>없음</td></tr>';
    return h + '</tbody></table><p class="hint">오피스텔·주택 외 요율은 공인중개사법 시행규칙 기준이며, 월세는 주택과 같은 방식으로 환산합니다(오피스텔 환산 방식은 원문 확인 필요).</p>';
  }
  root.FeeRates = { render: render };
})(typeof self !== 'undefined' ? self : this);
