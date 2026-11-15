/* 돈버프 리뉴얼 공통 스크립트: 금융계산기 드롭다운, 모바일 전체 메뉴, 측정(GA4). 금액·개인정보는 보내지 않는다. */
(function () {
  'use strict';
  function ev(name, params) { try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {} }
  var $ = function (s, r) { return (r || document).querySelector(s); };

  // 금융계산기 드롭다운
  var dd = $('#ddCalc'), ddBtn = dd && $('[data-dd]', dd);
  function setDd(open) { if (!dd) return; dd.classList.toggle('open', open); ddBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  if (ddBtn) ddBtn.addEventListener('click', function (e) { e.stopPropagation(); setDd(!dd.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (dd && !dd.contains(e.target)) setDd(false); });

  // 모바일 전체 메뉴
  var btn = $('#menuBtn'), panel = $('#menuPanel'), closeBtn = $('#menuClose');
  function setMenu(open) {
    if (!panel) return;
    panel.hidden = !open; panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false'); btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) { ev('nav_menu_open'); if (closeBtn) closeBtn.focus(); } else if (btn) btn.focus();
  }
  if (btn) btn.addEventListener('click', function () { setMenu(panel.hidden); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setDd(false); if (panel && !panel.hidden) setMenu(false); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 900 && panel && !panel.hidden) setMenu(false); });

  // 측정: 기존 홈과 같은 이벤트 이름을 유지한다.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-ga]');
    if (a) { var t = a.getAttribute('data-ga'); ev(t === 'banner' ? 'calc_home_banner_click' : 'nav_menu_click', { target: t }); }
    var h = e.target.closest && e.target.closest('[data-hero]');
    if (h) ev('hero_tag_click', { target: h.getAttribute('data-hero') });
  });
  var banner = $('#svc-calc');
  if (banner && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { ev('calc_home_banner_view'); io.disconnect(); } }); }, { threshold: 0.5 });
    io.observe(banner);
  }
})();
