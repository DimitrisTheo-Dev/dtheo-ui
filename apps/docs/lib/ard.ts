import { mcpTools } from './agents';
import { site } from './site';

/**
 * Agentic Resource Discovery (ARD v0.91) manifest, served at /.well-known/ard.json and linked with rel="ard".
 * It lists only agentic resources: the MCP server and the component registry. llms.txt and the Markdown mirrors are
 * found through their own conventions. Each entry needs a urn:air identifier anchored to this host, a display name,
 * a media type, exactly one of url or data, and 2 to 5 sample queries so registries can index it.
 */
export function ardManifest() {
  const host = new URL(site.url).host;
  return {
    entries: [
      {
        identifier: `urn:air:${host}:mcp:${site.cli}`,
        displayName: `${site.name} MCP server`,
        type: 'application/mcp-server-card+json',
        description:
          'Read-only design system tools. Look components up, copy their source, read tokens and guidelines, then check UI code against the system.',
        version: site.version,
        tags: ['design-system', 'react', 'tailwindcss', 'base-ui', 'charts', 'accessibility'],
        capabilities: mcpTools.map(([name]) => name),
        representativeQueries: [
          'find a React component for a measurement with a pass or fail limit',
          'get the source of an accessible select built on Base UI',
          'check this Tailwind JSX for design system mistakes',
          'which color token should muted text use in dark mode',
        ],
        data: {
          serverInfo: { name: site.name, version: site.version },
          description: 'Components, charts, tokens and a design check for data-heavy React apps.',
          transport: { type: 'streamable-http', url: `${site.url}/mcp` },
          authentication: { required: false },
          tools: mcpTools.map(([name, description]) => ({ name, description })),
        },
      },
      {
        identifier: `urn:air:${host}:registry:components`,
        displayName: `${site.name} component registry`,
        type: 'application/vnd.shadcn.registry+json',
        description: 'Every component, chart and helper as a shadcn registry item, installable with the shadcn CLI.',
        version: site.version,
        tags: ['shadcn', 'registry', 'react', 'components', 'charts'],
        representativeQueries: [
          'install a design system button with the shadcn CLI',
          'add an engineering line chart with limit lines to a Next.js app',
          'copy a data table component into my project',
        ],
        url: `${site.url}/r/registry.json`,
      },
    ],
  };
}
