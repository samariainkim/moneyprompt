/* 돈버프 보완 측정(GA4) — 기존 정적 페이지에 빠져 있던 이벤트를 빌드 때 inline 으로 끼워 넣는다. (scripts/sync-static.mjs)
 * 저장소 루트의 원본 페이지는 수정하지 않는다. 개인정보·입력 금액은 보내지 않는다.
 *  - 모든 페이지: 회원 여부(user property member_status = member | guest)
 *  - 홈(/): 서비스 카드 클릭(home_service_click), 문의·채널 링크 클릭(contact_click)
 *  - 프롬프트(/prompt/): prompt_open, prompt_copy, prompt_ai_open, prompt_filter, prompt_search, today_pick_click, new_prompt_click
 */
(function () {
  'use strict';
  if (window.__dbxGa) return;
  window.__dbxGa = true;

  var path = location.pathname;
  if (path.charAt(path.length - 1) !== '/' && path.indexOf('.') < 0) path += '/';

  function ev(name, params, beacon) {
    try {
      if (typeof window.gtag !== 'function') return;
      var p = params || {};
      if (beacon) p.transport_type = 'beacon'; // 페이지를 떠나는 클릭도 끊기지 않게
      window.gtag('event', name, p);
    } catch (e) {}
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function txt(s, n) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n || 60); }

  /* ───────── 회원 여부 ───────── */
  function setMember(signed) {
    try { if (typeof window.gtag === 'function') window.gtag('set', 'user_properties', { member_status: signed ? 'member' : 'guest' }); } catch (e) {}
  }
  function initMember() {
    var a = window.__dbxAuth;
    if (!a) return;
    setMember(a.signedIn());
    a.onChange(function (s) { setMember(!!s); });
  }

  /* ───────── 홈 ───────── */
  function initHome() {
    document.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest('.svc-card');
      if (card) { ev('home_service_click', { target: txt((card.id || '').replace('svc-', ''), 20) || 'unknown' }, true); return; }
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var h = a.getAttribute('href') || '';
      if (h.indexOf('open.kakao.com') >= 0) ev('contact_click', { channel: 'kakao' }, true);
      else if (h.indexOf('youtube.com') >= 0) ev('contact_click', { channel: 'youtube' }, true);
      else if (h.indexOf('mailto:') === 0) ev('contact_click', { channel: 'email' }, true);
    }, true);
  }

  /* ───────── 프롬프트 ───────── */
  function findPrompt(rowId) {
    try {
      if (typeof PROMPTS === 'undefined') return null;
      var key = String(rowId || '').replace(/^row-/, '');
      for (var i = 0; i < PROMPTS.length; i++) if (String(PROMPTS[i].idx).replace('/', '-') === key) return PROMPTS[i];
    } catch (e) {}
    return null;
  }
  function pinfo(p) { return p ? { prompt_idx: p.idx, prompt_category: txt(p.cat, 30), prompt_ai: txt(p.ai, 30), prompt_level: txt(p.level, 20) } : {}; }

  function initPrompt() {
    document.addEventListener('click', function (e) {
      var t = e.target; if (!t || !t.closest) return;
      var copy = t.closest('.copy-btn');
      if (copy) {
        var m = /copyPrompt\('([^']+)'\)/.exec(copy.getAttribute('onclick') || '');
        ev('prompt_copy', pinfo(m && findPrompt(m[1])));
        return;
      }
      var go = t.closest('.go-btn');
      if (go) {
        var row = go.closest('.prompt-row'); var p = pinfo(row && findPrompt(row.id));
        p.ai_service = txt(go.textContent, 30); ev('prompt_ai_open', p, true); return;
      }
      var tg = t.closest('[data-toggle]');
      if (tg) {
        var r = document.getElementById(tg.getAttribute('data-toggle'));
        if (r && !r.classList.contains('open')) ev('prompt_open', pinfo(findPrompt(r.id))); // 닫혀 있던 행을 열 때만
        return;
      }
      var tab = t.closest('.ftab');
      if (tab) { ev('prompt_filter', { category: txt(tab.getAttribute('data-cat') || tab.textContent, 30) }); return; }
      if (t.closest('#todayCard')) { var tc = document.getElementById('todayCard'); ev('today_pick_click', { prompt_idx: tc && tc.dataset ? tc.dataset.idx : '' }, true); return; }
      var nl = t.closest('#newPromptList a[href]');
      if (nl) ev('new_prompt_click', { destination: 'blog' }, true);
    }, true);

    var timer = null;
    var si = document.getElementById('searchInput');
    if (si) si.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = txt(si.value, 40);
        if (q.length < 2) return;
        setTimeout(function () { ev('prompt_search', { search_term: q, result_count: document.querySelectorAll('#mainList .prompt-row').length }); }, 300);
      }, 1000);
    });
  }

  function start() {
    initMember();
    if (path === '/') initHome();
    else if (path === '/prompt/') initPrompt();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
