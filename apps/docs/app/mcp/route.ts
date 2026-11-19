import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { components, getComponent } from '@dtheo/ui/meta';
import { colorRoles, foundation, presets } from '@dtheo/tokens';
import { checkSource } from 'dtheo/check';
import { componentMarkdown, foundationMarkdown } from '@/lib/markdown';
import { pagesMarkdown } from '@/lib/pages-md';
import { registryItem } from '@/lib/registry';
import { site } from '@/lib/site';

/**
 * dtheo/ui MCP server (Streamable HTTP). Read-only: it describes the design system and checks code; it never
 * writes, fetches other hosts or runs anything. Inputs are validated; requests are rate limited per client.
 */
const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const slugs = components.map((c) => c.slug) as [string, ...string[]];

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'list_components',
      {
        title: 'List components',
        description: `List ${site.name} components with their category, atomic level and purpose. Call this before choosing a component.`,
        inputSchema: z.object({
          category: z
            .enum([
              'Actions',
              'Inputs',
              'Selection',
              'Overlays',
              'Navigation',
              'Feedback',
              'Data display',
              'Layout',
              'Charts',
            ])
            .optional(),
        }),
      },
      async ({ category }) =>
        text(
          components
            .filter((c) => !category || c.category === category)
            .map((c) => `- ${c.slug} (${c.category}, ${c.level}): ${c.description}`)
            .join('\n'),
        ),
    );

    server.registerTool(
      'get_component',
      {
        title: 'Get component contract',
        description:
          'The full contract for one component: install command, exports, when to use and avoid, API, keyboard, accessibility and example code.',
        inputSchema: z.object({ slug: z.enum(slugs) }),
      },
      async ({ slug }) => text(componentMarkdown(getComponent(slug)!)),
    );

    server.registerTool(
      'get_component_source',
      {
        title: 'Get component source',
        description:
          'Source files for a component (imports already rewritten to @/components/ui and @/lib), plus npm and registry dependencies.',
        inputSchema: z.object({ slug: z.enum(slugs) }),
      },
      async ({ slug }) => {
        const item = registryItem(slug)!;
        return text(
          [
            `# ${item.title} source`,
            `npm dependencies: ${item.dependencies.join(' ') || 'none'}`,
            `registry dependencies: ${item.registryDependencies.join(' ') || 'none'}`,
            ...item.files.map((f) => `\n## ${f.target}\n\n\`\`\`tsx\n${f.content}\n\`\`\``),
          ].join('\n'),
        );
      },
    );

    server.registerTool(
      'search_docs',
      {
        title: 'Search the docs',
        description:
          'Ranked search across components, foundations, patterns and guides. Use plain words: "filter a table", "limit line", "toast".',
        inputSchema: z.object({ query: z.string().min(2).max(120) }),
      },
      async ({ query }) => {
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        const docs = [
          ...components.map((c) => ({
            title: c.title,
            url: `${site.url}/docs/${c.package === 'charts' ? 'charts' : 'components'}/${c.slug}.md`,
            body: `${c.title} ${c.description} ${c.use.join(' ')} ${c.avoid?.join(' ') ?? ''} ${c.category}`,
          })),
          ...Object.entries(pagesMarkdown).map(([k, v]) => ({
            title: v.split('\n')[0]!.replace('# ', ''),
            url: `${site.url}/docs/${k}.md`,
            body: v,
          })),
          ...['color', 'typography', 'geometry', 'motion'].map((k) => ({
            title: k,
            url: `${site.url}/docs/foundations/${k}.md`,
            body: foundationMarkdown(k)!,
          })),
        ];
        const scored = docs
          .map((d) => {
            const hay = d.body.toLowerCase();
            const title = d.title.toLowerCase();
            const score = terms.reduce(
              (s, t) => s + (title.includes(t) ? 5 : 0) + Math.min(5, hay.split(t).length - 1),
              0,
            );
            return { ...d, score };
          })
          .filter((d) => d.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        return text(
          scored.length
            ? scored.map((d) => `- ${d.title}: ${d.url}`).join('\n')
            : 'No matches. Try list_components.',
        );
      },
    );

    server.registerTool(
      'get_tokens',
      {
        title: 'Get design tokens',
        description:
          'Color roles (OKLCH) and geometry for a preset and mode. Use role class names in code (bg-card, text-muted-foreground), never the raw values.',
        inputSchema: z.object({
          preset: z.enum(['graphite', 'flight-deck', 'deep-space']).default('graphite'),
          mode: z.enum(['light', 'dark']).default('dark'),
        }),
      },
      async ({ preset, mode }) => {
        const p = presets.find((x) => x.id === preset)!;
        const scheme = p.modes[mode] ?? presets[0]!.modes[mode]!;
        return text(
          [
            `# ${p.name} (${mode})`,
            ...colorRoles.map((r) => `--${r}: ${scheme[r]}`),
            '',
            ...Object.entries(p.geometry).map(([k, v]) => `--${k}: ${v}`),
            '',
            ...Object.entries(foundation.text).map(([k, v]) => `text-${k}: ${v[0]}/${v[1]} ${v[3]}`),
          ].join('\n'),
        );
      },
    );

    server.registerTool(
      'get_guidelines',
      {
        title: 'Get guidelines',
        description:
          'Design rules for color, typography, geometry, motion, forms, states, data tables or agents.',
        inputSchema: z.object({
          topic: z.enum([
            'color',
            'typography',
            'geometry',
            'motion',
            'forms',
            'states',
            'data-table',
            'agents',
            'theming',
          ]),
        }),
      },
      async ({ topic }) =>
        text(
          foundationMarkdown(topic) ??
            pagesMarkdown[topic] ??
            pagesMarkdown[`patterns/${topic}`] ??
            'Unknown topic.',
        ),
    );

    server.registerTool(
      'check_ui_code',
      {
        title: 'Check UI code',
        description:
          'Check React/Tailwind code against the design system: raw colors, palette classes, transition-all, unlabeled icon buttons, clickable divs and more. Returns findings with fixes. Run it on code you wrote before handing it back.',
        inputSchema: z.object({
          code: z.string().min(1).max(60_000),
          filename: z.string().max(200).optional(),
        }),
      },
      async ({ code, filename }) => {
        const findings = checkSource(code, { file: filename });
        if (!findings.length)
          return text('0 findings. The code follows the dtheo/ui rules this checker knows.');
        return text(
          findings
            .map(
              (f) =>
                `${f.severity.toUpperCase()} ${f.rule} (line ${f.line}): ${f.message}\n  Fix: ${f.fix}\n  > ${f.excerpt}`,
            )
            .join('\n'),
        );
      },
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

// Per-client rate limit (in memory, per instance): 120 requests per minute.
const hits = new Map<string, { n: number; reset: number }>();
async function limited(req: Request) {
  const id = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  const h = hits.get(id);
  if (!h || h.reset < now) hits.set(id, { n: 1, reset: now + 60_000 });
  else if (++h.n > 120)
    return new Response('Too many requests. Try again in a minute.', {
      status: 429,
      headers: { 'retry-after': '60' },
    });
  if (hits.size > 5000) hits.clear();
  return handler(req);
}

export { limited as GET, limited as POST, limited as DELETE };
