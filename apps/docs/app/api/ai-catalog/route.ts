import { site } from '@/lib/site';

export const dynamic = 'force-static';

/** AI Catalog (AgentReady AR-FIND-04): typed entry points for agents, served at /.well-known/ai-catalog.json. */
export function GET() {
  const catalog = {
    version: '1.0',
    name: site.name,
    description: site.description,
    url: site.url,
    entries: [
      { type: 'llms-txt', url: `${site.url}/llms.txt`, description: 'Described index of every docs page' },
      {
        type: 'llms-full-txt',
        url: `${site.url}/llms-full.txt`,
        description: 'Every docs page in one Markdown file',
      },
      {
        type: 'mcp',
        url: `${site.url}/mcp`,
        transport: 'streamable-http',
        auth: 'none',
        description: 'Read-only design system tools',
      },
      {
        type: 'registry',
        url: `${site.url}/r/registry.json`,
        format: 'shadcn-registry',
        description: 'Installable components',
      },
      {
        type: 'cli',
        package: site.cli,
        install: `npx ${site.cli}@latest`,
        description: 'Add components and check UI code',
      },
      {
        type: 'docs',
        url: `${site.url}/docs`,
        description: 'Human documentation; append .md to any page for Markdown',
      },
    ],
  };
  return Response.json(catalog, { headers: { 'cache-control': 'public, max-age=3600' } });
}
