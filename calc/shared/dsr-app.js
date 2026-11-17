(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var FILES = {
    rules: '/calc/data/dsr.rules.v1.0.0.json?v=1.0',
    copy: '/calc/data/dsr.copy.json?v=1.0',
    prompt: '/calc/data/dsr.prompt.v1.0.0.json?v=1.0'
  };
  var rules, copy, pdata, last = null, scenarios = [], started = false, promptText = '';
  var sel = { type: null, region: null, rep: null };
  var AI_DESC = {
    verify: ['내 DSR 계산 결과 검증하기', '검증', '계산값과 적용 규정, 입력 조건을 다시 확인해요'],
    existing: ['기존 대출 반영해 다시 분석하기', '추가 분석', '보유 대출이 한도에 미치는 영향을 살펴봐요'],
    compare: ['대출 조건별 한도 변화 비교하기', '조건 비교', '금리·기간·상환방식에 따른 한도와 이자 부담을 비교해요'],
    criteria: ['DSR 외 대출 심사 조건 확인하기', '심사 조건', 'LTV·DTI·담보·소득 등 추가로 확인할 기준을 정리해요'],
    checklist: ['대출 신청 전 준비사항 점검하기', '체크리스트', '은행에 확인할 질문과 필요한 서류를 정리해요']
  };
  var TYPE = { mortgage: '주택담보대출', credit: '신용대출' };
  var REP = { annuity: '원리금균등', principal_equal: '원금균등' };

  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function won(n) { return fmt(n) + '원'; }
  function pct(bps) { return (bps / 100).toFixed(2).replace(/0$/, ''); }
  function tpl(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k] === undefined ? '' : v[k]; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.className = 'toast on'; setTimeout(function () { t.className = 'toast'; }, 2000); }
  function start() { if (!started) { started = true; DsrAnalytics.track('calc_start'); } }
  function todayIso() {
    var q = /[?&]asof=(\d{4}-\d{2}-\d{2})/.exec(location.search); // 시험용(운영 주소에서는 무시)
    if (q && !/(^|\.)donbuff\.com$/.test(location.hostname)) return q[1];
    var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function invalidate() {
    last = null; scenarios = []; promptText = '';
    $('result').hidden = true; $('result').innerHTML = '';
    $('ai').hidden = true; $('copy-res').hidden = true;
    resetPrompt();
  }
  function resetPrompt() {
    promptText = ''; $('prompt-box').hidden = true; $('prompt').textContent = '';
    $('make-prompt').setAttribute('aria-expanded', 'false'); $('ai-err').textContent = '';
  }
  function bindMoney(el) { el.addEventListener('input', function () { var d = el.value.replace(/\D/g, '').slice(0, 11); el.value = d ? fmt(d) : ''; hint(); start(); invalidate(); }); }
  function hint() { // 연소득 한글 보조 표기
    var d = $('inc').value.replace(/\D/g, ''); var el = $('inc-hint');
    if (!d) { el.textContent = ''; return; }
    var man = Math.floor(Number(d) / 10000), eok = Math.floor(man / 10000), rest = man % 10000;
    el.textContent = (eok ? eok + '억 ' : '') + (rest ? fmt(rest) + '만 ' : '') + '원';
  }

  function err(code) {
    var lim = rules.limits, ymax = sel.type === 'credit' ? lim.years_max_credit : lim.years_max_mortgage;
    var v = { min: won(lim.income_min_krw), max: won(lim.income_max_krw), rmin: pct(lim.rate_min_bps), rmax: pct(lim.rate_max_bps), ymax: ymax };
    $('err').textContent = tpl(copy.errors[code] || copy.errors.exception, v);
    invalidate();
    var t = /_range|years_range/.test(code) ? 'out_of_range' : (/unsupported|expired|before_supported/.test(code) ? 'unsupported' : (code === 'exception' ? 'exception' : 'required_missing'));
    DsrAnalytics.error(t);
  }

  function input(over) {
    var o = { incomeKrw: $('inc').value.replace(/\D/g, ''), loanType: sel.type, region: sel.type === 'mortgage' ? sel.region : null, repayment: sel.rep, ratePercent: $('rate').value, years: $('yrs').value.replace(/\D/g, ''), asOf: todayIso() };
    for (var k in (over || {})) o[k] = over[k];
    return o;
  }

  function calc() {
    $('err').textContent = '';
    var r;
    try { r = DsrEngine.calculate(input(), rules); } catch (e) { err('exception'); return; }
    if (r.status !== 'success') { err(r.error.code); return; }
    last = r; scenarios = makeScenarios(r); resetPrompt();
    render(r);
    $('ai').hidden = false; $('copy-res').hidden = false;
    DsrAnalytics.track('calc_result', { loan_type: r.loan_type, repayment: r.repayment, stress_applied: r.stress_applied ? 'yes' : 'no' });
  }

  // 조건별 한도(프롬프트 SIMULATE 표): 같은 엔진·규칙으로 기간·상환방식·금리만 바꿔 계산한다
  function makeScenarios(r) {
    var rows = [{ label: '현재 입력(' + r.years + '년·' + REP[r.repayment] + '·금리 ' + pct(r.loan_rate_bps) + '%)', limit_krw: r.limit_krw, base: true }];
    var ymax = r.loan_type === 'credit' ? rules.limits.years_max_credit : rules.limits.years_max_mortgage;
    var yrs = r.loan_type === 'credit' ? [3, 5, 10] : [20, 30, 40];
    yrs.forEach(function (y) { if (y !== r.years && y <= ymax) add('기간 ' + y + '년', { years: String(y) }); });
    add(REP[r.repayment === 'annuity' ? 'principal_equal' : 'annuity'] + '로 변경', { repayment: r.repayment === 'annuity' ? 'principal_equal' : 'annuity' });
    [-100, 100].forEach(function (d) { var b = r.loan_rate_bps + d; if (b >= rules.limits.rate_min_bps && b <= rules.limits.rate_max_bps) add('대출 금리 ' + (d > 0 ? '+' : '−') + '1.00%p (' + pct(b) + '%)', { ratePercent: (b / 100).toFixed(2) }); });
    function add(label, over) {
      var x = DsrEngine.calculate(input(over), rules);
      if (x.status === 'success') rows.push({ label: label, limit_krw: x.limit_krw });
    }
    return rows;
  }

  function render(r) {
    var c = copy.result, L = DsrEngine.approxLabel;
    var h = '<span class="k">' + c.badge + '</span><h2 id="rh" style="margin:0 0 2px">' + c.title + '</h2><p class="hint">' + (r.loan_type === 'credit' ? c.label_credit : c.label_mortgage) + '</p><div class="big" id="r-big">' + L(r.limit_krw) + '</div><p class="why">' + c.why + '</p>';
    // 스트레스 금리 미적용 vs 적용
    var onTxt = L(r.limit_krw), onNote = '';
    if (r.credit_boundary === 'below_threshold') onNote = c.compare_on_credit_free; else if (r.credit_boundary === 'at_threshold') onNote = c.compare_on_credit_edge;
    h += '<h3 class="sc-t">' + c.compare_title + '</h3><div class="cmp2"><div><small>' + c.compare_off + '</small><strong>' + L(r.limit_no_stress_krw) + '</strong></div><div class="hl"><small>' + c.compare_on + '</small><strong>' + onTxt + '</strong>' + (onNote ? '<small>' + onNote + '</small>' : '') + '</div></div>';
    if (r.diff_krw > 0) h += '<div class="diff">' + tpl(c.diff, { diff: L(r.diff_krw).replace('약 ', '약 ') }) + '<small>' + c.diff_note + '</small></div>';
    h += '<dl><div><dt>' + c.dt_capacity + '</dt><dd>' + won(r.annual_capacity_krw) + '</dd></div><div><dt>' + c.dt_rate + '</dt><dd>' + pct(r.loan_rate_bps) + '%' + (r.stress_applied ? ' + ' + (r.stress_bp / 100).toFixed(1) + '%p <span class="asm">' + c.rate_tag + '</span>' : '') + '</dd></div></dl>';
    // 기존 대출 영향(연 원리금 100만 원당 한도 변화): 한도는 연 상환 여력에 비례
    var base = r.stress_applied || r.loan_type === 'mortgage' ? r.limit_with_stress_krw : r.limit_no_stress_krw;
    var per = Math.floor(base / r.annual_capacity_krw * 1000000 / 10000);
    var vary = copy.result.vary.map(function (x) { return '<li>' + tpl(x, { per: '약 ' + fmt(per) }) + '</li>'; });
    if (r.loan_type === 'credit') vary = vary.concat(copy.result.vary_credit.map(function (x) { return '<li>' + x + '</li>'; }));
    h += '<div class="check"><b>' + c.vary_title + '</b><ul>' + vary.join('') + '</ul></div>';
    h += '<div class="notapply"><b>' + c.notapply_title + '</b><ul>' + c.notapply.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
    h += '<p class="note" style="margin-top:12px">' + tpl(c.foot, { asof: r.as_of, from: r.rule_period.from, to: r.rule_period.to, ann: r.rule_period.announced }) + '</p>';
    h += '<details class="src" style="margin-top:12px"><summary>' + c.src_title + '</summary><ul>' + rules.sources.map(function (s) { return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a></li>'; }).join('') + '</ul></details>';
    var box = $('result'); box.innerHTML = h; box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── AI 프롬프트 ── */
  function renderAiList() {
    var h = '';
    pdata.order.forEach(function (id) {
      var d = AI_DESC[id]; if (!d || !pdata.modules[id]) return;
      h += '<label class="opt"><input class="ai-it" id="ai-' + id + '" type="checkbox" value="' + id + '"' + (pdata.defaults.indexOf(id) >= 0 ? ' checked' : '') + '><span><b>' + esc(d[0]) + ' <em class="asm tag">' + esc(d[1]) + '</em></b><small>' + esc(d[2]) + '</small></span></label>';
    });
    $('ai-list').insertAdjacentHTML('beforeend', h);
    $('ai-list').addEventListener('change', function () { resetPrompt(); });
  }
  function makePrompt() {
    if (!last) return;
    var ids = [].slice.call(document.querySelectorAll('.ai-it:checked')).map(function (x) { return x.value; });
    if (!ids.length) { $('ai-err').textContent = '분석 항목을 하나 이상 선택해 주세요.'; return; }
    $('ai-err').textContent = '';
    promptText = DsrPrompt.build(last, ids, pdata, { label: DsrEngine.approxLabel, scenarios: scenarios });
    $('prompt').textContent = promptText; $('prompt-box').hidden = false; $('make-prompt').setAttribute('aria-expanded', 'true');
    DsrAnalytics.track('calc_ai_generate', { channel: 'prompt' });
  }
  function copyText(t, msg, ev) {
    function ok() { toast(msg); DsrAnalytics.track(ev); }
    function fallback() {
      try { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var done = document.execCommand('copy'); document.body.removeChild(ta); done ? ok() : toast('복사하지 못했어요. 직접 선택해 복사해 주세요.'); } catch (e) { toast('복사하지 못했어요. 직접 선택해 복사해 주세요.'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fallback); else fallback();
  }

  function bindSeg(id, key, after) {
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      sel[key] = b.dataset.v; if (after) after(); start(); invalidate();
    });
  }
  function syncType() {
    var mort = sel.type === 'mortgage';
    $('f-region').hidden = !mort;
    $('yrs').placeholder = sel.type === 'credit' ? '예: 5' : '예: 30';
    $('yrs-note').textContent = sel.type === 'credit' ? '신용대출은 최대 ' + rules.limits.years_max_credit + '년까지 입력할 수 있어요.' : '주택담보대출은 최대 ' + rules.limits.years_max_mortgage + '년까지 입력할 수 있어요.';
    $('credit-note').hidden = sel.type !== 'credit';
  }

  function init() {
    bindMoney($('inc'));
    ['rate', 'yrs'].forEach(function (id) { $(id).addEventListener('input', function () { if (id === 'yrs') this.value = this.value.replace(/\D/g, '').slice(0, 2); start(); invalidate(); }); });
    bindSeg('g-type', 'type', syncType); bindSeg('g-region', 'region'); bindSeg('g-rep', 'rep');
    $('go').addEventListener('click', calc);
    ['inc', 'rate', 'yrs'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') calc(); }); });
    renderAiList();
    $('make-prompt').addEventListener('click', makePrompt);
    $('copy-ai').addEventListener('click', function () { if (promptText) copyText(promptText, '프롬프트를 복사했어요', 'calc_ai_copy'); });
    $('copy-res').addEventListener('click', function () {
      if (!last) return;
      copyText(tpl(copy.share, { income: DsrEngine.approxLabel(last.income_krw).replace('약 ', ''), type: TYPE[last.loan_type], rep: REP[last.repayment], rate: pct(last.loan_rate_bps), years: last.years, limit: DsrEngine.approxLabel(last.limit_krw) }), '공유용 문구를 복사했어요', 'calc_share');
    });
    syncType();
    DsrAnalytics.track('calc_view');
  }

  Promise.all([FILES.rules, FILES.copy, FILES.prompt].map(function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }))
    .then(function (d) { rules = d[0]; copy = d[1]; pdata = d[2]; init(); })
    .catch(function () { $('go').disabled = true; $('err').textContent = '계산에 필요한 데이터를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'; });
})();
