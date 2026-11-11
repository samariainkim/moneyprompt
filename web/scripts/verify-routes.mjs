// 전환 검증: 저장소 루트의 기존 정적 페이지가 배포 주소에서 같은 제목·같은 색인 설정으로 200 응답하는지 확인한다.
// 사용: node scripts/verify-routes.mjs <배포 주소>   예) node scripts/verify-routes.mjs https://moneyprompt.vercel.app
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base)) { console.error('사용: node scripts/verify-routes.mjs <배포 주소>'); process.exit(2); }
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKIP = new Set(['tests', 'node_modules']);

// 기존 정적 페이지 목록: index.html 이 있는 폴더(→ /폴더/)와 privacy.html
const paths = [];
const walk = (dir, rel) => {
  if (existsSync(join(dir, 'index.html'))) paths.push(rel === '' ? '/' : rel + '/');
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (SKIP.has(name) || !statSync(full).isDirectory()) continue;
    walk(full, `${rel}/${name}`);
  }
};
for (const top of ['calc', 'fee', 'prompt', 'invest-mbti', 'new']) if (existsSync(join(root, top))) walk(join(root, top), `/${top}`);
paths.unshift('/'); paths.push('/privacy.html');

const info = (html) => ({
  title: (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() ?? '',
  noindex: /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html),
});
const local = (p) => readFileSync(join(root, p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1)), 'utf8');

let bad = 0;
for (const p of [...new Set(paths)]) {
  const exp = info(p === '/' ? readFileSync(join(root, 'index.html'), 'utf8') : local(p));
  let res; try { res = await fetch(base + p, { redirect: 'manual' }); } catch (e) { console.log(`  ✗ ${p}  접속 실패: ${e.message}`); bad++; continue; }
  const got = res.status === 200 ? info(await res.text()) : null;
  if (res.status !== 200) { console.log(`  ✗ ${p}  상태 ${res.status}`); bad++; }
  else if (got.title !== exp.title) { console.log(`  ✗ ${p}  제목 다름: "${got.title}" ≠ "${exp.title}"`); bad++; }
  else if (got.noindex !== exp.noindex) { console.log(`  ✗ ${p}  noindex 설정 다름(기대 ${exp.noindex}, 실제 ${got.noindex})`); bad++; }
  else console.log(`  ✓ ${p}  200 · ${exp.title}${exp.noindex ? ' · noindex' : ''}`);
}
// 이전 주소 규칙: 슬래시 없는 주소는 슬래시 주소로 이동(또는 같은 화면)
for (const p of ['/calc/fx', '/prompt', '/invest-mbti']) {
  const res = await fetch(base + p, { redirect: 'manual' }).catch(() => null);
  const loc = res && res.headers.get('location');
  (res && (res.status === 200 || ([301, 307, 308].includes(res.status) && loc && loc.replace(base, '').startsWith(p + '/')))) ? console.log(`  ✓ ${p}  ${res.status}${loc ? ' → ' + loc.replace(base, '') : ''}`) : (console.log(`  ✗ ${p}  슬래시 없는 주소 처리 이상`), bad++);
}
const nf = await fetch(base + '/없는-페이지/').catch(() => null);
(nf && nf.status === 404) ? console.log('  ✓ 없는 주소는 404') : (console.log('  ✗ 없는 주소가 404 아님: ' + (nf && nf.status)), bad++);
console.log(bad ? `\n실패 ${bad}건` : '\n전체 통과');
process.exit(bad ? 1 : 0);
