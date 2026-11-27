/* 새해 재테크 운세 — 입력 → 계산(브라우저) → 결과. 개인정보는 서버로 보내지 않고, GA 이벤트에도 입력값을 싣지 않는다. */
(function () {
  'use strict';
  var $app = document.getElementById('app');
  var ENGINE_SRC = '/redesign/fortune-engine.js';
  var CITIES = [
    ['서울', 37.57, 126.98], ['부산', 35.18, 129.08], ['대구', 35.87, 128.6], ['인천', 37.46, 126.71], ['광주', 35.16, 126.85], ['대전', 36.35, 127.38], ['울산', 35.54, 129.31],
    ['세종', 36.48, 127.29], ['수원', 37.26, 127.03], ['성남', 37.42, 127.13], ['고양', 37.66, 126.83], ['용인', 37.24, 127.18], ['창원', 35.23, 128.68], ['청주', 36.64, 127.49],
    ['전주', 35.82, 127.15], ['천안', 36.82, 127.15], ['포항', 36.02, 129.37], ['김해', 35.23, 128.88], ['제주', 33.5, 126.53], ['춘천', 37.88, 127.73], ['강릉', 37.75, 128.88],
    ['원주', 37.34, 127.92], ['안동', 36.57, 128.73], ['목포', 34.81, 126.39], ['여수', 34.76, 127.66], ['순천', 34.95, 127.49], ['군산', 35.97, 126.74], ['진주', 35.18, 128.11],
    ['평양(북한)', 39.02, 125.75], ['도쿄(일본)', 35.68, 139.69], ['오사카(일본)', 34.69, 135.5], ['베이징(중국)', 39.9, 116.4], ['상하이(중국)', 31.23, 121.47], ['타이베이(대만)', 25.03, 121.57],
    ['호치민(베트남)', 10.78, 106.7], ['하노이(베트남)', 21.03, 105.85], ['방콕(태국)', 13.76, 100.5], ['싱가포르', 1.35, 103.82], ['시드니(호주)', -33.87, 151.21],
    ['로스앤젤레스(미국)', 34.05, -118.24], ['뉴욕(미국)', 40.71, -74.01], ['시카고(미국)', 41.88, -87.63], ['토론토(캐나다)', 43.65, -79.38], ['런던(영국)', 51.51, -0.13], ['파리(프랑스)', 48.86, 2.35], ['프랑크푸르트(독일)', 50.11, 8.68]
  ];
  var JOBS = ['직장인', '프리랜서', '자영업', '구직·이직 중', '학생', '전업주부', '은퇴'];
  var WANTS = ['월급 안정', '저축 늘리기', '지출 줄이기', '부채 정리', '투자 공부·시작', '부수입', '내 집 마련', '노후 준비'];
  var HABITS = ['수입 늘리기', '지출 습관', '저축 습관', '투자 공부', '빚 줄이기'];
  var ORDER = ['birth', 'place', 'who', 'story', 'confirm'];
  var S = { screen: 'intro', y: 1990, m: 5, d: 15, hh: 12, mm: 0, place: null, q: '', name: '', gender: '', job: '', wants: [], habit: '', ask: '', useAi: true };
  var chart = null, engineP = null, topic = 'save';

  function $(h) { var t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ev(n, p) { try { if (typeof gtag === 'function') gtag('event', n, p || {}); } catch (e) {} }
  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); setTimeout(function () { el.classList.remove('on'); }, 2200); }
  function loadEngine() {
    if (window.DBFortuneEngine) return Promise.resolve(window.DBFortuneEngine);
    if (engineP) return engineP;
    engineP = new Promise(function (ok, ng) { var s = document.createElement('script'); s.src = ENGINE_SRC; s.onload = function () { ok(window.DBFortuneEngine); }; s.onerror = function () { engineP = null; ng(new Error('engine')); }; document.head.appendChild(s); });
    return engineP;
  }
  function daysIn(y, m) { return new Date(y, m, 0).getDate(); }
  function opts(from, to, sel, suf, pad) { var h = ''; for (var i = from; i <= to; i++) h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + (pad ? String(i).padStart(2, '0') : i) + suf + '</option>'; return h; }
  function go(sc) { S.screen = sc; render(); window.scrollTo(0, 0); }
  function prev() { var i = ORDER.indexOf(S.screen); go(i <= 0 ? 'intro' : ORDER[i - 1]); }

  /* ───── 화면 조각 ───── */
  function bar(step, label) {
    var n = ORDER.indexOf(S.screen) + 1;
    return '<div class="stb"><button class="bk" data-act="prev" aria-label="이전">←</button><div class="prog"><div class="pl"><span><b>' + (step || n + '단계') + '</b> ' + label + '</span><span>' + n + ' / ' + ORDER.length + '</span></div><div class="pb"><i style="width:' + (n / ORDER.length * 100) + '%"></i></div></div><button class="so" data-act="home">닫기</button></div>';
  }
  function foot(next, nextLabel, disabled, skip) {
    return '<div class="foot"><div class="in">' + (skip ? '<button class="btn2 g" data-act="' + skip + '">건너뛰기</button>' : '') + '<button class="btn2" data-act="' + next + '"' + (disabled ? ' disabled' : '') + '>' + nextLabel + '</button></div></div>';
  }

  function intro() {
    var pil = '<div style="display:flex;gap:8px">' + [['庚', '午'], ['辛', '巳'], ['庚', '辰'], ['癸', '未']].map(function (p) { return '<div class="pil" style="padding:6px 0"><div class="g">' + p[0] + '</div><div class="g">' + p[1] + '</div></div>'; }).join('') + '</div>';
    var gridCells = ''; var names = ['', '', '', '', '', '', '', '', '', '', '', ''];
    for (var i = 0; i < 16; i++) { var mid = (i === 5 || i === 6 || i === 9 || i === 10); gridCells += i === 5 ? '<div style="grid-area:2/2/4/4;background:var(--navy);border-radius:8px"></div>' : (mid ? '' : '<div style="height:30px;border-radius:8px;border:1px solid var(--line)' + ([1, 7, 13].indexOf(i) >= 0 ? ';border:2px solid var(--orange);background:var(--cream)' : '') + '"></div>'); }
    return '<div class="ih"><div class="ih-in"><div>' +
      '<div class="eyb">NEW YEAR · 재테크 운세</div>' +
      '<h1>새해 나의<br><em>재테크 운세</em>는?</h1>' +
      '<p class="d">동양의 사주팔자와 자미두수, 서양의 점성술은 각각 다른 방식으로 \'돈\'을 읽습니다.</p>' +
      '<p class="d">돈버프 재테크 운세는 동서양을 대표하는 세 가지 시선에서 <b>\'나만의 재물운과 투자 신호\'</b>만을 뽑아 새로운 기회를 포착할 수 있도록 만들어졌습니다.</p>' +
      '<p class="d">지금 바로 나만의 새해 재테크 운세를 점쳐보세요.</p>' +
      '<button class="cta-o" data-act="start">나만의 재테크 운세 보기 →</button></div>' +
      '<div class="vis"><div class="cd c1">' + pil + '</div><div class="cd c2"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">' + gridCells + '</div></div><div class="cd c3"><svg viewBox="0 0 100 100" style="width:100%" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="#27364D" stroke-width="1.5"/><circle cx="50" cy="50" r="30" fill="none" stroke="#E7DFD2" stroke-width="1"/>' + [0, 30, 60, 90, 120, 150].map(function (a) { return '<line x1="50" y1="4" x2="50" y2="96" stroke="#E7DFD2" transform="rotate(' + a + ' 50 50)"/>'; }).join('') + '<circle cx="70" cy="30" r="4" fill="#BC6727"/><circle cx="32" cy="62" r="3.2" fill="#27364D"/></svg></div>' +
      '<span class="tg t1">四柱 · 사주팔자</span><span class="tg t2">紫微斗數 · 자미두수</span><span class="tg t3">ASTROLOGY · 점성술</span></div></div></div>' +
      '<div class="sec"><div class="eyb">WHY DONBUFF</div><h2>돈버프 재테크 운세는 달라요!</h2><p class="ld">동서양을 대표하는 세 가지 관점을 한 번에 비교해서 나만의 재물운, 투자운을 집중적으로 분석해요.</p><div class="flow3">' +
      '<div class="fl"><i>동양</i><b>사주팔자</b><span>태어난 연·월·일·시의 네 기둥으로 타고난 재물의 구조와 시기별 흐름을 살펴요.</span></div>' +
      '<div class="fl"><i>동양</i><b>자미두수</b><span>12개의 궁에 배치된 별로 재물과 관련된 자리를 읽어요.</span></div>' +
      '<div class="fl"><i>서양</i><b>점성술</b><span>출생 시각과 장소의 행성 배치로 수입과 투자의 자리를 살펴요.</span></div></div></div>' +
      '<div class="sec"><div class="eyb">HOW IT WORKS</div><h2>이렇게 진행돼요</h2><p class="ld">태어난 날짜와 원하는 정보를 입력하면 세 가지 분석 결과를 함께 만들어요.</p><div class="flow3">' +
      '<div class="fl"><i>STEP 1~2</i><b>출생정보와 나의 돈 이야기를 골라요</b></div><div class="fl"><i>STEP 3</i><b>내 재물운, 투자운 결과 보기</b></div><div class="fl k"><i>MORE THAN</i><b>추가적인 궁금증을 AI와 상담받기</b></div></div>' +
      '<div class="cta-b"><h2>3분이면 충분해요. 나만의 재테크 운세를 확인해 볼까요?</h2><button class="cta-o" data-act="start">나만의 재테크 운세 보기 →</button></div>' +
      '<p class="note" style="text-align:center">해당 결과는 참고자료이며, 투자 권유가 아닙니다. 상업용 재배포는 금지합니다.</p></div><div style="height:40px"></div>';
  }

  function birth() {
    var dmax = daysIn(S.y, S.m); if (S.d > dmax) S.d = dmax;
    return bar('1단계', '출생정보') + '<div class="main"><h1>태어난 날과 시간을<br>알려주세요</h1><div class="sub">양력 기준이에요. 계산은 이 기기 안에서만 이뤄져요.</div>' +
      '<div class="lbl">생년월일 <em>양력</em></div><div class="row"><select id="y" aria-label="년">' + opts(1930, 2026, S.y, '년') + '</select><select id="m" aria-label="월">' + opts(1, 12, S.m, '월') + '</select><select id="d" aria-label="일">' + opts(1, dmax, S.d, '일') + '</select></div>' +
      '<div class="lbl">태어난 시간 <em>한국 표준시</em></div><div class="row"><select id="hh" aria-label="시">' + opts(0, 23, S.hh, '시', true) + '</select><select id="mm" aria-label="분">' + opts(0, 59, S.mm, '분', true) + '</select></div>' +
      '<p class="hint">출생 시각이 정확할수록 사주 시주·자미두수 명궁·점성술 상승점이 정확해져요. 시간을 정확히 모르면 부모님이나 출생증명서로 한 번 확인해 보세요.</p></div>' + foot('next', '계속');
  }
  function place() {
    var q = S.q.trim(); var list = CITIES.filter(function (c) { return !q || c[0].indexOf(q) >= 0; });
    return bar('1단계', '출생지') + '<div class="main"><h1>태어난 곳은<br>어디인가요?</h1><div class="sub">도시를 고르면 경도에 맞춰 시각을 보정해요.</div>' +
      '<div class="lbl">도시 검색</div><input id="q" type="text" placeholder="예: 서울, 부산, 도쿄" value="' + esc(S.q) + '" autocomplete="off" aria-label="도시 검색">' +
      '<div id="cl">' + (list.length ? list.map(function (c) { return '<button class="city' + (S.place && S.place[0] === c[0] ? ' on' : '') + '" data-city="' + esc(c[0]) + '">' + esc(c[0]) + '<small>' + (S.place && S.place[0] === c[0] ? '✓ 선택됨' : '') + '</small></button>'; }).join('') : '<p class="hint">검색 결과가 없어요. 가까운 도시를 목록에서 골라 주세요. <button class="chip" data-act="clearq">전체 목록 보기</button></p>') + '</div></div>' + foot('next', '계속', !S.place);
  }
  function who() {
    return bar('1단계', '이름·성별') + '<div class="main"><h1>마지막으로<br>기본 정보를 알려주세요</h1>' +
      '<div class="lbl">이름 또는 별명 <em>선택</em></div><input id="nm" type="text" maxlength="12" placeholder="결과 화면에서 불러 드려요" value="' + esc(S.name) + '" autocomplete="off"><p class="hint">입력하지 않아도 돼요. 공유 카드와 AI 질문에는 담기지 않아요.</p>' +
      '<div class="lbl">성별 <em>필수</em></div><div class="seg"><button class="chip' + (S.gender === 'female' ? ' on' : '') + '" data-g="female">여성</button><button class="chip' + (S.gender === 'male' ? ' on' : '') + '" data-g="male">남성</button></div>' +
      '<p class="hint">자미두수 명반과 사주 대운 방향을 정하는 데 쓰여요.</p></div>' + foot('next', '계속', !S.gender);
  }
  function story() {
    function chips(arr, on, key, max) { return arr.map(function (c) { return '<button class="chip' + (on.indexOf(c) >= 0 ? ' on' : '') + '" data-k="' + key + '" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join(''); }
    return bar('2단계', '나의 돈 이야기') + '<div class="main"><div class="ok">✓ 기본정보 완료! 이제 내 돈 고민을 골라볼까요?</div><h1>새해 돈 이야기를<br>조금 더 알려주세요</h1><div class="sub">답하고 싶은 것만 골라도 돼요. 건너뛰어도 결과는 같아요.</div>' +
      '<div class="lbl">지금 나는?</div>' + chips(JOBS, [S.job], 'job') +
      '<div class="lbl">새해에는 돈과 관련해 무엇이 가장 달라졌으면 하나요? <em>최대 3개</em></div>' + chips(WANTS, S.wants, 'wants') +
      '<div class="lbl">내 돈 습관, 하나만 바꾼다면? <em>선택</em></div>' + chips(HABITS, [S.habit], 'habit') +
      '<div class="lbl">요즘 가장 궁금한 돈 이야기 한 가지는? <em>선택</em></div><textarea id="ask" maxlength="100" placeholder="예: 월급이 들어오면 금방 사라져요. 어디부터 점검하면 좋을까요?">' + esc(S.ask) + '</textarea>' +
      '<div class="hint" style="display:flex;justify-content:space-between"><span>이메일·전화번호·주소 같은 개인정보는 적지 마세요</span><span id="cnt">' + S.ask.length + ' / 100</span></div>' +
      '<p class="hint">투자 경험이나 위험 성향, 자금 여력은 묻지 않아요. 이 서비스는 투자 적합성을 진단하지 않아요.</p>' +
      '<label class="chip" style="display:flex;gap:10px;align-items:flex-start;border-radius:16px;margin-top:14px;border-color:var(--line);background:var(--cream)"><input type="checkbox" id="useai"' + (S.useAi ? ' checked' : '') + ' style="margin-top:4px"><span><b>내 선택을 AI 질문에 반영하기</b><br><small style="font-weight:500;color:var(--muted)">켜 두면 마지막 \'물어보기\'에 위 선택이 담겨요. 결과 화면은 같아요.</small></span></label></div>' + foot('next', '계속', false, 'next');
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function confirm() {
    return bar('2단계', '입력 확인') + '<div class="main"><h1>입력한 내용이<br>맞는지 확인해 주세요</h1><div class="sum">' +
      '<div><span>생년월일</span><b>' + S.y + '년 ' + S.m + '월 ' + S.d + '일 (양력)</b></div><div><span>태어난 시간</span><b>' + pad2(S.hh) + ':' + pad2(S.mm) + '</b></div><div><span>출생지</span><b>' + esc(S.place[0]) + '</b></div><div><span>성별</span><b>' + (S.gender === 'male' ? '남성' : '여성') + '</b></div><div><span>이름</span><b>' + (S.name ? esc(S.name) : '입력 안 함') + '</b></div></div>' +
      '<p class="hint">\'계산하기\'를 누르면 이 기기에서 세 가지 차트를 계산해요. 입력한 내용은 서버로 전송되지 않아요.</p></div>' + foot('calc', '계산하기');
  }
  function loading() {
    var items = [['사주팔자', '네 기둥과 십신을 계산했어요'], ['자미두수', '12궁에 별을 배치했어요'], ['점성술', '행성의 위치를 계산했어요'], ['재물운·투자운', '세 가지 결과를 비교했어요']];
    return '<div class="stb"><div style="width:40px"></div><div class="prog"><div class="pl"><span><b>계산 중</b></span><span></span></div><div class="pb"><i style="width:85%"></i></div></div><span style="width:40px"></span></div><div class="main"><div class="ld-wrap">' +
      '<h1 class="fi" style="animation-delay:.1s">세 가지 시선으로<br>나의 재테크 운세를 읽고 있어요</h1><div class="sub fi" style="animation-delay:.6s">잠시만 기다려 주세요.</div><div style="max-width:340px;margin:22px auto 0;width:100%">' +
      items.map(function (t, i) { return '<div class="li fi" style="animation-delay:' + (1.1 + i * .6) + 's"><i>✓</i><div><b>' + t[0] + '</b><span>' + t[1] + '</span></div></div>'; }).join('') + '</div></div></div>';
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
  }
  function calc() {
    go('load'); var t0 = Date.now();
    var p = loadEngine().then(function (E) { return new Promise(function (ok) { setTimeout(function () { ok(E.calculate({ y: S.y, m: S.m, d: S.d, hh: S.hh, mm: S.mm, gender: S.gender, lat: S.place[1], lon: S.place[2] })); }, 30); }); });
    p.then(function (c) { chart = c; var wait = Math.max(0, 3600 - (Date.now() - t0)); setTimeout(function () { ev('fortune_complete'); go('result'); }, matchMedia('(prefers-reduced-motion:reduce)').matches ? 300 : wait); })
      .catch(function () { toast('계산을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); go('confirm'); });
  }
  $app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-city],[data-g],[data-k],[data-topic],[data-more]'); if (!t) return;
    var a = t.getAttribute('data-act');
    if (t.hasAttribute('data-city')) { S.place = CITIES.filter(function (c) { return c[0] === t.getAttribute('data-city'); })[0]; render(); return; }
    if (t.hasAttribute('data-g')) { S.gender = t.getAttribute('data-g'); render(); return; }
    if (t.hasAttribute('data-k')) { var k = t.getAttribute('data-k'), v = t.getAttribute('data-v'); if (k === 'wants') { var i = S.wants.indexOf(v); if (i >= 0) S.wants.splice(i, 1); else if (S.wants.length < 3) S.wants.push(v); else toast('최대 3개까지 고를 수 있어요'); } else S[k] = S[k] === v ? '' : v; var y = window.scrollY; render(); window.scrollTo(0, y); return; }
    if (t.hasAttribute('data-topic')) { topic = t.getAttribute('data-topic'); document.getElementById('cmpbody').innerHTML = compare(); ev('fortune_topic', { topic: topic }); return; }
    if (t.hasAttribute('data-more')) { var id = t.getAttribute('data-more'), d = document.getElementById('det-' + id), o = d.classList.toggle('open'); t.setAttribute('aria-expanded', o); t.textContent = o ? '접기 ⌃' : '자세히 보기 ⌄'; if (o) ev('fortune_detail', { system: id }); return; }
    if (a === 'start') { ev('fortune_start'); go('birth'); }
    else if (a === 'prev') prev(); else if (a === 'home') go('intro');
    else if (a === 'next') { var i2 = ORDER.indexOf(S.screen); go(ORDER[i2 + 1]); }
    else if (a === 'clearq') { S.q = ''; render(); }
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
    if (['y', 'm', 'd', 'hh', 'mm'].indexOf(id) >= 0) { S[id] = +e.target.value; if (id === 'y' || id === 'm') render(); }
    else if (id === 'useai') S.useAi = e.target.checked;
  });
  $app.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'q') { S.q = e.target.value; var pos = e.target.selectionStart; render(); var q = document.getElementById('q'); q.focus(); q.setSelectionRange(pos, pos); }
    else if (id === 'nm') S.name = e.target.value.slice(0, 12);
    else if (id === 'ask') { S.ask = e.target.value.slice(0, 100); document.getElementById('cnt').textContent = S.ask.length + ' / 100'; }
  });
  render();
})();
