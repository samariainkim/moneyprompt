// 연말정산 체크업 규칙 엔진 시험 — 실행: node scripts/test-yearend-engine.cjs
const assert = require('assert');
const path = require('path'); const RD = path.join(__dirname, '..', 'redesign');
const YE = require(path.join(RD, 'pages', 'yearend-engine.js')).make(require(path.join(RD, 'data', 'yearend', 'rules.v0.3.1.json')));
const YP = require(path.join(RD, 'pages', 'yearend-prompt.js')).make(require(path.join(RD, 'data', 'yearend', 'prompt.v0.3.0.json')), YE);
const { run: runRaw, R } = YE;
const run = (a, o = {}) => runRaw(a, { mode: 'staging', ...o }); // 기본: 미리보기 배포 기준(원문 확인 + 2차 일치)
const ids = r => r.items.map(i => i.id.replace('TAX-2026-', ''));
const T = []; const t = (name, fn) => { try { fn(); T.push(['PASS', name]); } catch (e) { T.push(['FAIL', name + ' → ' + e.message]); } };
const full = { Q1: 'same', Q2: 'family', Q3: ['none'], Q5: 'none', Q6: ['none'], Q7: ['none'], Q8: ['none'] };
// ---- 기본 매핑 ----
t('01 월세·미혼·연금 없음 → 월세만', () => { const r = run({ ...full, Q2: 'rent' }); assert.deepEqual(ids(r), ['RENT']); assert.equal(r.total, 7); });
t('02 전세·올해 이사 → 항목 없음(이사 독립 카드 없음), 월세 금지', () => assert.deepEqual(ids(run({ ...full, Q2: 'jeonse', Q8: ['moved'] })), []));
t('03 맞벌이·자녀 → 자녀세액공제+부양가족(중복공제 행)', () => { const r = run({ ...full, Q3: ['spouse', 'child_young'], Q4: 'dual' }); assert.deepEqual(ids(r), ['CHILD', 'DEPENDENT']); assert(r.items[1].rows.includes('dual_income_no_duplicate')); assert.equal(r.total, 8); });
t('04 연금 가입·올해 미납입 → 미납입 변형', () => assert.equal(run({ ...full, Q5: 'joined_unpaid' }).items[0].variant, 'joined_unpaid'));
t('05 올해 다른 회사에서도 근무 → 전 직장 소득·자료 확인(2행)', () => { const r = run({ ...full, Q1: 'other_workplace' }); assert.deepEqual(ids(r), ['JOB-CHANGE']); assert.deepEqual(r.items[0].rows, ['previous_income', 'previous_documents']); });
t('06 의료비·교육비 → 각각 별도 항목', () => assert.deepEqual(ids(run({ ...full, Q6: ['medical', 'edu'] })), ['MEDICAL', 'EDU']));
t('07 가족 소득 변화 → 부양가족 재확인 행', () => { const r = run({ ...full, Q8: ['family_income'] }); assert.deepEqual(ids(r), ['DEPENDENT']); assert(r.items[0].rows.includes('income_change')); });
t('08 모든 문항 건너뛰기 → 조건부 항목 없음 + 공통 확인 2개 항상 + 답하지 않은 질문 7개', () => { const r = run({}); assert.deepEqual(ids(r), []); assert.equal(r.common.length, 2); assert.deepEqual(r.skipped, ['Q1', 'Q2', 'Q3', 'Q5', 'Q6', 'Q7', 'Q8']); });
t('09 주거·연금 모름 → 먼저 확인할 것 1장, 월세·연금 카드 없음', () => { const r = run({ ...full, Q2: 'unknown', Q5: 'unknown' }); assert.deepEqual(ids(r), []); assert.deepEqual(r.firstCheck, ['주거 형태', '연금저축·IRP 가입·납입']); });
t('10 가족 없음+배우자 동시 선택 → 배타', () => { const r = run({ ...full, Q3: ['spouse', 'none'] }); assert.deepEqual(r.normalized.Q3, ['none']); assert(!('Q4' in r.normalized)); });
t('11 배우자 없음 → 맞벌이 생략, 총 7문항(하위 질문 제외)', () => assert.equal(run({ ...full, Q3: ['parent'] }).total, 7));
t('12 연금·의료·기부 복수 → 중복 없이 3개, 연금 먼저', () => assert.deepEqual(ids(run({ ...full, Q5: 'paid', Q6: ['medical', 'donation'] })), ['PENSION', 'MEDICAL', 'DONATION']));
t('13 월세+올해 이사 → 월세 1개(이사 행은 미검증이라 staging에서 숨김)', () => { const r = run({ ...full, Q2: 'rent', Q8: ['moved'] }); assert.deepEqual(ids(r), ['RENT']); assert(!r.items[0].rows.includes('moved_contract_address')); });
t('14 생활 변화 해당 없음+이사 시도 → 배타', () => assert.deepEqual(run({ ...full, Q8: ['none', 'moved'] }).normalized.Q8, ['none']));
t('15 결혼 선택(가족 질문 건너뜀) → 혼인세액공제+부양가족', () => assert.deepEqual(ids(run({ Q8: ['married'] })), ['MARRIAGE', 'DEPENDENT']));
t('16 같은 항목이 여러 이유여도 카드 1개', () => assert.equal(ids(run({ ...full, Q3: ['spouse'], Q4: 'dual', Q8: ['family_income', 'married'] })).filter(x => x === 'DEPENDENT').length, 1));
t('17 결제수단 어떤 것이든 → 카드', () => { for (const v of ['credit', 'debit', 'cash_receipt', 'market_transit']) assert.deepEqual(ids(run({ ...full, Q7: [v] })), ['CARD']); });
t('18 Q4 모름 → 부양가족은 나오되 중복공제 행 없음', () => assert(!run({ ...full, Q3: ['spouse'], Q4: 'unknown' }).items.find(i => i.id.endsWith('DEPENDENT')).rows.includes('dual_income_no_duplicate')));
t('19 잘못된 선택지는 오류', () => assert.throws(() => run({ ...full, Q2: 'villa' })));
t('20 출산·입양 → 자녀·출산 세액공제(+부양가족)', () => { const r = run({ ...full, Q8: ['birth'] }); assert.deepEqual(ids(r), ['CHILD', 'DEPENDENT']); assert(r.items[0].rows.includes('birth_adoption')); });
t('21 Q3 자녀 선택 → 자녀 세액공제도 나온다', () => assert(ids(run({ ...full, Q3: ['child_older'] })).includes('CHILD')));
// ---- Q1 (v0.3: 4개 선택지) ----
t('22 Q1 선택지는 정확히 4개(계속 근무·처음 취업·다른 회사 근무·모름)', () => assert.deepEqual(R.questions.find(q => q.id === 'Q1').options, ['same', 'first_job', 'other_workplace', 'unknown']));
t('23 Q1 처음 취업·계속 근무 → 이직 카드 없음, 모름 → 먼저 확인할 것', () => { assert.deepEqual(ids(run({ ...full, Q1: 'first_job' })), []); assert.deepEqual(ids(run({ ...full, Q1: 'same' })), []); assert.deepEqual(run({ ...full, Q1: 'unknown' }).firstCheck, ['직장 상황']); });
t('24 예전 선택지(moved·multiple)는 더 이상 받지 않는다', () => { for (const v of ['moved', 'multiple']) assert.throws(() => run({ ...full, Q1: v })); });
// ---- Q6 하위 선택 (v0.3: 난임과 미숙아·선천성이상아를 분리) ----
t('25 의료비+보험금 수령 → 보험금 제외 확인 행(검증된 행)', () => assert(run({ ...full, Q6: ['medical'], Q6M: ['insurance_received'] }).items[0].rows.includes('insurance_excluded')));
t('26 난임·미숙아는 서로 다른 행이며 staging에서는 둘 다 숨김, internal에서는 각각 나옴', () => {
  const a = { ...full, Q6: ['medical'], Q6M: ['infertility'] }, b = { ...full, Q6: ['medical'], Q6M: ['premature_congenital'] };
  for (const x of [a, b]) assert.deepEqual(run(x).items[0].rows, ['base']);
  assert.deepEqual(run(a, { mode: 'internal' }).items[0].rows, ['base', 'infertility']); assert.deepEqual(run(b, { mode: 'internal' }).items[0].rows, ['base', 'premature_congenital']); });
