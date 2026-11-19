import { ImageResponse } from 'next/og';
import { components, getComponent } from '@dtheo/ui/meta';
import { DocCard, ogFonts, ogSize } from '@/lib/og';
import { site } from '@/lib/site';

export const size = ogSize;
export const contentType = 'image/png';
export const alt = 'A dtheo/ui chart';

export function generateStaticParams() {
  return components.filter((c) => c.package === 'charts').map((c) => ({ slug: c.slug }));
}

/** Each chart shares as its own card: its category, its name, what it is for and the line that installs it. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getComponent(slug);
  return new ImageResponse(
    <DocCard
      eyebrow={meta?.category ?? 'Charts'}
      title={meta?.title ?? slug}
      description={meta?.description ?? ''}
      command={`npx ${site.cli} add ${slug}`}
    />,
    { ...size, fonts: await ogFonts() },
  );
}
