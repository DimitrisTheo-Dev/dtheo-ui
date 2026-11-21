import { components } from '@dtheo/ui/meta';
import { componentCard } from '@/lib/og';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return components.filter((c) => c.package === 'ui').map((c) => ({ slug: c.slug }));
}

/**
 * Each component page's share card, rendered at build time. It is a plain route, not an `opengraph-image` file, so the
 * page can give the card alt text that names the component (an `opengraph-image` file exports one alt for every slug).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return componentCard(slug);
}
