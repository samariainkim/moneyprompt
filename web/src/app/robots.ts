import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { PRIVATE_PATHS, SITE_HOST, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

// 정식 도메인(donbuff.com)에서만 검색을 허용한다. 테스트 주소(*.vercel.app)가 중복 사이트로 색인되지 않도록 전체 차단.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get('host') ?? '').toLowerCase().split(':')[0];
  if (host !== SITE_HOST) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS }, sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
}
