(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var env = FeeConfig.env(location.hostname);
  var rules, insights, copy, last = null, ttype = 'sale', started = false, lastFocus = null;

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
    if (r.negotiated_rate_bps !== null) rows.push(['협의 요율 ' + (r.negotiated_rate_bps / 100).toFixed(2) + '%', fmt(r.negotiated_fee_krw) + '원' + (r.negotiated_cap_applied ? ' (한도액 적용)' : '')], ['상한 대비 차이', fmt(r.difference_krw) + '원 (확정 절감액 아님)']);
    var ver = r.verified_at ? ' · 최종 검증: ' + r.verified_at : '';
    box.hidden = false;
    box.innerHTML = '<h2 id="rh">계산 결과</h2><p class="hint">상한 중개보수 (부가세 미포함)</p><div class="big">' + fmt(r.max_fee_krw) + '원</div><dl>' +
      rows.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="hint">요율 기준: ' + r.region_label + ver + (r.rules_status !== 'verified' ? '<br><strong>※ 요율 검증 전 테스트 버전입니다. 결과는 참고용이며 공식 확인 후 사용하세요.</strong>' : '') + '</p>' +
      '<h2>함께 확인해 보세요</h2><ul class="ins">' + FeeInsights.evaluate(r, insights, copy).map(function (i) { return '<li>' + i.text + '</li>'; }).join('') + '</ul>';
    $('ai').hidden = false; updatePrompt();
    box.setAttribute('tabindex', '-1'); box.focus();
  }
  function selected() { return Array.prototype.map.call(document.querySelectorAll('.ai-it:checked'), function (c) { return c.value; }); }
  function updatePrompt() { if (last && last.status === 'success') $('prompt').textContent = FeePrompt.build(last, selected()); }
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
    document.querySelectorAll('.ai-it').forEach(function (c) { c.addEventListener('change', updatePrompt); });
    $('copy-ai').addEventListener('click', function () { copyText($('prompt').textContent, 'calc_ai_copy'); });
    $('copy-res').addEventListener('click', function () {
      if (!last || last.status !== 'success') return;
      var t = '[FEE BUFF] ' + last.region_label + ' 주택 중개보수 상한 ' + fmt(last.max_fee_krw) + '원 (부가세 미포함, 참고용)\n' + location.origin + '/fee/brokerage-fee/';
      copyText(t, 'calc_share');
    });
    $('neg').addEventListener('focus', function () {});
    if (rules.status !== 'verified') $('beta').hidden = false;
    setType('sale'); FeeAnalytics.track('calc_view');
  }
  Promise.all([FeeConfig.RULES_FILE, FeeConfig.INSIGHTS_FILE, FeeConfig.COPY_FILE].map(function (u) { return fetch(u).then(function (r) { return r.json(); }); }))
    .then(function (d) { rules = d[0]; insights = d[1]; copy = d[2]; init(); })
    .catch(function () { $('err').textContent = '기준 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'; });
})();
