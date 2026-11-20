import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { components, getComponent } from '@dtheo/ui/meta';
import { ComponentDoc } from '@/components/component-doc';
import { JsonLd } from '@/components/json-ld';
import { pageMetadata } from '@/lib/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return components.filter((c) => c.package === 'charts').map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = getComponent(slug);
  if (!meta) return {};
  return pageMetadata({
    title: meta.title,
    description: meta.description,
    path: `/docs/charts/${slug}`,
    markdown: `/docs/charts/${slug}.md`,
    ownCard: true,
  });
}

export default async function ChartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getComponent(slug);
  if (!meta || meta.package !== 'charts') notFound();
  return (
    <>
      <JsonLd meta={meta} />
      <ComponentDoc meta={meta} />
    </>
  );
}
