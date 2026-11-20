import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarkdownPage } from '@/components/markdown';
import { parseMarkdown } from '@/lib/parse-markdown';
import { DataTableDemo } from '@/components/patterns/data-table-demo';
import { FormDemo } from '@/components/patterns/form-demo';
import { StatesDemo } from '@/components/patterns/states-demo';
import { pagesMarkdown } from '@/lib/pages-md';
import { pageMetadata } from '@/lib/metadata';

const demos = { 'data-table': DataTableDemo, forms: FormDemo, states: StatesDemo } as const;
type Slug = keyof typeof demos;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(demos).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const md = pagesMarkdown[`patterns/${slug}`];
  if (!md) return {};
  const { title, description } = parseMarkdown(md);
  return pageMetadata({
    title,
    description,
    path: `/docs/patterns/${slug}`,
    markdown: `/docs/patterns/${slug}.md`,
  });
}

export default async function PatternPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const md = pagesMarkdown[`patterns/${slug}`];
  const Demo = demos[slug as Slug];
  if (!md || !Demo) notFound();
  return (
    <MarkdownPage md={md} markdownHref={`/docs/patterns/${slug}.md`} eyebrow="Patterns">
      <Demo />
    </MarkdownPage>
  );
}
