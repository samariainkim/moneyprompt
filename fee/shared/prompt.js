/* AI 프롬프트 생성(복사용). AI 호출 없음. 입력된 숫자만 사용하도록 고정 문구 포함. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FeePrompt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var ITEMS = {
    verify: '중개보수 검증: 위 계산이 맞는지 구간·요율·한도 기준으로 점검',
    cost: '총거래비용 분석: 중개보수 외에 함께 고려할 비용 항목 정리',
    negotiate: '협의 시나리오: 협의 요율별 금액 차이와 협의 시 확인할 점',
    risk: '계약 위험 점검: 계약 전 확인해야 할 사항',
    checklist: '실행 체크리스트: 계약 전후 해야 할 일을 순서대로 정리'
  };
  var DEFAULTS = ['verify', 'negotiate', 'checklist'];
  var LABEL = { sale: '매매', jeonse: '전세', rent: '월세' };
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function build(r, selected) {
    if (!r || r.status !== 'success') return '';
    selected = (selected && selected.length) ? selected : DEFAULTS;
    var L = [];
    L.push('[역할] 부동산 중개보수를 점검해 주는 분석 도우미');
    L.push('[계산 결과]');
    L.push('- 기준 지역: ' + r.region_label + ' · 주택 ' + LABEL[r.transaction_type]);
    L.push('- 적용 거래금액: ' + fmt(r.transaction_amount_krw) + '원' + (r.converted_from_rent ? ' (월세 환산)' : ''));
    L.push('- 상한 요율: ' + (r.applied_max_rate_bps / 100).toFixed(2) + '%' + (r.cap_krw !== null ? ' · 한도액 ' + fmt(r.cap_krw) + '원' : ''));
    L.push('- 상한 중개보수: ' + fmt(r.max_fee_krw) + '원 (부가세 미포함)');
    if (r.negotiated_rate_bps !== null) {
      L.push('- 협의 요율: ' + (r.negotiated_rate_bps / 100).toFixed(2) + '% → ' + fmt(r.negotiated_fee_krw) + '원 (상한 대비 차이 ' + fmt(r.difference_krw) + '원)');
    }
    L.push('[요청 항목]');
    selected.forEach(function (k, i) { if (ITEMS[k]) L.push((i + 1) + '. ' + ITEMS[k]); });
    L.push('[지켜야 할 규칙]');
    L.push('- 위에 제공한 숫자만 사용하고 새로운 숫자를 만들지 마세요.');
    L.push('- 확실하지 않은 내용은 "추정"이라고 표시하세요.');
    L.push('- 답변을 "확인됨 / 가정 / 추가 확인 필요"로 구분해 주세요.');
    L.push('- 개인정보는 포함하지 않았습니다. 요청하지 마세요.');
    return L.join('\n');
  }
  return { ITEMS: ITEMS, DEFAULTS: DEFAULTS, build: build };
});
