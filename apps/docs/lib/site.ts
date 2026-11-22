/** One place to rename the library. Everything user-facing reads from here. */
export const site = {
  name: 'dtheo/ui',
  tagline: 'Pixel-perfect UI, even when your agent writes it.',
  /** Also the share and search snippet, so it stays under 155 characters. */
  description:
    'A React design system for data-dense engineering tools: components, charts and OKLCH tokens, plus an MCP server and a linter so agents build it right.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ui.dtheo.dev',
  repo: 'https://github.com/DimitrisTheo-Dev/dtheo-ui',
  /** Who made it: credited in the footer, and linked back from the author's own site. */
  author: { name: 'Dimitris Theodoropoulos', site: 'dtheo.dev', url: 'https://dtheo.dev' },
  cli: 'dtheo',
  version: '0.1.0',
} as const;

/** One command that adds every named item (and what each one needs). */
export const installCommand = (...names: string[]) => `npx ${site.cli}@latest add ${names.join(' ')}`;
export const shadcnCommand = (...names: string[]) =>
  `npx shadcn@latest add ${names.map((n) => `${site.url}/r/${n}.json`).join(' ')}`;
