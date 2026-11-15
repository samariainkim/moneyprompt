/* 금융계산기 허브: 계산기 목록(레지스트리)과 '필요해요' 집계. 이벤트 이름은 기존 허브와 동일하게 유지한다. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  function track(n, p) { try { if (typeof window.gtag === 'function') window.gtag('event', n, p || {}); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  track('calc_hub_view');

  var ICON = { home: '🏠', loan: '🏦', fx: '💱' };
  // 서비스명보다 사용자가 궁금해하는 질문을 앞에 둔다.
  var QUESTION = {
    brokerage: '집을 사고팔거나 계약할 때, 중개보수는 얼마일까요?',
    'loan-prepay': '대출을 미리 갚으면 수수료가 얼마나 나올까요?',
    fx: '환율 우대 90%, 실제로 얼마나 아낄까요?'
  };
  function card(c) {
    var open = c.status === 'open';
    var q = QUESTION[c.id] || c.desc;
    var body = '<span class="ico" aria-hidden="true">' + (ICON[c.icon] || '🧮') + '</span><h3>' + esc(c.name) + '</h3><p class="q">' + esc(q) + '</p>' +
      (c.ai ? '<span class="ai">★ AI 심층분석 제공</span>' : '') +
      '<div class="ft"><span></span><span class="go">' + (open ? '계산하기 <i>→</i>' : '준비 중') + '</span></div>';
    return open ? '<a class="cc" href="' + esc(c.path) + '" data-calc="' + esc(c.id) + '">' + body + '</a>' : '<div class="cc off" aria-disabled="true">' + body + '</div>';
  }

  var KEY = 'calc_interest_v1', picked = {};
  try { picked = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { picked = {}; }
  function remember(id) { picked[id] = 1; try { localStorage.setItem(KEY, JSON.stringify(picked)); } catch (e) {} }
  function mark(btn) { btn.setAttribute('aria-pressed', 'true'); btn.setAttribute('aria-disabled', 'true'); btn.textContent = '✓ 의견을 전달했어요'; }
  function wish(w) {
    var d = document.createElement('div');
    d.innerHTML = '<b></b><small>추가 검토 중</small><button type="button" aria-pressed="false">필요해요</button>';
    d.querySelector('b').textContent = w.name;
    var btn = d.querySelector('button');
    if (picked[w.id]) mark(btn);
    btn.addEventListener('click', function () {
      if (picked[w.id]) return;
      remember(w.id); mark(btn);
      track('calc_interest', { calculator_id: 'hub', category: 'interest', interest_item: w.id });
    });
    $('up').appendChild(d);
  }

  fetch(FeeConfig.REGISTRY_FILE).then(function (r) { return r.json(); }).then(function (d) {
    d.calculators.sort(function (a, b) { return a.order - b.order; });
    $('grid').innerHTML = d.calculators.map(card).join('');
    (d.wishlist || []).forEach(wish);
  }).catch(function () { $('grid').innerHTML = '<p style="color:var(--muted);font-size:14px">계산기 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>'; });

  // '다른 이유' 진입 측정(히어로 링크 / 하단 배너)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-why]');
    if (a) track('calc_why_click', { source: a.getAttribute('data-why') });
  });
})();
