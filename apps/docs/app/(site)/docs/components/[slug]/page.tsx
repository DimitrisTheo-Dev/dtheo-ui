import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { components, getComponent } from '@dtheo/ui/meta';
import { ComponentDoc } from '@/components/component-doc';
import { JsonLd } from '@/components/json-ld';
import { pageMetadata } from '@/lib/metadata';
import { site } from '@/lib/site';
import { plainText } from '@/lib/parse-markdown';

export const dynamicParams = false;

export function generateStaticParams() {
  return components.filter((c) => c.package === 'ui').map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = getComponent(slug);
  if (!meta) return {};
  return pageMetadata({
    title: meta.title,
    description: plainText(meta.description),
    path: `/docs/components/${slug}`,
    markdown: `/docs/components/${slug}.md`,
    card: {
      url: `/docs/components/${slug}/card.png`,
      alt: `${meta.title}, a ${site.name} component, and the command that installs it`,
    },
  });
}

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getComponent(slug);
  if (!meta || meta.package !== 'ui') notFound();
  return (
    <>
      <JsonLd meta={meta} />
      <ComponentDoc meta={meta} />
    </>
  );
}
