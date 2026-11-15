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

  // ── 이동·처리 중 표시 ──
  // 링크를 누르거나 화면이 넘어가기 시작하면 맨 위에 진행 막대를 바로 보여 주고, 누른 링크는 다시 눌리지 않게 흐리게 한다.
  // 서버가 응답하는 동안 '눌렸는지 모르겠다'며 여러 번 누르게 되는 것을 막기 위함.
  var prog = document.createElement('div'); prog.id = 'dbxProg'; prog.setAttribute('aria-hidden', 'true'); prog.innerHTML = '<i></i>'; document.body.appendChild(prog);
  var progOff = null;
  function progStart() {
    if (prog.classList.contains('on')) return;
    var bar = prog.firstChild; prog.classList.add('on'); document.documentElement.classList.add('dbx-wait');
    bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth;
    bar.style.transition = 'width 9s cubic-bezier(.1,.6,.2,1)'; bar.style.width = '85%';
    clearTimeout(progOff); progOff = setTimeout(progEnd, 20000); // 이동이 일어나지 않았을 때를 대비한 안전장치
  }
  function progEnd() {
    clearTimeout(progOff); prog.classList.remove('on'); document.documentElement.classList.remove('dbx-wait');
    Array.prototype.forEach.call(document.querySelectorAll('a.is-nav'), function (a) { a.classList.remove('is-nav'); });
  }
  window.addEventListener('beforeunload', progStart);   // 링크·폼·주소 이동 등 모든 화면 전환의 시작
  window.addEventListener('pageshow', progEnd);         // 뒤로 가기로 돌아왔을 때
  window.addEventListener('popstate', progEnd);
  ['pushState', 'replaceState'].forEach(function (m) { var o = history[m]; history[m] = function () { var r = o.apply(this, arguments); setTimeout(progEnd, 60); return r; }; });
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented && !(e.target.closest && e.target.closest('a[href]'))) return;
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || /^(mailto|tel):/i.test(a.getAttribute('href'))) return;
    if (u.href === location.href || (u.pathname === location.pathname && u.search === location.search && u.hash)) return; // 같은 화면의 앵커
    a.classList.add('is-nav'); progStart();
  }, true);
})();
