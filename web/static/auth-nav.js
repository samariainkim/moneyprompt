/* 돈버프 로그인 메뉴 — 기존 정적 페이지의 헤더에 "로그인 / 내 계정"을 붙인다.
 * 빌드 때 scripts/sync-static.mjs 가 각 페이지에 이 스크립트를 끼워 넣는다. (원본 페이지는 수정하지 않음)
 * 로그인 상태는 같은 도메인의 /api/me/ 로 확인한다. 실패하면 "로그인"으로 보여준다. */
(function () {
  'use strict';
  if (window.__dbxAuthNav) return;
  window.__dbxAuthNav = true;

  var CSS =
    '.dbx-auth{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;text-decoration:none;' +
    'font:700 12.5px/1 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;padding:7px 13px;border-radius:999px;' +
    'border:1px solid #d97706;color:#d97706;background:#fff;cursor:pointer;margin-left:6px;align-self:center}' +
    '.dbx-auth:hover{background:#fff4e6}' +
    '.dbx-auth.is-in{background:#d97706;color:#fff}.dbx-auth.is-in:hover{background:#b45309}' +
    '.dbx-auth-menu{margin-left:0;align-self:auto;border:0;border-radius:0;background:transparent;padding:inherit;font:inherit;color:inherit;display:flex}' +
    '.dbx-auth-menu.is-in{background:transparent;color:inherit;font-weight:800}' +
    '.dbx-auth-float{position:fixed;top:10px;right:10px;z-index:2147483000;box-shadow:0 2px 8px rgba(0,0,0,.12)}';

  // 데스크톱 헤더(알약 버튼) / 모바일 메뉴(목록 항목) 위치 후보
  var HEADER_TARGETS = ['.lnav', '.dbx-nav', '.header-btns'];
  var MENU_TARGETS = ['.menu-panel', '.dbx-menu'];
  var BRAND_ONLY = '.dbx-h-in'; // 메뉴가 없는 헤더(수수료 계산기)

  function addCss() {
    var s = document.createElement('style');
    s.setAttribute('data-auth-nav', '1');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function href(signedIn) {
    return signedIn ? '/account/' : '/login/?next=' + encodeURIComponent(location.pathname + location.search);
  }

  function make(signedIn, kind) {
    var a = document.createElement('a');
    a.href = href(signedIn);
    a.setAttribute('data-auth-nav', '1');
    a.className = 'dbx-auth' + (signedIn ? ' is-in' : '') + (kind === 'menu' ? ' dbx-auth-menu' : '') + (kind === 'float' ? ' dbx-auth-float' : '');
    a.textContent = signedIn ? '내 계정' : '로그인';
    if (kind === 'menu') a.insertAdjacentHTML('beforeend', '<i>›</i>');
    return a;
  }

  function clear() {
    var old = document.querySelectorAll('a[data-auth-nav]');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
  }

  function place(signedIn) {
    clear();
    var placed = false, i, el;
    for (i = 0; i < HEADER_TARGETS.length; i++) {
      el = document.querySelector(HEADER_TARGETS[i]);
      if (el) { el.appendChild(make(signedIn, 'header')); placed = true; break; }
    }
    for (i = 0; i < MENU_TARGETS.length; i++) {
      el = document.querySelector(MENU_TARGETS[i]);
      if (el) { el.appendChild(make(signedIn, 'menu')); placed = true; break; }
    }
    if (!placed) {
      el = document.querySelector(BRAND_ONLY);
      if (el) { el.appendChild(make(signedIn, 'header')); placed = true; }
    }
    return placed;
  }

  function placeFallback(signedIn) {
    clear();
    document.body.appendChild(make(signedIn, 'float'));
  }

  function run(signedIn) {
    // 일부 헤더는 다른 스크립트가 늦게 그린다. 0.6초까지 기다렸다가 못 찾으면 떠 있는 버튼으로 대체한다.
    var tries = 0;
    (function attempt() {
      if (place(signedIn)) return;
      if (++tries < 6) return setTimeout(attempt, 100);
      placeFallback(signedIn);
    })();
  }

  function start() {
    addCss();
    var signedIn = false;
    try {
      fetch('/api/me/', { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : { signedIn: false }; })
        .then(function (j) { signedIn = Boolean(j && j.signedIn); run(signedIn); })
        .catch(function () { run(false); });
    } catch (e) { run(false); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
