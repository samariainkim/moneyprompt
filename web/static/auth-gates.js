/* 돈버프 로그인 게이트 — 기존 정적 페이지의 "심화 기능"을 로그인한 회원만 쓰게 한다.
 * 빌드 때 scripts/sync-static.mjs 가 해당 페이지(<head>)에만 끼워 넣는다. (저장소 루트의 원본 페이지는 수정하지 않음)
 *
 *  - 계산기 4종(#make-prompt) / 투자 성향(#aiCta, #copyBtn): 비로그인이 누르면 기능은 실행하지 않고 로그인 안내 페이지(/join/)로 보낸다.
 *  - 내 결과 저장: 계산 결과·투자 성향 결과 아래에 "내 결과에 저장" 버튼. 비로그인은 /join/ 으로 보내고, 로그인하면 계정에 저장(/api/saved/)한다.
 *    저장한 결과는 /account/saved/ 에서 다시 열 수 있다(?dbx_resume=restore&dbx_saved=<id>).
 *  - 프롬프트 즐겨찾기(★): 비로그인은 /join/ 으로 보내고, 로그인하면 계정에 저장(/api/favorites/)한다.
 *  - 로그인하고 돌아오면(?dbx_resume=…) 입력값을 복원하고 하려던 동작을 자동으로 이어서 실행한다.
 *
 * 이 게이트는 화면 단(소프트) 게이트다. 개발자 도구로 우회할 수 있으며, 가입 유도가 목적이다. */
