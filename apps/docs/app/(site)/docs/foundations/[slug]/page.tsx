import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocPage, DocSection } from '@/components/doc-page';
import { EngineeringDataFoundation } from '@/components/engineering-data';
import {
  ColorFoundation,
  GeometryFoundation,
  MotionFoundation,
  TypographyFoundation,
} from '@/components/foundations';
import { foundations } from '@/lib/nav';
import { pageMetadata } from '@/lib/metadata';

const slugs = ['color', 'typography', 'geometry', 'motion', 'engineering-data'] as const;
type Slug = (typeof slugs)[number];

export const dynamicParams = false;

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = foundations.find((f) => f.href.endsWith(`/${slug}`));
  if (!page?.description) return {};
  return pageMetadata({
    title: page.title,
    description: page.description,
    path: `/docs/foundations/${slug}`,
    markdown: `/docs/foundations/${slug}.md`,
  });
}

const content: Record<Slug, { description: string; body: React.ReactNode }> = {
  color: {
    description:
      'Color marks attention, not decoration. Surfaces stay neutral. One accent carries the primary action and selection. Status colors appear only when something needs a person, always with a word or an icon.',
    body: <ColorFoundation />,
  },
  typography: {
    description:
      'The system font (SF Pro on Apple platforms) with roles instead of sizes. Tracking tightens as text grows and numbers align in columns. Every role works in English and Greek.',
    body: <TypographyFoundation />,
  },
  geometry: {
    description:
      'Controls of the same size align in one row. Corners nest concentrically. Borders are quiet hairlines; focus is always visible.',
    body: <GeometryFoundation />,
  },
  'engineering-data': {
    description:
      'How the tools write a number: its unit, its precision, its limit and its status. One way on every screen, so nobody wonders whether 17.6 and 17.60 are the same run.',
    body: <EngineeringDataFoundation />,
  },
  motion: {
    description:
      'Motion answers a press, shows where something came from or bridges a change. Anything used a hundred times a day does not animate.',
    body: <MotionFoundation />,
  },
};

export default async function FoundationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugs.includes(slug as Slug)) notFound();
  const page = foundations.find((f) => f.href.endsWith(`/${slug}`))!;
  const { description, body } = content[slug as Slug];
  return (
    <DocPage
      eyebrow="Foundations"
      title={page.title}
      description={description}
      markdownHref={`/docs/foundations/${slug}.md`}
    >
      {body}
      <DocSection title="Source">
        {slug === 'engineering-data' ? (
          <p className="docs-prose">
            Every specimen on this page is written by <code>Quantity</code> and the format functions in{' '}
            <code>packages/ui/src/lib/quantity.ts</code>, the same code the example apps and the data table
            use.
          </p>
        ) : (
          <p className="docs-prose">
            Every value on this page is read from <code>packages/tokens/src/index.ts</code>, the same source
            that generates the CSS, the DTCG JSON and the React Native values.
          </p>
        )}
      </DocSection>
    </DocPage>
  );
}
