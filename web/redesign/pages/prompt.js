/* 돈 버는 프롬프트 페이지 동작.
 * 데이터(PROMPTS, AI_LINKS, REVIEWS, CHALLENGE_REVIEWS, NEW_PROMPTS, catSections, catLabels)는 빌드 때 기존 prompt/index.html 에서
 * 그대로 가져와 이 스크립트 앞에 들어 있다. (저자가 기존 파일에 한 줄 추가하면 이 페이지에도 반영된다)
 *
 * 주의: 로그인 게이트(auth-gates.js)와 측정(ga-extra.js)이 아래 이름·요소를 직접 쓴다. 바꾸면 기능이 끊긴다.
 *   전역 함수: getFavorites, saveFavorites, isFavorite, toggleFavorite, updateFavCount, render, copyPrompt, jumpToPrompt
 *   요소: .star-btn[data-idx], .prompt-row#row-…, [data-toggle], .copy-btn[onclick=copyPrompt('…')], .go-btn, .ftab[data-cat],
 *         #searchInput, #todayCard, #newPromptList, #mainList, [data-open], [data-view]
 * 전역 함수는 반드시 function 선언으로 둔다(window 속성이 되어야 auth-gates.js 가 서버 저장용으로 바꿔 끼울 수 있다). */

var FAV_KEY = 'moneyprompt_favorites';
var RECENT_KEY = 'moneyprompt_recent';
var RECENT_MAX = 20;
var VIEW_KEY = 'dbx:prompt:view';

var currentCat = '전체';
var currentSearch = '';
var currentSpecial = null; // 'favorites' | 'recent' | null
var currentView = 'list';  // 'list' | 'grid'
var pmLastFocus = null;

/* ───────── 공통 도우미 ───────── */
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function rowId(idx) { return 'row-' + String(idx).replace('/', '-'); }
function findByIdx(idx) { for (var i = 0; i < PROMPTS.length; i++) if (PROMPTS[i].idx === idx) return PROMPTS[i]; return null; }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
// 한국 시간 기준 오늘 날짜 문자열 → 같은 날엔 모두에게 같은 결과(서버 없이)
function kstDate() {
  var now = new Date(), kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  return { str: kst.getFullYear() + '-' + (kst.getMonth() + 1) + '-' + kst.getDate(), label: (kst.getMonth() + 1) + '월 ' + kst.getDate() + '일' };
}
function dateSeed() { var d = kstDate().str, seed = 0; for (var i = 0; i < d.length; i++) seed = (seed * 31 + d.charCodeAt(i)) % 100000; return seed; }
function levelClass(l) { return l === '입문' ? 'l1' : (l === '심화' ? 'l3' : 'l2'); }

/* ───────── 즐겨찾기 / 최근 본 (이 기기 저장 — 로그인하면 auth-gates.js 가 서버 저장으로 바꿔 끼운다) ───────── */
function getFavorites() { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; } }
function saveFavorites(arr) { lsSet(FAV_KEY, JSON.stringify(arr)); }
function isFavorite(idx) { return getFavorites().indexOf(idx) >= 0; }
function toggleFavorite(idx) {
  var favs = getFavorites();
  if (favs.indexOf(idx) >= 0) favs = favs.filter(function (i) { return i !== idx; }); else favs.push(idx);
  saveFavorites(favs); updateFavCount();
}
function updateFavCount() { var el = document.getElementById('favCount'); if (el) el.textContent = '(' + getFavorites().length + ')'; }
function getRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; } }
function saveRecent(arr) { lsSet(RECENT_KEY, JSON.stringify(arr)); }
function addRecent(idx) {
  var recent = getRecent().filter(function (i) { return i !== idx; });
  recent.unshift(idx);
  if (recent.length > RECENT_MAX) recent = recent.slice(0, RECENT_MAX);
  saveRecent(recent); updateRecentCount();
}
function updateRecentCount() { var el = document.getElementById('recentCount'); if (el) el.textContent = '(' + getRecent().length + ')'; }

