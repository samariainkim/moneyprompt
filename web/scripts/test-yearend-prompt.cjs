// 연말정산 AI 질문 생성기·자동 점검기 시험 — 실행: node scripts/test-yearend-prompt.cjs
const assert = require('assert');
const path = require('path'); const RD = path.join(__dirname, '..', 'redesign');
const YE = require(path.join(RD, 'pages', 'yearend-engine.js')).make(require(path.join(RD, 'data', 'yearend', 'rules.v0.3.1.json')));
const YP = require(path.join(RD, 'pages', 'yearend-prompt.js')).make(require(path.join(RD, 'data', 'yearend', 'prompt.v0.2.0.json')), YE);
const { build, check, guard, P, R, ALL_RULES } = YP; const { run } = YE;
const T = []; const t = (n, f) => { try { f(); T.push(['PASS', n]); } catch (e) { T.push(['FAIL', n + ' → ' + e.message]); } };
const full = { Q1: 'same', Q2: 'family', Q3: ['none'], Q5: 'none', Q6: ['none'], Q7: ['none'], Q8: ['none'] };
const A = { ...full, Q2: 'rent', Q5: 'joined_unpaid', Q7: ['credit', 'debit'] };
const B = { ...full, Q3: ['spouse', 'child_young'], Q4: 'dual', Q8: ['married', 'birth'] };
const C = { Q2: 'unknown', Q5: 'unknown' };
const D = { ...full, Q6: ['medical', 'donation'], Q6M: ['infertility', 'insurance_received'], Q6D: ['hometown'] };
const E = { ...full, Q2: 'rent', Q8: ['moved'] };
const base = build(A).text; const ids = build(A).ruleIds;
t('01 정상 프롬프트(A·B·C·D·E)는 점검을 통과한다', () => { for (const a of [A, B, C, D, E]) { const o = build(a); assert.deepEqual(o.violations, [], JSON.stringify(o.violations)); } });
t('02 [점검기] 공제 확정·환급 단정·과장 표현을 잡는다', () => { for (const s of ['월세 공제 가능합니다.', '환급이 됩니다', '무조건 받습니다', '100% 환급']) assert(check(base + '\n' + s, { ruleIds: ids }).length > 0, s); });
t('03 [점검기] 금액·공제율 숫자를 잡는다', () => { assert(check(base + '\n월세 120만 원', { ruleIds: ids }).some(x => x.includes('금액'))); assert(check(base + '\n공제율 15%', { ruleIds: ids }).some(x => x.includes('비율'))); });
t('04 [점검기] 주민번호·전화·이메일·계좌 형태를 잡는다', () => { for (const s of ['900101-1234567', '010-1234-5678', 'a.b@example.com', '110-123-456789']) assert(check(base + '\n' + s, { ruleIds: ids }).some(x => x.includes('형태')), s); });
t('05 [점검기] 규칙 ID가 빠지거나 문구가 사라지면 잡는다(문구가 아닌 ID 기준)', () => { assert(check(base, { ruleIds: ids.filter(i => i !== 'VERIFY-06') }).some(x => x.includes('VERIFY-06'))); assert(check(base.replace(ALL_RULES['SIM-01'], ''), { ruleIds: ids }).some(x => x.includes('SIM-01'))); });
t('06 [점검기] 섹션 순서·추천 표현·"개인정보 없음" 단정·길이 초과를 잡는다', () => { assert(check(base.replace('# 3. SIMULATE', '# 3. 기타'), { ruleIds: ids }).some(x => x.includes('섹션'))); assert(check(base + '\n가입하세요', { ruleIds: ids }).some(x => x.includes('추천'))); assert(check(base + '\n개인 정보는 포함되어 있지 않으며', { ruleIds: ids }).some(x => x.includes('개인정보'))); assert(check(base + 'x'.repeat(7000), { ruleIds: ids }).some(x => x.includes('길이'))); });
t('07 날짜·버전 문자열(2026-11-19, v0.2.0)은 번호로 오인하지 않는다', () => assert.deepEqual(build(A).violations, []));
t('08 입력은 선택지 ID만: 자유 텍스트·잘못된 선택지는 오류', () => { assert.throws(() => build({ ...full, Q2: '서울시 강남구 123' })); assert.throws(() => build({ ...full, Q3: ['spouse', '<script>'] })); });
t('09 모든 체크업 행·공통 확인에 프롬프트 문구가 있다', () => { for (const i of R.items) for (const r of i.rows) assert(P.rows[i.id] && P.rows[i.id][r.id], i.id + '.' + r.id); for (const c of R.common) assert(P.common_rows[c.id]); });
t('10 모든 질문·선택지에 라벨이 있다', () => { for (const q of R.questions) for (const o of q.options) assert(P.labels[q.id][o], q.id + '.' + o); });
t('11 [차단] 미검증 행 문구는 프롬프트에 없고 notice 가 켜진다', () => { const o = build(D); assert(!o.text.includes(P.rows['TAX-2026-MEDICAL'].infertility)); assert(!o.text.includes(P.rows['TAX-2026-DONATION'].hometown)); assert(o.notice === true); });
t('12 [대조] internal 모드에서는 같은 문구가 나온다', () => assert(build(D, { mode: 'internal' }).text.includes(P.rows['TAX-2026-MEDICAL'].infertility)));
t('13 [운영 기준] production 은 확인된 항목 0개 → "확인된 결과 항목 없음", 점검 통과', () => { const o = build(A, { mode: 'production' }); assert(o.text.includes('(확인된 결과 항목 없음)')); assert.deepEqual(o.violations, []); });
t('14 [연쇄 제외] 월세 응답(Q2)을 빼면 월세 항목·선정 이유·주소/결제 행·이사→계약주소 행이 모두 사라진다', () => { const o = build(E, { exclude: ['Q2'] }); for (const s of ['월세 세액공제', '월세로 거주', '주거 형태', P.rows['TAX-2026-RENT'].address_contract, P.rows['TAX-2026-RENT'].payment_evidence]) assert(!o.text.includes(s), s); assert(o.text.includes('올해 생활 변화: 이사')); assert.deepEqual(o.violations, []); });
t('15 [연쇄 제외] Q6 제외 시 하위 Q6M·Q6D 와 파생 항목도 사라진다', () => { const o = build(D, { exclude: ['Q6'] }); for (const s of ['의료', '기부', '교육']) assert(!o.text.includes('올해 큰 지출') && !o.items.some(i => i.id.includes(s.toUpperCase())), s); assert(!o.text.includes(P.rows['TAX-2026-MEDICAL'].base)); });
t('16 [연쇄 제외] Q3 제외 시 Q4(맞벌이)도 함께 제외된다', () => { const o = build(B, { exclude: ['Q3'] }); assert(!o.text.includes('맞벌이') && !o.text.includes('- ' + P.labels.Q3.title + ':') && !o.text.includes('- ' + P.labels.Q4.title + ':') && !o.items.some(i => i.reason.includes('Q3=') || i.reason.includes('Q4='))); });
t('17 [공유 안내] 제외가 있으면 "공유하지 않기로" 문구가 들어가고, 제외한 질문은 "응답하지 않은 질문"에도 나오지 않는다', () => { const o = build(C, { exclude: ['Q2'] }); assert(o.text.includes(P.not_shared_note)); assert(!o.text.includes('- 주거 형태')); assert(build(C).text.includes('- 주거 형태')); });
t('18 [독립 가드] 엔진이 상태를 잘못 내보내도(미검증 행 주입) 생성기가 다시 걸러낸다', () => { const fake = { items: [{ id: 'TAX-2026-MEDICAL', reason: 'Q6=medical', rows: ['base', 'infertility'] }], common: [] }; const stat = Object.fromEntries(R.items.find(i => i.id === 'TAX-2026-MEDICAL').rows.map(r => [r.id, r.status])); const g = guard(fake, 'production'); const kept = g.items.flatMap(i => i.rows); for (const r of kept) assert(R.profiles.production.includes(stat[r]), r); });
t('19 [독립 가드] 귀속연도가 다르면 생성이 중단된다', () => { const y = R.tax_year; R.tax_year = 2025; try { assert.throws(() => build(A), /귀속연도/); } finally { R.tax_year = y; } });
t('20 [메타] 작성 기준일·법령 검증 상태가 분리 표시된다(검증 전에는 "진행 중")', () => { const o = build(A, { asOf: '2026-12-01' }); assert(o.text.includes('작성 기준일 2026-12-01') && o.text.includes('법령 원문 검증: 진행 중')); assert.equal(o.meta.legal_verified_at, null); assert(o.text.includes('프롬프트 v0.2.0') && o.text.includes('체크업 규칙 v0.3.1')); });
t('21 [개인정보 문구] "개인정보 없음" 단정이 없고 직접식별정보 비포함 + 동의 문구가 있다', () => { const x = build(A).text; assert(!x.includes('개인 정보는 포함되어 있지 않')); assert(x.includes('직접 선택하고 공유에 동의한') && x.includes('직접 식별정보는 포함하지 않습니다')); });
t('22 [접근 불가 규칙] VERIFY-06 이 항상 들어간다', () => { for (const a of [A, B, C, D, {}]) assert(build(a).text.includes(ALL_RULES['VERIFY-06'])); });
t('23 금액 미입력 계산 금지(SIM-01)와 질문 3개 이내(SIM-02)가 항상 들어간다', () => { for (const a of [A, B, C, D, {}]) { const x = build(a).text; assert(x.includes(ALL_RULES['SIM-01']) && x.includes(ALL_RULES['SIM-02'])); } });
t('24 결정적: 같은 입력은 같은 프롬프트', () => assert.equal(build(A).text, build(A).text));
t('25 "판정한 것이 아님" 안내가 결과 블록 머리에 항상 있다', () => { for (const a of [A, B, {}]) assert(build(a).text.includes('공제 가능 여부를 판정한 것이 아님')); });
t('26 권장 길이(3,000) 초과는 경고, 최대(6,000) 초과는 위반으로 분리된다', () => { const w = []; check(base + 'x'.repeat(3500), { ruleIds: ids, warnings: w }); assert(w.length === 1); assert(check(base + 'x'.repeat(6500), { ruleIds: ids }).some(x => x.includes('길이'))); });
t('27 [속성 시험] 무작위 응답·무작위 제외 3,000회: ① 점검 통과 ② 프롬프트의 항목 = 남은 응답으로 엔진을 다시 돌린 결과 ③ 제외한 질문의 라벨이 본문에 없음 ④ 숨긴 행 문구 없음', () => {
  const pick = a => a[Math.floor(Math.random() * a.length)], sub = a => a.filter(() => Math.random() < .4); let maxLen = 0; const DEP = { Q6: ['Q6M', 'Q6D'], Q3: ['Q4'] };
  for (let n = 0; n < 3000; n++) { const ans = {}; for (const q of R.questions) { if (Math.random() < .2) continue; ans[q.id] = q.type === 'single' ? pick(q.options) : sub(q.options); }
    const keys = Object.keys(ans).filter(k => !/^Q6[MD]$/.test(k)); const ex = keys.filter(() => Math.random() < .3);
    let o; try { o = build(ans, { exclude: ex }); } catch (e) { continue; }
    assert.deepEqual(o.violations, [], JSON.stringify(ans) + JSON.stringify(ex) + o.violations.join(','));
    const exAll = new Set(ex); ex.forEach(q => (DEP[q] || []).forEach(d => exAll.add(d))); const rem = Object.fromEntries(Object.entries(ans).filter(([q]) => !exAll.has(q)));
    const exp = run(rem, { mode: 'staging' }); assert.deepEqual(o.items.map(i => i.id + ':' + i.rows.join()), exp.items.map(i => i.id + ':' + i.rows.join()), '항목 불일치 ' + JSON.stringify(ex));
    for (const q of ex) if (ans[q] !== undefined) assert(!o.text.includes('- ' + P.labels[q].title + ':') && !o.text.includes('- ' + P.labels[q].title + '\n'), '제외 질문 라벨 노출 ' + q);
    for (const s of exp.suppressed.filter(s => s.row)) assert(!o.text.includes(P.rows[s.id][s.row]), '숨긴 행 노출'); maxLen = Math.max(maxLen, o.text.length); }
  console.log('   (최대 길이 ' + maxLen + '자)'); });
for (const [s, n] of T) console.log(s, n); const failed = T.filter(x => x[0] === 'FAIL').length; console.log(failed ? 'FAILED ' + failed : 'ALL PASS', T.length + '건'); process.exit(failed ? 1 : 0);
