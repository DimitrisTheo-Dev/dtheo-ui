import { components, getComponent } from '@dtheo/ui/meta';
import {
  componentMarkdown,
  componentsIndexMarkdown,
  foundationMarkdown,
  checkRulesMarkdown,
} from '@/lib/markdown';
import { pagesMarkdown } from '@/lib/pages-md';
import { docsSection } from '@/lib/paths';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { path: ['index'] },
    { path: ['components'] },
    ...['installation', 'theming', 'agents', 'cli', 'atomic-design'].map((s) => ({ path: [s] })),
    ...['color', 'typography', 'geometry', 'motion'].map((s) => ({ path: ['foundations', s] })),
    ...['data-table', 'forms', 'states'].map((s) => ({ path: ['patterns', s] })),
    ...components.map((c) => ({ path: [docsSection(c), c.slug] })),
    { path: ['check-rules'] },
  ];
}

/** Markdown mirrors of the docs, served at /docs/<page>.md via a rewrite. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join('/');
  let body: string | null = null;
  if (key === 'components') body = componentsIndexMarkdown();
  else if (path[0] === 'components' || path[0] === 'charts') {
    const meta = getComponent(path[1] ?? '');
    if (meta) body = componentMarkdown(meta);
  } else if (path[0] === 'foundations') body = foundationMarkdown(path[1] ?? '');
  else if (key === 'check-rules') body = checkRulesMarkdown();
  else body = pagesMarkdown[key] ?? null;
  if (!body)
    return new Response('Not found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  return new Response(body, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
