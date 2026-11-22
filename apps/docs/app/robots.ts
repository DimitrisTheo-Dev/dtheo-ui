import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/**
 * Public docs, written to be found: every crawler may read them, including AI search and the fetchers an agent runs
 * for a person, so answers about dtheo/ui can come from the docs and cite them.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