(function () {
  'use strict';
  if (window.__dbxGates) return;
  window.__dbxGates = true;

  /* ───────── 페이지별 설정 ───────── */
  var CFG = {
    '/calc/brokerage/': { kind: 'form', id: 'calc_brokerage', saveTool: 'calc_brokerage', trigger: '#make-prompt' },
    '/calc/fx/': { kind: 'form', id: 'calc_fx', saveTool: 'calc_fx', trigger: '#make-prompt' },
    '/calc/loan-prepay/': { kind: 'form', id: 'calc_loan', saveTool: 'calc_loan', trigger: '#make-prompt' },
    '/fee/brokerage-fee/': { kind: 'form', id: 'fee_brokerage', saveTool: 'fee_brokerage', trigger: '#make-prompt' },
    '/invest-mbti/': { kind: 'mbti', id: 'mbti_prompt', saveTool: 'mbti', triggers: ['#aiCta', '#copyBtn'] },
    '/prompt/': { kind: 'fav', id: 'fav' }
  };

  var path = location.pathname;
  if (path.charAt(path.length - 1) !== '/') path += '/';
  var cfg = CFG[path];
  if (!cfg) return;

  var STATE_KEY = 'dbx:gate:' + path;
  var STATE_TTL = 24 * 3600 * 1000;
  var RESUME_PARAMS = ['dbx_resume', 'dbx_idx', 'dbx_saved'];
  var MBTI_KEY = 'invest_mbti_session';
  var FAV_LOCAL_KEY = 'moneyprompt_favorites';

  /* ───────── 공통 도우미 ───────── */
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function ga(name, params) { try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {} }
  function cookieHint() { try { return /(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(document.cookie); } catch (e) { return false; } }
  function signedIn() { return window.__dbxAuth ? window.__dbxAuth.signedIn() : cookieHint(); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function fire(el, type) { var ev; try { ev = new Event(type, { bubbles: true }); } catch (e) { ev = document.createEvent('Event'); ev.initEvent(type, true, true); } el.dispatchEvent(ev); }

  function cleanSearch() {
    var q = new URLSearchParams(location.search);
    RESUME_PARAMS.forEach(function (k) { q.delete(k); });
    return q;
  }
  function stripResumeFromUrl() {
    var q = cleanSearch(); var rest = q.toString();
    try { history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) {}
  }
  // 로그인 후 돌아올 주소: 지금 페이지 + 이어서 할 동작 표시
  function resumeUrl(key, extra) {
    var q = cleanSearch(); q.set('dbx_resume', key);
    if (extra) Object.keys(extra).forEach(function (k) { q.set(k, extra[k]); });
    return location.pathname + '?' + q.toString();
  }
  function authUrl(kind, next) { return '/' + kind + '/?next=' + encodeURIComponent(next) + '&src=' + encodeURIComponent(cfg.id); }

  /* ───────── 토스트 ───────── */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'dbx-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.className = 'dbx-toast on';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.className = 'dbx-toast'; }, 2400);
  }

  /* ───────── 스타일 ───────── */
  var CSS =
    '.dbx-gate{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif}' +
    '.dbx-gate[hidden]{display:none}' +
    '.dbx-gate-bg{position:absolute;inset:0;background:rgba(17,24,39,.55)}' +
    '.dbx-gate-card{position:relative;width:100%;max-width:420px;max-height:92vh;overflow:auto;background:#fff;color:#111827;border-radius:18px;padding:24px 22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.28)}' +
    '@media (max-width:560px){.dbx-gate{align-items:flex-end;padding:0}.dbx-gate-card{max-width:none;border-radius:18px 18px 0 0;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))}}' +
    '.dbx-gate-x{position:absolute;top:8px;right:10px;width:36px;height:36px;border:0;background:none;font-size:24px;line-height:1;color:#6b7280;cursor:pointer;border-radius:10px}' +
    '.dbx-gate-x:hover{background:#f3f4f6}' +
    '.dbx-gate-card h2{margin:0 28px 8px 0;font-size:18px;line-height:1.4;letter-spacing:-.3px;font-weight:800}' +
    '.dbx-gate-lead{margin:0 0 12px;font-size:13.5px;line-height:1.65;color:#4b5563}' +
    '.dbx-gate-actions{display:flex;gap:8px;margin-top:4px}' +
    '.dbx-gate-actions button{flex:1;padding:12px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;font:inherit;font-weight:700;font-size:14px;cursor:pointer;color:#374151}' +
    '.dbx-gate-actions button.pri{background:#d97706;border-color:#d97706;color:#fff}' +
    '.dbx-save-wrap{margin:14px 0 4px;display:flex;flex-direction:column;gap:6px;align-items:stretch}' +
    '.dbx-save-wrap[hidden]{display:none}' +
    '.dbx-save{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:13px 16px;border-radius:12px;border:1.5px solid #d97706;background:#fff7ed;color:#b45309;font:700 15px/1.3 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;cursor:pointer}' +
    '.dbx-save:hover{background:#ffedd5}.dbx-save:disabled{opacity:.65;cursor:default}' +
    '.dbx-save-note{font:13px/1.5 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#6b7280;text-align:center}.dbx-save-note a{color:#b45309;font-weight:700}' +
    '.dbx-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);opacity:0;pointer-events:none;z-index:2147483200;background:#111827;color:#fff;padding:10px 16px;border-radius:999px;font:600 13px/1.4 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;transition:opacity .2s,transform .2s;max-width:90vw}' +
    '.dbx-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}';
  function addCss() { var s = document.createElement('style'); s.setAttribute('data-dbx-gates', '1'); s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }

  /* ───────── 시트(가입 안내 / 확인) ───────── */
  var sheet = null, lastFocus = null;
  function closeSheet() {
    if (!sheet) return;
    sheet.hidden = true; document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  function openSheet(html, onReady) {
    if (!sheet) {
      sheet = document.createElement('div'); sheet.className = 'dbx-gate'; sheet.hidden = true;
      sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'dbx-gate-t');
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) { if (e.target.classList.contains('dbx-gate-bg') || e.target.classList.contains('dbx-gate-x') || e.target.classList.contains('dbx-gate-later')) closeSheet(); });
      document.addEventListener('keydown', function (e) {
        if (!sheet || sheet.hidden) return;
        if (e.key === 'Escape') { closeSheet(); return; }
        if (e.key === 'Tab') {
          var f = qsa('a[href],button', sheet); if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }
    lastFocus = document.activeElement;
    sheet.innerHTML = '<div class="dbx-gate-bg"></div><div class="dbx-gate-card">' + html + '</div>';
    sheet.hidden = false; document.documentElement.style.overflow = 'hidden';
    var first = qs('.dbx-gate-go, .dbx-gate-actions .pri', sheet) || qs('button,a', sheet);
    if (first) first.focus();
    if (onReady) onReady(sheet);
  }

  // 로그인 안내 페이지(/join/)로 보낸다. 로그인 후 돌아올 주소(next)에는 하려던 동작(dbx_resume)을 실어 둔다.
  function goJoin(opts) {
    var next = resumeUrl(opts.resume, opts.extra);
    var gid = opts.gateId || cfg.id;
    ga('gate_trigger', { gate_id: gid, transport_type: 'beacon' });
    location.assign('/join/?next=' + encodeURIComponent(next) + '&src=' + encodeURIComponent(gid));
  }

  /* ───────── 입력값 스냅샷 저장·복원 (계산기) ───────── */
  // 눌림(aria-pressed) 버튼을 다시 찾기 위한 선택자. id 나 data-* 속성이 없으면 정확히 다시 찾을 수 없으므로 null.
  function sigOf(el) {
    if (el.id) return '#' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
    var attrs = '';
    Array.prototype.forEach.call(el.attributes, function (a) { if (a.name.indexOf('data-') === 0) attrs += '[' + a.name + '="' + String(a.value).replace(/"/g, '\\"') + '"]'; });
    return attrs ? el.tagName.toLowerCase() + attrs : null;
  }
  function collectState() {
    var s = { t: Date.now(), f: {}, c: {}, ai: [], p: [] };
    qsa('input[id],select[id],textarea[id]').forEach(function (el) {
      if (el.type === 'checkbox' || el.type === 'radio') s.c[el.id] = el.checked; else s.f[el.id] = el.value;
    });
    qsa('.ai-it').forEach(function (el, i) { s.ai[i] = el.checked; });
    qsa('[aria-pressed="true"]').forEach(function (el) { var sg = sigOf(el); if (sg) s.p.push(sg); });
    return s;
  }
  function saveFormState() { lsSet(STATE_KEY, JSON.stringify(collectState())); }
  function loadSnapshot() {
    var raw = lsGet(STATE_KEY); if (!raw) return null;
    var s; try { s = JSON.parse(raw); } catch (e) { return null; }
    if (!s || !s.t || Date.now() - s.t > STATE_TTL) return null;
    return s;
  }
  // 선택 버튼(aria-pressed)을 저장된 대로 맞춘다. 페이지가 아직 버튼 동작을 연결하기 전이면 눌려도 효과가 없으므로,
  // 실제로 눌림 상태가 되었는지 확인해서 돌려준다. (모두 맞춰졌으면 true)
  function applyPressed(s) {
    var all = true;
    s.p.forEach(function (sel) {
      var el; try { el = qs(sel); } catch (e) { el = null; }
      if (!el) return;
      if (el.getAttribute('aria-pressed') !== 'true') el.click();
      if (el.getAttribute('aria-pressed') !== 'true') all = false;
    });
    return all;
  }
  function applyFields(s) {
    Object.keys(s.f).forEach(function (id) { var el = document.getElementById(id); if (!el) return; el.value = s.f[id]; fire(el, 'input'); fire(el, 'change'); });
    Object.keys(s.c).forEach(function (id) { var el = document.getElementById(id); if (!el) return; if (el.checked !== s.c[id]) { el.checked = s.c[id]; fire(el, 'change'); } });
    qsa('.ai-it').forEach(function (el, i) { if (s.ai[i] !== undefined && el.checked !== s.ai[i]) { el.checked = s.ai[i]; fire(el, 'change'); } });
  }
  function visible(el) { return !!el && !el.hidden && (el.offsetWidth || el.offsetHeight || el.getClientRects().length); }

  /* ───────── 내 결과 저장 ───────── */
  var saving = false;
  function saveFail(status) {
    if (status === 409) toast('저장 공간이 가득 찼어요. 내 결과에서 오래된 결과를 지워 주세요.');
    else if (status === 401) toast('로그인이 필요해요.');
    else toast('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  // item: { title, summary, payload }
  function doSave(item, btn, note) {
    if (saving) return; saving = true;
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '저장하는 중…'; }
    fetch('/api/saved/', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: cfg.saveTool, title: item.title, summary: item.summary, payload: item.payload }) })
      .then(function (r) { if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; } return r.json(); })
      .then(function () {
        ga('save_result', { tool: cfg.saveTool });
        toast('내 결과에 저장했어요 ✓');
        if (note) note.innerHTML = '저장했어요. <a href="/account/saved/">내 결과에서 보기</a>';
        if (btn) { btn.textContent = '저장했어요 ✓'; setTimeout(function () { btn.disabled = false; btn.textContent = label; }, 2500); }
      })
      .catch(function (err) { saveFail(err && err.status); if (btn) { btn.disabled = false; btn.textContent = label; } })
      .then(function () { saving = false; });
  }
  // 저장 버튼을 만들고 클릭을 연결한다. getItem 은 클릭 시점의 화면에서 저장 내용을 만든다.
  function makeSaveButton(getItem, resumeKey) {
    var wrap = document.createElement('div'); wrap.className = 'dbx-save-wrap'; wrap.hidden = true;
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'dbx-save'; btn.textContent = '☆ 내 결과에 저장';
    var note = document.createElement('div'); note.className = 'dbx-save-note';
    note.textContent = signedIn() ? '' : '로그인하면 이 결과를 내 계정에 저장해 언제든 다시 볼 수 있어요.';
    wrap.appendChild(btn); wrap.appendChild(note);
    btn.addEventListener('click', function () {
      var item = getItem(); if (!item) { toast('저장할 결과가 아직 없어요.'); return; }
      if (!signedIn()) { if (resumeKey === 'save') saveFormState(); ga('save_click', { tool: cfg.saveTool, signed_in: false }); goJoin({ resume: 'save', gateId: 'save_' + cfg.id }); return; }
      ga('save_click', { tool: cfg.saveTool, signed_in: true });
      doSave(item, btn, note);
    });
    if (window.__dbxAuth) window.__dbxAuth.onChange(function (s) { if (s) note.textContent = ''; });
    return { wrap: wrap, btn: btn, note: note };
  }
  function oneLine(t, n) { return String(t || '').replace(/\s+/g, ' ').trim().slice(0, n); }

  /* ───────── 계산기: 게이트 + 이어하기 ───────── */
  function formItem() {
    var title = oneLine((document.title || '').split('·')[0], 80) || cfg.saveTool;
    var big = qs('#r-big'); var res = qs('#result');
    var summary = oneLine(big && big.innerText ? big.innerText : (res ? res.innerText : ''), 100);
    return { title: title, summary: summary, payload: collectState() };
  }
  function initSaveForm() {
    var res = qs('#result'); if (!res) return;
    var ui = makeSaveButton(formItem, 'save');
    res.parentNode.insertBefore(ui.wrap, res.nextSibling);
    function sync() { ui.wrap.hidden = !visible(res) || (res.textContent || '').trim().length < 20; }
    sync();
    if (window.MutationObserver) new MutationObserver(sync).observe(res, { attributes: true, attributeFilter: ['hidden', 'style', 'class'], childList: true, subtree: true });
    return ui;
  }
  function initForm() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest(cfg.trigger);
      if (!t || signedIn()) return;
      e.preventDefault(); e.stopImmediatePropagation();
      saveFormState();
      goJoin({ resume: 'make-prompt' });
    }, true);

    var ui = initSaveForm();
    var mode = new URLSearchParams(location.search).get('dbx_resume');
    if (mode === 'make-prompt') resumeForm(loadSnapshot, 'prompt');
    else if (mode === 'save') resumeForm(loadSnapshot, 'save', ui);
    else if (mode === 'restore') resumeForm(loadSaved, 'restore');
  }
  // 저장해 둔 결과(서버)를 불러온다. 성공하면 snap 을 콜백으로 돌려준다.
  function loadSaved(cb) {
    var id = new URLSearchParams(location.search).get('dbx_saved');
    if (!id) return cb(null);
    fetch('/api/saved/?id=' + encodeURIComponent(id), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) { var p = j && j.item && j.item.payload; cb(p && p.f ? p : null); })
      .catch(function () { cb(null); });
  }
  // getSnap: 동기(로그인 복귀: localStorage) 또는 비동기(저장 결과: 서버) 모두 지원. final: 'prompt' | 'save' | 'restore'
  function resumeForm(getSnap, final, ui) {
    if (!signedIn()) { stripResumeFromUrl(); return; }
    if (getSnap.length) { getSnap(function (snap) { runResume(snap, final, ui); }); return; }
    runResume(getSnap(), final, ui);
  }
  function runResume(snap, final, ui) {
    if (!snap) { stripResumeFromUrl(); if (final === 'restore') toast('저장한 결과를 불러오지 못했어요.'); return; }
    var tries = 0, fieldsApplied = false, goClicks = 0;
    (function step() {
      tries++;
      var trigger = qs(cfg.trigger);
      if (trigger) {
        // 1) 선택 버튼이 실제로 맞춰질 때까지 반복 → 2) 입력값 채움 → 3) 계산 → 4) 프롬프트 만들기
        var pressedOk = applyPressed(snap);
        if ((pressedOk || tries > 24) && !fieldsApplied) { applyFields(snap); fieldsApplied = true; }
        if (fieldsApplied) {
          var res = qs('#result');
          if (visible(res) && (res.textContent || '').trim().length > 20) {
            stripResumeFromUrl();
            if (final === 'restore') {
              toast('저장한 결과를 불러왔어요.');
              try { res.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
            } else if (final === 'save') {
              lsDel(STATE_KEY);
              doSave(formItem(), ui && ui.btn, ui && ui.note);
              try { res.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
            } else {
              lsDel(STATE_KEY);
              trigger.click();
              try { trigger.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
            }
            return;
          }
          var go = qs('#go');
          if (go && goClicks < 6 && tries % 3 === 0) { goClicks++; go.click(); }
        }
      }
      if (tries < 40) setTimeout(step, 250);
      else { stripResumeFromUrl(); toast('입력값을 복원했어요. 계산하기를 눌러 주세요.'); }
    })();
  }

  /* ───────── 투자 성향: 게이트 + 이어하기 + 프롬프트 일부만 노출 ───────── */
  function mbtiTeaser() {
    var pt = qs('#promptText');
    if (!pt || pt.getAttribute('data-dbx-teaser') || signedIn()) return;
    var full = pt.textContent || '';
    if (full.length < 200) return;
    var lines = full.split('\n').filter(function (l) { return l.trim(); }).slice(0, 5);
    pt.setAttribute('data-dbx-teaser', lines.join('\n'));
    pt.textContent = lines.join('\n') + '\n…';
  }
  function mbtiSession() {
    try { var s = JSON.parse(lsGet(MBTI_KEY)); return s && s.result && s.result.type_code ? s : null; } catch (e) { return null; }
  }
  function mbtiItem() {
    var s = mbtiSession(); if (!s) return null;
    var r = s.result;
    return { title: oneLine('투자 성향 · ' + r.type_code + (r.type_name ? ' ' + r.type_name : ''), 80), summary: oneLine(r.type_catchline, 120), payload: s };
  }
  function initMbtiSave() {
    var app = document.getElementById('app'); if (!app) return null;
    var ui = makeSaveButton(mbtiItem, 'save'); ui.wrap.hidden = false;
    function ensure() {
      var cta = qs('#aiCta', app); if (!cta || !cta.parentNode) return;
      var anchor = cta.parentNode;
      if (ui.wrap.parentNode !== anchor.parentNode || ui.wrap.nextSibling !== anchor) anchor.parentNode.insertBefore(ui.wrap, anchor);
    }
    ensure();
    if (window.MutationObserver) new MutationObserver(ensure).observe(app, { childList: true, subtree: true });
    return ui;
  }
  function initMbti() {
    var sel = cfg.triggers.join(',');
    var ui = initMbtiSave();
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest(sel);
      if (!t || signedIn()) return;
      e.preventDefault(); e.stopImmediatePropagation();
      mbtiTeaser();
      goJoin({ resume: 'aiCta' });
    }, true);
    // 결과 화면이 그려질 때마다, 비로그인이면 프롬프트 전문이 화면(DOM)에 남지 않게 일부만 남긴다.
    var app = document.getElementById('app') || document.body;
    if (window.MutationObserver) new MutationObserver(function () { if (!signedIn()) mbtiTeaser(); }).observe(app, { childList: true, subtree: true });

    var mode = new URLSearchParams(location.search).get('dbx_resume');
    if (mode === 'save') {
      stripResumeFromUrl();
      if (signedIn() && mbtiSession()) doSave(mbtiItem(), ui && ui.btn, ui && ui.note);
      return;
    }
    if (mode === 'restore') {
      if (!signedIn()) { stripResumeFromUrl(); return; }
      var sid = new URLSearchParams(location.search).get('dbx_saved');
      stripResumeFromUrl();
      if (!sid) return;
      fetch('/api/saved/?id=' + encodeURIComponent(sid), { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) {
          var p = j && j.item && j.item.payload;
          if (!p || !p.result) throw new Error('empty');
          lsSet(MBTI_KEY, JSON.stringify(p)); location.replace(location.pathname);
        })
        .catch(function () { toast('저장한 결과를 불러오지 못했어요.'); });
      return;
    }
    if (mode === 'aiCta') {
      if (!signedIn()) { stripResumeFromUrl(); return; }
      var tries = 0;
      (function step() {
        var cta = qs('#aiCta');
        if (cta) { stripResumeFromUrl(); cta.click(); try { cta.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} return; }
        if (++tries < 40) setTimeout(step, 150); else stripResumeFromUrl();
      })();
    }
  }

  /* ───────── 즐겨찾기 ───────── */
  var favs = null;          // 서버에서 받은 즐겨찾기(로그인 후)
  var favsError = false;    // 서버가 오류(401 제외)를 돌려준 경우
  function localFavs() { try { var a = JSON.parse(lsGet(FAV_LOCAL_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function api(method, body) {
    return fetch('/api/favorites/', { method: method, credentials: 'same-origin', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; } return r.json(); });
  }
  function rerender() { try { if (typeof window.updateFavCount === 'function') window.updateFavCount(); if (typeof window.render === 'function') window.render(); } catch (e) {} }

  function initFav() {
    // 별 클릭: 비로그인이면 안내 시트 (즐겨찾기 상태는 바꾸지 않는다)
    document.addEventListener('click', function (e) {
      var star = e.target.closest && e.target.closest('.star-btn');
      if (!star) return;
      if (!signedIn()) {
        e.preventDefault(); e.stopImmediatePropagation();
        goJoin({ resume: 'fav', extra: { dbx_idx: star.getAttribute('data-idx') || '' } });
        return;
      }
      if (favs === null) { e.preventDefault(); e.stopImmediatePropagation(); toast(favsError ? '지금은 즐겨찾기를 사용할 수 없어요. 잠시 후 다시 시도해 주세요.' : '즐겨찾기를 불러오는 중이에요. 잠시 후 다시 눌러 주세요.'); }
    }, true);

    if (signedIn()) loadFavs();
    if (window.__dbxAuth) window.__dbxAuth.onChange(function (s) { if (s && favs === null) loadFavs(); });
  }

  function loadFavs() {
    if (favs !== null || loadFavs.busy) return; loadFavs.busy = true;
    api('GET').then(function (j) {
      favs = Array.isArray(j.keys) ? j.keys : [];
      // 이 페이지의 즐겨찾기 저장소를 서버로 바꿔 끼운다. (페이지 코드는 그대로 두고 전역 함수만 교체)
      window.getFavorites = function () { return favs.slice(); };
      window.saveFavorites = function () {};
      window.toggleFavorite = function (idx) {
        var on = favs.indexOf(idx) < 0;
        favs = on ? favs.concat([idx]) : favs.filter(function (k) { return k !== idx; });
        ga('favorite_toggle', { action: on ? 'add' : 'remove', prompt_idx: idx });
        if (typeof window.updateFavCount === 'function') window.updateFavCount();
        api('POST', { key: idx, on: on }).catch(function () {
          favs = on ? favs.filter(function (k) { return k !== idx; }) : favs.concat([idx]);
          rerender(); toast('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
        });
      };
      rerender();
      resumeFav();
      offerMigration();
    }).catch(function (err) { if (!err || err.status !== 401) favsError = true; /* 401 은 세션 없음(비로그인 처리) */ }).then(function () { loadFavs.busy = false; });
  }

  function resumeFav() {
    var q = new URLSearchParams(location.search);
    if (q.get('dbx_resume') !== 'fav') return;
    var idx = q.get('dbx_idx'); stripResumeFromUrl();
    if (idx && /^\d{2}\/\d{2}$/.test(idx) && favs.indexOf(idx) < 0) { window.toggleFavorite(idx); rerender(); toast('즐겨찾기에 추가했어요 ★'); }
  }

  function offerMigration() {
    var local = localFavs(); if (!local.length) return;
    var snooze = parseInt(lsGet('dbx:fav:snooze') || '0', 10); if (snooze && Date.now() < snooze) return;
    var html = '<button type="button" class="dbx-gate-x" aria-label="닫기">×</button>' +
      '<h2 id="dbx-gate-t">이 기기의 즐겨찾기를 계정으로 옮길까요?</h2>' +
      '<p class="dbx-gate-lead">이 기기에 저장된 즐겨찾기 <b>' + local.length + '개</b>를 내 계정으로 옮기면 어느 기기에서든 볼 수 있어요.</p>' +
      '<div class="dbx-gate-actions"><button type="button" data-m="later">나중에</button><button type="button" class="pri" data-m="move">옮기기</button></div>';
    openSheet(html, function (root) {
      qs('[data-m="later"]', root).addEventListener('click', function () { lsSet('dbx:fav:snooze', String(Date.now() + 7 * 24 * 3600 * 1000)); closeSheet(); });
      qs('[data-m="move"]', root).addEventListener('click', function () {
        var b = this; b.disabled = true; b.textContent = '옮기는 중…';
        api('PUT', { keys: local }).then(function (j) {
          favs = Array.isArray(j.keys) ? j.keys : favs;
          lsDel(FAV_LOCAL_KEY); lsDel('dbx:fav:snooze');
          closeSheet(); rerender(); toast('즐겨찾기 ' + local.length + '개를 계정으로 옮겼어요');
        }).catch(function () { b.disabled = false; b.textContent = '옮기기'; toast('옮기지 못했어요. 잠시 후 다시 시도해 주세요.'); });
      });
    });
  }

  /* ───────── 시작 ───────── */
  function start() {
    addCss();
    if (cfg.kind === 'form') initForm();
    else if (cfg.kind === 'mbti') initMbti();
    else if (cfg.kind === 'fav') initFav();
  }
  // 클릭 가로채기(capture)는 문서가 아직 읽히는 중이어도 걸 수 있다. 전역 함수 교체는 페이지 스크립트가 끝난 뒤여야 하므로 DOM 준비 후 시작한다.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
