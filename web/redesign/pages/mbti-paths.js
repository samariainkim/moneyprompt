/* 8가지 성향 소개 페이지: 측정만 담당한다. (내용은 빌드 때 검사 원본 데이터로 만든다) */
(function () {
  'use strict';
  function track(n, p) { try { if (typeof window.gtag === 'function') window.gtag('event', n, p || {}); } catch (e) {} }
  track('mbti_paths_view');
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-paths-cta]');
    if (a) track('mbti_paths_cta', { target: a.getAttribute('data-paths-cta') });
  });
})();
