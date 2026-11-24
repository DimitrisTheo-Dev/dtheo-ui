import { site } from './site';

/** One source for the agent setup: the For agents page and its Markdown mirror both read from here. */
const url = `${site.url}/mcp`;
const name = site.cli;

const json = (value: unknown) => JSON.stringify(value, null, 2);

export interface McpClient {
  id: string;
  name: string;
  command?: string;
  file?: { path: string; lang: 'json' | 'bash'; code: string };
  /** One-click install link the client registers itself. */
  deeplink?: string;
}

export const mcpClients: McpClient[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    command: `claude mcp add --transport http ${name} ${url}`,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    file: { path: '.cursor/mcp.json', lang: 'json', code: json({ mcpServers: { [name]: { url } } }) },
    deeplink: `cursor://anysphere.cursor-deeplink/mcp/install?name=${name}&config=${Buffer.from(json({ url })).toString('base64')}`,
  },
  {
    id: 'vscode',
    name: 'VS Code',
    command: `code --add-mcp '${JSON.stringify({ name, type: 'http', url })}'`,
    file: {
      path: '.vscode/mcp.json',
      lang: 'json',
      code: json({ servers: { [name]: { type: 'http', url } } }),
    },
  },
  {
    id: 'codex',
    name: 'Codex',
    file: { path: '~/.codex/config.toml', lang: 'bash', code: `[mcp_servers.${name}]\nurl = "${url}"` },
  },
  {
    id: 'other',
    name: 'Other',
    file: { path: 'mcp.json', lang: 'json', code: json({ mcpServers: { [name]: { url } } }) },
  },
];

export const mcpTools: Array<[string, string]> = [
  ['list_components', 'Every component, one line each'],
  ['get_component', 'The contract: install, props, do and don’t, keyboard'],
  ['get_component_source', 'The source files, ready to write'],
  ['search_docs', 'Ranked matches across components, foundations and patterns'],
  ['get_tokens', 'Color roles and geometry for a preset and mode'],
  ['get_guidelines', 'Color, type, geometry, motion or writing rules'],
  ['check_ui_code', 'Design-check findings for a snippet, with fixes'],
];

export const agentPrompt = `Build the run review screen with the ${site.name} design system.
Look components up with the ${name} MCP server before writing code,
add them with \`npx ${name} add\`, use only token classes for color,
and run \`npx ${name} check\` until it reports 0 errors.`;

/** The Markdown mirror of the For agents page. */
export function agentsMarkdown() {
  return [
    '# For agents',
    '',
    '> Three steps: connect, ask, check. Your agent gets the docs, the code and a reviewer.',
    '',
    '## 1. Connect',
    '',
    `Add the read-only MCP server (Streamable HTTP) at \`${url}\`.`,
    '',
    ...mcpClients.flatMap((c) => [
      `### ${c.name}`,
      '',
      ...(c.command ? ['```bash', c.command, '```', ''] : []),
      ...(c.file
        ? [
            `\`${c.file.path}\`:`,
            '',
            `\`\`\`${c.file.path.endsWith('.toml') ? 'toml' : c.file.lang}`,
            c.file.code,
            '```',
            '',
          ]
        : []),
    ]),
    '## 2. Ask',
    '',
    '```md',
    agentPrompt,
    '```',
    '',
    '## 3. Check',
    '',
    '```bash',
    `npx ${name} check`,
    '```',
    '',
    'It exits with 1 on errors and prints the fix for each finding. Add it to CI.',
    '',
    '## What it can call',
    '',
    '| Tool | What it returns |',
    '| --- | --- |',
    ...mcpTools.map(([tool, does]) => `| \`${tool}\` | ${does} |`),
    '',
    'The same tools are offered to in-page agents through WebMCP when the browser supports it.',
    '',
    '## No MCP? Use these',
    '',
    `- \`${site.url}/llms.txt\`: a described index of the docs and the example apps.`,
    `- \`${site.url}/llms-full.txt\`: all the docs in one file.`,
    '- Any docs page URL + `.md`: the Markdown copy of that page (e.g. `/docs/components/button.md`).',
    `- \`${site.url}/r/registry.json\`: every installable item in the shadcn registry format.`,
    '',
    `Run \`npx ${name} rules\` to see every rule the check enforces.`,
    '',
  ].join('\n');
}
