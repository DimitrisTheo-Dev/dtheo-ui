import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { categories, components, getComponent, type ComponentMeta } from '@dtheo/ui/meta';
import { colorRoles, foundation, presets } from '@dtheo/tokens';
import { checkSource } from 'dtheo/check';
import { componentMarkdown, foundationMarkdown } from '@/lib/markdown';
import { foundations, patterns } from '@/lib/nav';
import { pagesMarkdown } from '@/lib/pages-md';
import { componentByName, registryItem } from '@/lib/registry';
import { searchDocs } from '@/lib/search';
import { site } from '@/lib/site';
import { repoFile } from '@/lib/source';

/**
 * dtheo/ui MCP server (Streamable HTTP). Read-only: it describes the design system and checks code; it never
 * writes, fetches other hosts or runs anything. Inputs are validated; each client gets a best-effort rate limit.
 */
const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const docsPage = (slug: string) =>
  `${site.url}/docs/${getComponent(slug)?.package === 'charts' ? 'charts' : 'components'}/${slug}`;

/** Every tool only reads: it describes the system or checks code it is given, and never changes anything. */
const readOnly = (title: string) => ({
  title,
  annotations: {
    title,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
});

const slugOf = (href: string) => href.split('/').pop()!;
const presetIds = presets.map((p) => p.id) as [string, ...string[]];
/** get_guidelines topics: the foundations and patterns in the docs nav, then the pages that are guidelines too. */
const topics: [string, ...string[]] = [
  'theming',
  'writing',
  'agents',
  ...foundations.map((f) => slugOf(f.href)),
  ...patterns.map((p) => slugOf(p.href)),
];

/** A section of DESIGN.md, the design principles every page follows. */
function designSection(heading: string) {
  const section = repoFile('DESIGN.md')
    .split(/^## /m)
    .find((s) => s.startsWith(`${heading}\n`));
  if (!section) throw new Error(`DESIGN.md has no "## ${heading}" section`);
  return `# ${heading}\n\n${section.slice(heading.length).trim()}\n`;
}

/** Edit distance, for suggesting the slug someone meant. */
function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(row[j]! + 1, next[j - 1]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length]!;
}

const kebab = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\.(json|md)$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The component a name means: a slug, an alias (`toggle-group`, `skeleton`) or a title (`Command palette`). */
function findComponent(name: string): ComponentMeta | undefined {
  const key = kebab(name);
  return componentByName(key) ?? components.find((c) => kebab(c.title) === key);
}

/** The answer for a name that is not a component: the closest slugs, so the agent can retry at once. */
function unknownComponent(name: string) {
  const key = kebab(name);
  const near = components
    .map((c) => {
      const names = [c.slug, ...(c.aliases ?? []), kebab(c.title)];
      const d = Math.min(
        ...names.map((n) => (key.length > 2 && (n.includes(key) || key.includes(n)) ? 0 : distance(key, n))),
      );
      return { slug: c.slug, d };
    })
    .filter((c) => c.d <= Math.max(2, Math.floor(key.length / 3)))
    .sort((a, b) => a.d - b.d)
    .map((c) => c.slug);
  // Nothing spelled alike: try what the name means ("datepicker" finds nothing; "status label" finds Badge).
  const related = near.length
    ? near
    : searchDocs(name.replace(/[-_]/g, ' '))
        .map((r) => components.find((c) => r.url === `${docsPage(c.slug)}.md`)?.slug)
        .filter((s): s is string => Boolean(s));
  const list = related.slice(0, 3).map((s) => `\`${s}\``);
  return {
    ...text(
      `There is no component "${name}". ${list.length ? `Closest: ${list.join(', ')}. ` : ''}list_components lists all ${components.length}.`,
    ),
    isError: true,
  };
}

/**
 * Build a tool's answer. If that fails, log the cause for the owner and tell the agent where the same answer is
 * published as a static file. The agent never sees a server path or a maintainer's to-do.
 */
function answer(tool: string, build: () => string, instead: string) {
  try {
    return text(build());
  } catch (error) {
    console.error(`[mcp] ${tool} failed`, error);
    return { ...text(`${tool} could not build this answer right now. ${instead}`), isError: true };
  }
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'list_components',
      {
        ...readOnly('List components'),
        description: `List ${site.name} components with their category, atomic level and purpose. Call this before choosing a component.`,
        inputSchema: z.object({ category: z.enum(categories).optional() }),
      },
      async ({ category }) =>
        answer(
          'list_components',
          () =>
            components
              .filter((c) => !category || c.category === category)
              .map((c) => `- ${c.slug} (${c.category}, ${c.level}): ${c.description}`)
              .join('\n'),
          `Fetch ${site.url}/docs/components.md for the same list.`,
        ),
    );

    server.registerTool(
      'get_component',
      {
        ...readOnly('Get component contract'),
        description:
          'The full contract for one component: install command, exports, when to use and avoid, API, keyboard, accessibility and example code. Pass a slug from list_components, such as button or line-chart.',
        inputSchema: z.object({ slug: z.string().min(1).max(80) }),
      },
      async ({ slug: name }) => {
        const meta = findComponent(name);
        if (!meta) return unknownComponent(name);
        const slug = meta.slug;
        return answer(
          'get_component',
          () => componentMarkdown(meta),
          `Fetch ${docsPage(slug)}.md: the same contract as Markdown.`,
        );
      },
    );

    server.registerTool(
      'get_component_source',
      {
        ...readOnly('Get component source'),
        description:
          'Source files for a component (imports already rewritten to @/components/ui and @/lib), plus npm and registry dependencies.',
        inputSchema: z.object({ slug: z.string().min(1).max(80) }),
      },
      async ({ slug: name }) => {
        const meta = findComponent(name);
        if (!meta) return unknownComponent(name);
        const slug = meta.slug;
        return answer(
          'get_component_source',
          () => {
            const item = registryItem(slug)!;
            return [
              `# ${item.title} source`,
              `npm dependencies: ${item.dependencies.join(' ') || 'none'}`,
              `registry dependencies: ${item.registryDependencies.join(' ') || 'none'}`,
              ...item.files.map((f) => `\n## ${f.target}\n\n\`\`\`tsx\n${f.content}\n\`\`\``),
            ].join('\n');
          },
          `Fetch ${site.url}/r/${slug}.json instead: each entry in files[] has the file's content and its target path, and registryDependencies lists the items it needs. Or run \`npx ${site.cli}@latest add ${slug}\` in the project.`,
        );
      },
    );

    server.registerTool(
      'search_docs',
      {
        ...readOnly('Search the docs'),
        description:
          'Ranked search across components, foundations, patterns and guides. Use plain words: "filter a table", "limit line", "toast".',
        inputSchema: z.object({ query: z.string().min(2).max(120) }),
      },
      async ({ query }) =>
        answer(
          'search_docs',
          () => {
            const results = searchDocs(query);
            return results.length
              ? results.map((r) => `- ${r.title}: ${r.url}\n  ${r.description}`).join('\n')
              : 'No matches. Try other words, or list_components.';
          },
          `Fetch ${site.url}/llms.txt: every docs page, described, with a link to its Markdown copy.`,
        ),
    );

    server.registerTool(
      'get_tokens',
      {
        ...readOnly('Get design tokens'),
        description:
          'Color roles (OKLCH), radii, control heights and text roles for a preset and mode. Only Graphite has a light mode. Use role class names in code (bg-card, text-muted-foreground, h-control-md), never the raw values.',
        inputSchema: z.object({
          preset: z.enum(presetIds).default('graphite'),
          mode: z.enum(['light', 'dark']).default('dark'),
        }),
      },
      async ({ preset, mode }) =>
        answer(
          'get_tokens',
          () => {
            const p = presets.find((x) => x.id === preset)!;
            // A preset without this mode has no values for it. Say so, and show the mode it has.
            const shown = p.modes[mode] ? mode : (Object.keys(p.modes)[0] as keyof typeof p.modes);
            const scheme = p.modes[shown]!;
            const withMode = presets.filter((x) => x.modes[mode]).map((x) => x.name);
            const touch = foundation.control.touch;
            return [
              `# ${p.name} (${shown})`,
              ...(shown === mode
                ? []
                : [
                    '',
                    `${p.name} has no ${mode} mode; only ${withMode.join(' and ')} does. These are its ${shown} values. For ${mode} colors, use the ${withMode[0]} preset.`,
                    '',
                  ]),
              ...colorRoles.map((r) => `--${r}: ${scheme[r]}`),
              '',
              ...Object.entries(p.geometry).map(([k, v]) => `--${k}: ${v}`),
              '',
              ...Object.entries(foundation.control).map(([k, v]) => `h-control-${k}: ${v}`),
              `On a coarse pointer (touch), h-control-md grows to ${touch} and h-control-lg to ${parseFloat(touch) + 4}px.`,
              '',
              ...Object.entries(foundation.text).map(([k, v]) => `text-${k}: ${v[0]}/${v[1]} ${v[3]}`),
            ].join('\n');
          },
          `Fetch ${site.url}/docs/foundations/color.md and ${site.url}/docs/foundations/geometry.md: the same values as Markdown.`,
        ),
    );

    server.registerTool(
      'get_guidelines',
      {
        ...readOnly('Get guidelines'),
        description:
          'Design rules for color, typography, geometry, motion, theming, writing (interface copy), forms, states, data tables or agents.',
        inputSchema: z.object({ topic: z.enum(topics) }),
      },
      async ({ topic }) =>
        answer(
          'get_guidelines',
          () =>
            (topic === 'writing' ? designSection('Writing') : null) ??
            foundationMarkdown(topic) ??
            pagesMarkdown[topic] ??
            pagesMarkdown[`patterns/${topic}`] ??
            'Unknown topic.',
          `Fetch ${site.url}/llms.txt and open the page for "${topic}"; every docs page has a Markdown copy.`,
        ),
    );

    server.registerTool(
      'check_ui_code',
      {
        ...readOnly('Check UI code'),
        description:
          'Check React/Tailwind code against the design system: raw colors, palette classes, transition-all, unlabeled icon buttons, clickable divs and more. Returns findings with fixes. Run it on code you wrote before handing it back.',
        inputSchema: z.object({
          code: z.string().min(1).max(60_000),
          filename: z.string().max(200).optional(),
        }),
      },
      async ({ code, filename }) =>
        answer(
          'check_ui_code',
          () => {
            const findings = checkSource(code, { file: filename });
            if (!findings.length)
              return '0 findings. The code follows the dtheo/ui rules this checker knows.';
            return findings
              .map(
                (f) =>
                  `${f.severity.toUpperCase()} ${f.rule} (line ${f.line}): ${f.message}\n  Fix: ${f.fix}\n  > ${f.excerpt}`,
              )
              .join('\n');
          },
          `Save the code to a file and run \`npx ${site.cli}@latest check <file>\`: the same rules, offline.`,
        ),
    );
  },
  {
    serverInfo: { name: site.name.toLowerCase(), version: site.version },
    instructions: `${site.name} design system. Use list_components or search_docs to pick components, get_component for the contract, get_component_source to copy code, and check_ui_code before returning UI code.`,
    experimental_webMcp: {
      tools: [
        'list_components',
        'get_component',
        'search_docs',
        'get_tokens',
        'get_guidelines',
        'check_ui_code',
      ],
    },
  },
);

// Best-effort per-client limit, 120 requests per minute. It lives in this instance's memory, so it slows a runaway
// agent loop rather than stopping a determined client; abuse protection belongs to the platform's firewall.
const hits = new Map<string, { n: number; reset: number }>();
let swept = 0;
async function limited(req: Request) {
  const id = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  // Forget windows that have ended, at most once a second, so many one-off clients can neither grow the map without
  // bound nor reset everyone's count (clearing the whole map would).
  if (hits.size > 5000 && now - swept > 1000) {
    swept = now;
    for (const [key, h] of hits) if (h.reset < now) hits.delete(key);
  }
  const h = hits.get(id);
  if (!h || h.reset < now) hits.set(id, { n: 1, reset: now + 60_000 });
  else if (++h.n > 120)
    return new Response('Too many requests. Try again in a minute.', {
      status: 429,
      headers: { 'retry-after': String(Math.ceil((h.reset - now) / 1000)) },
    });
  return handler(req);
}

export { limited as GET, limited as POST, limited as DELETE };
