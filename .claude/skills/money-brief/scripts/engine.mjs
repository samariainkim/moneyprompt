// 돈버프 계산 엔진(calc/shared/*-engine.js)으로 카드에 쓸 숫자를 뽑는다. 카드 속 숫자는 손으로 옮겨 적지 말고 이 값만 쓴다.
// 사용: echo '{"root":"<저장소 루트>","calc":{...}}' | node engine.mjs   (기준 시각을 고정하려면 NOW=2026-11-16T12:00:00+09:00)
//
// calc 항목 종류
//  {"engine":"fx","input":{mode,direction,currency,amount,prefPercent}}          환전수수료 계산기 결과
//  {"engine":"fx_rate","currency":"USD"}                                          고시 환율(base,tts,ttb)과 스프레드
//  {"engine":"loan","input":{amountKrw,executionDate,repaymentDate,periodMonths,ratePercent}}   중도상환수수료
//  {"engine":"loan_compare","of":"<loan 항목 id>","offset_days":30}               상환 시점 비교 한 줄(offset_days 생략=만기일)
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const req = createRequire(import.meta.url);
const input = JSON.parse(readFileSync(0, 'utf8'));
const root = input.root;
const latest = (prefix) => { // calc/data 의 규칙 파일 중 가장 높은 버전
  const f = readdirSync(join(root, 'calc', 'data')).filter((x) => x.startsWith(prefix + '.rules.v') && x.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
  if (!f) throw new Error(`규칙 파일 없음: ${prefix}`);
  return JSON.parse(readFileSync(join(root, 'calc', 'data', f), 'utf8'));
};
const FX = req(join(root, 'calc', 'shared', 'fx-engine.js'));
const LOAN = req(join(root, 'calc', 'shared', 'loan-engine.js'));
const rulesFx = latest('fx'), rulesLoan = latest('loan-prepay');
const rates = JSON.parse(readFileSync(join(root, 'calc', 'data', 'fx', 'rates.json'), 'utf8'));
const now = process.env.NOW ? Date.parse(process.env.NOW) : Date.now();

const out = {};
for (const [id, c] of Object.entries(input.calc || {})) {
  let r;
  if (c.engine === 'fx') r = FX.calculate(c.input, rates, rulesFx, { now });
  else if (c.engine === 'fx_rate') {
    const e = rates.currencies[c.currency];
    if (!e) throw new Error(`${id}: 통화 ${c.currency} 환율 없음`);
    const base = Number(e.base), tts = Number(e.tts), ttb = Number(e.ttb);
    r = { status: 'success', base, tts, ttb, spread_out: Math.round((tts - base) * 1e4) / 1e4, spread_in: Math.round((base - ttb) * 1e4) / 1e4, base_date: rates.base_date, unit: e.unit };
  } else if (c.engine === 'loan') r = LOAN.calculate(c.input, rulesLoan);
  else if (c.engine === 'loan_compare') {
    const base = out[c.of]; if (!base) throw new Error(`${id}: ${c.of} 가 먼저 와야 합니다.`);
    const rows = LOAN.compare(base, rulesLoan);
    r = c.offset_days === undefined ? rows.find((x) => x.kind === 'end') : rows.find((x) => x.offset_days === c.offset_days);
    if (!r) throw new Error(`${id}: 비교 행을 찾지 못했습니다(offset_days=${c.offset_days}).`);
    r = { status: 'success', ...r };
  } else throw new Error(`${id}: 알 수 없는 engine '${c.engine}'`);
  if (!r || r.status !== 'success') throw new Error(`${id}: 계산 실패 ${JSON.stringify(r)}`);
  out[id] = r;
}
out._meta = { fx_base_date: rates.base_date, fx_checked_at: rates.checked_at, fx_rules: rulesFx.version, loan_rules: rulesLoan.version, now: new Date(now).toISOString() };
console.log(JSON.stringify(out));
