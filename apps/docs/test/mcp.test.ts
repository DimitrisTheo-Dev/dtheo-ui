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

/** A fresh copy of the route, so module caches start cold like a new serverless instance. */
async function route() {
  vi.resetModules();
  const { POST } = await import('@/app/mcp/route');
  let id = 0;
  return async (name: string, args: Record<string, unknown> = {}) => {
    const res = await POST(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          // The route allows 120 calls a minute per client; give each tool its own budget.
          'x-forwarded-for': `vitest-${name}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++id,
          method: 'tools/call',
          params: { name, arguments: args },
        }),
      }),
    );
    const body = await res.text();
    const json = body.startsWith('{')
      ? body
      : body
          .split('\n')
          .find((l) => l.startsWith('data: '))!
          .slice(6);
    const result = JSON.parse(json).result as ToolResult;
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
      ...(['graphite', 'flight-deck', 'deep-space'] as const).flatMap((preset) =>
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
