/* 대출 중도상환 AI 프롬프트 생성기 — 문구는 prompt JSON, 숫자는 엔진 산출값만 사용 (AI 호출 없음) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LoanPrompt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LETTERS = 'ABCDEFGH';
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function pct(bps) { return (bps / 100).toFixed(2) + '%'; }
  function period(m) { return m % 12 === 0 ? (m / 12) + '년(' + m + '개월)' : m + '개월'; }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function moduleList(data, selected) {
    var sel = (selected && selected.length) ? selected : data.defaults;
    return data.order.filter(function (id) { return sel.indexOf(id) >= 0 && data.modules[id]; });
  }
  var KIND = { base: '현재 상환 예정일', offset: ' 뒤 상환', end: '부과기간 종료일 상환' };
  function rowLabel(r) { return r.kind === 'offset' ? r.offset_days + '일' + KIND.offset : KIND[r.kind]; }

  // opts: { rows: LoanEngine.compare 결과, today: 'YYYY-MM-DD' }
  function build(res, selected, data, opts) {
    if (!res || res.status !== 'success' || !data) return '';
    opts = opts || {};
    var ids = moduleList(data, selected), L = [], n = 1, past = res.repayment_date < (opts.today || todayIso());
    var rows = opts.rows || [];

    L.push('# 역할'); data.role.forEach(function (x) { L.push(x); }); L.push('');
    L.push('# ' + (n++) + '. FACT — 입력값과 계산기 산출값');
    L.push('[사용자 입력]');
    L.push('- 중도상환 예정금액: ' + fmt(res.amount_krw) + '원');
    L.push('- 대출 실행일: ' + res.execution_date);
    L.push('- 상환 예정일: ' + res.repayment_date + (past ? ' (오늘 이전 날짜)' : ''));
    L.push('- 수수료 부과기간(사용자 선택): ' + period(res.period_months));
    L.push('- 약정 수수료율(사용자 입력): ' + pct(res.rate_bps));
    L.push('[계산기 산출 — 간편 비례식]');
    L.push('- 부과 종료 기준일: ' + res.end_date + ' (실행일 + ' + res.period_months + '개월, 달력 기준, 월말은 해당 월 말일)');
    L.push('- 전체 일수: ' + fmt(res.total_days) + '일 / 잔여 일수: ' + fmt(res.remaining_days) + '일');
    L.push('- 산식: 상환금액 × 수수료율 × 잔여 일수 ÷ 전체 일수, 원 미만 버림');
    L.push('- 예상 중도상환수수료: ' + fmt(res.fee_krw) + '원' + (res.period_ended ? ' (부과기간이 끝난 시점이라 0원으로 처리)' : ''));
    L.push('- 계산 가정: 단순 비례식, 부과 종료일 당일 이후 0원, 달력 기준 실제 일수, 면제·감면·연간 일부상환 한도 미반영');
    L.push('[미확인 정보 — 입력되지 않았거나 약정서로 확인되지 않음]');
    data.missing_info.forEach(function (x) { L.push('- ' + x); });
    L.push('');

    L.push('# ' + (n++) + '. VERIFY — 검증 기준');
    data.verify_rules.forEach(function (x) { L.push('- ' + x); }); L.push('');

    if (ids.indexOf('compare') >= 0 && rows.length) {
      L.push('# ' + (n++) + '. SIMULATE — 상환 시점별 수수료 (계산기 산출값, 수수료만 비교 · 대출이자 미포함)');
      L.push('| 구분 | 상환일 | 잔여 일수 | 예상 수수료 | 현재 대비 차이 |'); L.push('| --- | --- | --- | --- | --- |');
      rows.forEach(function (r) { L.push('| ' + rowLabel(r) + ' | ' + r.date + ' | ' + fmt(r.remaining_days) + '일 | ' + fmt(r.fee_krw) + '원 | ' + (r.kind === 'base' ? '기준' : fmt(r.diff_krw) + '원 감소') + ' |'); });
      L.push('동일한 상환금액·수수료율을 가정한 비교이며, 상환을 미루는 동안의 이자는 포함되지 않았습니다.'); L.push('');
    }

    L.push('# ' + (n++) + '. 요청 분석'); L.push('');
    ids.forEach(function (id, i) {
      var m = data.modules[id];
      L.push('## ' + LETTERS[i] + '. ' + m.title + ' [' + m.phase + ']');
      m.tasks.forEach(function (t, k) { L.push((k + 1) + '. ' + t); });
      L.push('→ 산출물: ' + m.output); L.push('');
    });

    L.push('# 분석 규칙');
    data.common_rules.concat(past ? data.past_date_rules : []).forEach(function (x, i) { L.push((i + 1) + '. ' + x); });
    L.push('');
    var f = data.format, k = 1;
    L.push('# 답변 형식'); L.push('다음 순서로 작성하세요.');
    L.push((k++) + '. **' + f.summary_title + '** — ' + f.summary_max_lines + '줄 이내로, 확인된 내용과 중요한 주의사항');
    L.push((k++) + '. **선택한 분석 결과** — ' + ids.map(function (id) { return data.modules[id].title; }).join(' / ') + ' 순서로');
    L.push((k++) + '. **' + f.question_title + '** — 반드시 필요한 질문만 최대 ' + f.question_max + '개');
    L.push((k++) + '. **' + f.action_title + '** — 금융회사에 확인할 일과 판단 순서');
    return L.join('\n');
  }
  return { build: build, moduleList: moduleList };
});
