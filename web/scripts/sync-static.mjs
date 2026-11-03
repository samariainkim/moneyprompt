// 저장소 루트의 기존 정적 페이지를 web/public 으로 복사한다. (루트 파일은 그대로 둔다)
// 개발·테스트 문서(tests, *.md)는 복사하지 않는다.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
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
