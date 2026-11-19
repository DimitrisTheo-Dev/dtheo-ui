/** One place to rename the library. Everything user-facing reads from here. */
export const site = {
  name: 'dtheo/ui',
  tagline: 'Pixel-perfect UI, even when your agent writes it.',
  description:
    'dtheo/ui is a React design system for data-dense engineering tools: native-feeling components on Base UI, custom engineering charts, OKLCH tokens with contrast checked at build time, and an MCP server, CLI and llms.txt so agents build with it as well as people do.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ui.dtheo.dev',
  repo: 'https://github.com/DimitrisTheo-Dev/dtheo-ui',
  cli: 'dtheo',
  version: '0.1.0',
} as const;

export const installCommand = (slug: string) => `npx ${site.cli}@latest add ${slug}`;
export const shadcnCommand = (slug: string) => `npx shadcn@latest add ${site.url}/r/${slug}.json`;
