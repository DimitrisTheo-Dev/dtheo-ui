import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/** Public docs: every crawler, including AI search and user-initiated fetchers, may read them (AR-FIND-01). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
