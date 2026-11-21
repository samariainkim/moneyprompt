// 운영 사이트 점검: 주요 주소가 200 으로 열리는지, Vercel 정지(402 DEPLOYMENT_DISABLED) 여부를 확인한다.
// 사용: node web/scripts/check-site.mjs [주소(기본 https://donbuff.com)]   — 요청은 주소당 1건뿐이라 사용량 영향이 없다.
const base = (process.argv[2] || 'https://donbuff.com').replace(/\/$/, '');
const PATHS = ['/', '/prompt/', '/calc/', '/calc/dsr/', '/brief/', '/book/', '/login/', '/robots.txt', '/sitemap.xml'];
let bad = 0;
for (const p of PATHS) {
  try {
    const r = await fetch(base + p, { redirect: 'manual', headers: { 'user-agent': 'donbuff-site-check' } });
    const err = r.headers.get('x-vercel-error');
    const ok = r.status === 200 && !err;
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${String(r.status).padEnd(4)} ${p}${err ? '  [' + err + ']' : ''}`);
  } catch (e) { bad++; console.log(`✗ ERR  ${p}  ${e.message}`); }
}
console.log(bad ? `\n문제 ${bad}건` : '\n모두 정상');
process.exit(bad ? 1 : 0);
