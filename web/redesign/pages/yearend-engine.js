/* 연말정산 체크업 규칙 엔진 (순수 함수, UI 비의존) — 질문 응답 → 확인해 볼 항목.
   규칙 데이터(rules JSON)를 인자로 받는다: YearendEngine.make(rules) → { run, normalize, R }.
   공제 가능 여부를 판정하지 않으며, 금액·소득은 입력받지 않는다. 항목·행마다 검증 상태(verified/secondary_matched/unverified)가 있고
   배포 프로필(production/staging/internal)이 허용한 상태만 결과에 나온다. 차단된 것은 suppressed/notice 로 알린다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.YearendEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function make(R) {
  function normalize(ans) {
    const out = {};
    for (const q of R.questions) {
      if (q.showIf && !Object.entries(q.showIf).every(([k, v]) => (out[k] || []).includes(v))) continue; // 노출 조건이 안 맞으면 입력을 버린다
      let a = ans[q.id];
      if (a === undefined || a === null || (Array.isArray(a) && !a.length)) continue; // 건너뜀
      if (q.type === 'multi') {
        a = [...new Set(a)];
        const ex = (q.exclusive || []).find(e => a.includes(e)); if (ex) a = [ex]; // 배타 옵션
        if (!a.every(x => q.options.includes(x))) throw new Error('bad option ' + q.id);
      } else { if (!q.options.includes(a)) throw new Error('bad option ' + q.id); a = [a]; }
      out[q.id] = a;
    }
    return out;
  }
  const has = (a, q, v) => (a[q] || []).includes(v);
  const mainQuestions = a => R.questions.filter(q => !q.sub && (!q.showIf || Object.entries(q.showIf).every(([k, v]) => has(a, k, v))));
  function run(ans, opts = {}) {
    const mode = opts.mode || 'production'; // production: 원문 확인(verified)만 / staging: 2차 일치까지(미리보기 배포용) / internal: 전부(내부 확인용)
    const assumeAll = opts.assumeAll || null; // 테스트용: 모든 상태를 한꺼번에 덮어씀(예: 'verified' = 원문 확인이 모두 끝난 경우를 가정)
    const overrides = opts.overrides || {}; // 테스트용: 항목 상태 덮어쓰기
    const rowOverrides = opts.rowOverrides || {}; // 테스트용: 행 상태 덮어쓰기 {항목id: {행id: 상태}}
    const a = normalize(ans); const hits = {}; // itemId -> {reason, rows:Set, variant}
    const add = (id, reason, rows = [], variant) => { const h = hits[id] || (hits[id] = { reasons: [], rows: new Set(), variant }); h.reasons.push(reason); rows.forEach(r => h.rows.add(r)); if (variant) h.variant = variant; };
    const def = Object.fromEntries(R.items.map(i => [i.id, i]));
    // 연금 (가입·납입 구분)
    if (has(a, 'Q5', 'paid')) add('TAX-2026-PENSION', 'Q5=paid', ['limit', 'year_end_deposit'], 'paid');
    if (has(a, 'Q5', 'joined_unpaid')) add('TAX-2026-PENSION', 'Q5=joined_unpaid', ['limit', 'year_end_deposit'], 'joined_unpaid');
    // 월세 (이사는 월세 카드의 행으로만)
    if (has(a, 'Q2', 'rent')) add('TAX-2026-RENT', 'Q2=rent', ['income', 'housing', 'address_contract', 'payment_evidence'].concat(has(a, 'Q8', 'moved') ? ['moved_contract_address'] : []));
    // 혼인·출산·자녀
    if (has(a, 'Q8', 'married')) { add('TAX-2026-MARRIAGE', 'Q8=married', ['filing_year', 'once_in_lifetime']); add('TAX-2026-DEPENDENT', 'Q8=married', ['income_age']); }
    const kids = has(a, 'Q3', 'child_young') || has(a, 'Q3', 'child_older');
    if (kids) add('TAX-2026-CHILD', 'Q3=child', ['age_requirement']);
    if (has(a, 'Q8', 'birth')) { add('TAX-2026-CHILD', 'Q8=birth', ['age_requirement', 'birth_adoption']); add('TAX-2026-DEPENDENT', 'Q8=birth', ['income_age']); }
    // 카드
    if (['credit', 'debit', 'cash_receipt', 'market_transit'].some(v => has(a, 'Q7', v))) add('TAX-2026-CARD', 'Q7=' + a.Q7.join(','), ['threshold', 'method_difference'].concat(has(a, 'Q7', 'market_transit') ? ['special_items'] : []));
    // 부양가족
    if (['spouse', 'child_young', 'child_older', 'parent'].some(v => has(a, 'Q3', v))) add('TAX-2026-DEPENDENT', 'Q3=' + a.Q3.join(','), ['income_age']);
    if (has(a, 'Q8', 'family_income')) add('TAX-2026-DEPENDENT', 'Q8=family_income', ['income_age', 'income_change']);
    if (has(a, 'Q4', 'dual')) add('TAX-2026-DEPENDENT', 'Q4=dual', ['income_age', 'dual_income_no_duplicate']);
    // 의료·교육·기부 (하위 선택은 행으로만 반영)
    if (has(a, 'Q6', 'medical')) add('TAX-2026-MEDICAL', 'Q6=medical', ['base'].concat(has(a, 'Q6M', 'insurance_received') ? ['insurance_excluded'] : [], has(a, 'Q6M', 'infertility') ? ['infertility'] : [], has(a, 'Q6M', 'premature_congenital') ? ['premature_congenital'] : []));
    if (has(a, 'Q6', 'edu')) add('TAX-2026-EDU', 'Q6=edu', ['base']);
    if (has(a, 'Q6', 'donation')) add('TAX-2026-DONATION', 'Q6=donation', ['base'].concat(has(a, 'Q6D', 'hometown') ? ['hometown'] : []));
    // 이직·복수 근무처
    if (has(a, 'Q1', 'other_workplace')) add('TAX-2026-JOB-CHANGE', 'Q1=other_workplace', ['previous_income', 'previous_documents']);
    // 허용된 상태만 출력 (행 단위 + 항목 단위 차단). 차단된 것은 suppressed 로 기록해 화면에서 "일부 항목은 공식 기준 확인 중" 안내를 띄운다.
    const okSet = R.profiles[mode]; const st = x => assumeAll || x; const allowed = s => okSet.includes(st(s));
    const items = []; const suppressed = [];
    for (const [id, h] of Object.entries(hits)) {
      const d = def[id]; const istat = overrides[id] || d.status;
      if (!allowed(istat)) { suppressed.push({ id, reason: 'item_not_verified' }); continue; }
      const rowStatus = { ...Object.fromEntries(d.rows.map(r => [r.id, r.status])), ...(rowOverrides[id] || {}) };
      const rows = []; for (const r of h.rows) { if (allowed(rowStatus[r])) rows.push(r); else suppressed.push({ id, row: r, reason: 'row_not_verified' }); }
      if (!rows.length) { if (!suppressed.find(x => x.id === id && !x.row)) suppressed.push({ id, reason: 'no_verified_rows' }); continue; }
      items.push({ id, reason: h.reasons.join(' | '), rows, variant: h.variant, priority: d.priority, official_link: d.official_link });
    }
    items.sort((x, y) => x.priority - y.priority);
    const common = R.common.filter(c => allowed(c.status)).map(c => c.id); R.common.filter(c => !allowed(c.status)).forEach(c => suppressed.push({ id: c.id, reason: 'common_not_verified' })); // 어떤 입력에서도 공통 확인은 항상 나옴
    const firstCheck = Object.keys(R.unknown_topics).filter(q => has(a, q, 'unknown')).map(q => R.unknown_topics[q]);
    const skipped = mainQuestions(a).filter(q => !(q.id in a)).map(q => q.id);
    return { items, common, firstCheck, skipped, suppressed, notice: suppressed.length > 0, total: mainQuestions(a).length, normalized: a };
  }
  return { run: run, normalize: normalize, R: R };

  }
  return { make: make };
});
