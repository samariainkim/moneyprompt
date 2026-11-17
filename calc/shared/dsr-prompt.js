/* DSR 한도 AI 프롬프트 생성기 — 문구는 prompt JSON, 숫자는 엔진 산출값만 사용 (AI 호출 없음) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DsrPrompt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LETTERS = 'ABCDEFGH';
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function pct(bps) { return (Math.round(bps) / 100).toFixed(2) + '%'; }
  function pp(bps) { return (Math.round(bps * 10) / 1000).toFixed(bps % 10 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '.0') + '%p'; }
  var TYPE = { mortgage: '주택담보대출', credit: '신용대출(분할상환 가정)' };
  var REGION = { metro: '수도권·규제지역', non_metro: '그 외 지역(지방)' };
  var REP = { annuity: '원리금균등', principal_equal: '원금균등(첫해 12개월 상환액 기준)' };
  function moduleList(data, selected) {
    var sel = (selected && selected.length) ? selected : data.defaults;
    return data.order.filter(function (id) { return sel.indexOf(id) >= 0 && data.modules[id]; });
  }

  // opts: { label: (krw)=>"약 N억 N,NNN만 원", scenarios: [{label, limit_krw}] }
  function build(res, selected, data, opts) {
    if (!res || res.status !== 'success' || !data) return '';
    opts = opts || {};
    var ids = moduleList(data, selected), L = [], n = 1;
    var lab = opts.label || function (v) { return fmt(v) + '원'; };

    L.push('# 역할'); data.role.forEach(function (x) { L.push(x); }); L.push('');
    L.push('# ' + (n++) + '. FACT — 입력값과 계산기 산출값');
    L.push('[사용자 입력]');
    L.push('- 연 소득(세전): ' + fmt(res.income_krw) + '원');
    L.push('- 대출 종류: ' + TYPE[res.loan_type]);
    if (res.region) L.push('- 주택 소재지: ' + REGION[res.region]);
    L.push('- 상환 방식: ' + REP[res.repayment]);
    L.push('- 대출 금리(약정금리, 사용자 입력): ' + pct(res.loan_rate_bps));
    L.push('- 대출 기간: ' + res.years + '년');
    L.push('[계산기 산출 — 간편 추정]');
    L.push('- 연간 갚을 수 있는 원리금(연소득의 40%): ' + fmt(res.annual_capacity_krw) + '원');
    L.push('- 스트레스 가산금리(규정 기준 가정, 한도 심사용 — 실제로 부담하는 금리가 아님): ' + (res.stress_applied ? pp(res.stress_bp) : '적용 안 함'));
    L.push('- DSR 심사용 금리(약정금리 + 가산금리): ' + pct(res.review_rate_bps));
    L.push('- DSR 기준 추정 대출 한도: ' + fmt(res.limit_krw) + '원 (' + lab(res.limit_krw) + ')');
    L.push('- 스트레스 금리 미적용 가정 시 한도(비교용): ' + fmt(res.limit_no_stress_krw) + '원 (' + lab(res.limit_no_stress_krw) + ')');
    if (res.credit_boundary === 'at_threshold') L.push('- 신용대출 1억 원 경계: 1억 원 이하는 스트레스 금리가 적용되지 않고, 초과분은 적용 한도를 넘어 한도가 1억 원으로 계산됨');
    L.push('- 계산 가정: 기존 대출 미입력(없다고 가정해 계산, 실제로 없다는 확인이 아님), 변동금리, 은행권 DSR 40%, 규칙 기준일 ' + res.as_of + ' (스트레스 금리 적용기간 ' + res.rule_period.from + '~' + res.rule_period.to + ', 공시 ' + res.rule_period.announced + ')');
    L.push('- 계산 방식: 원금균등은 상환액이 가장 큰 첫해 12개월 상환액 기준 추정이며 공식 계산 사례로 대조되지 않음. 한도는 원 단위 절사 값이며 화면 표기는 만원 미만 절사 근사치');
    L.push('[미확인 정보 — 입력되지 않았거나 확인되지 않음]');
    data.missing_info.forEach(function (x) { L.push('- ' + x); });
    L.push('');

    L.push('# ' + (n++) + '. VERIFY — 검증 기준');
    data.verify_rules.forEach(function (x) { L.push('- ' + x); }); L.push('');

    if (ids.indexOf('compare') >= 0 && opts.scenarios && opts.scenarios.length) {
      L.push('# ' + (n++) + '. SIMULATE — 조건별 한도 (계산기 산출값, 같은 규칙·가정, 이자 부담 미포함)');
      L.push('| 조건 | DSR 기준 추정 한도 | 현재 대비 |'); L.push('| --- | --- | --- |');
      opts.scenarios.forEach(function (s) {
        var d = s.limit_krw - res.limit_krw;
        L.push('| ' + s.label + ' | ' + lab(s.limit_krw) + ' | ' + (s.base ? '기준' : (d >= 0 ? '+' : '−') + lab(Math.abs(d)).replace('약 ', '약 ')) + ' |');
      });
      L.push('한도가 커지는 조건은 총이자 부담이 늘 수 있으며, 위 표는 이자 부담을 계산하지 않았습니다.'); L.push('');
    }

    L.push('# ' + (n++) + '. 요청 분석'); L.push('');
    ids.forEach(function (id, i) {
      var m = data.modules[id];
      L.push('## ' + LETTERS[i] + '. ' + m.title + ' [' + m.phase + ']');
      if (m.needs && m.needs.length) L.push('필요한 정보(없으면 먼저 질문): ' + m.needs.join(' / '));
      m.tasks.forEach(function (t, k) { L.push((k + 1) + '. ' + t); });
      L.push('→ 산출물: ' + m.output); L.push('');
    });

    L.push('# 공통 규칙'); data.common_rules.forEach(function (x) { L.push('- ' + x); }); L.push('');
    var f = data.format;
    L.push('# 답변 형식');
    L.push('1. ' + f.summary_title + ' (' + f.summary_max_lines + '줄 이내)');
    L.push('2. 선택한 분석 항목별 결과');
    L.push('3. ' + f.question_title + ' (최대 ' + f.question_max + '개)');
    L.push('4. ' + f.action_title);
    return L.join('\n');
  }
  return { build: build };
});
