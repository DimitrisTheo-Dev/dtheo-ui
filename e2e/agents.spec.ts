import { expect, test } from '@playwright/test';

test('llms.txt is a described index of Markdown pages', async ({ request }) => {
  const res = await request.get('/llms.txt');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('text/plain');
  const body = await res.text();
  expect(body).toMatch(/^# dtheo\/ui/);
  expect(body).toContain('/docs/components/button.md');
});

test('every docs page has a Markdown mirror', async ({ request }) => {
  for (const path of [
    '/docs/index.md',
    '/docs/components/button.md',
    '/docs/charts/line-chart.md',
    '/docs/patterns/forms.md',
  ]) {
    const res = await request.get(path);
    expect(res.ok(), path).toBe(true);
    expect(res.headers()['content-type'], path).toContain('text/markdown');
    expect(await res.text(), path).toMatch(/^# /);
  }
  // A component's mirror installs what its example imports and shows the example as a client component.
  const dialog = await (await request.get('/docs/components/dialog.md')).text();
  expect(dialog).toContain('npx dtheo@latest add dialog field number-field toast');
  expect(dialog).toContain("```tsx\n'use client';");
});

test('the registry serves shadcn-compatible items', async ({ request }) => {
  const index = await (await request.get('/r/registry.json')).json();
  expect(index.items.length).toBeGreaterThan(40);
  const item = await (await request.get('/r/button.json')).json();
  expect(item.files[0].content).toContain('export function Button');
  expect(item.files[0].content).not.toContain('@dtheo/');
  // The file name a pasted import uses finds the item that writes it.
  for (const [name, owner] of [
    ['toggle-group', 'toggle'],
    ['segmented-control', 'toggle'],
    ['skeleton', 'spinner'],
  ]) {
    const res = await request.get(`/r/${name}.json`);
    expect(res.ok(), name).toBe(true);
    expect((await res.json()).name, name).toBe(owner);
  }
  // Popover ships its own file and gets the shared popup classes from their own item.
  const popover = await (await request.get('/r/popover.json')).json();
  expect(popover.files.map((f: { target: string }) => f.target)).toEqual(['components/ui/popover.tsx']);
  expect(popover.registryDependencies.some((d: string) => d.endsWith('/r/popup.json'))).toBe(true);
});

test('the MCP server lists its tools and checks code', async ({ request }) => {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const call = async (method: string, params: object, id: number) => {
    const res = await request.post('/mcp', { headers, data: { jsonrpc: '2.0', id, method, params } });
    expect(res.ok(), method).toBe(true);
    const text = await res.text();
    const json = text.startsWith('{')
      ? text
      : text
          .split('\n')
          .find((l) => l.startsWith('data: '))!
          .slice(6);
    return JSON.parse(json);
  };
  await call(
    'initialize',
    { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } },
    1,
  );
  const tools = await call('tools/list', {}, 2);
  expect(tools.result.tools.map((t: { name: string }) => t.name)).toContain('check_ui_code');
  const check = await call(
    'tools/call',
    { name: 'check_ui_code', arguments: { code: '<div className="bg-blue-500 transition-all" />' } },
    3,
  );
  expect(JSON.stringify(check.result)).toContain('palette-color');
  // The two tools that read source files when called: a component's code, and a chart's contract.
  const source = await call('tools/call', { name: 'get_component_source', arguments: { slug: 'button' } }, 4);
  expect(source.result.isError).toBeFalsy();
  expect(source.result.content[0].text).toContain('export function Button');
  const chart = await call('tools/call', { name: 'get_component', arguments: { slug: 'line-chart' } }, 5);
  expect(chart.result.isError).toBeFalsy();
  expect(chart.result.content[0].text).toContain("from '@/components/charts/line-chart'");
});

test('the ARD manifest and robots are published', async ({ request }) => {
  const ard = await request.get('/.well-known/ard.json');
  expect(ard.ok()).toBe(true);
  expect((await ard.json()).entries.length).toBeGreaterThan(0);
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
});
