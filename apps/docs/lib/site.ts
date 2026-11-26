/** One place to rename the library. Everything user-facing reads from here. */
export const site = {
  name: 'dtheo/ui',
  tagline: 'Build clean UIs with your coding agent.',
  /** Also the share and search snippet, so it stays under 155 characters. */
  description:
    'A React design system your coding agent can look up, build with and check: components, tokens, an MCP server and a design linter.',
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
