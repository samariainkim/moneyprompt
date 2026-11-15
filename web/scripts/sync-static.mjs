// 저장소 루트의 기존 정적 페이지를 web/public 으로 복사한다. (루트 파일은 그대로 둔다)
// 개발·테스트 문서(tests, *.md)는 복사하지 않는다.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, '..', 'public');

const ITEMS = [
  'index.html', 'privacy.html', 'manifest.json', 'icon-512.png', 'book-cover.png', 'favicon.ico',
  'assets', 'calc', 'fee', 'prompt', 'invest-mbti', 'new',
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let n = 0;
for (const item of ITEMS) {
  const src = join(root, item);
  if (!existsSync(src)) { console.warn(`[sync-static] 없음, 건너뜀: ${item}`); continue; }
  cpSync(src, join(out, item), {
    recursive: true,
    filter: (p) => { const b = basename(p); return b !== 'tests' && !b.endsWith('.md'); },
  });
  n++;
}
console.log(`[sync-static] ${n}개 항목을 web/public 으로 복사했습니다.`);

// ───────── 리뉴얼 페이지 (web/redesign) ─────────
// pages.json 의 스위치에 따라, 켜진 주소의 파일을 새 디자인 페이지로 바꿔 넣는다. 저장소 루트의 원본은 그대로 둔다.
//  - 운영(VERCEL_ENV=production)은 production 목록, 그 외(미리보기·로컬)는 preview 목록을 쓴다.
const RD_DIR = join(here, '..', 'redesign');
const rdCfg = JSON.parse(readFileSync(join(RD_DIR, 'pages.json'), 'utf8'));
const rdEnv = process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
const rdOn = (rdCfg[rdEnv] || []).filter((u) => rdCfg.pages[u]);
const targetOf = (u) => (u === '/' ? 'index.html' : join(u.replace(/^\/|\/$/g, ''), 'index.html'));

// 프롬프트 개수는 데이터에서 자동으로 센다. (프롬프트가 늘면 화면의 숫자도 따라간다)
function promptStats() {
  const src = readFileSync(join(root, 'prompt', 'index.html'), 'utf8').replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, '');
  const start = src.indexOf('const PROMPTS');
  const seg = src.slice(start, src.indexOf('];', start));
  const cats = [...seg.matchAll(/\bcat:\s*"([^"]+)"/g)].map((m) => m[1]);
  const ais = new Set([...seg.matchAll(/\bai:\s*"([^"]+)"/g)].map((m) => m[1]));
  const byCat = {}; for (const c of cats) byCat[c] = (byCat[c] || 0) + 1;
  return { total: cats.length, categories: Object.keys(byCat).length, ais: ais.size, byCat };
}
function renderRedesign(html, ctx) {
  html = html.replace(/<!--@header([^>]*)-->/g, (_, a) => {
    const attrs = Object.fromEntries([...a.matchAll(/(\w+)=(\w+)/g)].map((m) => [m[1], m[2]]));
    let h = readFileSync(join(RD_DIR, 'partials', 'header.html'), 'utf8');
    h = h.replace('{{over}}', attrs.over === '1' ? ' over' : '');
    for (const k of ['prompt', 'invest']) h = h.replace(`{{cur_${k}}}`, attrs.active === k ? ' aria-current="page" class="cur"' : '');
    return h;
  });
  html = html.replace(/<!--@footer-->/g, readFileSync(join(RD_DIR, 'partials', 'footer.html'), 'utf8'));
  html = html.replace(/\{\{TOTAL\}\}/g, String(ctx.total)).replace(/\{\{CATEGORIES\}\}/g, String(ctx.categories)).replace(/\{\{AIS\}\}/g, String(ctx.ais));
  html = html.replace(/\{\{N:([^}]+)\}\}/g, (_, c) => { if (!(c in ctx.byCat)) throw new Error(`[sync-static] 프롬프트 카테고리 '${c}' 를 찾지 못했습니다.`); return String(ctx.byCat[c]); });
  if (/\{\{[^}]+\}\}/.test(html)) throw new Error('[sync-static] 리뉴얼 페이지에 채워지지 않은 {{…}} 가 남았습니다.');
  return html;
}
if (rdOn.length) {
  const ctx = promptStats();
  for (const u of rdOn) {
    const out2 = join(out, targetOf(u));
    mkdirSync(dirname(out2), { recursive: true });
    writeFileSync(out2, renderRedesign(readFileSync(join(RD_DIR, 'pages', rdCfg.pages[u]), 'utf8'), ctx));
  }
  cpSync(join(RD_DIR, 'img'), join(out, 'redesign', 'img'), { recursive: true });
  cpSync(join(RD_DIR, 'shared', 'frame.css'), join(out, 'redesign', 'frame.css'));
  cpSync(join(RD_DIR, 'shared', 'frame.js'), join(out, 'redesign', 'frame.js'));
  for (const f of readdirSync(join(RD_DIR, 'pages'))) if (f.endsWith('.css')) cpSync(join(RD_DIR, 'pages', f), join(out, 'redesign', f));
  console.log(`[sync-static] 리뉴얼 페이지(${rdEnv}) ${rdOn.length}개 적용: ${rdOn.join(', ')}  · 프롬프트 ${ctx.total}개`);
} else {
  console.log(`[sync-static] 리뉴얼 페이지(${rdEnv}): 적용 없음 — 기존 페이지 그대로`);
}

