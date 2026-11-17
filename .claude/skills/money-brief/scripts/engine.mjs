// 돈버프 계산 엔진(calc/shared/*-engine.js)으로 카드에 쓸 숫자를 뽑는다. 카드 속 숫자는 손으로 옮겨 적지 말고 이 값만 쓴다.
// 사용: echo '{"root":"<저장소 루트>","calc":{...}}' | node engine.mjs   (기준 시각을 고정하려면 NOW=2026-11-16T12:00:00+09:00)
//
// calc 항목 종류
//  {"engine":"fx","input":{mode,direction,currency,amount,prefPercent}}          환전수수료 계산기 결과
//  {"engine":"fx_rate","currency":"USD"}                                          고시 환율(base,tts,ttb)과 스프레드
//  {"engine":"loan","input":{amountKrw,executionDate,repaymentDate,periodMonths,ratePercent}}   중도상환수수료
//  {"engine":"loan_compare","of":"<loan 항목 id>","offset_days":30}               상환 시점 비교 한 줄(offset_days 생략=만기일)
//  {"engine":"const","values":{...}}                                              1차 자료에서 옮겨 온 값(공시 금리 등). 본문에서 {{id.값}} 로 쓰면 출처가 한 곳에 모인다
//  {"engine":"dsr","input":{incomeKrw,loanType,region,repayment,ratePercent,years,asOf}}      DSR 한도 계산기 엔진(스트레스 금리 규칙은 calc/data/dsr.rules.v*.json, 등록 기간 밖이면 실패). 필드: limit_krw, limit_no_stress_krw, diff_krw, stress_bp …
//  {"engine":"savings","input":{monthlyKrw,months,ratePercent,taxPercent}}         단리 정액적립식 적금 이자(매월 초 납입 가정, 세율 기본 15.4%). 입력값에 "@id.필드" 로 다른 항목 값을 쓸 수 있다
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
const DSR = req(join(root, 'calc', 'shared', 'dsr-engine.js'));
const rulesFx = latest('fx'), rulesLoan = latest('loan-prepay'), rulesDsr = latest('dsr');
const rates = JSON.parse(readFileSync(join(root, 'calc', 'data', 'fx', 'rates.json'), 'utf8'));
const now = process.env.NOW ? Date.parse(process.env.NOW) : Date.now();

const out = {};
const resolve = (v) => { // "@id.필드" → 앞에서 계산한 값
  if (typeof v === 'string' && v.startsWith('@')) {
    const [n, f] = v.slice(1).split('.');
    if (!out[n] || out[n][f] === undefined) throw new Error(`참조 '${v}' 를 찾지 못했습니다(앞 항목이 먼저 와야 합니다).`);
    return out[n][f];
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]));
  return v;
};
for (const [id, c0] of Object.entries(input.calc || {})) {
  const c = { ...c0, input: resolve(c0.input), values: resolve(c0.values) };
  let r;
  if (c.engine === 'fx') r = FX.calculate(c.input, rates, rulesFx, { now });
  else if (c.engine === 'fx_rate') {
    const e = rates.currencies[c.currency];
    if (!e) throw new Error(`${id}: 통화 ${c.currency} 환율 없음`);
    const base = Number(e.base), tts = Number(e.tts), ttb = Number(e.ttb);
    r = { status: 'success', base, tts, ttb, spread_out: Math.round((tts - base) * 1e4) / 1e4, spread_in: Math.round((base - ttb) * 1e4) / 1e4, base_date: rates.base_date, unit: e.unit };
  } else if (c.engine === 'loan') r = LOAN.calculate(c.input, rulesLoan);
  else if (c.engine === 'dsr') r = DSR.calculate(c.input, rulesDsr);
  else if (c.engine === 'loan_compare') {
    const base = out[c.of]; if (!base) throw new Error(`${id}: ${c.of} 가 먼저 와야 합니다.`);
    const rows = LOAN.compare(base, rulesLoan);
    r = c.offset_days === undefined ? rows.find((x) => x.kind === 'end') : rows.find((x) => x.offset_days === c.offset_days);
    if (!r) throw new Error(`${id}: 비교 행을 찾지 못했습니다(offset_days=${c.offset_days}).`);
    r = { status: 'success', ...r };
  } else if (c.engine === 'const') {
    r = { status: 'success', ...c.values };
  } else if (c.engine === 'savings') {
    const i = c.input, M = BigInt(Math.round(Number(i.monthlyKrw))), n = Number(i.months);
    const rateBp = BigInt(Math.round(Number(i.ratePercent) * 100));                 // 0.01% 단위(2.75% → 275)
    const taxBp = BigInt(Math.round((i.taxPercent === undefined ? 15.4 : Number(i.taxPercent)) * 100)); // 15.4% → 1540
    if (!(M > 0n) || !(n >= 1) || rateBp < 0n) throw new Error(`${id}: 입력값이 올바르지 않습니다.`);
    const sumMonths = BigInt(n * (n + 1) / 2);                                          // 매월 초 납입: 납입 k회차는 (n−k+1)개월 이자
    const pre = (M * rateBp * sumMonths) / (10000n * 12n);                              // 원 단위 절사
    const tax = (pre * taxBp) / 10000n;
    r = { status: 'success', principal_krw: Number(M) * n, interest_pre: Number(pre), tax_krw: Number(tax), interest_post: Number(pre - tax), maturity_post: Number(M) * n + Number(pre - tax), rate_percent: Number(i.ratePercent), months: n, monthly_krw: Number(M) };
  } else throw new Error(`${id}: 알 수 없는 engine '${c.engine}'`);
  if (!r || r.status !== 'success') throw new Error(`${id}: 계산 실패 ${JSON.stringify(r)}`);
  out[id] = r;
}
out._meta = { fx_base_date: rates.base_date, fx_checked_at: rates.checked_at, fx_rules: rulesFx.version, loan_rules: rulesLoan.version, dsr_rules: rulesDsr.version, now: new Date(now).toISOString() };
console.log(JSON.stringify(out));
