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
      '<button class="cta-o" id="heroCta" data-act="start">' + CTA + '</button></div>' +
      '<div class="vis"><img src="/redesign/img/fortune/hero.jpg" width="1200" height="880" alt="사주팔자·자미두수·점성술 차트와 금화 일러스트" fetchpriority="high"></div></div></div>' +
      '<div class="sec why"><div class="eyb">WHY DONBUFF</div><h2>돈버프 재테크 운세는 달라요!</h2><p class="ld">하나의 사주로 여러 가지 운세를 보는 대신,<br>동서양의 세 가지 운세로 오직 나의 재물운과 투자운을 살펴봐요.</p><div class="three">' +
      '<div class="wc"><div class="re">한국 · 四柱八字</div><h3>사주팔자</h3><div class="tp">타고난 재물의 흐름</div><p>오행과 재성의 관계를 통해 타고난 재물 성향과 경제활동의 흐름을 살펴봐요.</p><div class="pt"><span>재성</span><span>세운·대운</span></div></div>' +
      '<div class="wc"><div class="re">베트남 · 紫微斗數</div><h3>자미두수</h3><div class="tp">돈과 마음, 자산의 자리</div><p>재백궁, 복덕궁, 전택궁을 통해 돈을 버는 방식과 쓰는 마음, 자산이 쌓이는 자리를 살펴봐요.</p><div class="pt"><span>재백궁</span><span>복덕궁</span><span>전택궁</span></div></div>' +
      '<div class="wc"><div class="re">서양 · ASTROLOGY</div><h3>점성술</h3><div class="tp">재물과 자원 활용의 성향</div><p>행성과 하우스의 배치를 통해 돈과 자원 활용에 관한 상징적 성향을 살펴봐요.</p><div class="pt"><span>2·8·10하우스</span><span>목성·토성·금성</span></div></div></div>' +
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
    return bar() + '<div class="main">' + ey('1단계 · 출생정보') + '<h1>태어난 날과 시간을<br>알려주세요</h1><div class="sub">양력·음력 모두 입력할 수 있어요. 계산은 이 기기 안에서만 이뤄져요.</div>' +
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
      '<div class="lbl">이름 또는 별명 <em>선택</em></div><input id="nm" type="text" maxlength="12" placeholder="결과 화면에서 불러 드려요" value="' + esc(S.name) + '" autocomplete="off"><p class="hint">입력하지 않아도 돼요. 공유 카드와 AI 질문에는 담기지 않아요.</p>' +
      '<div class="lbl">성별 <em>필수</em></div><div class="seg"><button class="chip' + (S.gender === 'female' ? ' on' : '') + '" data-g="female">여성</button><button class="chip' + (S.gender === 'male' ? ' on' : '') + '" data-g="male">남성</button></div>' +
      '<p class="hint">자미두수 명반과 사주 대운 방향을 정하는 데 쓰여요.</p></div>' + foot('next', '계속', !S.gender);
  }
  function story() {
    function chips(arr, on, key, max) { return arr.map(function (c) { return '<button class="chip' + (on.indexOf(c) >= 0 ? ' on' : '') + '" data-k="' + key + '" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join(''); }
    return bar() + '<div class="main">' + ey('2단계 · 나의 돈 이야기') + '<div class="ok">✓ 기본정보 완료! 이제 내 돈 고민을 골라볼까요?</div><h1>새해 돈 이야기를<br>조금 더 알려주세요</h1><div class="sub">답하고 싶은 것만 골라도 돼요. 건너뛰어도 결과는 같아요.</div><div class="sw"><button type="button" class="swb' + (S.useAi ? ' on' : '') + '" role="switch" aria-checked="' + S.useAi + '" id="useai" aria-label="내 이야기를 AI 프롬프트에 반영하기"><i></i></button><div><b>내 이야기를 AI 프롬프트에 반영하기</b><span>이 버튼을 켜두면 선택한 이야기들이 나만의 프롬프트에 반영돼요.</span></div></div>' +
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
      '<p class="hint">\'계산하기\'를 누르면 이 기기에서 세 가지 차트를 계산해요. 입력한 내용은 서버로 전송되지 않아요.</p></div>' + foot('calc', '계산하기');
  }
  function loading() {
    var items = [['사주팔자', '네 기둥과 십신을 계산했어요'], ['자미두수', '12궁에 별을 배치했어요'], ['점성술', '행성의 위치를 계산했어요'], ['재물운·투자운', '세 가지 결과를 비교했어요']];
    return '<div class="step-topbar"><div class="stb-in"><span class="step-back invisible"></span><div class="prog"><div class="prog-l"><span>' + TITLE + '</span><b>계산 중</b></div><div class="prog-bar"><i style="width:90%"></i></div></div><span style="width:40px"></span></div></div>' +
      '<div class="main"><div class="ld-wrap">' +
      '<h1 class="fi" style="animation-delay:.2s">세 가지 시선으로<br>나의 재테크 운세를 읽고 있어요</h1><div class="sub fi" style="animation-delay:1.2s">잠시만 기다려 주세요.</div><div style="max-width:340px;margin:22px auto 0;width:100%">' +
      items.map(function (t, i) { return '<div class="li fi" style="animation-delay:' + (2.2 + i * 1.2) + 's"><i>✓</i><div><b>' + t[0] + '</b><span>' + t[1] + '</span></div></div>'; }).join('') + '</div></div></div>';
  }

  /* ───── 결과 ───── */
  var SYS_TEXT = { // ⚠ 시안 샘플 문장 — 규칙표 확정 전
    earn: { saju: '새로 들어오는 돈의 길이 보이는 해로 읽어요.', zw: '일과 관련한 재물의 자리에 변화의 기운이 있어요.', as: '수입을 만드는 자리에 활동적인 기운이 모여 있어요.', same: '새 수입보다 <b>지금 일의 기반을 다지는 일</b>이 비슷하게 나와요.', diff: '사주는 <b>새 수입</b>, 점성술은 <b>꾸준함</b>을 더 눈여겨봐요.' },
    save: { saju: '들어오는 돈과 나가는 돈이 함께 움직이는 해로 읽어요.', zw: '돈을 쓰는 마음의 자리에 변화가 있어 쓰는 습관을 점검해 볼 만해요.', as: '내 돈과 함께 묶인 돈(공동 지출·대출 등)을 살펴보면 좋은 배치예요.', same: '새로 생기는 흐름보다 <b>지출 구조를 정리하는 일</b>이 비슷하게 나와요.', diff: '사주는 <b>새 수입</b>, 점성술은 <b>묶인 돈</b>을 더 눈여겨봐요.' },
    invest: { saju: '서두르기보다 흐름을 지켜보는 쪽이 어울리는 해로 읽어요.', zw: '마음이 흔들리기 쉬운 자리에 별이 있어 판단 기준을 먼저 적어 두면 좋아요.', as: '큰 판단은 천천히, 공부와 점검 위주로 접근하기 좋은 배치예요.', same: '<b>충동적인 판단을 줄이고 기준을 먼저 세우는 일</b>이 비슷하게 나와요.', diff: '자미두수는 <b>마음의 흔들림</b>, 점성술은 <b>학습과 점검</b>을 더 눈여겨봐요.' }
  };
  var TOPICS = [['earn', '돈 벌기'], ['save', '돈 모으기'], ['invest', '투자 습관']];
  function elc(e) { return 'var(--' + e + ')'; }
  function pcol(p, E) { return '<div class="pil' + (p.hidden.some(function (h) { return h.tg === '정재' || h.tg === '편재'; }) ? ' hl' : '') + '"><small>' + p.label + '</small><div class="g" style="color:' + elc(E.EL_STEM[p.stem]) + '">' + p.stem + '</div><div class="g" style="color:' + elc(E.EL_BR[p.branch]) + '">' + p.branch + '</div><div class="tg2">' + p.stemTG + '</div></div>'; }
  function wheel(w) {
    var R = 150, cx = 170, cy = 170, rot = 180 - w.asc; // ASC 를 왼쪽(180°)에 놓는다
    function pt(lon, r) { var a = (lon + rot) * Math.PI / 180; return [cx + r * Math.cos(-a), cy + r * Math.sin(-a)]; }
    var g = '<circle cx="170" cy="170" r="150" fill="#fff" stroke="#27364D" stroke-width="1.5"/><circle cx="170" cy="170" r="108" fill="none" stroke="#E7DFD2"/>';
    for (var i = 0; i < 12; i++) { var p1 = pt(i * 30, 108), p2 = pt(i * 30, 150), m = pt(i * 30 + 15, 129); g += '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="#E7DFD2"/><text x="' + m[0] + '" y="' + (m[1] + 6) + '" text-anchor="middle" font-size="17" fill="#6B6458">' + window.DBFortuneEngine.SIGN_GL[i] + '</text>'; }
    w.cusps.forEach(function (c, i) { var a = pt(c, 40), b = pt(c, 108); var hl = [1, 7, 9].indexOf(i) >= 0; g += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (hl ? '#BC6727' : '#CFC6B6') + '" stroke-width="' + (hl ? 2 : 1) + '"/>'; var n = pt(c + 12, 96); g += '<text x="' + n[0] + '" y="' + (n[1] + 4) + '" text-anchor="middle" font-size="10" fill="' + (hl ? '#94582A' : '#A8A196') + '" font-weight="700">' + (i + 1) + '</text>'; });
    w.bodies.forEach(function (b) { var q = pt(b.lon, 72); var wp = ['jupiter', 'saturn', 'venus'].indexOf(b.k) >= 0; g += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="13" fill="' + (wp ? '#F3E9DB' : '#fff') + '" stroke="' + (wp ? '#BC6727' : '#CFC6B6') + '"/><text x="' + q[0] + '" y="' + (q[1] + 5) + '" text-anchor="middle" font-size="14" fill="#27364D">' + b.gl + '</text>'; });
    return '<svg viewBox="0 0 340 340" role="img" aria-label="점성 차트" style="width:100%;max-width:420px;display:block;margin:0 auto">' + g + '</svg>';
  }
  function palGrid(z) {
    var E = window.DBFortuneEngine, cells = {}; z.palaces.forEach(function (p) { cells[E.GRID[p.branch].join(',')] = p; });
    var h = '<div class="grid4">';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
      if ((r === 1 || r === 2) && (c === 1 || c === 2)) { if (r === 1 && c === 1) h += '<div class="pal ctr"><b style="color:#E5B98A">' + esc(z.five) + '</b>명궁 ' + esc(z.soul) + '<br>2027 사화 ' + z.mutagen.join('·') + '</div>'; continue; }
      var p = cells[r + ',' + c], w = ['재백', '복덕', '전택'].indexOf(p.name) >= 0;
      h += '<div class="pal' + (w ? ' w' : '') + '"><b>' + p.name + '</b><br>' + (p.major.map(function (s) { return s.n; }).join('·') || '—') + '</div>';
    }
    return h + '</div>';
  }
  function keyTitle() { return (S.name ? esc(S.name) + '님의 ' : '') + '2027 재물 이야기'; }
  function compare() {
    var T = SYS_TEXT[topic], ev_ = chart.signals.evidence;
    return '<div class="seg" role="tablist" style="margin-bottom:6px">' + TOPICS.map(function (t) { return '<button class="chip' + (t[0] === topic ? ' on' : '') + '" role="tab" aria-selected="' + (t[0] === topic) + '" data-topic="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div style="font-size:15px;font-weight:800;margin-top:14px">이 주제를 세 관점은 어떻게 볼까요?</div>' +
      '<div class="v3"><span class="s">사주</span><p>' + T.saju + '</p><small>근거 · ' + esc(ev_.saju) + '</small></div>' +
      '<div class="v3"><span class="s">자미두수</span><p>' + T.zw + '</p><small>근거 · ' + esc(ev_.ziwei) + ' · 2027 사화 ' + chart.ziwei.mutagen.join('·') + '</small></div>' +
      '<div class="v3"><span class="s">점성술</span><p>' + T.as + '</p><small>근거 · ' + esc(ev_.western) + '</small></div>' +
      '<div class="two"><div class="pn" style="background:var(--okbg)"><b style="color:var(--ok)">비슷하게 보는 부분</b>' + T.same + '</div><div class="pn" style="background:#FDF0E7"><b style="color:var(--orange-text)">의견이 갈리는 부분</b>' + T.diff + '</div></div>' +
      '<p class="hint"><span class="ribbon">시안 샘플</span>문장은 규칙 확정 전의 예시이고, <b>근거 칸의 값은 실제 계산 결과</b>예요. 3개 중 몇 개가 좋다는 식의 결론은 내지 않아요.</p>';
  }
  function result() {
    var E = window.DBFortuneEngine, sg = chart.signals, s = chart.saju, z = chart.ziwei, w = chart.western;
    var wl = ['재백', '복덕', '전택'].map(function (n) { return z.palaces.filter(function (p) { return p.name === n; })[0]; });
    var ts = s.trueSolar ? '진태양시 ' + s.trueSolar.time + ' 기준 · ' : '';
    function sec(id, k, t, sub, body, det) { return '<section class="rdc" id="' + id + '"><div class="rk">' + k + '</div><h3>' + t + (sub ? ' <small>' + sub + '</small>' : '') + '</h3>' + body + (det ? '<button class="more" data-more="' + id + '" aria-expanded="false">자세히 보기 ⌄</button><div class="det" id="det-' + id + '">' + det + '</div>' : '') + '</section>'; }
    var sajuEasy = '<div class="pillars">' + s.pillars.map(function (p) { return pcol(p, E); }).join('') + '</div><p style="margin-top:12px;font-size:15px;line-height:1.7"><b>재성(재물을 뜻하는 칸)</b>이 ' + (sg.parts.cai.length ? '<b>' + sg.parts.cai.join('·') + '</b>에 있어요.' : '뚜렷하게 드러나지 않아요.') + '<br>2027년은 <b>정미(丁未)년</b>이고, 일간 기준 <b>' + s.sewoon.tg + '</b>의 해예요.</p>';
    var sajuDet = '<div class="chart-title">대운 흐름 <small style="font-weight:500;color:var(--muted)">10년 단위</small></div><table class="t"><tr><th>시작 나이</th><th>시작 연도</th><th>간지</th><th>십신</th></tr>' + s.cycles.slice(0, 7).map(function (c) { return '<tr><td>' + c.age + '세</td><td>' + c.year + '</td><td>' + c.gz + '</td><td>' + c.tg + '</td></tr>'; }).join('') + '</table>' +
      (s.trueSolar ? '<p class="hint">진태양시 ' + s.trueSolar.time + ' (경도 보정 ' + s.trueSolar.lonMin + '분, 균시차 ' + (s.trueSolar.eotMin >= 0 ? '+' : '') + s.trueSolar.eotMin + '분) · 자시는 23시 기준</p>' : '') +
      '<p class="hint">지장간: ' + s.pillars.map(function (p) { return p.label + ' ' + p.hidden.map(function (h) { return h.s + '(' + h.tg + ')'; }).join(' '); }).join(' / ') + '</p>';
    var zwEasy = '<div class="tri">' + wl.map(function (p) { return '<div><small>' + p.name + '궁</small><b>' + (p.major.map(function (x) { return x.n; }).join('·') || '주성 없음') + '</b></div>'; }).join('') + '</div><p style="margin-top:12px;font-size:15px;line-height:1.7">2027 유년 사화는 <b>' + z.mutagen.join('·') + '</b> 순으로 움직여요. 재물 관련 궁(재백·복덕·전택)을 주황색으로 표시해요.</p>';
    var zwDet = palGrid(z) + '<p class="hint">12궁 배치: ' + z.palaces.map(function (p) { return p.name + ' ' + p.stem + p.branch; }).join(' · ') + '</p>';
    var asEasy = '<div class="tri">' + [2, 8, 10].map(function (n) { return '<div><small>' + n + '하우스</small><b>' + w.houseSign[n - 1] + '</b></div>'; }).join('') + '</div><p style="margin-top:12px;font-size:15px;line-height:1.7">재물 행성은 ' + sg.parts.wealthPlanets.map(function (p) { return '<b>' + p.n + ' ' + p.sign + '(' + p.house + '하우스)</b>'; }).join(', ') + '에 있어요.</p>';
    var asDet = wheel(w) + '<p class="hint" style="text-align:center">주황색 선: 2·8·10하우스 · 주황 테두리: 재물 행성(목성·토성·금성) · 트로피컬·플라시더스</p><table class="t"><tr><th>행성</th><th>별자리</th><th>도수</th><th>하우스</th></tr>' + w.bodies.map(function (b) { return '<tr><td>' + b.gl + ' ' + b.ko + (b.retro ? ' ℞' : '') + '</td><td>' + b.sign + '</td><td>' + b.deg + '</td><td>' + b.house + '</td></tr>'; }).join('') + '</table>';
    return '<div class="rh"><div class="rh-in"><div class="ey">' + keyTitle() + '</div><h1 class="serif">' + sg.keySentence + '</h1><div class="tags">' + sg.keywords.map(function (k) { return '<span># ' + k + '</span>'; }).join('') + '</div>' +
      '<p class="ds">' + (sg.sample ? '<span class="ribbon">시안 샘플</span>' : '') + '2027 정미년 · ' + ts + '오락·참고용이며 투자 권유가 아니에요.</p></div></div>' +
      '<nav class="anch" aria-label="결과 바로가기"><a href="#cmp">세 관점 비교</a><a href="#saju">사주</a><a href="#ziwei">자미두수</a><a href="#astro">점성술</a><a href="#share">카드 저장</a><a href="#ai">물어보기</a></nav><div class="rd">' +
      sec('cmp', 'COMPARE', '세 관점으로 비교하기', '주제를 골라 보세요', '<div id="cmpbody">' + compare() + '</div>') +
      sec('saju', 'SAJU', '사주 만세력', '四柱', sajuEasy, sajuDet) + sec('ziwei', 'ZIWEI', '자미두수 명반', '紫微斗數', zwEasy, zwDet) + sec('astro', 'ASTRO', '점성 차트', '트로피컬', asEasy, asDet) +
      '<section class="rdc" id="share" style="background:var(--cream);border-color:#EBDCC6;text-align:center"><div class="rk">SHARE</div><h3 style="justify-content:center">내 돈 이야기를 카드로 남겨 보세요</h3><p class="hint">이름·생년월일·시간·고민은 카드에 담기지 않아요.</p><div class="sharecard"><canvas id="cv" width="720" height="900" role="img" aria-label="공유 카드 미리보기"></canvas></div><div style="display:flex;gap:10px;margin-top:16px"><button class="btn2" data-act="save">결과 카드 이미지 저장</button><button class="btn2 g" style="flex:1" data-act="link">서비스 링크 복사</button></div><p class="hint" style="text-align:left">\'결과 카드 저장\'은 내 결과를 이미지로 남기는 기능이고, \'링크 복사\'는 결과 없이 서비스 주소만 전달해요.</p></section>' +
      '<section class="ai" id="ai"><div class="k">MORE · 선택</div><h2>더 깊게 궁금하다면,<br>내 고민까지 AI에게 물어보기</h2><p>이 결과에 내가 고른 고민을 더한 질문을 만들어 드려요. 복사해서 평소 쓰는 AI에 붙여 넣어 보세요.</p><button class="b" data-act="aiopen">내 질문 만들기 →</button><span class="lock">🔒 계산은 이 기기에서만 이뤄지고 서버로 보내지 않아요</span><div id="aibox"></div></section>' +
      '<p class="note" style="text-align:center;margin:16px 0 40px">오락·참고용이며 투자 권유가 아니에요. 결과가 정확히 맞는다고 보장하지 않아요.</p></div>';
  }

  /* ───── 공유 카드 / AI 질문 ───── */
  function wrap(ctx, t, x, y, mw, lh) { var line = '', yy = y; for (var i = 0; i < t.length; i++) { var test = line + t[i]; if (ctx.measureText(test).width > mw && line) { ctx.fillText(line, x, yy); line = t[i]; yy += lh; } else line = test; } ctx.fillText(line, x, yy); return yy + lh; }
  function drawCard() {
    var cv = document.getElementById('cv'); if (!cv) return; var c = cv.getContext('2d'), sg = chart.signals;
    var g = c.createLinearGradient(0, 0, 720, 900); g.addColorStop(0, '#F5EDE2'); g.addColorStop(.55, '#F3E9DB'); g.addColorStop(1, '#EBDCC6'); c.fillStyle = g; c.fillRect(0, 0, 720, 900);
    var rg = c.createRadialGradient(660, 40, 0, 660, 40, 300); rg.addColorStop(0, 'rgba(188,103,39,.4)'); rg.addColorStop(1, 'rgba(188,103,39,0)'); c.fillStyle = rg; c.fillRect(0, 0, 720, 900);
    var F = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif", FS = "'Noto Serif KR','Nanum Myeongjo',serif";
    c.fillStyle = '#94582A'; c.font = '900 22px ' + F; c.fillText('DONBUFF · 2027 새해 재테크 운세', 56, 84);
    c.fillStyle = '#625B4F'; c.font = '700 28px ' + F; c.fillText('나의 새해 돈 이야기', 56, 150);
    c.fillStyle = '#27364D'; c.font = '700 46px ' + FS; var y = wrap(c, sg.keySentence, 56, 224, 608, 70);
    var x = 56; y += 6; c.font = '800 25px ' + F; sg.keywords.forEach(function (k) { var w = c.measureText('# ' + k).width + 36; c.fillStyle = '#fff'; c.beginPath(); c.roundRect ? c.roundRect(x, y - 34, w, 50, 25) : c.rect(x, y - 34, w, 50); c.fill(); c.fillStyle = '#94582A'; c.fillText('# ' + k, x + 18, y); x += w + 12; });
    c.fillStyle = '#27364D'; c.font = '800 28px ' + F; c.fillText('너의 새해 돈 이야기도 확인해봐 →', 56, 800); c.fillStyle = '#625B4F'; c.font = '600 22px ' + F; c.fillText('donbuff.com · 오락·참고용' + (sg.sample ? ' · 시안 샘플 문구' : ''), 56, 842);
  }
  function aiPrompt() {
    var z = chart.ziwei, s = chart.saju, w = chart.western, L = [];
    L.push('아래는 오락·참고용 새해(2027년) 재테크 운세 계산 결과입니다. 점괘를 맞히려는 것이 아니라, 제 돈 습관을 점검할 관점을 얻고 싶습니다. 특정 상품·종목 추천이나 수익 예측은 하지 말고, 일반적인 가계 재무 점검 관점에서 답해 주세요.');
    L.push('\n[사주] ' + s.pillars.slice().reverse().map(function (p) { return p.label + ' ' + p.stem + p.branch; }).join(', ') + ' · 2027 세운 ' + s.sewoon.gz + '(' + s.sewoon.tg + ')');
    L.push('[자미두수] ' + ['재백', '복덕', '전택'].map(function (n) { var p = z.palaces.filter(function (q) { return q.name === n; })[0]; return n + '궁 ' + (p.major.map(function (x) { return x.n; }).join('·') || '주성 없음'); }).join(', ') + ' · 2027 사화 ' + z.mutagen.join('·'));
    L.push('[점성술] ' + [2, 8, 10].map(function (n) { return n + '하우스 ' + w.houseSign[n - 1]; }).join(', ') + ' · ' + chart.signals.parts.wealthPlanets.map(function (p) { return p.n + ' ' + p.sign + ' ' + p.house + '하우스'; }).join(', '));
    if (S.useAi) { var m = []; if (S.job) m.push('현재 상황: ' + S.job); if (S.wants.length) m.push('새해 바라는 점: ' + S.wants.join(', ')); if (S.habit) m.push('바꾸고 싶은 습관: ' + S.habit); if (S.ask) m.push('궁금한 점: ' + S.ask); if (m.length) L.push('\n[제 상황]\n' + m.join('\n')); }
    L.push('\n세 관점이 비슷하게 보는 부분과 다르게 보는 부분을 나눠 정리하고, 올해 시도해 볼 만한 구체적인 가계 점검 습관 3가지를 제안해 주세요.');
    return L.join('\n');
  }

  /* ───── 렌더·이벤트 ───── */
  function render() {
    document.body.setAttribute('data-screen', S.screen === 'intro' ? 'intro' : (S.screen === 'result' ? 'result' : (S.screen === 'load' ? 'load' : 'step')));
    var map = { intro: intro, birth: birth, place: place, who: who, story: story, confirm: confirm, load: loading, result: result };
    $app.innerHTML = map[S.screen]();
    if (S.screen === 'result') { drawCard(); window.scrollTo(0, 0); }
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
    var t = e.target.closest('[data-act],[data-pl],[data-cal],[data-g],[data-k],[data-topic],[data-more],#useai'); if (!t) return;
    var a = t.getAttribute('data-act');
    if (t.id === 'useai') { S.useAi = !S.useAi; t.classList.toggle('on', S.useAi); t.setAttribute('aria-checked', S.useAi); return; }
    if (t.hasAttribute('data-pl')) { S.place = P.PLACES[+t.getAttribute('data-pl')]; S.q = S.place.label; render(); return; }
    if (t.hasAttribute('data-cal')) { S.cal = t.getAttribute('data-cal'); S.leap = false; render(); return; }
    if (t.hasAttribute('data-g')) { S.gender = t.getAttribute('data-g'); render(); return; }
    if (t.hasAttribute('data-k')) { var k = t.getAttribute('data-k'), v = t.getAttribute('data-v'); if (k === 'wants') { var i = S.wants.indexOf(v); if (i >= 0) S.wants.splice(i, 1); else if (S.wants.length < 3) S.wants.push(v); else toast('최대 3개까지 고를 수 있어요'); } else S[k] = S[k] === v ? '' : v; var y = window.scrollY; render(); window.scrollTo(0, y); return; }
    if (t.hasAttribute('data-topic')) { topic = t.getAttribute('data-topic'); document.getElementById('cmpbody').innerHTML = compare(); ev('fortune_topic', { topic: topic }); return; }
    if (t.hasAttribute('data-more')) { var id = t.getAttribute('data-more'), d = document.getElementById('det-' + id), o = d.classList.toggle('open'); t.setAttribute('aria-expanded', o); t.textContent = o ? '접기 ⌃' : '자세히 보기 ⌄'; if (o) ev('fortune_detail', { system: id }); return; }
    if (a === 'start') { ev('fortune_start'); go('birth'); }
    else if (a === 'prev') prev(); else if (a === 'home') go('intro');
    else if (a === 'next') { var i2 = ORDER.indexOf(S.screen); go(ORDER[i2 + 1]); }
    else if (a === 'calc') calc();
    else if (a === 'save') { document.getElementById('cv').toBlob(function (b) { var u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = 'donbuff-2027-fortune.png'; l.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); ev('fortune_share', { channel: 'image' }); toast('이미지를 저장했어요'); }); }
    else if (a === 'link') { var url = location.origin + '/fortune/?utm_source=share&utm_medium=link&utm_campaign=fortune2027'; (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast('링크를 복사했어요'); ev('fortune_share', { channel: 'link' }); }, function () { toast('복사하지 못했어요. 주소창의 주소를 직접 복사해 주세요.'); }); }
    else if (a === 'aiopen') {
      var box = document.getElementById('aibox'); ev('fortune_ai_open');
      box.innerHTML = '<div class="warn">아래 질문에는 <b>출생 정보로 계산한 차트 요약</b>이 들어 있어요. 이름·생년월일·출생지는 넣지 않았지만, 복사해서 붙여 넣으면 <b>사용하는 AI 서비스로 내용이 전달</b>돼요. 내용을 확인한 뒤 원할 때만 사용하세요.</div><textarea id="aip" readonly style="margin-top:12px;min-height:240px;font-size:14px">' + esc(aiPrompt()) + '</textarea><button class="b" data-act="aicopy" style="margin-top:10px">질문 복사하기</button>';
    } else if (a === 'aicopy') { var ta = document.getElementById('aip'); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(function () { toast('질문을 복사했어요'); ev('fortune_ai_copy'); }, function () { ta.select(); toast('선택된 내용을 직접 복사해 주세요'); }); }
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
})();
