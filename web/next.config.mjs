import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

// 기존 정적 페이지(디렉터리/index.html)를 같은 URL 로 서빙하기 위한 rewrite.
// public/ 은 빌드 직전 sync-static 이 채운다.
function staticDirRewrites() {
  const pub = join(process.cwd(), 'public');
  const out = [];
  if (existsSync(join(pub, 'index.html'))) out.push({ source: '/', destination: '/index.html' });
  const walk = (dir, rel) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (!statSync(full).isDirectory()) continue;
      const r = `${rel}/${name}`;
      if (existsSync(join(full, 'index.html'))) out.push({ source: r, destination: `${r}/index.html` });
      walk(full, r);
    }
  };
  if (existsSync(pub)) walk(pub, '');
  return out;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true, // 기존 사이트 URL(/calc/ 등)과 동일하게 유지
  async rewrites() {
    return { beforeFiles: staticDirRewrites(), afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