t('27 고향사랑기부 행도 차단', () => assert(!run({ ...full, Q6: ['donation'], Q6D: ['hometown'] }).items[0].rows.includes('hometown')));
t('28 [차단] 항목 자체를 미검증으로 바꾸면 카드가 사라진다', () => assert.deepEqual(ids(run({ ...full, Q2: 'rent' }, { overrides: { 'TAX-2026-RENT': 'unverified' } })), []));
t('29 [차단] 보여 줄 검증된 행이 하나도 없으면 카드를 내지 않는다', () => { const ro = { 'TAX-2026-RENT': { income: 'unverified', housing: 'unverified', address_contract: 'unverified', payment_evidence: 'unverified' } }; assert.deepEqual(ids(run({ ...full, Q2: 'rent' }, { rowOverrides: ro })), []); assert.deepEqual(ids(run({ ...full, Q2: 'rent' }, { rowOverrides: ro, mode: 'internal' })), ['RENT']); });
t('30 "모름" 선택지는 Q1·Q2·Q4·Q5·Q8에만(Q3·Q6·Q7에 넣으면 오류)', () => { for (const q of ['Q3', 'Q6', 'Q7']) assert.throws(() => run({ ...full, [q]: ['unknown'] })); for (const q of ['Q1', 'Q2', 'Q5']) assert.doesNotThrow(() => run({ ...full, [q]: 'unknown' })); });
t('31 공통 확인은 staging에서 어떤 입력에서도 항상 나온다', () => { for (const a of [{}, full, { ...full, Q2: 'rent' }]) assert.equal(run(a).common.length, 2); });
t('32 배우자 없는데 맞벌이 답변이 들어와도 무시', () => assert(!('Q4' in run({ ...full, Q3: ['none'], Q4: 'dual' }).normalized)));
t('33 의료비를 고르지 않았는데 하위 선택이 들어와도 무시', () => assert(!('Q6M' in run({ ...full, Q6: ['edu'], Q6M: ['infertility'] }).normalized)));
// ---- v0.3 신규: 숨긴 항목 알림, 배포 단계별 기준, 공식 링크 ----
t('34 [알림] 난임을 선택해 행이 숨겨지면 notice=true, suppressed에 해당 행이 기록된다', () => { const r = run({ ...full, Q6: ['medical'], Q6M: ['infertility'] }); assert.equal(r.notice, true); assert.deepEqual(r.suppressed, [{ id: 'TAX-2026-MEDICAL', row: 'infertility', reason: 'row_not_verified' }]); });
t('35 [알림] 숨길 것이 없으면 notice=false(불필요한 안내를 띄우지 않는다)', () => assert.equal(run({ ...full, Q2: 'rent' }).notice, false));
t('36 [알림] 카드 통째로 숨겨져도 notice=true', () => { const r = run({ ...full, Q2: 'rent' }, { overrides: { 'TAX-2026-RENT': 'unverified' } }); assert.equal(r.notice, true); assert.equal(r.suppressed[0].reason, 'item_not_verified'); });
t('37 [운영 기준] production은 원문 확인(verified)만 통과: 지금 상태(2차 일치)에서는 월세 카드·공통 확인이 모두 숨겨지고 notice=true', () => { const r = runRaw({ ...full, Q2: 'rent' }, { mode: 'production' }); assert.deepEqual(ids(r), []); assert.deepEqual(r.common, []); assert.equal(r.notice, true); });
t('38 [운영 기준] 원문 확인이 모두 끝났다고 가정하면(assumeAll=verified) 같은 입력이 production에서 정상 출력', () => { const r = runRaw({ ...full, Q2: 'rent' }, { mode: 'production', assumeAll: 'verified' }); assert.deepEqual(ids(r), ['RENT']); assert.equal(r.common.length, 2); assert.equal(r.notice, false); });
t('39 모든 결과 항목에 공식 요건 링크(https)가 있다', () => { for (const i of R.items) assert(/^https:\/\//.test(i.official_link), i.id); const r = run({ ...full, Q2: 'rent' }); assert(/^https:\/\//.test(r.items[0].official_link)); });
t('40 모든 입력에서 production 출력에는 verified가 아닌 상태가 나오지 않는다(현재 상태에서는 항목 0개)', () => { const pick = a => a[Math.floor(Math.random() * a.length)], sub = a => a.filter(() => Math.random() < .4); for (let n = 0; n < 1000; n++) { const ans = {}; for (const q of R.questions) { if (Math.random() < .2) continue; ans[q.id] = q.type === 'single' ? pick(q.options) : sub(q.options); } const r = runRaw(ans, { mode: 'production' }); assert.equal(r.items.length, 0); assert.equal(r.common.length, 0); } });
t('41 [불변식] 무작위 5,000개(staging): 미검증 행·항목 없음, 중복 없음, 우선순위 유지, 질문 수 7 또는 8, 공통 2개', () => {
  const pick = a => a[Math.floor(Math.random() * a.length)]; const sub = a => a.filter(() => Math.random() < .4);
  const itemSt = Object.fromEntries(R.items.map(i => [i.id, i])); const ok = R.profiles.staging;
  for (let n = 0; n < 5000; n++) { const ans = {}; for (const q of R.questions) { if (Math.random() < .2) continue; ans[q.id] = q.type === 'single' ? pick(q.options) : sub(q.options); }
    const r = run(ans); const seen = new Set(); let last = 0;
    for (const i of r.items) { const d = itemSt[i.id]; assert(ok.includes(d.status)); assert(!seen.has(i.id)); seen.add(i.id); assert(d.priority >= last); last = d.priority;
      const rs = Object.fromEntries(d.rows.map(x => [x.id, x.status])); for (const row of i.rows) assert(ok.includes(rs[row])); assert(i.rows.length > 0); }
    assert(r.total === 7 || r.total === 8); assert.equal(r.common.length, 2); } });
for (const [s, n] of T) console.log(s, n);
const failed = T.filter(x => x[0] === 'FAIL').length; console.log(failed ? 'FAILED ' + failed : 'ALL PASS', T.length + '건');
process.exit(failed ? 1 : 0);
