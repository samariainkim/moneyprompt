(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var env = FeeConfig.env(location.hostname);
  var rules, insights, copy, promptData, last = null, ttype = 'sale', started = false, lastFocus = null;

  function toast(m) { var t = $('toast'); t.textContent = m; t.className = 'toast on'; setTimeout(function () { t.className = 'toast'; }, 2000); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function digits(el) { return el.value.replace(/[^\d]/g, ''); }
  function bindMoney(el) {
    el.addEventListener('input', function () {
      var d = digits(el).slice(0, 12); el.value = d ? fmt(d) : '';
      if (!started) { started = true; FeeAnalytics.track('calc_start'); }
    });
  }
  function manwon(n) { // 안내용: 원 → 읽기 쉬운 표기
    if (!n) return '';
    var eok = Math.floor(n / 1e8), man = Math.floor((n % 1e8) / 1e4), s = '';
    if (eok) s += eok + '억 '; if (man) s += fmt(man) + '만'; return s.trim() + '원';
  }
  function setType(t) {
    ttype = t;
    document.querySelectorAll('[data-t]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.t === t); });
    $('f-amount').hidden = t === 'rent'; $('f-rent').hidden = t !== 'rent';
    $('lbl-amount').textContent = t === 'sale' ? '매매가격' : '전세 보증금';
  }
  function showErr(field, msg) { $('err').textContent = msg; FeeAnalytics.error(msg.indexOf('범위') >= 0 ? 'out_of_range' : 'required_missing'); }
  var MSG = {
    required_missing: '금액을 입력해 주세요.', not_integer: '숫자만 입력해 주세요.', must_be_positive: '0보다 큰 금액을 입력해 주세요.',
    out_of_range: '입력 가능 범위(1,000억 원 이하)를 확인해 주세요.', invalid_rate_format: '협의 요율은 0.00~ 형식(소수 둘째 자리까지)으로 입력해 주세요.',
    exceeds_max_rate: '협의 요율이 상한 요율을 넘을 수 없습니다.'
  };
  function calc() {
    $('err').textContent = '';
    var input = { propertyType: 'housing', transactionType: ttype, negotiatedRatePercent: $('neg').value };
    if (ttype === 'rent') { input.depositKrw = digits($('dep')); input.monthlyKrw = digits($('mon')); }
    else input.amountKrw = digits($('amt'));
    var r;
    try { r = FeeEngine.calculate(input, rules, { env: env }); } catch (e) { FeeAnalytics.error('exception'); $('err').textContent = '계산 중 문제가 발생했습니다.'; return; }
    last = r;
    var box = $('result');
    if (r.status === 'rule_unverified') { box.hidden = false; box.innerHTML = '<p>요율 기준 검증이 완료되지 않아 현재 계산을 제공하지 않습니다.</p>'; return; }
    if (r.status !== 'success') {
      var code = r.errors[0].code; $('err').textContent = MSG[code] || '입력값을 확인해 주세요.';
      FeeAnalytics.error(code === 'out_of_range' ? 'out_of_range' : 'required_missing'); box.hidden = true; return;
    }
    FeeAnalytics.track('calc_result');
    var rows = [['적용 지역', r.region_label + ' 주택'], ['적용 거래금액', fmt(r.transaction_amount_krw) + '원' + (r.converted_from_rent ? ' (월세 환산)' : '')],
      ['상한 요율', (r.applied_max_rate_bps / 100).toFixed(2) + '%'], ['한도액', r.cap_krw === null ? '없음' : fmt(r.cap_krw) + '원' + (r.cap_applied ? ' (적용됨)' : '')]];
    box.hidden = false;
    box.innerHTML = '<h2 id="rh">계산 결과</h2><p class="hint">상한 중개보수 (부가세 미포함)</p><div class="big">' + fmt(r.max_fee_krw) + '원</div><dl>' +
      rows.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl>' + scenarioHtml(r) +
      '<p class="note">※ 부동산 중개보수 요율 기준은 서울특별시 조례 기준을 적용하였습니다. 지역, 시점에 따라 기준 요율이 다소 상이할 수 있으므로 해당 결과는 참고자료로만 활용 바랍니다.</p>' +
      insightHtml(r);
    $('ai').hidden = false; $('copy-res').hidden = false; $('cost-desc').textContent = ttype === 'sale' ? '취득세·등기 등 추가 비용 확인' : '보증보험·확정일자 등 추가 비용 확인'; if (!$('prompt-box').hidden) updatePrompt();
    box.setAttribute('tabindex', '-1'); box.focus();
  }
  function diffText(sc) { return sc.kind === 'legal_max' ? '기준' : (sc.diff_krw > 0 ? FeeFormat.man(sc.diff_krw) + ' 적음' : '차이 없음'); }
  function scenarioHtml(r) {
    if (!r.scenarios || r.scenarios.length < 2) return '';
    var h = '<h3 class="sc-t">협의 요율 비교</h3><table class="rt sc"><caption class="sr">협의 요율별 중개보수</caption><thead><tr><th scope="col">구분</th><th scope="col">요율</th><th scope="col">중개보수</th><th scope="col">상한 대비 차이</th></tr></thead><tbody>';
    FeePrompt.scenarioRows(r).forEach(function (row) {
      var sc = row.scenario;
      h += '<tr><td>' + row.label + (row.badge ? ' <span class="asm">' + row.badge + '</span>' : '') + (row.sub ? '<br><small>' + row.sub + '</small>' : '') + '</td><td>' + FeeFormat.pct(sc.rate_bps) + '</td><td>' + FeeFormat.man(sc.fee_krw) + (sc.cap_applied ? '<br><small>한도액 적용</small>' : '') + '</td><td>' + diffText(sc) + '</td></tr>';
    });
    return h + '</tbody></table><p class="note">' + (r.negotiated_rate_bps === null ? '가정 요율은 계산기가 비교를 위해 둔 예시이며 실제 협의 요율이 아닙니다. ' : '') + '차이는 확정 절감액이 아닙니다.</p>';
  }
  var TXL = { sale: '매매', jeonse: '전세', rent: '월세' };
  function insightHtml(r) {
    var items = FeeInsights.evaluate(r, insights, copy);
    return '<section class="ins-box" aria-labelledby="ins-t"><div class="ins-h"><h2 id="ins-t">돈버프 인사이트</h2><span class="ins-sub">' + TXL[r.transaction_type] + ' · 주택</span></div><ul class="ins2">' +
      items.map(function (i) { return '<li><b>' + i.title + '</b><span>' + i.desc + '</span></li>'; }).join('') + '</ul></section>';
  }
  function selected() { return Array.prototype.map.call(document.querySelectorAll('.ai-it:checked'), function (c) { return c.value; }); }
  function updatePrompt() { if (last && last.status === 'success') $('prompt').textContent = FeePrompt.build(last, selected(), promptData, rules); }
  function makePrompt() {
    if (!selected().length) { $('ai-err').textContent = '분석 항목을 하나 이상 선택해 주세요.'; return; }
    $('ai-err').textContent = ''; updatePrompt(); var box = $('prompt-box'); box.hidden = false; $('make-prompt').setAttribute('aria-expanded', 'true'); $('make-prompt').textContent = '프롬프트 다시 만들기'; FeeAnalytics.track('calc_ai_generate');
  }
  function copyText(text, ev) {
    function done() { toast('복사했습니다'); FeeAnalytics.track(ev, ev === 'calc_share' ? { channel: 'copy_button' } : {}); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('복사에 실패했습니다'); } document.body.removeChild(ta); }
  }
  // 기준표 모달 (포커스 이동/트랩/Esc/복귀)
  function openModal() {
    lastFocus = document.activeElement; var bg = $('modal-bg'); bg.className = 'modal-bg on'; $('modal-body').innerHTML = FeeRates.render(rules); $('modal-title').focus();
  }
  function closeModal() { $('modal-bg').className = 'modal-bg'; if (lastFocus) lastFocus.focus(); }
  document.addEventListener('keydown', function (e) {
    if (!$('modal-bg').classList.contains('on')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      var f = $('modal').querySelectorAll('button,a[href],[tabindex="0"],#modal-title'); var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  function init() {
    ['amt', 'dep', 'mon'].forEach(function (i) { bindMoney($(i)); });
    document.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { setType(b.dataset.t); }); });
    $('amt').addEventListener('input', function () { $('amt-h').textContent = manwon(+digits($('amt'))); });
    $('go').addEventListener('click', calc);
    $('open-rates').addEventListener('click', openModal); $('close-modal').addEventListener('click', closeModal);
    $('modal-bg').addEventListener('click', function (e) { if (e.target.id === 'modal-bg') closeModal(); });
    document.querySelectorAll('.ai-it').forEach(function (c) { c.addEventListener('change', function () { $('ai-err').textContent = ''; if (!$('prompt-box').hidden) updatePrompt(); }); });
    $('make-prompt').addEventListener('click', makePrompt);
    $('copy-ai').addEventListener('click', function () { copyText($('prompt').textContent, 'calc_ai_copy'); });
    $('copy-res').addEventListener('click', function () {
      if (!last || last.status !== 'success') return;
      var t = '[CALC BUFF 돈버프 금융계산기] ' + last.region_label + ' 주택 중개보수 상한 ' + fmt(last.max_fee_krw) + '원 (부가세 미포함, 참고용)\n' + location.origin + '/calc/brokerage/';
      copyText(t, 'calc_share');
    });
    $('neg').addEventListener('focus', function () {});
    setType('sale'); FeeAnalytics.track('calc_view');
  }
  Promise.all([FeeConfig.RULES_FILE, FeeConfig.INSIGHTS_FILE, FeeConfig.COPY_FILE, FeeConfig.PROMPT_FILE].map(function (u) { return fetch(u).then(function (r) { return r.json(); }); }))
    .then(function (d) { rules = d[0]; insights = d[1]; copy = d[2]; promptData = d[3]; init(); })
    .catch(function () { $('err').textContent = '기준 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'; });
})();
