/* MONEY BRIEF(카드뉴스) 홈: 카드 확대 보기, 호 전환, 측정.
   - 카드를 누르면 상세 페이지 이동 없이 화면 안에서 크게 열린다(좌우 버튼·키보드·스와이프).
   - 카드마다 선택적으로 연동 링크(계산기·프롬프트·외부 링크)를 둘 수 있다(brief.json 의 cards[].link).
   - 측정은 호·카드 번호만 보낸다(개인정보·금액 없음). */
(function () {
  'use strict';
  var dataEl = document.getElementById('briefData');
  if (!dataEl) return;
  var data; try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var issues = data.issues || [];
  if (!issues.length) return;
  var latest = issues[0];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function ev(name, p) { try { if (typeof window.gtag === 'function') window.gtag('event', name, p || {}); } catch (e) {} }
  var imgSrc = function (it, n) { return '/redesign/img/brief/' + it.id + '/0' + n + '.jpg'; };
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function byNo(n) { for (var i = 0; i < issues.length; i++) if (issues[i].no === n) return issues[i]; return null; }

  var cur = latest;                       // 화면에 펼쳐진 호
  var rail = $('#bfRail'), prevB = $('#bfPrev'), nextB = $('#bfNext');

  /* ───── 카드 띠 ───── */
  function railButtons(it) {
    return it.cards.map(function (c) {
      return '<button type="button" class="bc" data-n="' + c.n + '" aria-label="' + it.no + '호 ' + c.n + '번 카드 크게 보기"><img src="' + imgSrc(it, c.n) + '" alt="' + esc(c.alt) + '" width="1080" height="1350" loading="' + (c.n <= 3 ? 'eager' : 'lazy') + '" decoding="async"></button>';
    }).join('');
  }
  function updateArrows() {
    if (!rail || !prevB || !nextB) return;
    var max = rail.scrollWidth - rail.clientWidth - 4;
    prevB.hidden = rail.scrollLeft <= 4; nextB.hidden = rail.scrollLeft >= max;
  }
  function scrollRail(dir) { rail.scrollBy({ left: dir * 540, behavior: 'smooth' }); }
  if (rail) { rail.addEventListener('scroll', updateArrows, { passive: true }); window.addEventListener('resize', updateArrows); updateArrows(); }
  if (prevB) prevB.addEventListener('click', function () { scrollRail(-1); });
  if (nextB) nextB.addEventListener('click', function () { scrollRail(1); });

  /* ───── 호 전환(지난 호) ───── */
  function selectIssue(no, opts) {
    opts = opts || {};
    var it = byNo(no) || latest;
    cur = it;
    var isLatest = it === latest;
    $('#bfNo').textContent = 'No.' + it.no;
    $('#bfCat').textContent = it.category;
    $('#bfDate').textContent = '기준일 ' + it.base_date;
    $('#bfTitle').textContent = it.title;
    $('#bfEyebrow').textContent = isLatest ? 'LATEST · 최신 호' : 'NO.' + it.no + ' · 지난 호';
    $('#bfH2').textContent = isLatest ? '지금 가장 먼저 볼 카드뉴스' : '지난 카드뉴스 다시 보기';
    $('#bfLd').textContent = isLatest ? '기준일과 출처를 확인한 최신 호예요.' : '발행 당시(기준일)의 정보예요. 제도·요율·환율은 바뀔 수 있어요.';
    rail.innerHTML = railButtons(it); rail.scrollLeft = 0; updateArrows();
    var tiles = document.querySelectorAll('.pp a');
    for (var i = 0; i < tiles.length; i++) {
      var on = Number(tiles[i].getAttribute('data-n')) === it.no;
      tiles[i].toggleAttribute('aria-current', on);
      var cv = tiles[i].querySelector('.cv'); if (cv) cv.classList.toggle('cur', on);
    }
    if (opts.push) { try { history.pushState({ n: it.no }, '', isLatest ? location.pathname : '?n=' + it.no); } catch (e) {} }
    if (opts.scroll) { var s = $('#latest'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (opts.track) ev('brief_issue_select', { issue: it.no });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.pp a');
    if (a) { e.preventDefault(); selectIssue(Number(a.getAttribute('data-n')), { push: true, scroll: true, track: true }); }
  });
  window.addEventListener('popstate', function () {
    var m = /[?&]n=(\d+)/.exec(location.search);
    if (lb.hidden === false) closeLb(true);
    selectIssue(m ? Number(m[1]) : latest.no, {});
  });

  /* ───── 확대 보기 ───── */
  var lb = $('#lb'), img = $('#lbImg'), cnt = $('#lbCount'), ttl = $('#lbTitle'), bar = $('#lbBar');
  var lPrev = $('#lbPrev'), lNext = $('#lbNext'), lClose = $('#lbClose'), hot = $('#lbHot'), cta = $('#lbCta'), rep = $('#lbReport');
  var st = { it: null, n: 1, max: 1, opener: null };

  function setInert(on) { var site = $('.site'); if (site) { try { site.inert = on; } catch (e) {} } }  // 열려 있는 동안 뒤 화면은 키보드·스크린리더 접근을 막는다
  function setHash() { try { history.replaceState(history.state, '', location.pathname + location.search + '#no' + st.it.no + '-' + st.n); } catch (e) {} }
  function clearHash() { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {} }

  function render(how) {
    var it = st.it, c = it.cards[st.n - 1];
    img.src = imgSrc(it, st.n); img.alt = c.alt;
    cnt.textContent = st.n + ' / ' + it.cards.length;
    ttl.textContent = 'No.' + it.no + ' · ' + it.category;
    bar.style.width = (st.n / it.cards.length * 100) + '%';
    lPrev.disabled = st.n <= 1; lNext.disabled = st.n >= it.cards.length;
    if (st.n > st.max) st.max = st.n;
    if (c.link) {
      var l = c.link;
      hot.hidden = false; hot.href = l.href; hot.setAttribute('aria-label', l.label);
      hot.style.left = l.x + '%'; hot.style.top = l.y + '%'; hot.style.width = l.w + '%'; hot.style.height = l.h + '%';
      cta.hidden = false; cta.href = l.href; cta.textContent = l.label + ' →';
      var ext = /^https:\/\//.test(l.href);
      [hot, cta].forEach(function (a) { if (ext) { a.target = '_blank'; a.rel = 'noopener'; } else { a.removeAttribute('target'); a.removeAttribute('rel'); } });
    } else { hot.hidden = true; cta.hidden = true; }
    // 앞뒤 카드를 미리 받아 둔다
    [st.n - 1, st.n + 1].forEach(function (k) { if (k >= 1 && k <= it.cards.length) { var p = new Image(); p.src = imgSrc(it, k); } });
    setHash();
    if (how) ev('brief_card_nav', { issue: it.no, card: st.n, how: how });
  }
  function openLb(it, n, source, opener) {
    st.it = it; st.n = n; st.max = n; st.opener = opener || document.activeElement;
    lb.hidden = false; document.documentElement.style.overflow = 'hidden'; setInert(true);
    render(null); lClose.focus();
    ev('brief_card_open', { issue: it.no, card: n, source: source });
  }
  function closeLb(silent) {
    if (lb.hidden) return;
    lb.hidden = true; document.documentElement.style.overflow = ''; setInert(false); clearHash();
    if (!silent) ev('brief_lightbox_close', { issue: st.it.no, last_card: st.n, max_card: st.max });
    if (st.opener && st.opener.focus) { try { st.opener.focus(); } catch (e) {} }
  }
  function go(d, how) { var n = st.n + d; if (n < 1 || n > st.it.cards.length) return; st.n = n; render(how); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#bfRail .bc');
    if (b) openLb(cur, Number(b.getAttribute('data-n')), 'strip', b);
  });
  lPrev.addEventListener('click', function () { go(-1, 'button'); });
  lNext.addEventListener('click', function () { go(1, 'button'); });
  lClose.addEventListener('click', function () { closeLb(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  [hot, cta].forEach(function (a) { a.addEventListener('click', function () { ev('brief_cta_click', { issue: st.it.no, card: st.n, target: (st.it.cards[st.n - 1].link || {}).target || a.getAttribute('href') }); }); });
  rep.addEventListener('click', function () { ev('brief_report_click', { issue: st.it.no, card: st.n }); });

  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1, 'key'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1, 'key'); }
    else if (e.key === 'Home') { e.preventDefault(); if (st.n !== 1) { st.n = 1; render('key'); } }
    else if (e.key === 'End') { e.preventDefault(); if (st.n !== st.it.cards.length) { st.n = st.it.cards.length; render('key'); } }
    else if (e.key === 'Tab') { // 확대 화면 안에서만 이동
      var f = Array.prototype.filter.call(lb.querySelectorAll('button,a[href]'), function (x) { return !x.hidden && !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // 스와이프(모바일): 좌우로 밀면 다음·이전 카드
  var tx = null, ty = null;
  lb.addEventListener('touchstart', function (e) { if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } else tx = null; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1, 'swipe');
  }, { passive: true });

  /* ───── 시작: 주소의 ?n=, #no3-4 로 바로 열기 ───── */
  var m = /[?&]n=(\d+)/.exec(location.search);
  if (m && byNo(Number(m[1])) && Number(m[1]) !== latest.no) selectIssue(Number(m[1]), {});
  var h = /^#no(\d+)-(\d)$/.exec(location.hash);
  if (h) { var hi = byNo(Number(h[1])); if (hi && Number(h[2]) >= 1 && Number(h[2]) <= hi.cards.length) { if (hi !== cur) selectIssue(hi.no, {}); openLb(hi, Number(h[2]), 'link', null); } }
  ev('brief_view', { issue: cur.no });
})();
