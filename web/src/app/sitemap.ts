import type { MetadataRoute } from 'next';
import { INDEXABLE_PATHS, SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.map((p) => ({ url: `${SITE_URL}${p}` }));
}
