/* 계산기 차별점 페이지: 측정만 담당한다. */
(function () {
  'use strict';
  function track(n, p) { try { if (typeof window.gtag === 'function') window.gtag('event', n, p || {}); } catch (e) {} }
  track('calc_why_view');
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-why-cta]');
    if (a) track('calc_why_cta', { target: a.getAttribute('data-why-cta') });
  });
})();
