import type { ComponentMeta } from '@dtheo/ui/meta';
import { site } from '@/lib/site';

/** Machine-readable facts for each component page (AgentReady AR-READ-08). The same facts are visible on the page. */
export function JsonLd({ meta }: { meta: ComponentMeta }) {
  const base = meta.package === 'charts' ? 'charts' : 'components';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${meta.title} · ${site.name}`,
    description: meta.description,
    url: `${site.url}/docs/${base}/${meta.slug}`,
    about: {
      '@type': 'SoftwareSourceCode',
      name: meta.title,
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'React',
    },
    isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
    encoding: {
      '@type': 'MediaObject',
      encodingFormat: 'text/markdown',
      contentUrl: `${site.url}/docs/${base}/${meta.slug}.md`,
    },
  };
  return (
    <script
      type="application/ld+json"
      // dtheo-check-ignore-next-line (JSON-LD from our own contracts, with "<" escaped so it cannot close the script)
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
