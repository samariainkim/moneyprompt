/* 나의 연말정산 체크업(/yearend/checkup/) — 질문 → 확인해 볼 항목 → (로그인 후) AI 질문 미리보기·복사
   판정 로직은 yearend-engine.js, 프롬프트 생성·점검은 yearend-prompt.js. 이 파일은 화면만 그린다.
   입력은 선택지뿐이고 금액·자유 텍스트는 받지 않는다. 응답은 이 기기(localStorage)에만 24시간 보관한다(로그인 후 이어하기용). */
(function () {
  'use strict';
  var RULES = JSON.parse(document.getElementById('yeRules').textContent);
  var PDATA = JSON.parse(document.getElementById('yePrompt').textContent);
  var E = YearendEngine.make(RULES), PR = YearendPrompt.make(PDATA, E);
  var MODE = RULES.meta.profile;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'dbx:ye:answers', TTL = 24 * 3600 * 1000;

  function ga(name, p) { try { if (typeof window.gtag === 'function') window.gtag('event', name, p || {}); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function signedIn() { try { return window.__dbxAuth ? window.__dbxAuth.signedIn() : /(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(document.cookie); } catch (e) { return false; } }

  /* ── 질문 화면 문구 ── (선택지 ID 는 rules JSON 과 같아야 한다 — 빌드가 라벨 누락을 확인한다) */
  var QUI = {
    Q1: { t: '올해 근무 상황은 어땠나요?', s: '가장 가까운 것을 하나 골라 주세요.', why: '이직한 해에는 전 직장 소득과 자료를 합산해 정산해야 할 수 있어요. 회사명이나 금액은 묻지 않아요.',
      o: { same: ['올해 계속 같은 회사에서 근무했어요'], first_job: ['올해 처음 근로소득이 생겼어요', '첫 취업 · 입사 전 소득이 없던 경우'], other_workplace: ['올해 다른 회사에서도 근무한 적이 있어요', '이직 · 중간에 퇴사 후 재취업 · 두 곳 이상 근무'], unknown: ['잘 모르겠어요'] } },
    Q2: { t: '현재 어떤 형태의 집에서 살고 계세요?', s: '가장 가까운 것을 하나 골라 주세요. 이사 여부는 마지막 질문에서 물어봐요.', why: '월세로 살고 있다면 관련 공제 요건을 확인해 볼 수 있어요. 주소나 금액은 묻지 않아요.',
      o: { rent: ['월세로 살고 있어요'], jeonse: ['전세로 살고 있어요'], own: ['본인 또는 배우자 소유의 집에 살고 있어요'], family: ['가족이나 다른 사람의 집에 살고 있어요'], unknown: ['잘 모르겠어요 · 기타'] } },
    Q3: { t: '함께 사는 가족이나 부양하는 가족이 있나요?', s: '해당하는 것을 모두 골라 주세요.', why: '가족이 있다고 해서 부양가족 공제 대상이 되는 것은 아니에요. 소득·연령 등 요건은 결과에서 확인해 드려요.',
      o: { spouse: ['배우자가 있어요'], child_young: ['초등학생 이하 자녀가 있어요'], child_older: ['중·고등학생 또는 대학생 자녀가 있어요'], parent: ['부모님 등 직계존속을 부양하고 있어요'], none: ['해당 없어요'] }, hint: '"해당 없어요"를 고르면 다른 선택은 해제돼요.' },
    Q4: { t: '배우자도 소득이 있어 맞벌이인가요?', s: '가장 가까운 것을 하나 골라 주세요.', why: '부양가족 공제는 중복해서 받을 수 없는 요건이 있어 맞벌이 여부를 확인해요. 금액은 묻지 않아요.',
      o: { dual: ['맞벌이예요'], single_income: ['외벌이예요', '배우자에게 소득이 없는 경우'], unknown: ['잘 모르겠어요'] } },
    Q5: { t: '연금저축이나 IRP에 올해 납입하셨나요?', s: '가장 가까운 것을 하나 골라 주세요.', why: '12월 31일까지 납입한 금액이 올해 기준이라, 연말 전에 확인해 볼 항목인지 알려 드려요.',
      o: { paid: ['올해 직접 납입했어요', '납입한 내역이 있어요'], joined_unpaid: ['가입은 했지만 올해는 납입하지 않았어요', '납입 내역은 연말 전에 다시 확인해요'], none: ['가입하지 않았어요', '결과에서는 제외돼요'], unknown: ['잘 모르겠어요', '가입·납입 여부부터 확인하도록 안내해요'] } },
    Q6: { t: '올해 큰 지출이 있었나요?', s: '해당하는 것을 모두 골라 주세요. 금액은 묻지 않아요.', why: '의료비·교육비·기부금은 항목마다 확인할 요건이 달라요. 해당하는 것만 골라 주세요.',
      o: { medical: ['의료비 지출이 있었어요'], edu: ['교육비 지출이 있었어요'], donation: ['기부를 했어요'], none: ['해당 없어요'] } },
    Q6M: { t: '의료비 중 해당하는 것이 있나요? (선택)', o: { insurance_received: ['실손보험금을 받았어요'], infertility: ['난임 관련 지출이 있어요'], premature_congenital: ['미숙아·선천성이상아 관련 지출이 있어요'] } },
    Q6D: { t: '기부 중 해당하는 것이 있나요? (선택)', o: { hometown: ['고향사랑기부를 했어요'], other: ['그 외 기부를 했어요'] } },
    Q7: { t: '올해 카드·현금영수증을 사용했나요?', s: '해당하는 것을 모두 골라 주세요.', why: '사용 수단마다 공제 방식이 달라요. 사용 금액은 묻지 않고, 어떤 항목을 확인해 볼지만 알려 드려요.',
      groups: [['결제 수단', ['credit', 'debit', 'cash_receipt']], ['추가로 해당하는 사용처', ['market_transit', 'none']]],
      o: { credit: ['신용카드'], debit: ['체크카드'], cash_receipt: ['현금영수증'], market_transit: ['전통시장 · 대중교통을 이용했어요', '공제 항목이 따로 나뉘는 사용처예요'], none: ['해당 없어요'] } },
    Q8: { t: '올해 생활에 변화가 있었나요?', s: '해당하는 것을 모두 골라 주세요.', why: '변화마다 확인할 공제가 달라요. 이사는 주거 관련, 출산·입양은 자녀 관련, 가족 소득 변화는 부양가족 요건 확인으로 이어져요.',
      o: { married: ['결혼했어요'], birth: ['출산 또는 입양했어요'], moved: ['이사했어요'], family_income: ['가족의 소득에 변화가 있었어요'], none: ['해당 없어요'], unknown: ['잘 모르겠어요'] } }
  };
  var QDEF = {}; RULES.questions.forEach(function (q) { QDEF[q.id] = q; });
  var SUBQ = { Q6: ['Q6M', 'Q6D'] }, SUBSHOW = { Q6M: ['Q6', 'medical'], Q6D: ['Q6', 'donation'] };
  var EVID = { 'TAX-2026-PENSION': '연금저축·IRP 납입 내역(금융회사 확인)', 'TAX-2026-RENT': '임대차계약서, 월세 납부 내역', 'TAX-2026-MARRIAGE': '혼인관계증명서 등 공식 서류', 'TAX-2026-CHILD': '자녀 관련 증빙(가족관계 서류 등)', 'TAX-2026-CARD': '카드 사용내역(간소화 자료)', 'TAX-2026-DEPENDENT': '부양가족 관계·소득 확인 서류', 'TAX-2026-MEDICAL': '의료비 영수증·간소화 자료', 'TAX-2026-EDU': '교육비 납입 증명·간소화 자료', 'TAX-2026-DONATION': '기부금 영수증·간소화 자료', 'TAX-2026-JOB-CHANGE': '전 직장 근로소득 원천징수영수증' };
  var STEPCHIP = { '세액공제': '6단계 · 세액공제', '소득공제': '3단계 · 소득공제' };
  var PRESET = { first: { Q1: 'first_job' }, rent: { Q2: 'rent' }, dual: { Q3: ['spouse'], Q4: 'dual' }, child: { Q3: ['child_young'] }, pension: { Q5: 'paid' }, job: { Q1: 'other_workplace' } };

  /* ── 상태 ── */
  var ans = {}, stepIdx = 0, seenResult = false;
  function steps() { var s = ['Q1', 'Q2', 'Q3']; if ((ans.Q3 || []).indexOf('spouse') >= 0) s.push('Q4'); return s.concat(['Q5', 'Q6', 'Q7', 'Q8']); }
  function save() { lsSet(KEY, JSON.stringify({ v: 1, ts: Date.now(), ans: ans })); }
  function load() { try { var j = JSON.parse(lsGet(KEY) || 'null'); if (j && j.v === 1 && Date.now() - j.ts < TTL && j.ans && typeof j.ans === 'object') return j.ans; } catch (e) {} lsDel(KEY); return null; }
  function sane(a) { try { E.run(a, { mode: MODE }); return true; } catch (e) { return false; } }
  function show(which) { ['ycIntro', 'ycQ', 'ycR'].forEach(function (id) { $(id).hidden = id !== which; }); window.scrollTo(0, 0); }
  function toast(m) { var t = $('ycToast'); t.textContent = m; t.className = 'yc-toast on'; clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = 'yc-toast'; }, 2600); }

  /* ── 질문 화면 ── */
  function isMulti(q) { return QDEF[q].type === 'multi'; }
  function cur(q) { var v = ans[q]; return v === undefined ? [] : (Array.isArray(v) ? v : [v]); }
  function optHtml(q, v) {
    var u = QUI[q].o[v], on = cur(q).indexOf(v) >= 0, multi = isMulti(q);
    return '<label class="opt' + (on ? ' on' : '') + '"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + q + '" value="' + v + '"' + (on ? ' checked' : '') + '><span class="cb' + (multi ? '' : ' rd') + '" aria-hidden="true"></span><span class="tx">' + esc(u[0]) + (u[1] ? '<small>' + esc(u[1]) + '</small>' : '') + '</span></label>';
  }
  function optionsHtml(q) {
    var ui = QUI[q];
    if (ui.groups) return ui.groups.map(function (g) { return '<div class="sec">' + esc(g[0]) + '</div>' + g[1].map(function (v) { return optHtml(q, v); }).join(''); }).join('');
    return QDEF[q].options.map(function (v) { return optHtml(q, v); }).join('');
  }
  function subHtml(q) {
    return (SUBQ[q] || []).map(function (sq) { var c = SUBSHOW[sq]; if (cur(c[0]).indexOf(c[1]) < 0) return ''; return '<fieldset class="sub" data-q="' + sq + '"><legend>' + esc(QUI[sq].t) + '</legend>' + QDEF[sq].options.map(function (v) { return optHtml(sq, v); }).join('') + '</fieldset>'; }).join('');
  }
  function renderQ() {
    var list = steps(), q = list[stepIdx], ui = QUI[q], tot = list.length, n = stepIdx + 1;
    var note = (q === 'Q5' && (ans.Q3 || []).indexOf('spouse') < 0) ? '<div class="prgn">배우자가 없어 맞벌이 질문은 건너뛰었어요 · 진행률이 자동으로 조정돼요</div>' : '';
    $('ycQ').innerHTML = '<div class="yc-qwrap"><div class="yc-qtop"><span class="qn">연말정산 체크업 · ' + n + ' / ' + tot + '</span><button type="button" class="quit" id="ycQuit">그만두기</button></div>' +
      '<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + tot + '" aria-valuenow="' + n + '"><i style="width:' + Math.round(n / tot * 100) + '%"></i></div>' + note +
      '<h2 id="ycQT" tabindex="-1">' + esc(ui.t) + '</h2><p class="s">' + esc(ui.s || '') + '</p>' +
      '<form id="ycForm" onsubmit="return false"><fieldset class="opts" aria-labelledby="ycQT"><div id="ycOpts">' + optionsHtml(q) + '</div><div id="ycSubs">' + subHtml(q) + '</div></fieldset>' + (ui.hint ? '<div class="hint">' + esc(ui.hint) + '</div>' : '') + '</form>' +
      '<div class="why"><span aria-hidden="true">💡</span><span><b>왜 묻나요?</b> ' + esc(ui.why) + '</span></div>' +
      '<div class="nxt"><button type="button" class="btn line" id="ycPrev"' + (stepIdx === 0 ? ' disabled' : '') + '>이전</button><button type="button" class="btn or" id="ycNext">' + (stepIdx === tot - 1 ? '결과 보기 →' : '다음 →') + '</button></div>' +
      '<button type="button" class="skip" id="ycSkip">이 질문 건너뛰기</button></div>';
    syncNext(q); $('ycQT').focus({ preventScroll: true });
    ga('ye_q_view', { q: q, n: n, total: tot });
  }
  function syncNext(q) { var b = $('ycNext'); if (b) b.disabled = cur(q).length === 0; }
  function onChange(e) {
    var inp = e.target; if (!inp || inp.tagName !== 'INPUT') return;
    var q = inp.name, v = inp.value, def = QDEF[q]; if (!def) return;
    if (def.type === 'single') ans[q] = v;
    else {
      var set = cur(q).slice(), ex = def.exclusive || [];
      if (inp.checked) { if (ex.indexOf(v) >= 0) set = [v]; else set = set.filter(function (x) { return ex.indexOf(x) < 0; }).concat(v); }
      else set = set.filter(function (x) { return x !== v; });
      if (set.length) ans[q] = set; else delete ans[q];
    }
    if (q === 'Q3' && (ans.Q3 || []).indexOf('spouse') < 0) delete ans.Q4;
    var main = steps()[stepIdx];
    if (main === 'Q6') { ['Q6M', 'Q6D'].forEach(function (sq) { var c = SUBSHOW[sq]; if (cur(c[0]).indexOf(c[1]) < 0) delete ans[sq]; }); }
    save();
    // 같은 화면의 선택 표시·하위 질문을 다시 그린다(포커스는 유지)
    var focusName = q, focusVal = v;
    $('ycOpts').innerHTML = optionsHtml(main); $('ycSubs').innerHTML = subHtml(main);
    var again = document.querySelector('input[name="' + focusName + '"][value="' + focusVal + '"]'); if (again) again.focus({ preventScroll: true });
    syncNext(main); ga('ye_q_answer', { q: q });
  }
  function go(delta) {
    var list = steps(), q = list[stepIdx];
    if (delta > 0) { if (stepIdx >= list.length - 1) return finish(); stepIdx++; } else { if (stepIdx <= 0) return; stepIdx--; }
    renderQ();
  }
  function skip() {
    var q = steps()[stepIdx]; delete ans[q]; (SUBQ[q] || []).forEach(function (s) { delete ans[s]; }); if (q === 'Q3') delete ans.Q4; save(); ga('ye_q_skip', { q: q }); go(1);
  }
  function startFlow(from) { stepIdx = from || 0; show('ycQ'); renderQ(); ga('ye_checkup_start', { preset: new URLSearchParams(location.search).get('p') || '' }); }

  /* ── 결과 ── */
  function optText(q, v) { return (QUI[q] && QUI[q].o[v] ? QUI[q].o[v][0] : v); }
  function reasonUi(tok) {
    var m = /^(Q\d)=(.+)$/.exec(tok);
    if (m) {
      if (m[2] === 'child') return '자녀가 있다고 답하셨어요';
      var vals = m[2].split(',').map(function (v) { return '‘' + optText(m[1], v) + '’'; });
      if (m[1] === 'Q7') return '카드 사용 수단으로 ' + vals.join(', ') + '를 선택하셨어요';
      return vals.join(', ') + '를 선택하셨어요';
    }
    return tok === 'Q7' ? '카드·현금영수증 사용 수단을 선택하셨어요' : '가족 구성을 선택하셨어요';
  }
  function reasonsOf(it) { var seen = {}; return it.reason.split(' | ').map(reasonUi).filter(function (x) { return !seen[x] && (seen[x] = 1); }).join(' / '); }
  function card(it, def) {
    var rows = it.rows.map(function (r) { return '<li>' + esc(PDATA.rows[it.id][r]) + '</li>'; }).join('');
    return '<article class="ri"><div class="h"><h3>' + esc(def.title) + '</h3><span class="tag chk">확인 필요</span></div>' +
      '<div class="chips2">' + (STEPCHIP[def.step] ? '<span class="chip2 c-step">' + STEPCHIP[def.step] + '</span>' : '') + '<span class="chip2 c-type">' + esc(def.type) + '</span></div>' +
      '<div class="rsn"><b>선정 이유</b> · ' + esc(reasonsOf(it)) + '</div><ul>' + rows + '</ul>' +
      (EVID[it.id] ? '<div class="ev">🗂 준비할 증빙 · ' + esc(EVID[it.id]) + '</div>' : '') +
      ((def.official_link || def.ref_post) ? '<div class="lk">' + (def.official_link ? '<a href="' + esc(def.official_link) + '" target="_blank" rel="noopener" data-item="' + it.id + '">공식 요건 보기 ↗</a>' : '') + (def.ref_post ? '<a class="ref" href="' + esc(def.ref_post.url) + '" target="_blank" rel="noopener" data-post="3" title="' + esc(def.ref_post.label) + '">돈버프 블로그 참고 글 ↗</a>' : '') + '</div>' : '') + '</article>';
  }
  function renderResult() {
    var r = E.run(ans, { mode: MODE }), defs = {}; RULES.items.forEach(function (i) { defs[i.id] = i; });
    var cards = r.items.map(function (it) { return card(it, defs[it.id]); });
    var left = [], right = []; cards.forEach(function (c, i) { (i % 2 ? right : left).push(c); });
    var first = r.firstCheck.length ? '<article class="ri first"><div class="h"><h3>먼저 확인해 볼 것</h3><span class="tag wait">모르겠다고 답한 항목</span></div><div class="rsn warm"><b>선정 이유</b> · ‘' + esc(r.firstCheck.join('’, ‘')) + '’ 질문에 ‘잘 모르겠어요’를 선택하셨어요.</div><ul>' + r.firstCheck.map(function (t) { return '<li>' + esc(t) + ' 관련 사실부터 확인해 보세요.</li>'; }).join('') + '</ul></article>' : '';
    var title = r.items.length ? '내 연말정산에서 확인해 볼 항목 ' + r.items.length + '가지' : '선택하신 답변에서 따로 확인해 볼 항목이 많지 않아요';
    var common = r.common.length ? '<div class="common"><h3>모든 분이 함께 확인하면 좋아요</h3><ul>' + r.common.map(function (c) { return '<li>' + esc(PDATA.common_rows[c]) + '</li>'; }).join('') + '</ul></div>' : '';
    var skipped = r.skipped.length ? '<div class="ri skipc"><div class="h"><h3>답하지 않은 질문</h3><span class="stp1">관련성을 추정하지 않았어요</span></div>' + r.skipped.map(function (q, i, a) { return '<div class="skl"' + (i === a.length - 1 ? ' style="border:0"' : '') + '><span>' + esc(PDATA.labels[q].title) + '</span><button type="button" data-redo="' + q + '">다시 답하기</button></div>'; }).join('') + '</div>' : '';
    $('ycR').innerHTML = '<div class="sumb"><div class="eyebrow">체크업 결과 · 2026년 귀속</div><h2>' + esc(title) + '</h2><p>선택하신 답변과 관련된 항목이에요. 공제 가능 여부를 판정한 결과가 아니며, 요건은 각 항목에서 확인해 주세요.</p></div>' +
      (r.notice ? '<div class="notice">ℹ️ 일부 공제 항목은 공식 기준을 확인 중이라 아직 결과에 보이지 않을 수 있어요. 국세청 안내로 함께 확인해 주세요.</div>' : '') +
      '<div class="yc-cols"><div>' + first + left.join('') + '</div><div>' + right.join('') + '</div></div>' + common + skipped +
      '<div class="yc-act"><div class="ai"><h3>이 결과로 AI에게 질문하기</h3><p>PROMPT BUFF · AI가 공제 여부를 판단하는 것이 아니라, 내가 확인할 질문을 만들어 드려요.</p><div class="row"><button type="button" class="btn or" id="ye-make">내 결과로 맞춤 AI 프롬프트 생성하기</button></div></div>' +
      '<div class="card"><b class="h3">결과 저장하고 이어서 보기</b><p>체크한 항목을 저장해 1월 간소화 시기에 이어서 확인해요.</p><button type="button" class="btn or" id="ycSaveBtn">결과 저장하기</button><div class="yc-note" id="ycSaveNote">선택하신 답변만 내 계정에 저장돼요. 금액·이름 같은 입력은 받지 않아요.</div></div></div>' +
      '<div class="ye-disc">※ 체크업 결과는 <b>참고용 정보</b>이며 세무 상담·신고 대행이 아닙니다. 공제 가능 여부는 요건 확인이 필요하고 실제 결과는 개인별 조건에 따라 달라요. 2026년 귀속 기준 · 출처는 각 항목에 표시해요.</div>' +
      '<div class="yc-share"><b>주변 분들에게도 꼭 알려주세요!</b><p>연말정산, 혼자 놓치기 쉬워요. 가족·동료·친구도 3~5분이면 내 항목을 확인해 볼 수 있어요.</p><button type="button" class="btn or" id="ycShare">연말정산 체크업 서비스 공유하기</button></div>' +
      '<div class="yc-again"><button type="button" class="btn line" id="ycRedo">처음부터 다시 하기</button></div>';
    window.__yeItem = function () { return { title: '연말정산 체크업 결과', summary: (r.items.length ? '확인해 볼 항목 ' + r.items.length + '가지' : '확인해 볼 항목 없음') + ' · 2026년 귀속', payload: { v: 1, ans: ans } }; };
    show('ycR');
    if (!seenResult) { seenResult = true; ga('ye_checkup_complete', { items: r.items.length, skipped: r.skipped.length, notice: r.notice ? 1 : 0 }); }
  }
  function finish() { if (!sane(ans)) { toast('답변을 확인하지 못했어요. 처음부터 다시 해 주세요.'); return; } save(); seenResult = false; renderResult(); }

  /* ── AI 질문 미리보기 ── */
  var exSet = {}, lastFocus = null;
  function exList() { return Object.keys(exSet).filter(function (k) { return exSet[k]; }); }
  function renderPreview() {
    var full = PR.build(ans, { mode: MODE }), cur2 = PR.build(ans, { mode: MODE, exclude: exList() });
    var offAll = {}; cur2.excluded.forEach(function (q) { offAll[q] = 1; });
    $('ycGroups').innerHTML = full.groups.map(function (g) {
      var off = !!offAll[g.qid], val = g.line.replace(/^- [^:]+: /, '');
      var note = g.derived.length ? '<em>끄면 ‘' + esc(g.derived.join('’, ‘')) + '’ 항목과 선정 이유도 함께 빠져요</em>' : '';
      return '<div class="grp' + (off ? ' off' : '') + '"><button type="button" class="sw' + (off ? '' : ' on') + '" role="switch" aria-checked="' + (!off) + '" aria-label="' + esc(g.label) + ' 공유" data-ex="' + g.qid + '"></button><div class="g"><b>' + esc(g.label) + '</b><span>' + esc(val) + '</span>' + note + '</div></div>';
    }).join('');
    var shared = full.groups.length - full.groups.filter(function (g) { return offAll[g.qid]; }).length;
    var offNames = full.groups.filter(function (g) { return offAll[g.qid]; }).length;
    $('ycPvLn').textContent = '총 ' + full.groups.length + '개 중 ' + shared + '개 공유' + (offNames ? ' · ' + offNames + '개 제외됨' : '') + ' · 약 ' + cur2.text.length.toLocaleString('ko-KR') + '자';
    $('ycPrompt').textContent = cur2.text;
    var bad = cur2.violations.length > 0; $('ycPvErr').textContent = bad ? '프롬프트 점검에서 문제가 발견되어 복사할 수 없어요.' : '';
    $('ycCopy').disabled = bad || !$('ycConsent').checked;
    renderPreview.last = { shared: shared, total: full.groups.length, len: cur2.text.length, bad: bad };
    if (bad) ga('ye_prompt_blocked', { n: cur2.violations.length });
  }
  function openPreview() {
    exSet = {}; $('ycConsent').checked = false; lastFocus = document.activeElement;
    $('ycPv').hidden = false; document.body.style.overflow = 'hidden'; renderPreview(); $('ycPv').querySelector('.yc-pv').focus();
    ga('ye_prompt_preview_open', {});
  }
  function closePreview() { $('ycPv').hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, no) { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy') ? ok() : no(); } catch (e) { no(e); } document.body.removeChild(ta); });
  }

  /* ── 이벤트 ── */
  document.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('#ycForm')) onChange(e); else if (e.target.id === 'ycConsent') renderPreview(); });
  document.addEventListener('click', function (e) {
    var t = e.target, c = function (s) { return t.closest && t.closest(s); }, b;
    if (c('#ycStart')) { ans = {}; save(); startFlow(0); }
    else if (c('#ycResume')) { var a = load(); if (a && sane(a)) { ans = a; seenResult = true; renderResult(); } }
    else if (c('#ycQuit')) { show('ycIntro'); }
    else if (c('#ycPrev')) go(-1);
    else if (c('#ycNext')) { var q = steps()[stepIdx]; if (cur(q).length) go(1); }
    else if (c('#ycSkip')) skip();
    else if ((b = c('[data-redo]'))) { var q2 = b.getAttribute('data-redo'), i = steps().indexOf(q2); if (i >= 0) { stepIdx = i; show('ycQ'); renderQ(); } }
    else if (c('#ycRedo')) { ans = {}; save(); startFlow(0); }
    else if (c('#ye-make')) { openPreview(); }
    else if (c('#ycShare')) {
      /* 결과·답변은 담지 않고 서비스 소개만 공유한다. */
      var url = location.origin + '/yearend/checkup/?utm_source=share&utm_medium=social&utm_campaign=yearend2026';
      var msg = '연말정산, 놓치는 항목 없는지 3~5분이면 확인해 볼 수 있어요. 돈버프 연말정산 체크업 한 번 해보세요!';
      ga('ye_share_click', { kind: navigator.share ? 'native' : 'copy' });
      if (navigator.share) navigator.share({ title: '돈버프 연말정산 체크업', text: msg, url: url }).catch(function () {});
      else copyText(msg + ' ' + url).then(function () { toast('링크를 복사했어요. 주변 분들께 전해 주세요!'); });
    }
    else if (c('#ycPvX') || (t.id === 'ycPv')) closePreview();
    else if ((b = c('[data-ex]'))) { var k = b.getAttribute('data-ex'); exSet[k] = !exSet[k]; renderPreview(); ga('ye_prompt_exclude', { q: k, on: exSet[k] ? 1 : 0 }); }
    else if (c('#ycCopy')) {
      var o = PR.build(ans, { mode: MODE, exclude: exList() }); if (o.violations.length || !$('ycConsent').checked) return;
      copyText(o.text).then(function () { var l = renderPreview.last || {}; toast('복사했어요. AI 서비스에 붙여넣어 보세요.'); ga('ye_prompt_copy', { shared: l.shared, total: l.total, len: o.text.length }); }, function () { toast('복사하지 못했어요. 미리보기 내용을 직접 선택해 복사해 주세요.'); });
    }
    else if ((b = c('a[data-post]'))) ga('ye_blog_click', { post: b.getAttribute('data-post'), from: 'checkup' });
    else if ((b = c('a[data-item]'))) ga('ye_official_click', { item: b.getAttribute('data-item') });
  });
  document.addEventListener('keydown', function (e) {
    if ($('ycPv').hidden) return;
    if (e.key === 'Escape') { closePreview(); return; }
    if (e.key === 'Tab') { var f = $('ycPv').querySelectorAll('button:not([disabled]),input,pre[tabindex]'); if (!f.length) return; var first = f[0], last = f[f.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === $('ycPv').querySelector('.yc-pv'))) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });

  /* ── 시작: 프리셋(?p=) · 로그인 후 이어하기(?dbx_resume=ye-prompt) · 이전 답변 ── */
  (function init() {
    var q = new URLSearchParams(location.search), p = q.get('p'), rm = q.get('dbx_resume'), resume = rm === 'ye-prompt' || rm === 'ye-save' || rm === 'ye-view', saved = load();
    if (saved && !sane(saved)) saved = null;
    if (resume) {
      try { q.delete('dbx_resume'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '')); } catch (e) {}
      if (saved) { ans = saved; seenResult = true; renderResult(); if (rm === 'ye-prompt' && signedIn()) openPreview(); if (rm === 'ye-save') { var tr = 0; setTimeout(function w() { var b = $('ycSaveBtn'); if (b && signedIn()) { b.click(); return; } if (++tr < 40) setTimeout(w, 150); }, 500); } return; }
    }
    if (saved && Object.keys(saved).length) $('ycResume').hidden = false;
    if (p && PRESET[p]) { ans = JSON.parse(JSON.stringify(PRESET[p])); if (!sane(ans)) ans = {}; save(); startFlow(0); }
  })();
})();
