#!/usr/bin/env node
// Calls a deployed site the way people and agents do: the pages, llms.txt, a Markdown mirror, a registry item and
// the MCP tools that read files at request time. Those tools once passed every test and failed only once deployed,
// so CI runs this against production after each deploy (.github/workflows/smoke.yml).
//
//   node scripts/smoke-production.mjs https://ui.dtheo.dev
const base = (process.argv[2] ?? 'https://ui.dtheo.dev').replace(/\/$/, '');
let failed = 0;

async function check(name, run) {
  try {
    await run();
    console.log(`ok    ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL  ${name}: ${error.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path) {
  const res = await fetch(base + path, { redirect: 'follow' });
  expect(res.ok, `${path} answered ${res.status}`);
  return res;
}

/** One JSON-RPC call to the MCP route; the answer comes back as JSON or as one server-sent event. */
async function mcp(method, params) {
  const res = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  expect(res.ok, `/mcp ${method} answered ${res.status}`);
  const body = await res.text();
  const json = body.startsWith('{')
    ? body
    : body
        .split('\n')
        .find((l) => l.startsWith('data: '))
        ?.slice(6);
  expect(json, `/mcp ${method} sent no message`);
  const message = JSON.parse(json);
  expect(!message.error, `/mcp ${method}: ${message.error?.message}`);
  return message.result;
}

async function tool(name, args) {
  const result = await mcp('tools/call', { name, arguments: args });
  const text = result.content.map((c) => c.text).join('\n');
  expect(!result.isError, `${name} returned an error: ${text.slice(0, 160)}`);
  return text;
}

await check('the home page', async () => {
  expect((await (await get('/')).text()).includes('dtheo/ui'), 'the page does not name dtheo/ui');
});
await check('llms.txt', async () => {
  expect(
    (await (await get('/llms.txt')).text()).startsWith('# dtheo/ui'),
    'it does not start with its title',
  );
});
await check('a Markdown mirror', async () => {
  expect((await (await get('/docs/components/button.md')).text()).includes('# Button'), 'no Button heading');
});
await check('a registry item', async () => {
  const item = await (await get('/r/button.json')).json();
  expect(
    item.files?.some((f) => f.content?.includes('export function Button')),
    'no Button source in its files',
  );
});
await check('MCP: the seven tools', async () => {
  const { tools } = await mcp('tools/list', {});
  expect(tools.length === 7, `${tools.length} tools listed`);
});
await check('MCP: a chart source read from disk', async () => {
  expect(
    (await tool('get_component_source', { slug: 'histogram' })).includes('export function Histogram'),
    'no source',
  );
});
await check('MCP: a chart contract', async () => {
  expect(
    (await tool('get_component', { slug: 'line-chart' })).includes('LineChart'),
    'no LineChart in the answer',
  );
});
await check('MCP: the design check', async () => {
  const text = await tool('check_ui_code', {
    code: '<div className="bg-[#0070f3]" />',
    filename: 'card.tsx',
  });
  expect(text.includes('raw-color'), 'a raw hex color was not reported');
});

if (failed) {
  console.log(`\n${failed} check${failed === 1 ? '' : 's'} failed against ${base}.`);
  process.exitCode = 1;
} else console.log(`\nEvery check passed against ${base}.`);
