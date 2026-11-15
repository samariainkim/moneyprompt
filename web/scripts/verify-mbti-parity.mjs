// 투자 성향 검사 리뉴얼(web/redesign/pages/mbti.js)이 원본(invest-mbti/index.html)의 '검사 로직'을 건드리지 않았는지 확인한다.
// 화면을 그리는 구간(5·6·14번)만 달라도 되고, 나머지 구간(데이터·상태·판정·단계·프롬프트·공유·부팅)은 글자 하나까지 같아야 한다.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const legacy = readFileSync(join(here, '..', '..', 'invest-mbti', 'index.html'), 'utf8');
const redesign = readFileSync(join(here, '..', 'redesign', 'pages', 'mbti.js'), 'utf8');
const lg = legacy.slice(legacy.indexOf('<script>\n/* ====='), legacy.lastIndexOf('</script>'));
function sections(text) {
  const re = /\/\* =+\n\s+(\d+)\. /g; const marks = []; let m;
  while ((m = re.exec(text))) marks.push({ n: Number(m[1]), at: m.index });
  const out = { head: text.slice(0, marks[0].at) };
  marks.forEach((k, i) => { out[k.n] = text.slice(k.at, i + 1 < marks.length ? marks[i + 1].at : text.length); });
  return out;
}
const A = sections(lg.replace('<script>\n', '')), B = sections(redesign);
const ALLOWED = new Set([5, 6, 14]); // 화면 그리기: 공통 UI 유틸(상단 바·헤더), 인트로, 결과 화면
let bad = 0;
for (const k of Object.keys(A)) {
  if (ALLOWED.has(Number(k))) continue;
  const same = A[k].trim() === (B[k] || '').trim();
  console.log(`  ${same ? '✓' : '✗'} 구간 ${k} ${same ? '원본과 동일' : '달라졌음 — 검사 로직이 바뀐 것은 아닌지 확인하세요'}`);
  if (!same) bad++;
}
// 결과 화면(14)은 판정 결과를 '그리기만' 해야 한다: 판정·프롬프트 함수를 새로 정의하거나 점수를 다시 계산하면 안 된다.
const r14 = B[14] || '';
for (const forbidden of ['calculateResult(', 'function buildPrompt', 'score[', 'riskSum']) {
  if (r14.includes(forbidden)) { console.log(`  ✗ 결과 화면 구간에 '${forbidden}' 가 들어 있음`); bad++; }
}
console.log(bad ? '\n실패 있음' : '\n전체 통과 — 검사 로직 구간은 원본과 같음');
process.exit(bad ? 1 : 0);
