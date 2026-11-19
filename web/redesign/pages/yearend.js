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

  /* ── 연말정산 계산 단계 ── */
  var STEPS = [
    ['총급여', '연간 급여에서 비과세소득을 뺀 금액이에요.', null],
    ['근로소득금액', '총급여에서 근로소득공제를 차감한 금액이에요.', null],
    ['소득공제', '인적공제·특별소득공제·그 밖의 소득공제를 차감해요. 신용카드 사용액 공제 등이 여기에 있어요.', '카드·현금영수증 사용'],
    ['과세표준', '근로소득금액에서 소득공제를 차감한 금액으로 세율을 적용하는 기준이에요.', null],
    ['산출세액', '과세표준에 세율을 적용해 계산한 세금이에요.', null],
    ['세액감면·세액공제', '산출세액에서 직접 차감해요. 대표 항목 예시: 연금계좌, 월세, 교육비, 의료비, 기부금, 자녀 관련 공제 등. 항목마다 요건과 한도가 달라 하나씩 확인이 필요해요.', '연금·월세·의료·교육·기부'],
    ['결정세액', '산출세액에서 감면·공제를 차감한 최종 세금이에요.', null],
    ['환급·추가납부', '결정세액과 이미 낸 세금(기납부세액)을 비교해 환급 또는 추가 납부가 정해져요.', null]
  ];
  var cur = 5;
  function renderSteps() {
    var bar = document.getElementById('yeSteps'), box = document.getElementById('yeStepBox'); if (!bar || !box) return;
    bar.innerHTML = STEPS.map(function (s, i) { return '<button type="button" role="tab" class="sb' + (i === cur ? ' on' : '') + '" aria-selected="' + (i === cur) + '" data-i="' + i + '"><small>' + (i + 1) + '</small>' + esc(s[0]) + '</button>'; }).join('');
    var s = STEPS[cur];
    box.innerHTML = '<div><span class="eyebrow">' + (cur + 1) + '단계</span><h3>' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p></div><div class="l">' +
      (s[2] ? '<a href="/yearend/checkup/" data-ga="ye_hub_service" data-service="step_checkup">🧭 체크업에서 내 항목 확인 <span>→</span></a>' : '') +
      (cur === 5 ? '<a class="off" aria-disabled="true">📈 연금저축·IRP 납입 효과 <span>준비중</span></a>' : '') + '</div>';
  }
  document.addEventListener('click', function (e) {
    var sb = e.target.closest && e.target.closest('#yeSteps .sb');
    if (sb) { cur = +sb.getAttribute('data-i'); renderSteps(); ga('ye_hub_step', { step: cur + 1 }); return; }
    var q = e.target.closest && e.target.closest('#yeFaq .fq button');
    if (q) { var open = q.getAttribute('aria-expanded') !== 'true'; q.setAttribute('aria-expanded', open ? 'true' : 'false'); q.nextElementSibling.hidden = !open; q.querySelector('i').textContent = open ? '－' : '＋'; if (open) ga('ye_hub_faq', { q: Array.prototype.indexOf.call(q.parentNode.parentNode.children, q.parentNode) + 1 }); return; }
    var a = e.target.closest && e.target.closest('[data-ga^="ye_"]');
    if (a) {
      var n = a.getAttribute('data-ga'), p = {};
      ['where', 'service', 'case', 'post', 'target'].forEach(function (k) { var v = a.getAttribute('data-' + k); if (v) p[k] = v; });
      ga(n, p);
    }
  });
  renderSched(); renderSteps();
})();