/* ───────── 오늘의 돈버프 ───────── */
function getTodayPrompt() { return { prompt: PROMPTS[dateSeed() % PROMPTS.length], dateStr: kstDate().label }; }
function renderTodayPick() {
  var t = getTodayPrompt(), p = t.prompt;
  document.getElementById('todayDateText').textContent = t.dateStr + ' 오늘의 돈버프';
  document.getElementById('todayTitle').textContent = p.title;
  document.getElementById('todayDesc').textContent = p.desc;
  document.getElementById('todayCat').textContent = p.cat;
  document.getElementById('todayAi').textContent = p.ai;
  document.getElementById('todayCard').dataset.idx = p.idx;
}

/* ───────── NEW BUFF ───────── */
function renderNewPrompts() {
  var wrap = document.getElementById('newPromptList'); if (!wrap) return;
  var items = NEW_PROMPTS.slice(0, 3); if (!items.length) return;
  var html = '';
  items.forEach(function (p, i) {
    html += '<a class="nc' + (i === 0 ? ' f' : '') + '" href="' + escHtml(p.url) + '" target="_blank" rel="noopener">' +
      (i === 0 ? '<span class="nw">NEW</span>' : '') + '<span class="nct">' + escHtml(p.cat) + '</span><h4>' + escHtml(p.title) + '</h4>' +
      (i === 0 && p.desc ? '<p>' + escHtml(p.desc) + '</p>' : '') + '</a>';
  });
  wrap.innerHTML = html;
}

