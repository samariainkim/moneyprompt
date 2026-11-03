/* 환전수수료 AI 프롬프트 생성기 — 문구는 prompt JSON, 숫자는 엔진 산출값만 사용 (AI 호출 없음)
   선택한 분석 메뉴만 요청문에 포함하며, 현찰/송금에 따라 용어·수수료 항목을 분기합니다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FxPrompt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var CIRCLED = ['①', '②', '③', '④', '⑤', '⑥'];
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function rate(n) { return Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 4 }); }
  function tpl(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k] === undefined ? '' : v[k]; }); }
  function moduleList(data, selected) {
    var sel = (selected && selected.length) ? selected : data.defaults;
    return data.order.filter(function (id) { return sel.indexOf(id) >= 0 && data.modules[id]; });
  }
  function dateKo(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[1] + '년 ' + (+m[2]) + '월 ' + (+m[3]) + '일' : '확인 필요'; }

  // res: FxEngine.calculate 성공 결과 / selected: 메뉴 id 배열 / data: prompt JSON / opts: { amountText }
  function build(res, selected, data, opts) {
    if (!res || res.status !== 'success' || !data) return '';
    opts = opts || {};
    var L = data.labels, key = res.mode + '.' + res.direction, cash = res.mode === 'cash';
    var ids = moduleList(data, selected), n = [];
    var unitLabel = res.unit > 1 ? res.unit + ' ' + res.currency : '1 ' + res.currency;
    var total = L.total[key], out = [];
    out.push('# ' + data.title); out.push('');
    data.role.forEach(function (x) { out.push(x); }); out.push('');

    out.push('## 1. 사용자 입력 (FACT)');
    out.push('- 거래 방식: ' + L.mode[res.mode]);
    out.push('- 거래 방향: ' + L.direction[res.mode][res.direction]);
    out.push('- 통화: ' + res.currency);
    out.push('- 외화 금액: ' + (opts.amountText || fmt(res.amount)) + ' ' + res.currency);
    out.push('- 환율 우대율: ' + (res.pref_bp / 100) + '%'); out.push('');

    out.push('## 2. 계산기 결과 (추정값)');
    out.push('- 환율 출처: ' + data.source[res.mode]);
    out.push('- 환율 기준일: ' + dateKo(res.base_date) + ' (' + data.date_note + ')');
    out.push('- 매매기준율: ' + unitLabel + ' = ' + rate(res.base_rate) + '원');
    if (cash) out.push(tpl(data.spread_line, { spread: res.spread_bp / 100 }));
    else out.push('- ' + L.pre_rate[key] + ': ' + unitLabel + ' = ' + rate(res.pre_rate) + '원');
    out.push('- 우대율 반영 추정 환율: ' + unitLabel + ' = ' + rate(res.applied_rate) + '원');
    out.push('- ' + total + ': ' + fmt(res.total_krw) + '원');
    out.push('- 기준환율 환산액: ' + fmt(res.base_total_krw) + '원');
    out.push('- 기준환율 대비 예상 차액: ' + fmt(res.diff_krw) + '원'); out.push('');
    out.push('계산 방식:');
    out.push('- ' + L.formula[key]);
    out.push('- ' + total + ' = 외화 금액 × 추정 환율, 원 미만 내림'); out.push('');
    out.push('주의:');
    data.caution.forEach(function (c) {
      out.push('- ' + tpl(c, { model: data.model_note[res.mode], total: fmt(res.total_krw), settle: L.settle[res.direction], pay: L.pay[res.direction] }));
    });
    out.push('');

    out.push('## 3. 아직 확인되지 않은 정보');
    data.missing_info[res.mode].forEach(function (x) { out.push('- ' + x); });
    out.push(''); out.push(data.missing_foot); out.push('');

    out.push('## 4. 요청 분석');
    ids.forEach(function (id, i) {
      var m = data.modules[id], tasks = m.tasks || (m.tasks_by_mode && m.tasks_by_mode[res.mode]) || [];
      out.push('### ' + CIRCLED[i] + ' ' + m.title);
      tasks.forEach(function (t) { out.push('- ' + t); });
      out.push('');
    });

    out.push('## 5. 분석 원칙');
    data.principles.forEach(function (p, i) { out.push((i + 1) + '. ' + p); });
    out.push('');
    out.push('## 6. 답변 형식');
    data.format.forEach(function (f, i) { out.push((i + 1) + '. ' + f); });
    out.push(''); out.push(data.format_foot);
    return out.join('\n');
  }
  return { build: build, moduleList: moduleList };
});
