(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var V = '1.4';
  var FILES = {
    rules: '/calc/data/fx.rules.v1.0.0.json?v=' + V,
    copy: '/calc/data/fx.copy.json?v=' + V,
    prompt: '/calc/data/fx.prompt.v1.0.0.json?v=' + V
  };
  // 환율 파일은 매일 갱신되므로 10분 단위로만 캐시
  var RATES_URL = '/calc/data/fx/rates.json?t=' + Math.floor(Date.now() / 600000);
  var rules, copy, pdata, rates = null, fresh = { ok: false }, last = null, started = false, promptText = '';
  var S = { m: 'cash', d: 'out', c: 'USD' };

  function fmt(n) { return Number(n).toLocaleString('ko-KR'); }
  function won(n) { return fmt(n) + '원'; }
  function tpl(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k] === undefined ? '' : v[k]; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.className = 'toast on'; setTimeout(function () { t.className = 'toast'; }, 2000); }
  function start() { if (!started) { started = true; FxAnalytics.track('calc_start'); } }
  function suffix(cur) { return (rules.currencies.input_suffix && rules.currencies.input_suffix[cur]) || cur; }
  function curLabel(cur) { return (rules.currencies.labels && rules.currencies.labels[cur]) || cur; }
  function amountText(res) {
    var n = Number(res.amount).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    return res.currency === 'JPY' ? n + '엔' : n + ' ' + res.currency;
  }
  function key() { return S.m + '.' + S.d; }

  /* ── 상태 무효화: 입력이 바뀌면 이전 결과·프롬프트·공유문구를 모두 숨김 ── */
  function invalidate() {
    last = null; promptText = '';
    $('result').hidden = true; $('ai').hidden = true; $('copy-res').hidden = true;
    resetPrompt();
  }
  function resetPrompt() {
    promptText = ''; $('prompt-box').hidden = true; $('prompt').textContent = '';
    $('make-prompt').setAttribute('aria-expanded', 'false'); $('ai-err').textContent = '';
  }

  /* ── 화면 갱신 ── */
  function refreshFreshness() { fresh = FxEngine.evaluateFreshness(rates, Date.now(), rules); }
  function drawBanner() {
    var b = $('banner');
    refreshFreshness();
    if (!fresh.ok) { b.className = 'banner block'; b.textContent = copy.banner.block; b.hidden = false; }
    else if (fresh.warn) { b.className = 'banner warn'; b.textContent = copy.banner.warn; b.hidden = false; }
    else { b.hidden = true; b.textContent = ''; }
    $('go').disabled = !fresh.ok;
    $('srcline').textContent = fresh.ok ? tpl(copy.source[S.m], { date: FxEngine.formatDate(rates.base_date, 'dot') }) : '';
  }
  function drawChips() {
    var list = fresh.ok ? FxEngine.pickCurrencies(rates, rules, S.m, S.d) : [];
    if (list.length && list.indexOf(S.c) < 0) S.c = list[0];
    var w = $('g-cur'); w.innerHTML = '';
    list.forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = curLabel(c); b.dataset.c = c; b.setAttribute('aria-pressed', c === S.c); w.appendChild(b);
    });
    var h = $('cur-h'); h.textContent = copy.labels.currency_hint_cash; h.hidden = S.m !== 'cash';
  }
  function drawLabels() {
    var dl = copy.labels.direction[S.m], bt = $('g-dir').children;
    bt[0].textContent = dl.out; bt[1].textContent = dl.in;
    $('l-amt').textContent = copy.labels.amount[key()];
    $('amt-u').textContent = suffix(S.c);
    $('amt-h').textContent = S.c === 'JPY' ? copy.labels.amount_hint_jpy : copy.labels.amount_hint;
  }
  function redraw() { drawBanner(); drawChips(); drawLabels(); }

  function errType(code) {
    if (code === 'amount_min' || code === 'amount_max' || code === 'pref_range') return 'out_of_range';
    if (code === 'currency_unavailable' || code === 'cash_unsupported') return 'unsupported';
    if (code.indexOf('data_') === 0 || code === 'rate_invalid') return 'data_unavailable';
    if (code === 'exception') return 'exception';
    return 'required_missing';
  }
  function showErr(code) {
    $('err').textContent = copy.errors[code] || copy.errors.exception;
    invalidate(); FxAnalytics.error(errType(code));
  }

  function calc() {
    $('err').textContent = '';
    var r;
    try {
      r = FxEngine.calculate({ mode: S.m, direction: S.d, currency: S.c, amount: $('amt').value, prefPercent: $('pref').value }, rates, rules, { now: Date.now() });
    } catch (e) { showErr('exception'); return; }
    if (r.status !== 'success') { showErr(r.error.code); return; }
    last = r; resetPrompt(); render(r);
    $('ai').hidden = false; $('copy-res').hidden = false;
    FxAnalytics.track('calc_result', { mode: r.mode, direction: r.direction, currency: r.currency });
  }

  function render(r) {
    var c = copy.result, k = r.mode + '.' + r.direction, v = { amount: amountText(r), eul: r.currency === 'JPY' ? '을' : '를', pref: r.pref_bp / 100 };
    $('r-k').textContent = tpl(c.lead[k], v);
    $('r-big').textContent = '약 ' + won(r.total_krw);
    $('r-why').textContent = tpl(c.why[k], v);
    var per = r.unit > 1 ? ' (' + tpl(c.per_unit, { unit: r.unit, cur: suffix(r.currency) }) + ')' : '';
    $('t-applied').textContent = c.rows.applied; $('t-base').textContent = c.rows.base; $('t-basetot').textContent = c.rows.base_total; $('t-date').textContent = c.rows.date;
    $('r-ap').textContent = r.applied_rate.toLocaleString('ko-KR', { maximumFractionDigits: 3 }) + '원' + per;
    $('r-base').textContent = r.base_rate.toLocaleString('ko-KR', { maximumFractionDigits: 4 }) + '원' + per;
    $('r-basetot').textContent = won(r.base_total_krw);
    $('r-date').textContent = FxEngine.formatDate(r.base_date, 'ko');
    $('r-round').textContent = c.rounding_hint;
    var d;
    if (r.diff_krw === 0) d = r.pref_bp === 10000 ? c.diff.none : c.diff.subwon;
    else d = tpl(r.diff_direction === 'more' ? c.diff.more : c.diff.less, { diff: fmt(r.diff_krw) });
    $('r-diff').innerHTML = d + '<small>' + esc(c.diff.foot) + '</small>';
    $('na-t').textContent = c.not_applied_title;
    $('r-na').innerHTML = c.not_applied[r.mode].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('ck-t').textContent = c.check_title;
    $('r-ck').innerHTML = c.check.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var box = $('result'); box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── AI 프롬프트 ── */
  function renderAiList() {
    var h = '';
    pdata.order.forEach(function (id) {
      var d = copy.ai_menu[id]; if (!d || !pdata.modules[id]) return;
      h += '<label class="opt"><input class="ai-it" type="checkbox" value="' + id + '"' + (pdata.defaults.indexOf(id) >= 0 ? ' checked' : '') + '><span><b>' + esc(d[0]) + '</b><small>' + esc(d[1]) + '</small></span></label>';
    });
    $('ai-list').insertAdjacentHTML('beforeend', h);
    $('ai-list').addEventListener('change', resetPrompt); // 분석 항목 변경 → 기존 요청문 무효화
  }
  function makePrompt() {
    if (!last) return;
    var sel = [].slice.call(document.querySelectorAll('.ai-it:checked')).map(function (x) { return x.value; });
    if (!sel.length) { $('ai-err').textContent = '분석 항목을 하나 이상 선택해 주세요.'; return; }
    $('ai-err').textContent = '';
    promptText = FxPrompt.build(last, sel, pdata, { amountText: $('amt').value.trim() });
    $('prompt').textContent = promptText; $('prompt-box').hidden = false; $('make-prompt').setAttribute('aria-expanded', 'true');
    FxAnalytics.track('calc_ai_generate', { channel: 'prompt' });
  }
  function copyText(t, msg, ev) {
    function ok() { toast(msg); FxAnalytics.track(ev); }
    function fallback() {
      try { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var done = document.execCommand('copy'); document.body.removeChild(ta); done ? ok() : toast('복사하지 못했어요. 직접 선택해 복사해 주세요.'); } catch (e) { toast('복사하지 못했어요. 직접 선택해 복사해 주세요.'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fallback); else fallback();
  }

  function init() {
    $('src-sum').textContent = copy.details.title;
    $('src-list').innerHTML = copy.details.items.map(function (x) { return '<li>' + x + '</li>'; }).join('');
    $('src-details').hidden = false;
    $('pref-help').textContent = copy.pref_help;
    renderAiList(); redraw();

    $('g-mode').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      [].forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', x === b); });
      S.m = b.dataset.m; redraw(); start(); invalidate(); $('err').textContent = '';
    });
    $('g-dir').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      [].forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', x === b); });
      S.d = b.dataset.d; redraw(); start(); invalidate(); $('err').textContent = '';
    });
    $('g-cur').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !b.dataset.c) return;
      [].forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', x === b); });
      S.c = b.dataset.c; drawLabels(); start(); invalidate(); $('err').textContent = '';
    });
    $('amt').addEventListener('input', function () { this.value = this.value.replace(/[^\d.,]/g, '').slice(0, 20); start(); invalidate(); $('err').textContent = ''; });
    $('amt').addEventListener('blur', function () { // 정상 형식만 천 단위 쉼표로 정리 (잘못된 쉼표는 그대로 두어 오류로 안내)
      var raw = this.value.trim();
      if (raw.indexOf(',') >= 0 && !/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(raw)) return;
      var v = raw.replace(/,/g, '');
      if (/^\d+(\.\d{0,2})?$/.test(v)) { var p = v.split('.'); this.value = Number(p[0]).toLocaleString('ko-KR') + (p[1] !== undefined ? '.' + p[1] : ''); }
    });
    $('pref').addEventListener('input', function () { this.value = this.value.replace(/[^\d.%]/g, '').slice(0, 7); start(); invalidate(); $('err').textContent = ''; });
    $('go').addEventListener('click', calc);
    ['amt', 'pref'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') calc(); }); });
    $('make-prompt').addEventListener('click', makePrompt);
    $('copy-ai').addEventListener('click', function () { if (promptText) copyText(promptText, '프롬프트를 복사했어요', 'calc_ai_copy'); });
    $('copy-res').addEventListener('click', function () {
      if (!last) return;
      copyText(tpl(copy.share, {
        mode: copy.labels.mode[last.mode] + ' ' + copy.labels.direction[last.mode][last.direction], amount: amountText(last), pref: last.pref_bp / 100,
        act: copy.share_act[last.direction], total: won(last.total_krw), diff: fmt(last.diff_krw), basis: copy.share_basis[last.mode]
      }), '공유용 문구를 복사했어요', 'calc_share');
    });
    FxAnalytics.track('calc_view');
  }

  function getJson(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  Promise.all([getJson(FILES.rules), getJson(FILES.copy), getJson(FILES.prompt)])
    .then(function (d) {
      rules = d[0]; copy = d[1]; pdata = d[2];
      return getJson(RATES_URL).then(function (r) { rates = r; }, function () { rates = null; }); // 환율 파일 실패 → 계산 차단 안내
    })
    .then(init)
    .catch(function () { $('go').disabled = true; $('err').textContent = '계산에 필요한 데이터를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'; });
})();
