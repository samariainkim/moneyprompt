/* 계산기 화면 보조: 로그인 상태면 'AI 심층분석 로그인 안내' 문구를 숨긴다. (계산·게이트 로직은 건드리지 않음) */
(function () {
  'use strict';
  function signedIn() {
    try { if (window.__dbxAuth && window.__dbxAuth.signedIn) return !!window.__dbxAuth.signedIn(); } catch (e) {}
    try { return /(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(document.cookie); } catch (e) { return false; }
  }
  function sync() { var on = signedIn(); document.querySelectorAll('.lock').forEach(function (el) { el.hidden = on; }); }
  // 저장 버튼 문구: 시안 확정 문구('내 결과 저장하기')로 맞춘다. (버튼은 로그인 모듈이 만들고, 저장 로직은 그대로)
  var LABEL = '☆ 내 결과 저장하기', OLD = '☆ 내 결과에 저장';
  function relabel() { document.querySelectorAll('.dbx-save').forEach(function (b) { if (b.textContent === OLD) b.textContent = LABEL; }); }
  relabel();
  if (window.MutationObserver) new MutationObserver(relabel).observe(document.body, { childList: true, subtree: true, characterData: true });
  sync();
  window.addEventListener('load', function () { sync(); setTimeout(sync, 1200); });
})();