// 로그인 메뉴 스크립트(web/static/auth-nav.js)를 복사된 모든 HTML 의 <head> 에 직접(inline) 끼워 넣는다.
// 별도 파일로 내려받으면 헤더가 먼저 그려지고 버튼이 늦게 나타나므로, 내려받는 시간이 없도록 페이지 안에 넣는다.
// 저장소 루트의 원본 페이지는 수정하지 않는다.
// 페이지 안에 직접 넣는 스크립트는 작게 만든다. (실패하면 원본을 그대로 쓴다)
async function small(file) {
  const src = readFileSync(join(here, '..', 'static', file), 'utf8');
  try { const r = await minify(src, { compress: true, mangle: true, format: { comments: false } }); return r.code || src; }
  catch (e) { console.warn(`[sync-static] ${file} 최소화 실패, 원본 사용: ${e.message}`); return src; }
}
const AUTH_NAV_JS = await small('auth-nav.js');
if (AUTH_NAV_JS.toLowerCase().includes('</script')) throw new Error('auth-nav.js 에 </script 가 있으면 inline 삽입이 깨집니다.');
const AUTH_GATES_JS = await small('auth-gates.js');
if (AUTH_GATES_JS.toLowerCase().includes('</script')) throw new Error('auth-gates.js 에 </script 가 있으면 inline 삽입이 깨집니다.');
const GA_EXTRA_JS = await small('ga-extra.js');
if (GA_EXTRA_JS.toLowerCase().includes('</script')) throw new Error('ga-extra.js 에 </script 가 있으면 inline 삽입이 깨집니다.');
// GA4 코드가 빠진 페이지에 기본 코드를 넣는다. (측정 ID 는 다른 페이지·Next 앱과 같다)
const GA_ID = 'G-GW588P483F';
const GA_BASE = `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>`;
// 파비콘·홈 화면 아이콘: 아이콘 링크가 없는 페이지에 넣는다. (탭=심볼만 favicon.ico·32px, iOS·앱=크림 타일)
const ICON_TAGS = `<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/icon-32.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">`;
// 테스트 주소(*.vercel.app, 미리보기 등)에서는 GA4 를 보내지 않는다. donbuff.com 에서만 측정. (공식 옵트아웃 스위치)
const GA_OPTOUT = `<script data-dbx-ga-optout>if(!/(^|\\.)donbuff\\.com$/.test(location.hostname)){window['ga-disable-${GA_ID}']=true}</script>`;
const MARK = 'data-dbx-auth-nav';
const TAG = `<script ${MARK}>${AUTH_NAV_JS}</script>`;
// 로그인 게이트는 필요한 페이지에만 넣는다. (경로는 public 기준)
const GATE_PAGES = new Set([
  'calc/brokerage/index.html', 'calc/fx/index.html', 'calc/loan-prepay/index.html',
  'fee/brokerage-fee/index.html', 'invest-mbti/index.html', 'prompt/index.html',
]);
const GATE_TAG = `<script data-dbx-gates>${AUTH_GATES_JS}</script>`;
let gated = 0;
let injected = 0;
let gaAdded = 0;
let iconAdded = 0;
let relinked = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    const ext = extname(name).toLowerCase();
    // 로고·푸터의 href="https://donbuff.com" 은 시험 환경에서 본 사이트로 빠지므로 같은 도메인 기준 "/" 로 바꾼다.
    // (og:image, canonical, 공유용 주소 등 href 가 아닌 절대주소는 그대로 둔다. 도메인 전환 후에도 동작은 같다.)
    if (ext === '.html' || ext === '.js') {
      const src = readFileSync(full, 'utf8');
      const out2 = src.replace(/href="https:\/\/donbuff\.com\/?"/g, 'href="/"');
      if (out2 !== src) { writeFileSync(full, out2); relinked++; }
    }
    if (ext !== '.html') continue;
    let html = readFileSync(full, 'utf8');
    if (html.includes(MARK)) continue;
    // <head> 끝에 넣어, 헤더가 생기는 즉시 버튼을 붙인다. (head 가 없으면 body 끝)
    const headOpen = /<head[^>]*>/i.exec(html);
    if (headOpen) html = html.slice(0, headOpen.index + headOpen[0].length) + '\n' + GA_OPTOUT + html.slice(headOpen.index + headOpen[0].length);
    const lower = html.toLowerCase();
    const h = lower.indexOf('</head>');
    const i = h >= 0 ? h : lower.lastIndexOf('</body>');
    const rel = full.slice(out.length + 1).split('\\').join('/');
    const needsIcon = !/<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(html);
    if (needsIcon) iconAdded++;
    const needsGa = !/gtag\(\s*['"]config['"]/.test(html);
    if (needsGa) gaAdded++;
    // 순서: (GA 기본 코드) → 로그인 메뉴 → 보완 측정 → (로그인 게이트)
    const tags = (needsIcon ? ICON_TAGS + '\n' : '') + (needsGa ? GA_BASE + '\n' : '') + TAG + `\n<script data-dbx-ga>${GA_EXTRA_JS}</script>` + (GATE_PAGES.has(rel) ? '\n' + GATE_TAG : '');
    if (GATE_PAGES.has(rel)) gated++;
    html = i >= 0 ? html.slice(0, i) + tags + '\n' + html.slice(i) : html + '\n' + tags + '\n';
    writeFileSync(full, html);
    injected++;
  }
};
walk(out);
console.log(`[sync-static] 로그인 메뉴 스크립트를 HTML ${injected}개에 삽입했습니다.`);
console.log(`[sync-static] donbuff.com 절대 링크를 상대 링크로 바꾼 파일 ${relinked}개.`);
console.log(`[sync-static] 파비콘 링크를 넣은 페이지 ${iconAdded}개.`);
console.log(`[sync-static] GA4 기본 코드를 새로 넣은 페이지 ${gaAdded}개.`);
console.log(`[sync-static] 로그인 게이트를 ${gated}개 페이지에 삽입했습니다.`);
if (gated !== GATE_PAGES.size) throw new Error(`게이트 대상 ${GATE_PAGES.size}개 중 ${gated}개만 삽입되었습니다. 경로를 확인하세요.`);
