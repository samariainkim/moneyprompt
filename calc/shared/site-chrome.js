/* 돈버프 공통 헤더·푸터 — 허브/계산기/기준표가 같은 컴포넌트를 씁니다 */
(function () {
  'use strict';
  var LINKS = [
    { href: '/prompt/', label: '돈 버는 프롬프트', key: 'prompt' },
    { href: '/invest-mbti/', label: '나의 투자성향 찾기', key: 'invest' },
    { href: '/calc/', label: '금융계산기', key: 'calc' }
  ];
  function track(n, p) { try { if (typeof gtag === 'function') gtag('event', n, p || {}); } catch (e) {} }
  function nav(cls, withArrow) {
    return LINKS.map(function (l) {
      return '<a href="' + l.href + '"' + (l.key === 'calc' ? ' aria-current="page"' : '') + ' data-nav="' + l.key + '">' + l.label + (withArrow ? '<i>›</i>' : '') + '</a>';
    }).join('');
  }
  var h = document.getElementById('dbx-header');
  if (h) {
    h.className = 'dbx-h';
    h.innerHTML = '<div class="dbx-h-in"><a class="dbx-brand" href="https://donbuff.com/" aria-label="돈버프 홈으로 이동"><b>돈버프</b><span>금융계산기</span></a>' +
      '<nav class="dbx-nav" aria-label="서비스">' + nav() + '</nav>' +
      '<button class="dbx-menu-btn" id="dbx-btn" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="dbx-menu"><span></span><span></span><span></span></button>' +
      '<nav class="dbx-menu" id="dbx-menu" aria-label="서비스 메뉴" hidden>' + nav('', true) + '</nav><div class="dbx-scrim" id="dbx-scrim" hidden></div></div>';
    var btn = document.getElementById('dbx-btn'), menu = document.getElementById('dbx-menu'), scrim = document.getElementById('dbx-scrim');
    var setMenu = function (open) {
      btn.setAttribute('aria-expanded', open); btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      menu.hidden = !open; scrim.hidden = !open; if (open) track('nav_menu_open');
    };
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    scrim.addEventListener('click', function () { setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 560 && !menu.hidden) setMenu(false); });
    h.addEventListener('click', function (e) { var a = e.target.closest('[data-nav]'); if (a) track('nav_menu_click', { target: a.getAttribute('data-nav') }); });
  }
  function renderFooter() {
    var f = document.getElementById('dbx-footer');
    if (!f) return;
    f.className = 'dbx-f';
    f.innerHTML = '<div class="fb">돈버프 (DONBUFF)</div>' +
      '<p>『AI로 부자되기』 | 저자 김태형(사마리아인)<br>' +
      '<a href="https://donbuff.com">donbuff.com</a> &nbsp;·&nbsp; <a href="https://www.youtube.com/@samariaintv" target="_blank" rel="noopener">사마리아인TV</a> &nbsp;·&nbsp; <a href="https://open.kakao.com/o/g2JnL4Ai" target="_blank" rel="noopener">독자 오픈채팅방</a></p>' +
      '<p>계산 결과는 참고용이며 실제 금액은 계약 조건과 기관 기준에 따라 달라질 수 있습니다. 최종 의사결정은 이용자 본인에게 있으며, 금융 상품 가입의 권유가 아닙니다.</p>' +
      '<p>© 2026 김태형</p>';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderFooter); else renderFooter();
})();
