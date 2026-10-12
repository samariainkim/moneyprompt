/* AI 프롬프트 생성기 v2.0 — 문구는 prompt JSON, 금액은 엔진 산출값만 사용. AI 호출 없음. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FeePrompt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TX = { sale: '매매', jeonse: '전세', rent: '월세' };
  var LETTERS = 'ABCDEFGH';
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function pct(bps) { return (bps / 100).toFixed(2) + '%'; }
  function groupOf(r) { return r.transaction_type === 'sale' ? 'sale' : 'lease'; }

  function moduleList(data, selected) {
    var sel = (selected && selected.length) ? selected : data.defaults;
    return data.order.filter(function (id) { return sel.indexOf(id) >= 0 && data.modules[id]; });
  }
  function descFor(data, id, group) {
    var m = data.modules[id];
    return m.desc_by_group ? m.desc_by_group[group] : m.desc;
  }
  function scenarioLabel(sc) {
    if (sc.kind === 'legal_max') return '법정 상한';
    if (sc.kind === 'user_input') return '입력 협의 요율';
    return '상한 −' + (sc.delta_bps / 100).toFixed(2) + '%p';
  }
  function scenarioFlag(sc) {
    return sc.kind === 'assumed' ? '가정' : (sc.kind === 'user_input' ? '사용자 입력' : '법정 상한');
  }

  function factSection(r, rules) {
    var L = [];
    var tx = TX[r.transaction_type];
    L.push('- 적용 기준 지역: ' + r.region_label);
    L.push('- 부동산 유형: 주택');
    L.push('- 거래 유형: ' + tx);
    if (r.converted_from_rent) {
      var mr = rules && rules.monthly_rent;
      L.push('- 보증금: ' + fmt(r.rent_deposit_krw) + '원');
      L.push('- 월세: ' + fmt(r.rent_monthly_krw) + '원');
      var rule = mr ? '보증금 + 월세 × ' + mr.primary_multiplier + ' (그 값이 ' + fmt(mr.fallback_threshold_krw) + '원 미만이면 보증금 + 월세 × ' + mr.fallback_multiplier + ')' : '보증금 + 월세 × 환산배수';
      L.push('- 월세 환산 산식: ' + rule);
      L.push('- 이번 계산에 적용된 배수: ' + r.rent_multiplier + '배 → ' + fmt(r.rent_deposit_krw) + ' + ' + fmt(r.rent_monthly_krw) + ' × ' + r.rent_multiplier + ' = ' + fmt(r.transaction_amount_krw) + '원');
      L.push('- 환산 거래금액: ' + fmt(r.transaction_amount_krw) + '원');
    } else {
      L.push('- 거래금액: ' + fmt(r.transaction_amount_krw) + '원');
    }
    L.push('- 계산기 적용 상한요율: ' + pct(r.applied_max_rate_bps));
    L.push('- 한도액: ' + (r.cap_krw === null ? '없음' : fmt(r.cap_krw) + '원' + (r.cap_applied ? ' (이번 계산에 적용됨)' : ' (이번 계산에는 미적용)')));
    L.push('- 계산기 산출 상한 중개보수: ' + fmt(r.max_fee_krw) + '원');
    L.push('- 부가가치세: 미계산');
    L.push('- 사용자 입력 협의 요율: ' + (r.negotiated_rate_bps === null ? '없음' : pct(r.negotiated_rate_bps)));
    if (r.rules_status === 'verified') {
      L.push('- 규정 검증 상태: 검증 완료');
      if (r.effective_from) L.push('- 적용 규정 시행일: ' + r.effective_from);
      if (r.verified_at) L.push('- 최종 요율 검증일: ' + r.verified_at);
      var src = rules && rules.sources && rules.sources.filter(function (x) { return r.source_ids.indexOf(x.id) >= 0; });
      if (src && src.length) src.forEach(function (x) { L.push('- 근거: ' + x.name + (x.url ? ' (' + x.url + ')' : '')); });
    } else {
      L.push('- 규정 검증 상태: 미검증 (추가 확인 필요)');
    }
    L.push('');
    L.push('위 값은 계산기가 전달한 데이터이며, AI가 법령 적합성을 독립적으로 검증한 결과가 아닙니다.');
    return L;
  }

  function build(r, selected, data, rules) {
    if (!r || r.status !== 'success' || !data) return '';
    var g = groupOf(r), ids = moduleList(data, selected), L = [];
    var hasNeg = ids.indexOf('negotiate') >= 0, n = 1;

    L.push('# 역할'); data.role.forEach(function (x) { L.push(x); }); L.push('');
    L.push('# ' + (n++) + '. FACT — 거래 조건과 계산기 산출값'); factSection(r, rules).forEach(function (x) { L.push(x); }); L.push('');

    L.push('# ' + (n++) + '. VERIFY — 검증 기준');
    data.verify_rules.forEach(function (x) { L.push('- ' + x); });
    if (r.rules_status !== 'verified') L.push(data.unverified_notice);
    L.push('');

    if (hasNeg && r.scenarios && r.scenarios.length) {
      L.push('# ' + (n++) + '. SIMULATE — 협의 시나리오 (계산기 산출값)');
      L.push('| 구분 | 요율 | 중개보수 | 상한 대비 차액 | 성격 |'); L.push('| --- | --- | --- | --- | --- |');
      r.scenarios.forEach(function (sc) {
        L.push('| ' + scenarioLabel(sc) + ' | ' + pct(sc.rate_bps) + ' | ' + fmt(sc.fee_krw) + '원' + (sc.cap_applied ? ' (한도액 적용)' : '') + ' | ' + fmt(sc.diff_krw) + '원 | ' + scenarioFlag(sc) + ' |');
      });
      L.push(r.negotiated_rate_bps === null
        ? '사용자가 협의 요율을 입력하지 않아, 상한요율과 상한 대비 −0.10%p, −0.20%p를 가정해 계산했습니다(한도액 적용 후 금액이 같은 시나리오는 제외). 가정 요율은 실제 합의된 요율이 아닙니다.'
        : '사용자가 입력한 협의 요율과 법정 상한을 비교한 값입니다. 입력 요율이 실제 계약 조건인지는 확인되지 않았습니다.');
      L.push('');
    }

    L.push('# ' + (n++) + '. 요청 분석'); L.push('');
    ids.forEach(function (id, i) {
      var m = data.modules[id], spec = m.by_group[g], tasks = spec.tasks.slice();
      if (spec.rent_extra_tasks && r.converted_from_rent) tasks = tasks.concat(spec.rent_extra_tasks);
      L.push('## ' + LETTERS[i] + '. ' + m.title + ' [' + m.phase + ']');
      tasks.forEach(function (t, k) { L.push((k + 1) + '. ' + t); });
      L.push('→ 산출물: ' + spec.output); L.push('');
    });

    L.push('# 분석 규칙'); data.common_rules.forEach(function (x, i) { L.push((i + 1) + '. ' + x); }); L.push('');

    L.push('# 답변 형식'); L.push('다음 순서로 작성하세요.');
    var k = 1;
    L.push((k++) + '. **' + data.format.summary_title + '** — ' + data.format.summary_max_lines + '줄 이내로, 확인된 내용과 중요한 주의사항');
    ids.forEach(function (id) {
      var o = data.modules[id].by_group[g].output, mt = /^([^(]+)\((.*)\)$/.exec(o);
      L.push((k++) + '. **' + (mt ? mt[1] : o) + '**' + (mt ? ' — ' + mt[2] + ' 포함' : ''));
    });
    L.push((k++) + '. **' + data.format.closing_title + '** — "' + data.format.closing_labels.join('" / "') + '" 라벨로 구분');
    L.push(''); L.push(data.format.style);
    return L.join('\n');
  }
  return { build: build, moduleList: moduleList, descFor: descFor, scenarioLabel: scenarioLabel, scenarioFlag: scenarioFlag };
});
