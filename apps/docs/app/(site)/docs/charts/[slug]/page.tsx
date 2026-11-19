import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { components, getComponent } from '@dtheo/ui/meta';
import { ComponentDoc } from '@/components/component-doc';
import { JsonLd } from '@/components/json-ld';

export const dynamicParams = false;

export function generateStaticParams() {
  return components.filter((c) => c.package === 'charts').map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = getComponent(slug);
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/docs/charts/${slug}`, types: { 'text/markdown': `/docs/charts/${slug}.md` } },
  };
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
