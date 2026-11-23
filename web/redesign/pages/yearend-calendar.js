/* 연말정산 일정·체크리스트(/yearend/calendar/) — 데이터(yeCal)로 그린다.
   체크는 항목별 3상태(미확인 / 확인함 / 해당 없음)이며 이 기기(localStorage)에만 저장한다. 서버로 보내지 않고, 측정에는 항목 ID·상태만 보낸다. */
(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('yeCal').textContent), C = YearendCal, KEY = 'dbx:ye:cal';
  var $ = function (id) { return document.getElementById(id); };
  function ga(n, p) { try { if (typeof window.gtag === 'function') window.gtag('event', n, p || {}); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var today = C.kstToday(), st = {}; // st[id] = 'done' | 'na'
  (function load() { try { var j = JSON.parse(lsGet(KEY) || 'null'); if (j && j.v === 1 && j.s) Object.keys(j.s).forEach(function (id) { if ((j.s[id] === 'done' || j.s[id] === 'na') && D.items.some(function (i) { return i.id === id; })) st[id] = j.s[id]; }); } catch (e) {} })();
  function save() { lsSet(KEY, JSON.stringify({ v: 1, s: st })); }
  function toast(m) { var t = $('calToast'); t.textContent = m; t.className = 'toast2 on'; clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = 'toast2'; }, 2200); }
  function md(s) { var p = s.split('-'); return +p[1] + '/' + +p[2]; }

  function actionHtml(it) {
    var a = it.action;
    if (a.type === 'none') return '';
    if (a.type === 'off') return '<span class="btn dis sm" aria-disabled="true">' + esc(a.label) + '</span>';
    var ext = a.type === 'ext', cls = a.type === 'checkup' ? 'btn or sm' : 'btn line sm';
    return '<a class="' + cls + '" href="' + esc(a.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + ' data-ga="ye_cal_cta" data-type="' + a.type + '" data-id="' + esc(it.id) + '">' + esc(a.label) + (ext ? ' ↗' : ' →') + '</a>';
  }
  function itemHtml(it) {
    var s = C.STATUS[it.status], dd = C.dday(it, today), chips = [];
    if (dd && dd.kind !== 'done') chips.push('<span class="ch dd">' + esc(dd.text) + '</span>');
    chips.push('<span class="ch ' + s[0] + '">' + esc(s[1]) + '</span>');
    if (it.where) chips.push('<span class="ch">' + esc(it.where) + '</span>');
    var when = it.when || (it.start && it.end ? md(it.start) + '~' + md(it.end) : (it.start ? md(it.start) : ''));
    if (when) chips.push('<span class="ch">' + esc(when) + '</span>');
    var src = it.source ? '<span class="src">출처: ' + esc(it.source.name) + (it.source.url ? ' · <a href="' + esc(it.source.url) + '" target="_blank" rel="noopener" data-ga="ye_cal_cta" data-type="source" data-id="' + esc(it.id) + '">공식 자료 ↗</a>' : '') + '</span>' : (it.status === 'company' ? '<span class="src">회사 공지를 확인하세요</span>' : '');
    var rel = it.related ? '<span class="src rel">관련 글: <a href="' + esc(it.related.url) + '" target="_blank" rel="noopener" data-ga="ye_cal_cta" data-type="post" data-id="' + esc(it.id) + '">' + esc(it.related.label) + ' ↗</a></span>' : '';
    var cls = 'it' + (st[it.id] === 'done' ? ' done' : '') + (st[it.id] === 'na' ? ' na' : '');
    return '<div class="' + cls + '" id="' + esc(it.id) + '"><button type="button" class="cb" role="checkbox" aria-checked="' + (st[it.id] === 'done') + '" aria-label="' + esc(it.title) + ' 확인함" data-chk="' + esc(it.id) + '"' + (st[it.id] === 'na' ? ' disabled' : '') + '></button>' +
      '<div><h3>' + esc(it.title) + '</h3><div class="mt">' + chips.join('') + src + rel + '</div>' + (it.note ? '<p class="note">' + esc(it.note) + '</p>' : '') + '</div>' +
      '<div class="act">' + actionHtml(it) + '<button type="button" class="na-b" data-na="' + esc(it.id) + '" aria-pressed="' + (st[it.id] === 'na') + '">' + (st[it.id] === 'na' ? '해당 없음 취소' : '해당 없음') + '</button></div></div>';
  }
  function counts(list) { var d = 0, n = 0; list.forEach(function (i) { if (st[i.id] === 'done') d++; else if (st[i.id] === 'na') n++; }); return { d: d, n: n, left: list.length - d - n }; }
  function render(keepOpen) {
    var items = D.items, openIds = {};
    if (keepOpen) Array.prototype.forEach.call(document.querySelectorAll('details.psec'), function (el) { openIds[el.id] = el.open; });
    var mobile = window.matchMedia('(max-width:900px)').matches, hash = decodeURIComponent((location.hash || '').slice(1));
    var hashPhase = (items.filter(function (i) { return i.id === hash; })[0] || {}).phase;
    var nowPhase = D.phases.filter(function (p) { return p.start && p.end && p.start <= today && today <= p.end; })[0];
    var activeA = D.phases[0] && D.phases[0].start <= today && today <= D.phases[0].end;
    $('calToday').innerHTML = '오늘 <b>' + md(today) + '</b> · ' + (activeA ? '지금은 <b>미리보기 단계</b>' : '연말정산 준비 중');
    var all = counts(items), done = all.d + all.n;
    $('calProg').innerHTML = '내 체크리스트 <i><b style="width:' + Math.round(done / items.length * 100) + '%"></b></i> <span>확인 ' + all.d + ' · 해당 없음 ' + all.n + ' · 남음 ' + all.left + ' / ' + items.length + '</span>';
    $('calTl').innerHTML = D.phases.map(function (p) {
      var cur = p.id === 'A' && activeA, soon = p.id === 'B' && today <= p.end, dd = cur ? C.dday({ start: p.start, end: p.end }, today) : null;
      return '<div class="ph' + (cur ? ' now' : (soon ? ' soon' : '')) + '"><i></i><b>' + p.id + '. ' + esc(p.name) + '</b><span>' + esc(p.period) + '</span>' + (cur ? '<em>지금 여기 · ' + esc(dd.text) + '</em>' : (soon ? '<em class="soft">지금부터 준비 가능</em>' : '')) + '</div>';
    }).join('');
    $('calBody').innerHTML = D.phases.map(function (p) {
      var list = items.filter(function (i) { return i.phase === p.id; }); if (!list.length) return '';
      var c = counts(list), cur = p.id === 'A' && activeA, soon = p.id === 'B' && today <= p.end;
      var open = keepOpen && p.id in openIds ? openIds[p.id] : (!mobile || p.id === hashPhase || (!hashPhase && (cur || (!activeA && soon))));
      return '<section class="sec2"><div class="wrap"><details class="psec" id="' + p.id + '"' + (open ? ' open' : '') + '><summary><h2>' + p.id + '. ' + esc(p.name) + '</h2><span class="per">' + esc(p.period) + '</span>' + (cur ? '<span class="nowb">● 지금 진행 중</span>' : (soon ? '<span class="nowb soft">지금부터 준비 가능</span>' : '')) + '<span class="cnt">' + (c.d + c.n) + ' / ' + list.length + '</span><span class="chev" aria-hidden="true">▾</span></summary><div class="list">' + list.map(itemHtml).join('') + '</div></details></div></section>';
    }).join('');
  }
  function focusHash(first) {
    var id = decodeURIComponent((location.hash || '').slice(1)), el = id && document.getElementById(id); if (!el || !el.classList.contains('it')) return;
    var d = el.closest('details'); if (d) d.open = true;
    setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('hl'); setTimeout(function () { el.classList.remove('hl'); }, 2600); }, first ? 250 : 0);
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-chk]'), n = e.target.closest && e.target.closest('[data-na]'), a = e.target.closest && e.target.closest('a[data-ga^="ye_"]');
    if (c) { var id = c.getAttribute('data-chk'); if (st[id] === 'na') return; if (st[id] === 'done') delete st[id]; else st[id] = 'done'; save(); render(true); ga('ye_cal_check', { id: id, state: st[id] || 'none' }); if (st[id] === 'done') toast('확인했어요 ✓'); return; }
    if (n) { var nid = n.getAttribute('data-na'); if (st[nid] === 'na') delete st[nid]; else st[nid] = 'na'; save(); render(true); ga('ye_cal_check', { id: nid, state: st[nid] || 'none' }); return; }
    if (a) { var p = {}; ['type', 'id'].forEach(function (k) { var v = a.getAttribute('data-' + k); if (v) p[k] = v; }); ga(a.getAttribute('data-ga'), p); }
  });
  window.addEventListener('hashchange', function () { render(true); focusHash(false); });
  render(false); focusHash(true);
  ga('ye_cal_view', { from: location.hash ? 'hub' : 'direct' });
})();
