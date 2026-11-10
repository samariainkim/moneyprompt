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

// 로그인 메뉴 스크립트(web/static/auth-nav.js)를 public 에 두고, 복사된 모든 HTML 에 <script> 를 끼워 넣는다.
// 저장소 루트의 원본 페이지는 수정하지 않는다.
cpSync(join(here, '..', 'static', 'auth-nav.js'), join(out, 'auth-nav.js'));
const TAG = '<script src="/auth-nav.js" defer></script>';
let injected = 0;
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
    if (html.includes('/auth-nav.js')) continue;
    const i = html.toLowerCase().lastIndexOf('</body>');
    html = i >= 0 ? html.slice(0, i) + TAG + '\n' + html.slice(i) : html + '\n' + TAG + '\n';
    writeFileSync(full, html);
    injected++;
  }
};
walk(out);
console.log(`[sync-static] 로그인 메뉴 스크립트를 HTML ${injected}개에 삽입했습니다.`);
console.log(`[sync-static] donbuff.com 절대 링크를 상대 링크로 바꾼 파일 ${relinked}개.`);
