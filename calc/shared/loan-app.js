(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var FILES = {
    rules: '/calc/data/loan-prepay.rules.v1.0.0.json?v=1.3',
    copy: '/calc/data/loan-prepay.copy.json?v=1.3',
    prompt: '/calc/data/loan-prepay.prompt.v1.0.0.json?v=1.3'
  };
  var rules, copy, pdata, last = null, rows = [], started = false, months = null, promptText = '';
  var AI_DESC = {
    verify: ['내 수수료 정확성 확인', '검증', '계산 결과가 실제 약정 조건에서도 맞는지 확인'],
    compare: ['지금 갚기 vs 유지 비교', '의사결정', '중도상환수수료와 이자 절감 효과를 함께 비교'],
    refi: ['대출 갈아타기 분석', '대안 비교', '대환 비용과 새로운 대출의 금리 절감 효과 비교'],
    exempt: ['수수료 면제·감면 확인', '비용 확인', '내가 적용받을 수 있는 면제·감면 조건 점검'],
    checklist: ['중도상환 전 체크리스트', '실행', '상환 전에 꼭 확인할 조건과 금융회사 질문 정리']
  };

  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function won(n) { return fmt(n) + '원'; }
  function pct(bps) { return (bps / 100).toFixed(2); }
  function perLabel(m) { return m % 12 === 0 ? (m / 12) + '년' : m + '개월'; }
  function kdate(iso) { var p = iso.split('-'); return p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일'; }
  function tpl(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k]; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.className = 'toast on'; setTimeout(function () { t.className = 'toast'; }, 2000); }
  function start() { if (!started) { started = true; LoanAnalytics.track('calc_start'); } }

  /* ── 상태 무효화: 입력이 바뀌면 이전 결과·프롬프트·공유문구를 모두 숨김 ── */
  function invalidate() {
    last = null; rows = []; promptText = '';
    $('result').hidden = true; $('result').innerHTML = '';
    $('ai').hidden = true; $('copy-res').hidden = true;
    resetPrompt();
  }
  function resetPrompt() {
    promptText = ''; $('prompt-box').hidden = true; $('prompt').textContent = '';
    $('make-prompt').setAttribute('aria-expanded', 'false'); $('ai-err').textContent = '';
  }

  /* ── 입력 UI ── */
  function bindMoney(el) {
    el.addEventListener('input', function () { var d = el.value.replace(/\D/g, '').slice(0, 14); el.value = d ? fmt(d) : ''; start(); invalidate(); });
  }
  function bindDate(el) {
    el.addEventListener('input', function () {
      var d = el.value.replace(/\D/g, '').slice(0, 8);
      el.value = d.slice(0, 4) + (d.length > 4 ? '-' + d.slice(4, 6) : '') + (d.length > 6 ? '-' + d.slice(6, 8) : '');
      start(); invalidate();
    });
  }
  function err(code) {
    var lim = rules.limits, v = { max: code === 'amount_range' ? fmt(lim.amount_max_krw) + '원' : (code === 'rate_too_high' ? pct(lim.rate_max_bps) : lim.period_months_max) };
    $('err').textContent = tpl(copy.errors[code] || copy.errors.exception, v);
    invalidate();
    LoanAnalytics.error(code === 'amount_range' || code === 'rate_too_high' || code === 'period_range' ? 'out_of_range' : (code === 'period_too_long' ? 'unsupported' : (code === 'exception' ? 'exception' : 'required_missing')));
  }

  function calc() {
    $('err').textContent = '';
    var m = months;
    if (!$('f-mon').hidden) m = $('mon').value.replace(/\D/g, '') || null;
    var input = { amountKrw: $('amt').value.replace(/\D/g, ''), executionDate: $('d-ex').value, repaymentDate: $('d-rp').value, periodMonths: m, ratePercent: $('rate').value };
    var r;
    try { r = LoanEngine.calculate(input, rules); } catch (e) { err('exception'); return; }
    if (r.status !== 'success') { err(r.error.code); return; }
    last = r; rows = LoanEngine.compare(r, rules); resetPrompt();
    render(r);
    $('ai').hidden = false; $('copy-res').hidden = false;
    LoanAnalytics.track('calc_result', { period_ended: r.period_ended ? 'yes' : 'no' });
  }

  function render(r) {
    var c = copy.result, h = '<span class="k">' + c.badge + '</span><h2 id="rh" style="margin:0 0 2px">' + c.title + '</h2><p class="hint">' + c.label + '</p><div class="big">' + won(r.fee_krw) + '</div>';
    if (r.period_ended) h += '<div class="explain"><b>' + c.why_ended_title + '</b>' + tpl(c.why_ended_body, { end: kdate(r.end_date) }) + '</div>';
    else h += '<div class="explain"><b>' + c.why_active_title + '</b>' + c.why_active_body + '<br>' + won(r.amount_krw) + ' × ' + pct(r.rate_bps) + '% × (' + fmt(r.remaining_days) + '일 ÷ ' + fmt(r.total_days) + '일) = ' + won(r.fee_krw) + ' (원 미만 버림)</div>';
    h += '<div class="notice"><b>' + (r.period_ended ? c.actual_ended_title : c.actual_active_title) + '</b>' + c.actual_body + '<br>' + c.actual_foot + '</div>';
    h += '<details class="cmp"><summary>' + c.detail_title + '</summary><dl style="margin:10px 0 12px">' +
      '<div><dt>중도상환 예정금액</dt><dd>' + won(r.amount_krw) + '</dd></div><div><dt>약정 수수료율</dt><dd>' + pct(r.rate_bps) + '%</dd></div>' +
      '<div><dt>부과기간</dt><dd>' + perLabel(r.period_months) + '</dd></div><div><dt>부과 기간 범위</dt><dd>' + r.execution_date + ' ~ ' + r.end_date + '</dd></div>' +
      '<div><dt>잔여 / 전체 일수</dt><dd>' + fmt(r.remaining_days) + '일 / ' + fmt(r.total_days) + '일</dd></div><div><dt>적용 가정</dt><dd>' + copy.assumption_rows + '</dd></div></dl></details>';
    if (rows.length) {
      var t = '';
      rows.forEach(function (x) {
        var lab = x.kind === 'base' ? '현재 상환 예정일' : (x.kind === 'end' ? '부과기간 종료일' : x.offset_days + '일 뒤 상환');
        t += '<tr><td>' + lab + '<small>' + x.date + '</small></td><td>' + fmt(x.remaining_days) + '일</td><td>' + won(x.fee_krw) + (x.kind === 'end' ? ' <small>' + c.compare_end_note + '</small>' : '') + '</td><td>' + (x.kind === 'base' ? '기준' : '−' + won(x.diff_krw)) + '</td></tr>';
      });
      h += '<details class="cmp"><summary>' + c.compare_title + '</summary><p class="hint">' + c.compare_intro + '</p><table class="rt sc"><caption class="sr">상환 시점별 예상 수수료</caption><thead><tr><th scope="col">상환 시점</th><th scope="col">잔여</th><th scope="col">예상 수수료</th><th scope="col">차이</th></tr></thead><tbody>' + t + '</tbody></table><p class="note" style="margin-bottom:12px">' + c.compare_note + '</p></details>';
    }
    var box = $('result'); box.innerHTML = h; box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── AI 프롬프트 ── */
  function renderAiList() {
    var h = '';
    pdata.order.forEach(function (id) {
      var d = AI_DESC[id]; if (!d || !pdata.modules[id]) return;
      h += '<label class="opt"><input class="ai-it" type="checkbox" value="' + id + '"' + (pdata.defaults.indexOf(id) >= 0 ? ' checked' : '') + '><span><b>' + esc(d[0]) + ' <em class="asm tag">' + esc(d[1]) + '</em></b><small>' + esc(d[2]) + '</small></span></label>';
    });
    $('ai-list').insertAdjacentHTML('beforeend', h);
    $('ai-list').addEventListener('change', function () { resetPrompt(); }); // 분석 항목 변경 → 기존 요청문 무효화
  }
  function makePrompt() {
    if (!last) return;
    var sel = [].slice.call(document.querySelectorAll('.ai-it:checked')).map(function (x) { return x.value; });
    if (!sel.length) { $('ai-err').textContent = '분석 항목을 하나 이상 선택해 주세요.'; return; }
    $('ai-err').textContent = '';
    promptText = LoanPrompt.build(last, sel, pdata, { rows: rows });
    $('prompt').textContent = promptText; $('prompt-box').hidden = false; $('make-prompt').setAttribute('aria-expanded', 'true');
    LoanAnalytics.track('calc_ai_generate', { channel: 'prompt' });
  }
  function copyText(t, msg, ev) {
    function ok() { toast(msg); LoanAnalytics.track(ev); }
    function fallback() {
      try { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var done = document.execCommand('copy'); document.body.removeChild(ta); done ? ok() : toast('복사하지 못했어요. 직접 선택해 복사해 주세요.'); } catch (e) { toast('복사하지 못했어요. 직접 선택해 복사해 주세요.'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fallback); else fallback();
  }

  function init() {
    bindMoney($('amt')); bindDate($('d-ex')); bindDate($('d-rp'));
    $('rate').addEventListener('input', function () { start(); invalidate(); });
    $('mon').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 3); start(); invalidate(); });
    $('g-per').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      months = b.dataset.m === 'custom' ? null : Number(b.dataset.m);
      $('f-mon').hidden = b.dataset.m !== 'custom'; if (b.dataset.m === 'custom') $('mon').focus();
      start(); invalidate();
    });
    $('go').addEventListener('click', calc);
    ['amt', 'd-ex', 'd-rp', 'mon', 'rate'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') calc(); }); });
    renderAiList();
    $('make-prompt').addEventListener('click', makePrompt);
    $('copy-ai').addEventListener('click', function () { if (promptText) copyText(promptText, '프롬프트를 복사했어요', 'calc_ai_copy'); });
    $('copy-res').addEventListener('click', function () {
      if (!last) return;
      copyText(tpl(copy.share, { amount: won(last.amount_krw), rate: pct(last.rate_bps), period: perLabel(last.period_months), fee: won(last.fee_krw) }), '공유용 문구를 복사했어요', 'calc_share');
    });
    LoanAnalytics.track('calc_view');
  }

  Promise.all([FILES.rules, FILES.copy, FILES.prompt].map(function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }))
    .then(function (d) { rules = d[0]; copy = d[1]; pdata = d[2]; init(); })
    .catch(function () { $('go').disabled = true; $('err').textContent = '계산에 필요한 데이터를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'; });
})();
