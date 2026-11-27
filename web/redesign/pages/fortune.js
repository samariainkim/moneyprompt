/* 새해 재테크 운세 — 입력 → 계산(브라우저) → 결과. 개인정보는 서버로 보내지 않고, GA 이벤트에도 입력값을 싣지 않는다. */
(function () {
  'use strict';
  var $app = document.getElementById('app');
  var ENGINE_SRC = '/redesign/fortune-engine.js';
  var JOBS = ['직장인', '프리랜서', '자영업', '구직·이직 중', '학생', '전업주부', '은퇴'];
  var WANTS = ['월급 안정', '저축 늘리기', '지출 줄이기', '부채 정리', '투자 공부·시작', '부수입', '내 집 마련', '노후 준비'];
  var HABITS = ['수입 늘리기', '지출 습관', '저축 습관', '투자 공부', '빚 줄이기'];
  var ORDER = ['birth', 'place', 'who', 'story', 'confirm'];
  var S = { screen: 'intro', cal: 'solar', leap: false, conv: null, y: 1990, m: 5, d: 15, hh: 12, mm: 0, place: null, q: '', name: '', gender: '', job: '', wants: [], habit: '', ask: '', useAi: true };
  var chart = null, engineP = null, lunarP = null, topic = 'save';

  function $(h) { var t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ev(n, p) { try { if (typeof gtag === 'function') gtag('event', n, p || {}); } catch (e) {} }
  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); setTimeout(function () { el.classList.remove('on'); }, 2200); }
  function loadScript(src, glob) {
    if (window[glob]) return Promise.resolve(window[glob]);
    return new Promise(function (ok, ng) { var t = document.createElement('script'); t.src = src; t.onload = function () { ok(window[glob]); }; t.onerror = function () { ng(new Error(glob)); }; document.head.appendChild(t); });
  }
  function loadEngine() { return engineP || (engineP = loadScript(ENGINE_SRC, 'DBFortuneEngine').catch(function (e) { engineP = null; throw e; })); }
  function loadLunar() { return lunarP || (lunarP = loadScript('/redesign/fortune-lunar.js', 'DBFortuneLunar').catch(function (e) { lunarP = null; throw e; })); }
  function daysIn(y, m) { return new Date(y, m, 0).getDate(); }
  function opts(from, to, sel, suf, pad) { var h = ''; for (var i = from; i <= to; i++) h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + (pad ? String(i).padStart(2, '0') : i) + suf + '</option>'; return h; }
  function signedIn() { try { return !!(window.__dbxAuth && window.__dbxAuth.signedIn()); } catch (e) { return false; } }
  function toLogin() { ev('fortune_login_prompt'); location.assign('/join/?next=' + encodeURIComponent('/fortune/?start=1') + '&src=fortune_start'); }
  function go(sc) { S.screen = sc; render(); window.scrollTo(0, 0); }
  function prev() { var i = ORDER.indexOf(S.screen); go(i <= 0 ? 'intro' : ORDER[i - 1]); }

  /* ───── 화면 조각 ───── */
  var TITLE = '새해 재테크 운세';
  function bar(step, label) {
    var n = ORDER.indexOf(S.screen) + 1;
    return '<div class="step-topbar"><div class="stb-in"><button class="step-back" data-act="prev" aria-label="이전 단계">←</button><div class="prog"><div class="prog-l"><span>' + TITLE + '</span><b>' + n + ' / ' + ORDER.length + '</b></div><div class="prog-bar"><i style="width:' + (n / ORDER.length * 100) + '%"></i></div></div><a class="step-out" href="/">나가기</a></div></div>';
  }
  function ey(t) { return '<div class="step-eyebrow">' + t + '</div>'; }
  function foot(next, nextLabel, disabled, skip) {
    return '<div class="foot"><div class="in">' + (skip ? '<button class="btn2 g" data-act="' + skip + '">건너뛰기</button>' : '') + '<button class="btn2" data-act="' + next + '"' + (disabled ? ' disabled' : '') + '>' + nextLabel + '</button></div></div>';
  }

  var CTA = '나의 2027 재테크 운세 보기 →';
  function intro() {
    function step(i, b, sp, k) { return '<div class="st' + (k ? ' k' : '') + '"><i>STEP 0' + i + '</i><b>' + b + '</b><span>' + sp + '</span></div>'; }
    return '<div class="ih"><div class="ih-in"><div>' +
      '<div class="eyb">NEW YEAR · 재테크 운세</div>' +
      '<h1>새해 나의<br><em>재테크 운세</em>는?</h1>' +
      '<p class="lead serif">동서양의 세 가지 시선으로 읽는<br>나의 재물운</p>' +
      '<p class="d">한국의 사주팔자, 베트남식 자미두수, 서양의 점성술까지. 돈버프는 동서양을 대표하는 세 가지 시선에서 오직 <b>\'재물운과 투자운\'</b>만 뽑아 <b>\'나만의 투자 신호\'</b>를 살펴봅니다.</p>' +
      '<div class="chips"><div><b class="serif">4</b><span>단계</span></div><div><b class="serif">3</b><span>분 소요</span></div><div><b class="serif">3</b><span>가지 결과</span></div></div>' +
      '<button class="cta-o" id="heroCta" data-act="start">' + CTA + '</button><p class="loginhint" id="loginhint"' + (signedIn() ? ' hidden' : '') + '>시작하려면 로그인이 필요해요.</p></div>' +
      '<div class="vis"><img src="/redesign/img/fortune/hero.jpg" width="1200" height="880" alt="사주팔자·자미두수·점성술 차트와 금화 일러스트" fetchpriority="high"></div></div></div>' +
      '<div class="sec why"><div class="eyb">WHY DONBUFF</div><h2>돈버프 재테크 운세는 달라요!</h2><p class="ld">하나의 사주로 여러 가지 운세를 보는 대신,<br>동서양의 세 가지 운세로 오직 나의 재물운과 투자운을 살펴봐요.</p><div class="three">' +
      '<div class="wc"><div class="re">한국 · 四柱八字</div><h3>사주팔자</h3><div class="tp">타고난 재물의 흐름</div><p>오행과 재성의 관계를 통해 타고난 재물 성향과 경제활동의 흐름을 살펴봐요.</p><div class="pt"><span>재성</span><span>세운·대운</span></div></div>' +
      '<div class="wc"><div class="re">베트남 · 紫微斗數</div><h3>자미두수</h3><div class="tp">돈과 마음, 자산의 자리</div><p>재백궁, 관록궁, 전택궁, 복덕궁을 통해 돈을 버는 방식과 일, 자산이 쌓이는 자리, 쓰는 마음을 살펴봐요.</p><div class="pt"><span>재백궁</span><span>관록궁</span><span>전택궁</span><span>복덕궁</span></div></div>' +
      '<div class="wc"><div class="re">서양 · ASTROLOGY</div><h3>점성술</h3><div class="tp">재물과 자원 활용의 성향</div><p>행성과 하우스의 배치를 통해 돈과 자원 활용에 관한 상징적 성향을 살펴봐요.</p><div class="pt"><span>2·5·8·10하우스</span><span>목성·토성·금성</span></div></div></div>' +
      '<div class="conv" aria-hidden="true"><svg viewBox="0 0 1000 56" preserveAspectRatio="none"><g fill="none" stroke="#BC6727" stroke-width="2" stroke-linecap="round"><path d="M167 0 V18 Q167 28 177 28 H490 Q500 28 500 38 V56"/><path d="M500 0 V56"/><path d="M833 0 V18 Q833 28 823 28 H510 Q500 28 500 38"/></g></svg></div>' +
      '<div class="core"><small>세 가지 운명 지도, 하나의 질문</small><b>나의 재물운은?</b><span>서로 다른 세 가지 관점의 공통점과 차이점을 통해 나의 재물운을 더욱 입체적으로 살펴보세요.</span></div></div>' +
      '<div class="sec how"><div class="eyb">HOW IT WORKS</div><h2>이렇게 진행돼요</h2><p class="ld">간단한 정보 입력부터 나만의 AI 질문까지.</p><div class="steps">' +
      step(1, '나의 출생정보 입력', '생년월일과 태어난 시간, 장소를 알려주세요.') + step(2, '나의 돈 이야기 선택', '새해 바라는 점과 궁금한 돈 이야기를 골라요.') + step(3, '세 가지 운명 지도 확인', '사주팔자, 자미두수, 점성 차트를 한 번에 확인해요.') + step(4, 'AI 맞춤 질문 만들기', '나만의 프롬프트로 평소 쓰는 AI에게 재물운을 물어봐요.', true) + '</div></div>' +
      '<div class="fin"><div class="band" id="finBand"><small>2027 MY MONEY FORTUNE</small><h2>세 가지 운명 지도에 AI를 더하다.</h2><p>2027년, 나의 재테크 운세는 어떨까요?</p><button class="cta-o" data-act="start">' + CTA + '</button></div>' +
      '<p class="note" style="text-align:center;margin:18px 0 0">해당 결과는 참고자료이며, 투자 권유가 아닙니다. 상업용 재배포를 금지합니다.</p></div><div style="height:90px"></div>' +
      '<div class="stk" id="stk" aria-hidden="true"><button class="cta-o" data-act="start" tabindex="-1">' + CTA + '</button></div>';
  }
  function watchSticky() {
    var stk = document.getElementById('stk'), h = document.getElementById('heroCta'), f = document.getElementById('finBand');
    if (!stk || !h || !('IntersectionObserver' in window)) return;
    var hv = true, fv = false;
    function upd() { var on = !hv && !fv; stk.classList.toggle('on', on); stk.setAttribute('aria-hidden', on ? 'false' : 'true'); var bt = stk.querySelector('button'); if (bt) bt.tabIndex = on ? 0 : -1; }
    new IntersectionObserver(function (e) { hv = e[0].isIntersecting; upd(); }).observe(h);
    new IntersectionObserver(function (e) { fv = e[0].isIntersecting; upd(); }).observe(f);
  }

  var P = window.DBPlaces;
  function sol() { return S.conv && S.conv.ok ? S.conv : null; }
  function birth() {
    var lunar = S.cal === 'lunar', dmax = lunar ? 30 : daysIn(S.y, S.m); if (S.d > dmax) S.d = dmax;
    return bar() + '<div class="main">' + ey('1단계 · 출생정보') + '<h1>태어난 날과 시간을<br>알려주세요</h1><div class="sub">양력·음력 모두 입력할 수 있어요.</div>' +
      '<div class="lbl">생년월일</div><div class="seg" role="radiogroup" aria-label="양력 음력 선택"><button class="chip' + (!lunar ? ' on' : '') + '" role="radio" aria-checked="' + !lunar + '" data-cal="solar">양력</button><button class="chip' + (lunar ? ' on' : '') + '" role="radio" aria-checked="' + lunar + '" data-cal="lunar">음력</button></div>' +
      '<div class="row" style="margin-top:10px"><select id="y" aria-label="년">' + opts(1930, 2026, S.y, '년') + '</select><select id="m" aria-label="월">' + opts(1, 12, S.m, '월') + '</select><select id="d" aria-label="일">' + opts(1, dmax, S.d, '일') + '</select></div>' +
      (lunar ? '<label class="leap"><input type="checkbox" id="leap"' + (S.leap ? ' checked' : '') + '> 윤달이에요 <small>(해당 월이 윤달일 때만 체크)</small></label>' : '') +
      '<div id="convmsg" class="conv-msg" aria-live="polite"></div>' +
      '<div class="lbl">태어난 시간 <em>한국 표준시</em></div><div class="row"><select id="hh" aria-label="시">' + opts(0, 23, S.hh, '시', true) + '</select><select id="mm" aria-label="분">' + opts(0, 59, S.mm, '분', true) + '</select></div>' +
      '<p class="hint">출생 시각이 정확할수록 사주 시주·자미두수 명궁·점성술 상승점이 정확해져요. 시간을 정확히 모르면 부모님이나 출생증명서로 한 번 확인해 보세요.</p></div>' + foot('next', '계속', true);
  }
  function setNext(on) { var b = $app.querySelector('.foot [data-act=next]'); if (b) b.disabled = !on; }
  function updConv() {
    var el = document.getElementById('convmsg'); if (!el) return;
    if (S.cal !== 'lunar') { S.conv = { ok: true, y: S.y, m: S.m, d: S.d }; el.textContent = ''; el.className = 'conv-msg'; setNext(true); return; }
    S.conv = null; el.className = 'conv-msg'; el.textContent = '양력으로 바꾸는 중…'; setNext(false);
    var key = [S.y, S.m, S.d, S.leap].join();
    loadLunar().then(function (L) {
      if ([S.y, S.m, S.d, S.leap].join() !== key || S.screen !== 'birth') return;
      var r = L.toSolar(S.y, S.m, S.d, S.leap); S.conv = r; var e2 = document.getElementById('convmsg'); if (!e2) return;
      if (r.ok) { e2.className = 'conv-msg ok2'; e2.textContent = '양력으로는 ' + r.y + '년 ' + r.m + '월 ' + r.d + '일이에요.'; setNext(true); } else { e2.className = 'conv-msg bad'; e2.textContent = r.msg; setNext(false); }
    }).catch(function () { var e3 = document.getElementById('convmsg'); if (e3) { e3.className = 'conv-msg bad'; e3.textContent = '음력 변환을 불러오지 못했어요. 양력으로 입력하거나 잠시 후 다시 시도해 주세요.'; } });
  }
  function placeList() {
    var q = S.q.trim();
    if (!q) return '';
    var r = P.find(q);
    if (!r.length) return '<p class="hint">검색 결과가 없어요. 시·군 단위로 다시 입력하거나, 위의 도시 중 가까운 곳을 골라 주세요.</p>';
    return r.map(function (c) { var i = P.PLACES.indexOf(c); return '<button class="city' + (S.place === c ? ' on' : '') + '" data-pl="' + i + '">' + esc(P.show(c)) + '<small>' + (S.place === c ? '✓ 선택됨' : '') + '</small></button>'; }).join('');
  }
  function place() {
    return bar() + '<div class="main">' + ey('1단계 · 출생지') + '<h1>태어난 곳은<br>어디인가요?</h1><div class="sub">시·군 단위로 입력하면 경도에 맞춰 시각을 보정해요.</div>' +
      '<div class="lbl">자주 찾는 도시</div><div>' + P.QUICK.map(function (l) { var c = P.PLACES.filter(function (x) { return x.label === l; })[0]; return '<button class="chip' + (S.place === c ? ' on' : '') + '" data-pl="' + P.PLACES.indexOf(c) + '">' + esc(c.base) + '</button>'; }).join('') + '</div>' +
      '<div class="lbl">직접 입력</div><input id="pq" type="text" placeholder="예) 서울시, 고성군" value="' + esc(S.q) + '" autocomplete="off" aria-label="출생지 직접 입력">' +
      '<p class="hint">예) 서울시, 고성군 처럼 시·군 단위로 입력해 주세요. 구·동·읍·면은 입력하지 않아도 돼요.</p><div id="pl">' + placeList() + '</div>' +
      (S.place ? '<div class="ok" style="margin-top:14px">✓ 출생지: ' + esc(P.show(S.place)) + '</div>' : '') + '</div>' + foot('next', '계속', !S.place);
  }
  function who() {
    return bar() + '<div class="main">' + ey('1단계 · 이름·성별') + '<h1>마지막으로<br>기본 정보를 알려주세요</h1>' +
      '<div class="lbl">이름 또는 별명 <em>선택</em></div><input id="nm" type="text" maxlength="12" placeholder="결과 화면에서 불러 드려요" value="' + esc(S.name) + '" autocomplete="off">' +
      '<div class="lbl">성별 <em>필수</em></div><div class="seg"><button class="chip' + (S.gender === 'female' ? ' on' : '') + '" data-g="female">여성</button><button class="chip' + (S.gender === 'male' ? ' on' : '') + '" data-g="male">남성</button></div>' +
      '<p class="hint">자미두수 명반과 사주 대운 방향을 정하는 데 쓰여요.</p></div>' + foot('next', '계속', !S.gender);
  }
  function story() {
    function chips(arr, on, key, max) { return arr.map(function (c) { return '<button class="chip' + (on.indexOf(c) >= 0 ? ' on' : '') + '" data-k="' + key + '" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join(''); }
    return bar() + '<div class="main">' + ey('2단계 · 나의 돈 이야기') + '<div class="ok">✓ 기본정보 완료! 이제 내 돈 고민을 골라볼까요?</div><h1>새해 돈 이야기를<br>조금 더 알려주세요</h1><div class="sub">답하고 싶은 것만 골라도 돼요. 건너뛰어도 되지만, AI 프롬프트에는 반영되지 않아요.</div><div class="sw"><button type="button" class="swb' + (S.useAi ? ' on' : '') + '" role="switch" aria-checked="' + S.useAi + '" id="useai" aria-label="내 이야기를 AI 프롬프트에 반영하기"><i></i></button><div><b>내 이야기를 AI 프롬프트에 반영하기</b><span>이 버튼을 켜두면 선택한 이야기들이 나만의 프롬프트에 반영돼요.</span></div></div>' +
      '<div class="lbl">지금 나는?</div>' + chips(JOBS, [S.job], 'job') +
      '<div class="lbl">새해에는 돈과 관련해 무엇이 가장 달라졌으면 하나요? <em>최대 3개</em></div>' + chips(WANTS, S.wants, 'wants') +
      '<div class="lbl">내 돈 습관, 하나만 바꾼다면? <em>선택</em></div>' + chips(HABITS, [S.habit], 'habit') +
      '<div class="lbl">요즘 가장 궁금한 돈 이야기 한 가지는? <em>선택</em></div><textarea id="ask" maxlength="100" placeholder="예: 월급이 들어오면 금방 사라져요. 어디부터 점검하면 좋을까요?">' + esc(S.ask) + '</textarea>' +
      '<div class="hint" style="display:flex;justify-content:space-between"><span>이메일·전화번호·주소 같은 개인정보는 적지 마세요</span><span id="cnt">' + S.ask.length + ' / 100</span></div>' +
      '<p class="hint">투자 경험이나 위험 성향, 자금 여력은 묻지 않아요. 이 서비스는 투자 적합성을 진단하지 않아요.</p>' +
      '</div>' + foot('next', '계속', false, 'next');
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function confirm() {
    return bar() + '<div class="main">' + ey('2단계 · 입력 확인') + '<h1>입력한 내용이<br>맞는지 확인해 주세요</h1><div class="sum">' +
      '<div><span>생년월일</span><b>' + (S.cal === 'lunar' ? '음력 ' + S.y + '년 ' + S.m + '월 ' + S.d + '일' + (S.leap ? ' (윤달)' : '') + '<br><small style="font-weight:600;color:var(--muted)">양력 ' + S.conv.y + '년 ' + S.conv.m + '월 ' + S.conv.d + '일</small>' : S.y + '년 ' + S.m + '월 ' + S.d + '일 (양력)') + '</b></div><div><span>태어난 시간</span><b>' + pad2(S.hh) + ':' + pad2(S.mm) + '</b></div><div><span>출생지</span><b>' + esc(S.place.label) + '</b></div><div><span>성별</span><b>' + (S.gender === 'male' ? '남성' : '여성') + '</b></div><div><span>이름</span><b>' + (S.name ? esc(S.name) : '입력 안 함') + '</b></div></div>' +
      '<p class="hint">\'나만의 운세 분석하기\'를 누르면 이 기기에서 세 가지 차트를 계산해요. 입력한 내용은 서버로 전송되지 않아요.</p></div>' + foot('calc', '나만의 운세 분석하기');
  }
  function loading() {
    var items = [['사주팔자', '네 기둥과 십신을 계산했어요'], ['자미두수', '12궁에 별을 배치했어요'], ['점성술', '행성의 위치를 계산했어요'], ['재물운·투자운', '세 가지 결과를 비교했어요']];
    return '<div class="step-topbar"><div class="stb-in"><span class="step-back invisible"></span><div class="prog"><div class="prog-l"><span>' + TITLE + '</span><b>계산 중</b></div><div class="prog-bar"><i style="width:90%"></i></div></div><span style="width:40px"></span></div></div>' +
      '<div class="main"><div class="ld-wrap">' +
      '<h1 class="fi" style="animation-delay:.2s">세 가지 시선으로<br>나의 재테크 운세를 읽고 있어요</h1><div class="sub fi" style="animation-delay:1.2s">잠시만 기다려 주세요.</div><div style="max-width:340px;margin:22px auto 0;width:100%">' +
      items.map(function (t, i) { return '<div class="li fi" style="animation-delay:' + (2.2 + i * 1.2) + 's"><i>✓</i><div><b>' + t[0] + '</b><span>' + t[1] + '</span></div></div>'; }).join('') + '</div></div></div>';
  }

  function result() { return window.DBR.html({ E: window.DBFortuneEngine, chart: chart, S: S, toast: toast, ev: ev }); }

  /* ───── 렌더·이벤트 ───── */
  function render() {
    document.body.setAttribute('data-screen', S.screen === 'intro' ? 'intro' : (S.screen === 'result' ? 'result' : (S.screen === 'load' ? 'load' : 'step')));
    var map = { intro: intro, birth: birth, place: place, who: who, story: story, confirm: confirm, load: loading, result: result };
    $app.innerHTML = map[S.screen]();
    if (S.screen === 'result') { window.DBR.bind($app.querySelector('#rwrap')); window.scrollTo(0, 0); }
    if (S.screen === 'intro') watchSticky();
    if (S.screen === 'birth') updConv();
  }
  function calc() {
    go('load'); var t0 = Date.now();
    var p = loadEngine().then(function (E) { return new Promise(function (ok) { setTimeout(function () { ok(E.calculate({ y: S.conv.y, m: S.conv.m, d: S.conv.d, hh: S.hh, mm: S.mm, gender: S.gender, lat: S.place.lat, lon: S.place.lon })); }, 30); }); });
    p.then(function (c) { chart = c; var wait = Math.max(0, 7600 - (Date.now() - t0)); setTimeout(function () { ev('fortune_complete'); go('result'); }, matchMedia('(prefers-reduced-motion:reduce)').matches ? 300 : wait); })
      .catch(function () { toast('계산을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); go('confirm'); });
  }
  $app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-pl],[data-cal],[data-g],[data-k],#useai'); if (!t) return;
    var a = t.getAttribute('data-act');
    if (t.id === 'useai') { S.useAi = !S.useAi; t.classList.toggle('on', S.useAi); t.setAttribute('aria-checked', S.useAi); return; }
    if (t.hasAttribute('data-pl')) { S.place = P.PLACES[+t.getAttribute('data-pl')]; S.q = S.place.label; render(); return; }
    if (t.hasAttribute('data-cal')) { S.cal = t.getAttribute('data-cal'); S.leap = false; render(); return; }
    if (t.hasAttribute('data-g')) { S.gender = t.getAttribute('data-g'); render(); return; }
    if (t.hasAttribute('data-k')) { var k = t.getAttribute('data-k'), v = t.getAttribute('data-v'); if (k === 'wants') { var i = S.wants.indexOf(v); if (i >= 0) S.wants.splice(i, 1); else if (S.wants.length < 3) S.wants.push(v); else toast('최대 3개까지 고를 수 있어요'); } else S[k] = S[k] === v ? '' : v; var y = window.scrollY; render(); window.scrollTo(0, y); return; }
    if (a === 'start') { if (!signedIn()) { toLogin(); return; } ev('fortune_start'); go('birth'); }
    else if (a === 'prev') prev(); else if (a === 'home') go('intro');
    else if (a === 'next') { var i2 = ORDER.indexOf(S.screen); go(ORDER[i2 + 1]); }
    else if (a === 'calc') calc();
  });
  $app.addEventListener('change', function (e) {
    var id = e.target.id;
    if (['y', 'm', 'd', 'hh', 'mm'].indexOf(id) >= 0) { S[id] = +e.target.value; if ((id === 'y' || id === 'm') && S.cal === 'solar') render(); else if (id !== 'hh' && id !== 'mm') updConv(); }
    else if (id === 'leap') { S.leap = e.target.checked; updConv(); }
  });
  $app.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'pq') { S.q = e.target.value; if (S.place && S.place.label !== S.q) { S.place = null; setNext(false); var okb = $app.querySelector('.ok'); if (okb) okb.remove(); } document.getElementById('pl').innerHTML = placeList(); }
    else if (id === 'nm') S.name = e.target.value.slice(0, 12);
    else if (id === 'ask') { S.ask = e.target.value.slice(0, 100); document.getElementById('cnt').textContent = S.ask.length + ' / 100'; }
  });
  render();
  try { if (window.__dbxAuth && window.__dbxAuth.onChange) window.__dbxAuth.onChange(function () { var el = document.getElementById('loginhint'); if (el) el.hidden = signedIn(); }); } catch (e) {}
  try { var q = new URLSearchParams(location.search); if (q.get('start') === '1') { q.delete('start'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); if (signedIn()) { ev('fortune_start'); go('birth'); } } } catch (e) {}
})();
