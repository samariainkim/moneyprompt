// 저장소 루트의 기존 정적 페이지를 web/public 으로 복사한다. (루트 파일은 그대로 둔다)
// 개발·테스트 문서(tests, *.md)는 복사하지 않는다.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, '..', 'public');

const ITEMS = [
  'index.html', 'privacy.html', 'manifest.json', 'icon-512.png', 'book-cover.png',
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

// 로그인 메뉴 스크립트(web/static/auth-nav.js)를 복사된 모든 HTML 의 <head> 에 직접(inline) 끼워 넣는다.
// 별도 파일로 내려받으면 헤더가 먼저 그려지고 버튼이 늦게 나타나므로, 내려받는 시간이 없도록 페이지 안에 넣는다.
// 저장소 루트의 원본 페이지는 수정하지 않는다.
const AUTH_NAV_JS = readFileSync(join(here, '..', 'static', 'auth-nav.js'), 'utf8');
if (AUTH_NAV_JS.toLowerCase().includes('</script')) throw new Error('auth-nav.js 에 </script 가 있으면 inline 삽입이 깨집니다.');
const MARK = 'data-dbx-auth-nav';
const TAG = `<script ${MARK}>${AUTH_NAV_JS}</script>`;
let injected = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (extname(name).toLowerCase() !== '.html') continue;
    let html = readFileSync(full, 'utf8');
    if (html.includes(MARK)) continue;
    // <head> 끝에 넣어, 헤더가 생기는 즉시 버튼을 붙인다. (head 가 없으면 body 끝)
    const lower = html.toLowerCase();
    const h = lower.indexOf('</head>');
    const i = h >= 0 ? h : lower.lastIndexOf('</body>');
    html = i >= 0 ? html.slice(0, i) + TAG + '\n' + html.slice(i) : html + '\n' + TAG + '\n';
    writeFileSync(full, html);
    injected++;
  }
};
walk(out);
console.log(`[sync-static] 로그인 메뉴 스크립트를 HTML ${injected}개에 삽입했습니다.`);
