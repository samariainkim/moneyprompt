import type { MetadataRoute } from 'next';
import { INDEXABLE_PATHS, SITE_URL } from '@/lib/site';
import { rdPageOn } from '@/lib/redesign';

export default function sitemap(): MetadataRoute.Sitemap {
  // /brief/·/about/·/editorial/ 은 켜진 환경(pages.json 의 해당 목록)에서만 사이트맵에 넣는다.
  const extra = ['/brief/', '/about/', '/editorial/'].filter((p) => rdPageOn(p));
  const paths = [...INDEXABLE_PATHS, ...extra];
  return paths.map((p) => ({ url: `${SITE_URL}${p}` }));
}
