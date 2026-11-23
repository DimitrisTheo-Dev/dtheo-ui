import { presets } from '@dtheo/tokens';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { components } from '@dtheo/ui/meta';
import config from '../next.config';

/**
 * The MCP route reads component sources and examples when a tool is called, not at build time. On a laptop every
 * file is on disk, so a missing file only shows up once deployed. These tests record what the tools read and check
 * it against the files next.config.ts ships with the route, and make reads fail to check what the agent is told.
 */
const fsState = vi.hoisted(() => ({ read: new Set<string>(), missing: null as RegExp | null }));

vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>();
  const readFileSync = ((path: string, ...rest: [BufferEncoding]) => {
    const file = String(path);
    if (fsState.missing?.test(file))
      throw Object.assign(new Error(`ENOENT: no such file or directory, open '${file}'`), { code: 'ENOENT' });
    fsState.read.add(file);
    return fs.readFileSync(file, ...rest);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const docs = fileURLToPath(new URL('../', import.meta.url));

interface ToolResult {
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
}

/** Send one JSON-RPC request to a fresh copy of the route and return its result. */
async function rpc(method: string, params: Record<string, unknown>, client: string) {
  const { POST } = await import('@/app/mcp/route');
  const res = await POST(
    new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        // The route allows 120 calls a minute per client; give each tool its own budget.
        'x-forwarded-for': `vitest-${client}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    }),
  );
  const body = await res.text();
  const json = body.startsWith('{')
    ? body
    : body
        .split('\n')
        .find((l) => l.startsWith('data: '))!
        .slice(6);
  return JSON.parse(json).result;
}

/** A fresh copy of the route, so module caches start cold like a new serverless instance. */
async function route() {
  vi.resetModules();
  return async (name: string, args: Record<string, unknown> = {}) => {
    const result = (await rpc('tools/call', { name, arguments: args }, name)) as ToolResult;
    return { ...result, text: result.content.map((c) => c.text).join('\n') };
  };
}

const slugs = components.map((c) => c.slug);
const leaks = /ENOENT|\/var\/task|packages\/|add it to/;

describe('MCP server', () => {
  it('tells the agent where else to get an answer when it cannot build one', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const call = await route();
    try {
      fsState.missing = /[/\\]packages[/\\]/;
      const source = await call('get_component_source', { slug: 'button' });
      expect(source.isError).toBe(true);
      expect(source.text).toContain('/r/button.json');
      expect(source.text).toContain('npx dtheo@latest add button');
      expect(source.text).not.toMatch(leaks);

      const chart = await call('get_component', { slug: 'line-chart' });
      expect(chart.isError).toBe(true);
      expect(chart.text).toContain('/docs/charts/line-chart.md');
      expect(chart.text).not.toMatch(leaks);
      // The owner still gets the cause in the server log.
      expect(error).toHaveBeenCalled();

      // Once the files are readable again, the same instance answers: a failed read must not be cached.
      fsState.missing = null;
      for (const slug of ['line-chart', 'histogram', 'card']) {
        const retry = await call('get_component', { slug });
        expect(retry.isError, `${slug}: ${retry.text.slice(0, 200)}`).toBeFalsy();
      }
    } finally {
      fsState.missing = null;
      error.mockRestore();
    }
  });

  it('answers every tool, for every component, from files shipped with the route', async () => {
    const call = await route();
    fsState.read.clear();
    const calls: Array<[string, Record<string, unknown>]> = [
      ['list_components', {}],
      ['list_components', { category: 'Charts' }],
      ...slugs.flatMap((slug): Array<[string, Record<string, unknown>]> => [
        ['get_component', { slug }],
        ['get_component_source', { slug }],
      ]),
      ['search_docs', { query: 'limit line' }],
      ...(['graphite', 'carbon'] as const).flatMap((preset) =>
        (['light', 'dark'] as const).map((mode): [string, Record<string, unknown>] => [
          'get_tokens',
          { preset, mode },
        ]),
      ),
      ...[
        'color',
        'typography',
        'geometry',
        'motion',
        'forms',
        'states',
        'data-table',
        'agents',
        'theming',
        'writing',
      ].map((topic): [string, Record<string, unknown>] => ['get_guidelines', { topic }]),
      // dtheo-check-ignore-next-line (the mistakes check_ui_code is called to find)
      ['check_ui_code', { code: '<div className="bg-blue-500 transition-all" />' }],
    ];
    for (const [name, args] of calls) {
      const result = await call(name, args);
      const label = `${name} ${JSON.stringify(args)}`;
      expect(result.isError, `${label}: ${result.text.slice(0, 200)}`).toBeFalsy();
      expect(result.text, label).not.toContain('is not written yet');
    }

    // next build traces imports, not paths computed at run time. Every file a tool read must be one the '/mcp'
    // globs ship with the function; otherwise the deployed route fails with ENOENT for it.
    const shipped = new Set(
      config.outputFileTracingIncludes!['/mcp']!.flatMap((glob) =>
        globSync(glob, { cwd: docs }).map((f) => resolve(docs, f)),
      ),
    );
    const read = [...fsState.read].map((f) => resolve(f));
    expect(read.length).toBeGreaterThan(slugs.length);
    expect(read.filter((f) => !shipped.has(f))).toEqual([]);
  });
});

describe('MCP tools', () => {
  it('are all marked read-only, with a title', async () => {
    vi.resetModules();
    const { tools } = (await rpc('tools/list', {}, 'list')) as {
      tools: Array<{
        name: string;
        title?: string;
        annotations?: { readOnlyHint?: boolean; title?: string };
      }>;
    };
    expect(tools.length).toBeGreaterThan(5);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
      expect(tool.annotations?.title, tool.name).toBe(tool.title);
    }
  });

  it('answers a name that is not a slug with the closest ones, or the component it means', async () => {
    const call = await route();
    const typo = await call('get_component', { slug: 'dialgo' });
    expect(typo.isError).toBe(true);
    expect(typo.text).toContain('There is no component "dialgo"');
    expect(typo.text).toContain('`dialog`');
    expect(typo.text).toContain('list_components');
    // Not the schema's list of every slug.
    expect(typo.text.length).toBeLessThan(300);

    // The file name in a pasted import and the title both find the component.
    expect((await call('get_component', { slug: 'toggle-group' })).text).toMatch(
      /^# Toggle and segmented control/,
    );
    expect((await call('get_component', { slug: 'Command palette' })).text).toMatch(/^# Command palette/);
    expect((await call('get_component_source', { slug: 'skeleton' })).text).toContain(
      'components/ui/skeleton.tsx',
    );

    const unrelated = await call('get_component_source', { slug: 'xyzzy' });
    expect(unrelated.isError).toBe(true);
    expect(unrelated.text).toContain('list_components');
  });

  it('answers each preset in the mode asked for, with its own values', async () => {
    const call = await route();
    const carbon = await call('get_tokens', { preset: 'carbon', mode: 'light' });
    expect(carbon.text).toMatch(/^# Carbon \(light\)/);
    expect(carbon.text).not.toContain('no light mode');
    // Carbon's own values, not Graphite's: no hue in its surfaces (zero chroma), and tighter corners.
    const preset = presets.find((p) => p.id === 'carbon')!;
    expect(carbon.text).toContain(`--background: ${preset.modes.light!.background}`);
    expect(preset.modes.light!.background).toMatch(/ 0 0\)$/);
    expect(carbon.text).toContain('--radius-control: 4px');
    const graphite = await call('get_tokens', { preset: 'graphite', mode: 'light' });
    expect(graphite.text).toMatch(/^# Graphite \(light\)/);
    expect(graphite.text).not.toContain('no light mode');
    // Control heights come with the tokens, including what touch does to them.
    expect(graphite.text).toContain('h-control-md: 28px');
    expect(graphite.text).toContain('h-control-md grows to 36px and h-control-lg to 40px');
  });

  it('serves the writing rules it advertises', async () => {
    const call = await route();
    const writing = await call('get_guidelines', { topic: 'writing' });
    expect(writing.isError).toBeFalsy();
    expect(writing.text).toMatch(/^# Writing\n\n\S/);
    expect(writing.text).not.toContain('## ');
  });

  it('ranks plain-English questions by what they mean', async () => {
    const call = await route();
    const top = async (query: string) => {
      const { text, isError } = await call('search_docs', { query });
      expect(isError, query).toBeFalsy();
      // Each result is a title, its Markdown URL and a one-line description.
      expect(text, query).toMatch(/^- .+: https:\/\/\S+\.md\n {2}\S.*$/m);
      return [...text.matchAll(/^- [^\n]*: \S+\/docs\/([\w/-]+)\.md$/gm)].map((m) => m[1]!);
    };
    const component = await top('find a React component for a measurement with a pass or fail limit');
    expect(component[0]).toBe('components/metric');
    const select = await top('get the source of an accessible select built on Base UI');
    expect(select.slice(0, 3)).toContain('components/select');
    const check = await top('check this Tailwind JSX against the rules');
    expect(check.slice(0, 3)).toEqual(expect.arrayContaining(['check-rules', 'cli']));
    const muted = await top('muted text');
    expect(muted[0]).toBe('foundations/color');
    expect(muted.indexOf('components/textarea')).not.toBe(0);
  });
});
