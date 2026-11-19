import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarkdownPage } from '@/components/markdown';
import { parseMarkdown } from '@/lib/parse-markdown';
import { AtomicGraph } from '@/components/atomic-graph';
import { pagesMarkdown } from '@/lib/pages-md';

const slugs = ['installation', 'theming', 'cli', 'atomic-design'] as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const md = pagesMarkdown[slug];
  if (!md) return {};
  const { title, description } = parseMarkdown(md);
  return {
    title,
    description,
    alternates: { canonical: `/docs/${slug}`, types: { 'text/markdown': `/docs/${slug}.md` } },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const md = pagesMarkdown[slug];
  if (!md) notFound();
  return (
    <MarkdownPage md={md} markdownHref={`/docs/${slug}.md`} eyebrow="Get started">
      {slug === 'atomic-design' ? <AtomicGraph /> : null}
    </MarkdownPage>
  );
}
