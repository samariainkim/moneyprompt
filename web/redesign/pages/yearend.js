/* 연말정산 특집 허브(/yearend/) — 일정 카드(오늘 날짜 강조), 계산 단계 안내, FAQ, 측정 */
(function () {
  'use strict';
  function ga(name, p) { try { if (typeof window.gtag === 'function') window.gtag('event', name, p || {}); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function kstToday() { var d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10); }
  function days(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }

  /* ── 일정 (공식 안내 기준) ──
     tag: ok=공식 일정 확인 / chk=확인 필요 / wait=공식 발표 대기. 날짜는 한국 기준 YYYY-MM-DD, end 가 없으면 하루짜리. */
  var SCHED = [
    { start: '2026-10-28', end: '2026-12-18', label: '12/18', title: '홈택스 연말정산 미리보기 종료', note: '10/28부터 이용 중', tag: 'ok', src: 'https://hometax.go.kr' },
    { start: '2026-12-31', label: '12/31', title: '연금저축·IRP 올해 납입 마감 · 금융회사별 처리 시각은 별도 확인', tag: 'ok', src: 'https://www.nts.go.kr' },
    { start: '2026-12-01', end: '2027-01-19', label: '12/1~1/19', title: '간소화자료 일괄제공 동의(회사가 신청한 경우) · 절차별 기간 재확인 중', tag: 'chk', src: 'https://www.nts.go.kr' },
    { start: '2027-01-15', label: '1월 중순', title: '연말정산 간소화 서비스 개통 · 공식 개통일 발표 전', tag: 'wait', src: 'https://www.nts.go.kr', soft: true }
  ];
  var TAGS = { ok: '공식 일정 확인', chk: '확인 필요', wait: '공식 발표 대기' };

  function renderSched() {
    var el = document.getElementById('yeSched'); if (!el) return;
    var today = kstToday(), nowIdx = -1;
    SCHED.forEach(function (s, i) { var e = s.end || s.start; if (!s.soft && s.start <= today && today <= e && nowIdx < 0) nowIdx = i; });
    el.innerHTML = SCHED.map(function (s, i) {
      var e = s.end || s.start, done = e < today && !s.soft, now = i === nowIdx;
      var dd = now && s.end ? '<span class="dday">D-' + days(today, s.end) + '</span>' : (!done && !now && !s.soft && s.start > today ? '<span class="dday soft">D-' + days(today, s.start) + '</span>' : '');
      return '<div class="sc' + (done ? ' done' : '') + (now ? ' now' : '') + '">' + (now ? '<div class="nowb">● 지금 진행 중</div>' : '') +
        '<div class="d">' + esc(s.label) + dd + '</div><div class="t">' + esc(s.title) + (s.note ? ' <small>(' + esc(s.note) + ')</small>' : '') + '</div>' +
        '<span class="tag ' + s.tag + '">' + TAGS[s.tag] + '</span>' +
        '<a class="src" href="' + esc(s.src) + '" target="_blank" rel="noopener" data-ga="ye_official" data-target="sched_' + i + '">출처 ↗</a></div>';
    }).join('');
    ga('ye_hub_view', { has_active: nowIdx >= 0 ? 1 : 0 });
  }

  /* ── 연말정산 계산 단계: 개념·계산식·확인할 항목·FAQ + 이어서 해볼 서비스 ──
     설명은 구조(어떤 값에서 무엇을 빼는지)와 개념 위주이며, 금액·세율·한도 같은 숫자는 싣지 않는다(공식 자료에서 확인). */
  var OFFICIAL = [['홈택스 연말정산 미리보기', 'https://hometax.go.kr', 'hometax'], ['국세청 연말정산 안내', 'https://www.nts.go.kr', 'nts_guide']];
  var CK = { t: 'STEP 1 · 나의 연말정산 체크업', href: '/yearend/checkup/', k: 'pri', s: 'checkup' };
  var PROMPT = { t: '돈 버는 프롬프트 · 절세전략', href: '/prompt/', k: '', s: 'prompt' };
  var BOOK = { t: '『AI로 부자되기』 책 안내', href: '/book/', k: '', s: 'book' };
  var PENS = { t: '연금·IRP 납입 효과', off: '12월 중순 · 준비중' };
  var CALC = { t: '놓친 공제 찾기 · 예상세액 계산', off: '준비중' };
  var STEPS = [
    { n: '총급여', easy: '1년 동안 회사에서 받은 급여·상여·수당을 모두 더한 금액에서, 식대 등 세금을 매기지 않는 <b>비과세 소득</b>을 뺀 금액이에요. 근로소득 원천징수영수증에 ‘총급여’로 표시돼요.',
      f: '총급여 = 연간 급여·상여·수당 − 비과세 소득', chk: ['급여·상여·수당', '비과세 소득(식대 등)', '이직했다면 전 직장 급여'], note: '이직·중도 입사라면 전 직장 소득도 함께 합산해 정산해요.',
      faq: [['총급여는 어디서 확인하나요?', '회사가 발급하는 근로소득 원천징수영수증에 표시돼요. 급여명세서의 합계와는 비과세 소득 때문에 다를 수 있어요.'], ['세전 연봉과 총급여는 같은가요?', '같지 않을 수 있어요. 비과세 소득은 빠지고, 상여·수당은 더해져요. 정확한 금액은 원천징수영수증으로 확인하세요.']], svc: [CK, PROMPT] },
    { n: '근로소득금액', easy: '총급여에서 <b>근로소득공제</b>를 뺀 금액이에요. 근로소득공제는 일하는 사람이면 별도 신청 없이 자동으로 적용되고, 총급여 구간에 따라 계산 방식이 정해져 있어요.',
      f: '근로소득금액 = 총급여 − 근로소득공제', chk: ['자동 적용(신청 불필요)'], note: '이 단계에서 직접 할 일은 없어요. 계산 결과만 확인하면 돼요.',
      faq: [['근로소득공제는 신청해야 하나요?', '아니요. 총급여에 따라 자동으로 계산돼요.'], ['총급여가 많아지면 공제도 계속 늘어나나요?', '구간별로 계산 방식이 정해져 있고 상한이 있어요. 정확한 기준은 국세청 안내에서 확인하세요.']], svc: [CK, PROMPT] },
    { n: '소득공제', easy: '근로소득금액에서 <b>내 상황에 따라 추가로 빼 주는 금액</b>이에요. 본인·부양가족에 대한 인적공제, 국민연금·건강보험료, 신용카드·현금영수증 사용액 공제 등이 있어요. <b>세금을 계산하는 기준 금액 자체</b>를 줄여 줘요.',
      f: '소득공제 합계 = 인적공제 + 보험료 등 공제 + 신용카드 등 사용액 공제 + 그 밖의 소득공제', chk: ['부양가족(인적공제)', '국민연금·건강보험', '신용카드·현금영수증', '주택 관련 소득공제'], note: '항목마다 요건과 한도가 달라요. 내게 해당하는지는 STEP 1 체크업에서 확인해 보세요.',
      faq: [['신용카드를 많이 쓰면 환급금이 늘어나나요?', '사용액이 기준을 넘는 부분부터 공제되고 한도가 있어요. 많이 쓴다고 환급이 늘어나는 것은 아니에요. 결제수단별로 공제 방식도 달라요.'], ['부양가족은 누구나 올릴 수 있나요?', '나이·소득 요건이 있고, 맞벌이처럼 한 사람만 공제받을 수 있는 경우도 있어요. 체크업에서 확인할 요건을 정리해 드려요.']], svc: [CK, PROMPT] },
    { n: '과세표준', easy: '<b>세율을 곱하는 기준 금액</b>이에요. 근로소득금액에서 소득공제를 모두 뺀 값이에요.',
      f: '과세표준 = 근로소득금액 − 소득공제 합계', chk: ['계산 결과 확인'], note: '소득공제를 많이 받을수록 과세표준이 낮아져요.',
      faq: [['과세표준이 낮아지면 무엇이 좋은가요?', '세율을 곱하는 금액이 줄어 산출세액이 줄어요. 그래서 소득공제는 ‘세금의 기준 금액’을 줄이는 공제라고 해요.']], svc: [CK, PROMPT] },
    { n: '산출세액', easy: '과세표준에 <b>세율</b>을 적용해 계산한 세금이에요. 과세표준을 구간으로 나누어, 높은 구간일수록 더 높은 세율을 적용해요(누진세율).',
      f: '산출세액 = 과세표준에 구간별 세율을 적용한 금액', chk: ['과세표준 구간', '구간별 세율(공식 자료 확인)'], note: '세율과 구간은 해마다 달라질 수 있어 이 화면에는 숫자를 싣지 않았어요. 국세청 안내에서 확인하세요.',
      faq: [['소득이 오르면 전체 소득에 높은 세율이 적용되나요?', '아니요. 구간을 넘는 부분에만 더 높은 세율이 적용돼요.']], svc: [CK, PROMPT] },
    { n: '세액감면·세액공제', easy: '소득공제가 “세금을 계산하는 기준 금액”을 줄여 준다면, 세액공제는 <b>이미 계산된 세금 자체</b>를 직접 깎아 줘요. 그래서 같은 금액이라도 효과가 달라요.',
      f: '결정세액 = 산출세액 − 세액감면 − 세액공제', chk: ['연금계좌', '월세', '교육비', '의료비', '기부금', '자녀 관련'], note: '항목마다 요건과 한도가 달라요. 내게 해당하는지는 STEP 1 체크업에서 확인해 보세요.',
      faq: [['소득공제와 세액공제는 뭐가 다른가요?', '소득공제는 과세표준(세율을 곱하는 기준 금액)을 줄이고, 세액공제는 산출세액에서 바로 차감해요. 공제 항목마다 어느 쪽에 해당하는지 정해져 있어요.'], ['세액공제는 쓴 만큼 다 받을 수 있나요?', '아니요. 항목마다 요건과 한도가 있어요. 한도와 비율은 해마다 달라질 수 있어 공식 자료에서 확인해야 해요.'], ['연금저축 납입은 언제까지 해야 올해 기준인가요?', '올해 기준은 12월 31일까지 납입한 금액이에요. 금융회사별 처리 시각은 다를 수 있으니 따로 확인하세요.']], svc: [CK, PENS, PROMPT, BOOK] },
    { n: '결정세액', easy: '산출세액에서 세액감면·세액공제를 뺀, <b>내가 최종적으로 내야 할 세금</b>이에요.',
      f: '결정세액 = 산출세액 − 세액감면 − 세액공제', chk: ['계산 결과 확인'], note: '결정세액은 아직 환급액이 아니에요. 이미 낸 세금과 비교하는 것이 다음 단계예요.',
      faq: [['결정세액이 곧 환급금인가요?', '아니요. 이미 월급에서 낸 세금(기납부세액)과 비교한 차이가 환급 또는 추가 납부가 돼요.']], svc: [CK, CALC] },
    { n: '환급·추가납부', easy: '결정세액과 이미 낸 세금(<b>기납부세액</b>)을 비교해요. 이미 낸 세금이 더 많으면 <b>환급</b>, 적으면 <b>추가 납부</b>예요.',
      f: '차이 = 기납부세액 − 결정세액 (+면 환급, −면 추가 납부)', chk: ['기납부세액(원천징수영수증)', '환급·추가 납부 시기(회사 안내)'], note: '홈택스 미리보기 금액은 예상일 뿐 확정이 아니에요.',
      faq: [['미리보기 금액이 실제 환급금인가요?', '아닙니다. 홈택스 미리보기의 금액은 예상 금액이며 실제 연말정산 결과와 차이가 날 수 있어요.'], ['12월 18일이 지나면 연말정산을 할 수 없나요?', '아니에요. 12월 18일은 홈택스 ‘연말정산 미리보기’ 이용 종료일이에요. 실제 연말정산은 회사를 통해 이듬해 초에 진행돼요.']], svc: [CK, CALC] }
  ];
  var cur = 5, openFaq = 0;
  function svcHtml(s) { if (s.off) return '<div class="off"><span>' + esc(s.t) + '</span><span>' + esc(s.off) + '</span></div>'; return '<a class="' + s.k + '" href="' + esc(s.href) + '" data-ga="ye_hub_service" data-service="guide_' + s.s + '"><span>' + esc(s.t) + '</span><span aria-hidden="true">→</span></a>'; }
  function renderSteps() {
    var bar = document.getElementById('yeSteps'), box = document.getElementById('yeGuide'); if (!bar || !box) return;
    bar.innerHTML = STEPS.map(function (s, i) { return '<button type="button" role="tab" class="sb' + (i === cur ? ' on' : '') + '" aria-selected="' + (i === cur) + '" data-i="' + i + '"><small>' + (i + 1) + '</small>' + esc(s.n) + '</button>'; }).join('');
    var s = STEPS[cur];
    box.innerHTML = '<div class="main"><span class="eyebrow">' + (cur + 1) + '단계</span><h3>' + esc(s.n) + '</h3>' +
      '<h4>쉽게 말하면</h4><p>' + s.easy + '</p><h4>계산식</h4><div class="formula">' + esc(s.f) + '</div>' +
      '<h4>이 단계에서 확인할 것</h4><div class="chk">' + s.chk.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' + (s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') +
      '<h4>자주 묻는 질문</h4>' + s.faq.map(function (q, i) { var o = i === openFaq; return '<div class="fq"><button type="button" aria-expanded="' + o + '" data-q="' + i + '"><span>' + esc(q[0]) + '</span><i aria-hidden="true">' + (o ? '－' : '＋') + '</i></button><p' + (o ? '' : ' hidden') + '>' + esc(q[1]) + '</p></div>'; }).join('') + '</div>' +
      '<div class="side"><div><h5>공식 자료에서 최종 확인하세요</h5><p class="sd">돈버프는 신고·정산을 대신하지 않아요. 최종 확인은 국세청 홈택스에서 해 주세요.</p>' + OFFICIAL.map(function (o) { return '<a href="' + o[1] + '" target="_blank" rel="noopener" data-ga="ye_official" data-target="' + o[2] + '"><span>' + esc(o[0]) + '</span><span aria-hidden="true">↗</span></a>'; }).join('') + '</div>' +
      '<div class="db"><h5>돈버프에서 확인해보세요</h5><p class="sd">이 단계와 이어서 해볼 수 있는 서비스예요.</p>' + s.svc.map(svcHtml).join('') + '</div></div>';
  }
  document.addEventListener('click', function (e) {
    var sb = e.target.closest && e.target.closest('#yeSteps .sb');
    if (sb) { cur = +sb.getAttribute('data-i'); openFaq = 0; renderSteps(); ga('ye_hub_step', { step: cur + 1 }); return; }
    var q = e.target.closest && e.target.closest('#yeGuide .fq button');
    if (q) { var i = +q.getAttribute('data-q'); openFaq = openFaq === i ? -1 : i; renderSteps(); if (openFaq === i) ga('ye_hub_faq', { step: cur + 1, q: i + 1 }); return; }
    var a = e.target.closest && e.target.closest('[data-ga^="ye_"]');
    if (a) {
      var n = a.getAttribute('data-ga'), p = {};
      ['where', 'service', 'case', 'post', 'target'].forEach(function (k) { var v = a.getAttribute('data-' + k); if (v) p[k] = v; });
      ga(n, p);
    }
  });
  renderSched(); renderSteps();
})();
