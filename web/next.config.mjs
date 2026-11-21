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
  // 정식 도메인이 아닌 주소(테스트 주소 등)는 검색엔진이 색인하지 않도록 한다.
  async headers() {
    // 정적 파일 캐시: 기본값(max-age=0, must-revalidate)이면 방문할 때마다 파일 수만큼 "바뀌었나요?" 확인(304)이 CDN 요청으로 쌓인다.
    // 이미지는 1시간, CSS·JS·계산기 파일은 5분 동안 브라우저가 다시 묻지 않게 한다(같은 파일명으로 교체해도 최대 이 시간 안에 반영, 만료 후에는 백그라운드 갱신).
    // HTML 페이지는 건드리지 않는다(내용 수정이 바로 반영되도록). 뒤에 오는 규칙이 같은 헤더를 덮어쓰므로 일반 → 구체 순서로 둔다.
    const cache = (v) => [{ key: 'Cache-Control', value: v }];
    const SHORT = 'public, max-age=300, stale-while-revalidate=600';
    const IMAGE = 'public, max-age=3600, stale-while-revalidate=86400';
    return [
      { source: '/:path*', missing: [{ type: 'host', value: 'donbuff.com' }], headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/redesign/:path*', headers: cache(SHORT) },
      { source: '/calc/shared/:path*', headers: cache(SHORT) },
      { source: '/calc/data/:path*', headers: cache(SHORT) },
      { source: '/redesign/img/:path*', headers: cache(IMAGE) },
      { source: '/assets/:path*', headers: cache(IMAGE) },
    ];
  },
  // 예전 개인정보처리방침 주소(/privacy.html)는 새 방침 페이지로 영구 이동한다. (이전 원문은 /archive/privacy-legacy-2026.html 에 보관)
  async redirects() {
    return [{ source: '/privacy.html', destination: '/privacy/', permanent: true }];
  },
  async rewrites() {
    return { beforeFiles: staticDirRewrites(), afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
