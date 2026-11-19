/* 연말정산 체크업 결과 → AI 질문(프롬프트) 생성기 (AI 호출 없음, 순수 함수).
   YearendPrompt.make(promptData, engine) → { build, check, guard, ... }.  engine = YearendEngine.make(rules).
   파이프라인: ① 입력 검증 → ② 공유 범위 확정(제외한 응답과 그 파생 정보 제거 후 다시 계산) → ③ 독립 가드(귀속연도·항목/행 상태 재확인)
   → ④ 생성 → ⑤ 출력 점검 → ⑥ 미리보기 구조 반환. 입력은 선택지 ID 뿐이라 자유 텍스트·금액·식별정보가 들어갈 경로가 없다.
   자동 점검은 우리가 만드는 프롬프트 문구에만 적용된다(외부 AI 답변은 점검할 수 없다). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.YearendPrompt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function make(P, engine) {
    var run = engine.run, R = engine.R;
  const DEPENDENTS = { Q6: ['Q6M', 'Q6D'], Q3: ['Q4'] }; // 부모 질문을 제외하면 하위 질문도 함께 제외
  const idText = arr => arr.map(x => x.text);
  function profileOk(mode, status) { return R.profiles[mode].includes(status); }
  // ③ 생성 단계의 독립 재검증: 엔진 출력을 믿지 않고 규칙 파일(R)의 상태를 다시 확인한다.
  function guard(result, mode) {
    const removed = []; const items = [];
    if (R.tax_year !== P.tax_year) throw new Error('귀속연도 불일치: 체크업 ' + R.tax_year + ' / 프롬프트 ' + P.tax_year);
    for (const it of result.items) {
      const d = R.items.find(x => x.id === it.id); if (!d || !profileOk(mode, d.status)) { removed.push({ id: it.id, reason: 'item_status' }); continue; }
      const rs = Object.fromEntries(d.rows.map(r => [r.id, r.status])); const rows = [];
      for (const row of it.rows) { if (rs[row] && profileOk(mode, rs[row]) && P.rows[it.id] && P.rows[it.id][row]) rows.push(row); else removed.push({ id: it.id, row, reason: 'row_status_or_text' }); }
      if (rows.length) items.push({ ...it, rows }); else removed.push({ id: it.id, reason: 'no_rows' });
    }
    const common = result.common.filter(c => { const d = R.common.find(x => x.id === c); return d && profileOk(mode, d.status) && P.common_rows[c]; });
    return { items, common, removed };
  }
  function build(answers, opts = {}) {
    const mode = opts.mode || 'staging', asOf = opts.asOf || '2026-11-19';
    // ① 입력 검증: 허용된 질문·선택지 ID가 아니면 엔진이 오류를 던진다
    run(answers, { mode });
    // ② 공유 범위: 제외한 질문의 응답을 지우고(하위 질문 포함) 남은 응답만으로 결과를 다시 계산한다 → 파생 결과·선정 이유·확인 문구가 함께 사라진다
    const excluded = new Set(opts.exclude || []); for (const q of [...excluded]) (DEPENDENTS[q] || []).forEach(d => excluded.add(d));
    const remaining = Object.fromEntries(Object.entries(answers).filter(([q]) => !excluded.has(q)));
    const raw = run(remaining, { mode }); const a = raw.normalized;
    // ③ 규칙 검증
    const g = guard(raw, mode); const emittedRows = g.items.flatMap(i => i.rows.map(r => i.id + '.' + r));
    // ④ 생성
    const L = []; const ruleIds = []; const rule = x => { ruleIds.push(x.id); return x.text; };
    const title = Object.fromEntries(R.items.map(i => [i.id, i.title]));
    const reasonOf = i => { const rs = []; for (const tok of i.reason.split(' | ')) { const key = P.reasons[tok] ? tok : (tok.startsWith('Q7=') ? 'Q7' : tok.startsWith('Q3=child') ? 'Q3=child' : tok.startsWith('Q3=') ? 'Q3' : tok); if (P.reasons[key]) rs.push(P.reasons[key]); } return [...new Set(rs)].join(' / '); };
    const legal = R.meta.legal_verified_at || '진행 중';
    L.push('# 역할'); P.role.forEach(x => L.push(rule(x)));
    L.push(`프롬프트 v${P.version} · 체크업 규칙 v${R.version} · 작성 기준일 ${asOf} · 법령 원문 검증: ${legal} · ${P.tax_year}년 귀속`); L.push('');
    L.push('# 1. USER INPUT — 사용자가 고른 상황과 체크업 결과');
    L.push('[사용자 입력]'); let any = false; const groups = [];
    for (const q of R.questions) { if (!(q.id in a)) continue; const lab = P.labels[q.id]; const line = `- ${lab.title}: ${a[q.id].map(v => lab[v]).join(', ')}`; L.push(line); any = true; groups.push({ qid: q.id, label: lab.title, line, derived: g.items.filter(i => i.reason.split(' | ').some(t => t.startsWith(q.id + '=') || (q.id === 'Q7' && t.startsWith('Q7')) || (q.id === 'Q3' && t.startsWith('Q3')))).map(i => title[i.id]) }); }
    if (!any) L.push('- (선택한 응답 없음)');
    if (excluded.size) L.push('- ' + P.not_shared_note);
    L.push('[체크업 결과 — 확인이 필요하다고 분류된 항목. 공제 가능 여부를 판정한 것이 아님]');
    if (g.items.length) g.items.forEach((i, n) => { L.push(`${n + 1}) ${title[i.id]} — 선정 이유: ${reasonOf(i)}`); i.rows.forEach(row => L.push(`   · 확인 포인트: ${P.rows[i.id][row]}`)); }); else L.push('- (확인된 결과 항목 없음)');
    if (raw.firstCheck.length) { L.push("[잘 모름]"); L.push(P.unknown_topics_note); raw.firstCheck.forEach(t => L.push(`- ${t}`)); }
    const skipped = raw.skipped.filter(q => !excluded.has(q)); // 사용자가 일부러 공유하지 않은 질문은 "응답하지 않은 질문"으로도 드러내지 않는다
    if (skipped.length) { L.push('[응답하지 않은 질문]'); L.push(P.skipped_note); skipped.forEach(q => L.push(`- ${P.labels[q].title}`)); }
    if (g.common.length) { L.push('[공통 확인]'); g.common.forEach(c => L.push(`- 공통 확인: ${P.common_rows[c]}`)); }
    L.push('[입력되지 않은 정보]'); P.missing_info.forEach(x => L.push('- ' + x)); L.push('');
    L.push('# 2. VERIFY — 검증 기준'); P.verify_rules.forEach(x => L.push('- ' + rule(x))); L.push('');
    L.push('# 3. SIMULATE — 필요한 추가 정보와 요건 검토'); P.simulate_rules.forEach(x => L.push('- ' + rule(x))); L.push('');
    L.push('# 4. ACT — 확인할 일'); P.act_rules.forEach(x => L.push('- ' + rule(x))); L.push('');
    L.push('# 공통 규칙'); P.common_rules.forEach(x => L.push('- ' + rule(x))); L.push('');
    const f = P.format; L.push('# 답변 형식'); L.push(`1. ${f.summary_title} (${f.summary_max_lines}줄 이내)`); L.push(`2. ${f.items_title}`); L.push(`3. ${f.question_title} (최대 ${f.question_max}개)`); L.push(`4. ${f.action_title}`);
    const text = L.join('\n');
    // ⑤ 점검 → ⑥ 미리보기 구조(UI: 공유 그룹별 토글)
    const warnings = []; const violations = check(text, { ruleIds, emittedRows, mode, warnings });
    const meta = { prompt_version: P.version, checkup_version: R.version, tax_year: P.tax_year, rules_updated_at: R.meta.rules_updated_at, legal_verified_at: R.meta.legal_verified_at, source_version: R.meta.source_version, as_of: asOf };
    return { text, groups, items: g.items, emittedRows, ruleIds, guardRemoved: g.removed, notice: raw.notice || g.removed.length > 0, violations, warnings, meta, excluded: [...excluded] };
  }
  // ---- 자동 점검 (프롬프트 문구에만 적용. 외부 AI 응답은 점검할 수 없다) ----
  const FORBIDDEN = [
    [/공제(가|는|를)?\s*(가능합니다|가능해요|됩니다|받습니다|확정)/, '공제 가능 확정 표현'], [/환급(이|을)?\s*(됩니다|가능합니다|예상됩니다|받습니다|받을 수 있습니다)/, '환급 단정 표현'], [/무조건|반드시 받|100%\s*환급|최대\s*환급|보장합니다/, '과장·보장 표현'],
    [/\d[\d,]*\s*(만\s*)?(억\s*)?원/, '금액 숫자(입력하지 않은 수치)'], [/\d+(\.\d+)?\s*%/, '공제율·비율 숫자'],
    [/\d{6}\s*-\s*[1-4]\d{6}/, '주민등록번호 형태'], [/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/, '휴대전화 번호 형태'], [/[\w.+-]+@[\w-]+\.[\w.-]+/, '이메일 형태'], [/\d{2,4}-\d{2,6}-\d{2,8}/, '계좌·전화 번호 형태'],
    [/추천합니다|가입하세요|가입을 권/, '상품 추천·권유 표현'], [/개인 정보는 포함되어 있지 않/, '"개인정보 없음" 단정 표현']];
  const HEADINGS = ['# 역할', '# 1. USER INPUT', '# 2. VERIFY', '# 3. SIMULATE', '# 4. ACT', '# 공통 규칙', '# 답변 형식'];
  const ALL_RULES = Object.fromEntries([...P.role, ...P.verify_rules, ...P.simulate_rules, ...P.act_rules, ...P.common_rules].map(x => [x.id, x.text]));
  function check(text, ctx = {}) {
    const v = []; const scan = text.replace(/\d{4}-\d{2}-\d{2}/g, 'DATE').replace(/v\d+\.\d+\.\d+/g, 'VER'); // 날짜·버전은 번호/금액으로 오인하지 않는다
    for (const [re, name] of FORBIDDEN) if (re.test(scan)) v.push('금지: ' + name);
    // 필수 규칙은 문구가 아니라 규칙 ID로 확인(문구가 바뀌어도 ID로 대조): 생성기가 실제로 넣은 규칙 ID + 그 규칙의 현재 문구가 본문에 있는지
    const ids = ctx.ruleIds || []; for (const id of P.required_rule_ids) { if (!ids.includes(id)) v.push('필수 규칙 ID 없음: ' + id); else if (!text.includes(ALL_RULES[id])) v.push('규칙 ID는 있으나 본문에 문구 없음: ' + id); }
    let last = -1; for (const h of HEADINGS) { const i = text.indexOf(h); if (i < 0 || i < last) v.push('섹션 순서·누락: ' + h); last = i; }
    if (text.length > (ctx.maxLen || P.length.max)) v.push('길이 초과(최대) ' + text.length); else if (text.length > P.length.recommended && ctx.warnings) ctx.warnings.push('권장 길이 초과 ' + text.length);
    // 행 ID 기준 점검: 내보낸 모든 행이 지금 배포 기준에서 허용된 상태여야 한다
    for (const key of ctx.emittedRows || []) { const [iid, rid] = key.split('.'); const d = R.items.find(x => x.id === iid); const st = d && d.rows.find(r => r.id === rid); if (!st || !profileOk(ctx.mode || 'staging', st.status)) v.push('허용되지 않은 행 출력: ' + key); }
    for (const s of ctx.mustNotContain || []) if (text.includes(s)) v.push('차단된 문구 포함: ' + s);
    return v;
  }
  return { build: build, check: check, guard: guard, P: P, R: R, FORBIDDEN: FORBIDDEN, ALL_RULES: ALL_RULES };

  }
  return { make: make };
});
