import type { MetadataRoute } from 'next';
import { INDEXABLE_PATHS, SITE_URL } from '@/lib/site';
import { rdPageOn } from '@/lib/redesign';

export default function sitemap(): MetadataRoute.Sitemap {
  // /brief/ 는 켜진 환경(pages.json 의 해당 목록)에서만 사이트맵에 넣는다.
  const paths = rdPageOn('/brief/') ? [...INDEXABLE_PATHS, '/brief/'] : INDEXABLE_PATHS;
  return paths.map((p) => ({ url: `${SITE_URL}${p}` }));
}
