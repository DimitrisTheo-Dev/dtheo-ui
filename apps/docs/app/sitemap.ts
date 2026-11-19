import type { MetadataRoute } from 'next';
import { allPages } from '@/lib/nav';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now },
    ...allPages.map((p) => ({ url: `${site.url}${p.href}`, lastModified: now })),
  ];
}