/* ───────── 독자 후기 (날짜 시드로 오늘의 후기 9개, 자동 넘김) ───────── */
var REVIEW_POOL_MAX = 9, REVIEW_AUTOPLAY_MS = 5000;
var reviewTimer = null, reviewPageCount = 1, reviewCurrentPage = 0, reviewPageSize = 3;
function getTodayReviewPool() {
  var pool = REVIEWS.map(function (r) { return { nick: r.nick, quote: r.quote, url: r.url, source: 'book' }; })
    .concat(CHALLENGE_REVIEWS.map(function (r) { return { nick: r.nick, quote: r.quote, url: r.url, source: 'challenge' }; }));
  if (pool.length <= REVIEW_POOL_MAX) return pool;
  var idxs = pool.map(function (_, i) { return i; }), s = dateSeed();
  for (var i = idxs.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; var j = Math.floor((s / 233280) * (i + 1)); var t = idxs[i]; idxs[i] = idxs[j]; idxs[j] = t; }
  return idxs.slice(0, REVIEW_POOL_MAX).map(function (i) { return pool[i]; });
}
function renderReviews() {
  var track = document.getElementById('reviewTrack'), dots = document.getElementById('reviewDots'); if (!track || !dots) return;
  reviewPageSize = window.matchMedia('(max-width:900px)').matches ? 1 : 3;
  var items = getTodayReviewPool(), pages = [];
  for (var i = 0; i < items.length; i += reviewPageSize) pages.push(items.slice(i, i + reviewPageSize));
  reviewPageCount = pages.length || 1; reviewCurrentPage = 0;
  track.innerHTML = pages.map(function (pg) {
    return '<div class="rev-page">' + pg.map(function (r) {
      return '<a class="rc" href="' + escHtml(r.url) + '" target="_blank" rel="noopener"><span class="t">' + (r.source === 'challenge' ? '챌린저스 후기' : 'Book 리뷰') +
        '</span><q>' + escHtml(r.quote) + '</q><div class="by">— ' + escHtml(r.nick) + '</div></a>';
    }).join('') + '</div>';
  }).join('');
  dots.innerHTML = pages.map(function (_, i) { return '<button type="button" class="rd' + (i === 0 ? ' on' : '') + '" aria-label="' + (i + 1) + '번째 후기 묶음"></button>'; }).join('');
  Array.prototype.forEach.call(dots.children, function (d, i) { d.addEventListener('click', function () { goToReviewPage(i); startReviewAutoplay(); }); });
  goToReviewPage(0); startReviewAutoplay();
}
function goToReviewPage(i) {
  var track = document.getElementById('reviewTrack'), dots = document.getElementById('reviewDots'); if (!track || !dots) return;
  reviewCurrentPage = i; track.style.transform = 'translateX(-' + (i * 100) + '%)';
  Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
}
function startReviewAutoplay() {
  if (reviewTimer) clearInterval(reviewTimer);
  if (reviewPageCount <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  reviewTimer = setInterval(function () {
    var next = reviewCurrentPage + 1;
    if (next >= reviewPageCount) { clearInterval(reviewTimer); reviewTimer = null; return; } // 끝까지 보여 준 뒤 멈춤(기존과 동일)
    goToReviewPage(next);
  }, REVIEW_AUTOPLAY_MS);
}

/* ───────── 카테고리 탭 ───────── */
function buildTabs() {
  var wrap = document.getElementById('filterTabs'); if (!wrap) return;
  var count = {}; PROMPTS.forEach(function (p) { count[p.cat] = (count[p.cat] || 0) + 1; });
  var html = '<button type="button" class="ftab tab on" data-cat="전체" aria-pressed="true">전체<small>' + PROMPTS.length + '</small></button>';
  catSections.forEach(function (c) { html += '<button type="button" class="ftab tab" data-cat="' + escHtml(c) + '" aria-pressed="false">' + escHtml(c) + '<small>' + (count[c] || 0) + '</small></button>'; });
  wrap.innerHTML = html;
}
function syncTabs() {
  Array.prototype.forEach.call(document.querySelectorAll('.ftab'), function (t) {
    var on = !currentSpecial && t.dataset.cat === currentCat; t.classList.toggle('on', on); t.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  Array.prototype.forEach.call(document.querySelectorAll('.ftab-sub'), function (t) {
    var on = currentSpecial === t.dataset.special; t.classList.toggle('on', on); t.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

/* ───────── 목록·카드 그리기 ───────── */
function tagsHtml(p, withCat) {
  return '<span class="tg ' + levelClass(p.level) + '">' + escHtml(p.level) + '</span><span class="tg ai">' + escHtml(p.ai) + '</span>' + (withCat ? '<span class="tg ai">' + escHtml(p.cat) + '</span>' : '');
}
function starHtml(p) {
  var fav = isFavorite(p.idx);
  return '<button type="button" class="star-btn' + (fav ? ' active' : '') + '" data-idx="' + p.idx + '" aria-label="즐겨찾기" aria-pressed="' + fav + '">' + (fav ? '★' : '☆') + '</button>';
}
function actionsHtml(p, id) {
  var link = AI_LINKS[p.ai] || null;
  return '<div class="acts"><button type="button" class="copy-btn btn or" onclick="copyPrompt(\'' + id + '\')">📋 프롬프트 복사</button>' +
    '<span class="copy-ok" id="ok-' + id + '" role="status">✓ 복사됐습니다!</span>' +
    (link ? '<a class="go-btn btn line" href="' + escHtml(link) + '" target="_blank" rel="noopener" data-ai="' + escHtml(p.ai) + '">🔗 ' + escHtml(p.ai) + '에서 열기 ↗</a>' : '') + '</div>';
}
function bodyHtml(p, id) {
  return '<p class="row-desc">' + escHtml(p.desc) + '</p><div class="pbox"><div class="prompt-label">프롬프트</div><div class="prompt-code" id="code-' + id + '" tabindex="0">' + escHtml(p.prompt) + '</div></div>' + actionsHtml(p, id);
}
function rowHtml(p, flat) {
  var id = rowId(p.idx);
  return '<div class="prompt-row" id="' + id + '" data-idx="' + p.idx + '"><div class="row-head" data-toggle="' + id + '">' + starHtml(p) +
    '<span class="row-idx">' + p.idx + '</span><button type="button" class="row-title" data-toggle="' + id + '" aria-expanded="false" aria-controls="body-' + id + '">' + escHtml(p.title) + '</button>' +
    '<span class="row-tags">' + tagsHtml(p, flat) + '</span><span class="row-arrow" aria-hidden="true">›</span></div>' +
    '<div class="row-body" id="body-' + id + '"></div></div>';
}
function cardHtml(p) {
  return '<div class="gc" data-idx="' + p.idx + '"><div class="top"><span class="no">' + p.idx + '</span>' + starHtml(p) + '</div>' +
    '<h4><button type="button" class="gc-title" data-open="' + p.idx + '">' + escHtml(p.title) + '</button></h4><p>' + escHtml(p.desc) + '</p>' +
    '<div class="tags">' + tagsHtml(p, true) + '</div><div class="more" aria-hidden="true">프롬프트 보기 →</div></div>';
}
function sectionHtml(label, items, flat) {
  var inner = currentView === 'grid' ? '<div class="pgrid">' + items.map(cardHtml).join('') + '</div>'
    : '<div class="rows' + (flat ? ' flat' : '') + '">' + items.map(function (p) { return rowHtml(p, flat); }).join('') + '</div>';
  return '<div class="section-label">' + escHtml(label) + '</div>' + inner;
}

function render() {
  var main = document.getElementById('mainList'), empty = document.getElementById('emptyMsg');
  var pool = PROMPTS;
  if (currentSpecial === 'favorites') { var favs = getFavorites(); pool = PROMPTS.filter(function (p) { return favs.indexOf(p.idx) >= 0; }); }
  else if (currentSpecial === 'recent') { pool = getRecent().map(findByIdx).filter(Boolean); }
  var q = currentSearch.toLowerCase();
  var filtered = pool.filter(function (p) {
    var matchCat = currentSpecial ? true : (currentCat === '전체' || p.cat === currentCat);
    var matchSearch = !q || p.title.toLowerCase().indexOf(q) >= 0 || p.prompt.toLowerCase().indexOf(q) >= 0 || p.cat.toLowerCase().indexOf(q) >= 0 || p.ai.toLowerCase().indexOf(q) >= 0;
    return matchCat && matchSearch;
  });
  main.innerHTML = '';
  syncTabs();
  if (!filtered.length) {
    empty.style.display = 'block';
    empty.textContent = currentSpecial === 'favorites' ? '아직 즐겨찾기한 프롬프트가 없습니다. ☆ 별표를 눌러 추가해보세요.'
      : currentSpecial === 'recent' ? '아직 열어본 프롬프트가 없습니다.' : '검색 결과가 없습니다. 다른 키워드로 검색해보세요.';
    return;
  }
  empty.style.display = 'none';
  if (currentSpecial) { main.innerHTML = sectionHtml(currentSpecial === 'recent' ? '최근 본 프롬프트' : '즐겨찾기한 프롬프트', filtered, true); return; }
  var html = '', cats = currentCat === '전체' ? catSections : [currentCat];
  cats.forEach(function (cat) {
    var items = filtered.filter(function (p) { return p.cat === cat; });
    if (items.length) html += sectionHtml(catLabels[cat] || cat, items, false);
  });
  main.innerHTML = html;
}

/* ───────── 행 펼치기 / 카드 팝업 ───────── */
function ensureBody(row) {
  var body = row && row.querySelector('.row-body');
  if (body && !body.firstChild) { var p = findByIdx(row.dataset.idx); if (p) body.innerHTML = bodyHtml(p, row.id); } // 처음 펼칠 때만 만든다(172개를 한꺼번에 그리지 않음)
}
function toggleRow(id) {
  var row = document.getElementById(id); if (!row) return;
  var wasOpen = row.classList.contains('open');
  if (!wasOpen) ensureBody(row);
  row.classList.toggle('open', !wasOpen);
  var t = row.querySelector('.row-title'); if (t) t.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
  if (!wasOpen) addRecent(row.dataset.idx);
}
function openModal(idx) {
  var p = findByIdx(idx); if (!p) return;
  var id = rowId(p.idx), pm = document.getElementById('pm');
  document.getElementById('pmTags').innerHTML = tagsHtml(p, true);
  document.getElementById('pmTitle').textContent = p.idx + ' · ' + p.title;
  document.getElementById('pmBody').innerHTML = bodyHtml(p, id);
  pmLastFocus = document.activeElement; pm.hidden = false; document.documentElement.style.overflow = 'hidden';
  document.getElementById('pmClose').focus(); addRecent(p.idx);
}
function closeModal() {
  var pm = document.getElementById('pm'); if (!pm || pm.hidden) return;
  pm.hidden = true; document.documentElement.style.overflow = '';
  if (pmLastFocus && pmLastFocus.focus) { try { pmLastFocus.focus(); } catch (e) {} }
}
function jumpToPrompt(idx) {
  var p = findByIdx(idx); if (!p) return;
  currentSpecial = null; currentSearch = ''; currentCat = p.cat;
  var si = document.getElementById('searchInput'); if (si) si.value = '';
  render();
  if (currentView === 'grid') { openModal(p.idx); return; }
  requestAnimationFrame(function () {
    var row = document.getElementById(rowId(p.idx)); if (!row) return;
    ensureBody(row); row.classList.add('open'); var t = row.querySelector('.row-title'); if (t) t.setAttribute('aria-expanded', 'true');
    addRecent(p.idx); row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
function copyPrompt(id) {
  var el = document.getElementById('code-' + id); if (!el) return;
  var text = el.innerText, ok = document.getElementById('ok-' + id);
  function done() { if (ok) { ok.style.display = 'inline-flex'; setTimeout(function () { ok.style.display = 'none'; }, 2000); } }
  function fallback() {
    var range = document.createRange(); range.selectNodeContents(el);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    try { document.execCommand('copy'); } catch (e) {} sel.removeAllRanges(); done();
  }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback); else fallback();
}

/* ───────── 보기 방식 ───────── */
function setView(v, persist) {
  currentView = v === 'grid' ? 'grid' : 'list';
  Array.prototype.forEach.call(document.querySelectorAll('#viewToggle [data-view]'), function (b) {
    var on = b.dataset.view === currentView; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (persist) lsSet(VIEW_KEY, currentView);
  render();
}

/* ───────── 이벤트 연결 ───────── */
(function bind() {
  var main = document.getElementById('mainList');
  main.addEventListener('click', function (e) {
    var star = e.target.closest('.star-btn');
    if (star) {
      e.stopPropagation();
      toggleFavorite(star.dataset.idx);
      var on = !star.classList.contains('active'); star.classList.toggle('active', on); star.textContent = on ? '★' : '☆'; star.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (currentSpecial === 'favorites') render();
      return;
    }
    var tg = e.target.closest('[data-toggle]'); if (tg) { toggleRow(tg.dataset.toggle); return; }
    var op = e.target.closest('[data-open]') || e.target.closest('.gc'); if (op) openModal(op.dataset.open || op.dataset.idx);
  });
  document.getElementById('filterTabs').addEventListener('click', function (e) {
    var tab = e.target.closest('.ftab'); if (!tab) return;
    currentCat = tab.dataset.cat; currentSpecial = null; render();
  });
  document.getElementById('filterTabsSub').addEventListener('click', function (e) {
    var tab = e.target.closest('.ftab-sub'); if (!tab) return;
    currentSpecial = currentSpecial === tab.dataset.special ? null : tab.dataset.special; render();
  });
  document.getElementById('viewToggle').addEventListener('click', function (e) { var b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view, true); });
  var timer; document.getElementById('searchInput').addEventListener('input', function (e) {
    clearTimeout(timer); timer = setTimeout(function () { currentSearch = e.target.value.trim(); render(); }, 200);
  });
  var today = document.getElementById('todayCard');
  function goToday() { var idx = today.dataset.idx; if (idx) jumpToPrompt(idx); }
  today.addEventListener('click', goToday);
  today.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToday(); } });
  document.getElementById('pmClose').addEventListener('click', closeModal);
  document.getElementById('pm').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  var mq = window.matchMedia('(max-width:900px)');
  if (mq.addEventListener) mq.addEventListener('change', renderReviews); else if (mq.addListener) mq.addListener(renderReviews);
})();

/* ───────── 시작 ───────── */
(function start() {
  var saved = lsGet(VIEW_KEY), url = new URLSearchParams(location.search).get('view');
  currentView = (url === 'grid' || url === 'list') ? url : (saved === 'grid' ? 'grid' : 'list');
  Array.prototype.forEach.call(document.querySelectorAll('#viewToggle [data-view]'), function (b) { var on = b.dataset.view === currentView; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  buildTabs(); updateFavCount(); updateRecentCount(); renderTodayPick(); renderNewPrompts(); renderReviews(); render();
  // 마이페이지 등에서 ?fav=1 로 오면 즐겨찾기 보기로 연다.
  if (new URLSearchParams(location.search).get('fav') === '1') { var fb = document.querySelector('[data-special="favorites"]'); if (fb) fb.click(); }
})();
