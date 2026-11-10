/* 돈버프 로그인 메뉴 — 기존 정적 페이지의 헤더에 "로그인 / 내 계정"을 붙인다.
 * 빌드 때 scripts/sync-static.mjs 가 각 페이지에 이 스크립트를 끼워 넣는다. (원본 페이지는 수정하지 않음)
 *
 * 깜빡임을 줄이는 방법
 *  1) 로그인 쿠키(sb-*-auth-token)의 유무로 상태를 즉시 추정해, 헤더가 생기는 순간 버튼을 함께 넣는다.
 *  2) 서버 확인(/api/me/)은 뒤에서 하고, 추정과 다를 때만 같은 버튼의 글자·링크를 바로잡는다. (버튼을 다시 만들지 않음)
 *  3) 버튼 폭을 고정해 "로그인" ↔ "내 계정" 전환에도 옆 메뉴가 밀리지 않게 한다.
 *  4) 헤더가 늦게 그려지는 페이지는 MutationObserver 로 생기는 즉시 넣고, 끝내 못 찾으면 떠 있는 버튼으로 대체한다.
 *  5) <head> 에서 async 로 불러와 문서 끝까지 읽기를 기다리지 않는다. */
(function () {
  'use strict';
  if (window.__dbxAuthNav) return;
  window.__dbxAuthNav = true;

  var CSS =
    '.dbx-auth{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:76px;' +
    'white-space:nowrap;text-decoration:none;font:700 12.5px/1 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;' +
    'padding:7px 13px;border-radius:999px;border:1px solid #d97706;color:#d97706;background:#fff;cursor:pointer;margin-left:6px;align-self:center}' +
    '.dbx-auth:hover{background:#fff4e6}' +
    '.dbx-auth.is-in{background:#d97706;color:#fff}.dbx-auth.is-in:hover{background:#b45309}' +
    '.dbx-auth-menu{min-width:0;margin-left:0;align-self:auto;border:0;border-radius:0;background:transparent;padding:inherit;font:inherit;color:inherit;display:flex}' +
    '.dbx-auth-menu.is-in{background:transparent;color:inherit;font-weight:800}' +
    '.dbx-auth-float{position:fixed;top:10px;right:10px;z-index:2147483000;box-shadow:0 2px 8px rgba(0,0,0,.12)}';

  var HEADER_TARGETS = ['.lnav', '.dbx-nav', '.header-btns'];
  var MENU_TARGETS = ['.menu-panel', '.dbx-menu'];
  var BRAND_ONLY = '.dbx-h-in'; // 메뉴가 없는 헤더(수수료 계산기)

  var signedIn = cookieHint();   // 지금 화면에 보여주는 상태
  var els = [];                  // 만들어 둔 버튼들
  var placed = false, observer = null, fallbackTimer = null;

  // sb-<프로젝트>-auth-token (또는 .0/.1 조각) 쿠키가 있으면 로그인한 것으로 추정한다. (-code-verifier 등은 제외)
  function cookieHint() {
    try { return /(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(document.cookie); } catch (e) { return false; }
  }

  function addCss() {
    var s = document.createElement('style');
    s.setAttribute('data-auth-nav', '1');
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function href() {
    return signedIn ? '/account/' : '/login/?next=' + encodeURIComponent(location.pathname + location.search);
  }

  function apply(a) {
    var kind = a.getAttribute('data-kind');
    a.href = href();
    a.className = 'dbx-auth' + (signedIn ? ' is-in' : '') + (kind === 'menu' ? ' dbx-auth-menu' : '') + (kind === 'float' ? ' dbx-auth-float' : '');
    a.textContent = signedIn ? '내 계정' : '로그인';
    if (kind === 'menu') a.insertAdjacentHTML('beforeend', '<i>›</i>');
  }

  function make(kind) {
    var a = document.createElement('a');
    a.setAttribute('data-auth-nav', '1');
    a.setAttribute('data-kind', kind);
    apply(a);
    els.push(a);
    return a;
  }

  function place() {
    var ok = false, i, el;
    for (i = 0; i < HEADER_TARGETS.length; i++) {
      el = document.querySelector(HEADER_TARGETS[i]);
      if (el) { el.appendChild(make('header')); ok = true; break; }
    }
    for (i = 0; i < MENU_TARGETS.length; i++) {
      el = document.querySelector(MENU_TARGETS[i]);
      if (el) { el.appendChild(make('menu')); ok = true; break; }
    }
    if (!ok) {
      el = document.querySelector(BRAND_ONLY);
      if (el) { el.appendChild(make('header')); ok = true; }
    }
    return ok;
  }

  function stop() {
    if (observer) { observer.disconnect(); observer = null; }
    if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
  }

  function tryPlace() {
    if (placed) return;
    if (place()) { placed = true; stop(); }
  }

  function placeFloat() {
    if (placed) return;
    (document.body || document.documentElement).appendChild(make('float'));
    placed = true;
    stop();
  }

  // 서버에서 로그인 여부를 확인하고, 추정과 다르면 이미 있는 버튼만 바로잡는다.
  function verify() {
    try {
      fetch('/api/me/', { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j) return;
          var s = Boolean(j.signedIn);
          if (s === signedIn) return;
          signedIn = s;
          for (var i = 0; i < els.length; i++) apply(els[i]);
        })
        .catch(function () {});
    } catch (e) {}
  }

  function start() {
    addCss();
    tryPlace();
    if (!placed) {
      if (window.MutationObserver) {
        observer = new MutationObserver(tryPlace);
        observer.observe(document.documentElement, { childList: true, subtree: true });
      }
      fallbackTimer = setTimeout(function () { tryPlace(); placeFloat(); }, 800);
    }
    verify();
  }

  // <head> 에서 비동기로 불러와도 되도록, 문서를 다 읽기를 기다리지 않고 바로 시작한다. (헤더는 관찰자가 생기는 즉시 잡는다)
  start();
})();
