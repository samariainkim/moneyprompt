/* 돈버프 리뉴얼 공통 스크립트: 금융계산기 드롭다운, 모바일 전체 메뉴, 측정(GA4). 금액·개인정보는 보내지 않는다. */
(function () {
  'use strict';
  function ev(name, params) { try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {} }
  var $ = function (s, r) { return (r || document).querySelector(s); };

  // 드롭다운(금융계산기·내 계정): .dd 안의 [data-dd] 버튼으로 열고 닫는다.
  var dds = Array.prototype.slice.call(document.querySelectorAll('.dd'));
  function setDd(d, open) { d.classList.toggle('open', open); var b = $('[data-dd]', d); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  dds.forEach(function (d) {
    var b = $('[data-dd]', d); if (!b) return;
    b.addEventListener('click', function (e) { e.stopPropagation(); var open = !d.classList.contains('open'); dds.forEach(function (x) { setDd(x, false); }); setDd(d, open); });
  });
  document.addEventListener('click', function (e) { dds.forEach(function (d) { if (!d.contains(e.target)) setDd(d, false); }); });

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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { dds.forEach(function (d) { setDd(d, false); }); if (panel && !panel.hidden) setMenu(false); } });
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
