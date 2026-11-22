import { registryAliases, registryIndex, registryItem, registryNames } from '@/lib/registry';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  // Aliases are served too (toggle-group.json is the toggle item), so `dtheo add` accepts a pasted import's name.
  return [
    { name: 'registry.json' },
    ...[...registryNames(), ...registryAliases()].map((n) => ({ name: `${n}.json` })),
  ];
}

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=300, s-maxage=3600',
  'access-control-allow-origin': '*',
};

/** shadcn-compatible registry: /r/registry.json and /r/<item>.json. Public, read-only, no credentials. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (name === 'registry.json') return new Response(JSON.stringify(registryIndex(), null, 2), { headers });
  const item = registryItem(name.replace(/\.json$/, ''));
  if (!item)
    return new Response(JSON.stringify({ error: 'Unknown registry item' }), { status: 404, headers });
  return new Response(JSON.stringify(item, null, 2), { headers });
}
