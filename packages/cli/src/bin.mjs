#!/usr/bin/env node
/**
 * dtheo: add dtheo/ui components to a React project, and check UI code against the system.
 *
 *   dtheo init                     add utils, theme scope and the stylesheet, and import it in the global CSS
 *   dtheo add <item...>            copy components (and what they need) into your project
 *   dtheo list [query]             list registry items
 *   dtheo check [paths...]         check UI code for design-system mistakes (offline)
 *   dtheo mcp                      print MCP client config for your editor or agent
 *
 * Options: --registry <url> (default https://ui.dtheo.dev or $DTHEO_REGISTRY), --cwd <dir>,
 *          --overwrite, --remove-overrides (init), --dry-run, --json, --help (-h), --version (-v)
 */
import { existsSync, globSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { checkSource, ruleList } from './check.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')));
const shortFlags = new Set(args.filter((a) => /^-[a-z]$/i.test(a)));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split('=').slice(1).join('=') : undefined;
};
const positional = args.filter(
  (a, i) => !a.startsWith('-') && !['--registry', '--cwd'].includes(args[i - 1]),
);
const [command, ...rest] = positional;
const json = flags.has('--json');
const cwd = resolve(opt('cwd') ?? process.cwd());
const registry = (opt('registry') ?? process.env.DTHEO_REGISTRY ?? 'https://ui.dtheo.dev').replace(/\/$/, '');

const c =
  process.stdout.isTTY && !json && !process.env.NO_COLOR
    ? {
        dim: (s) => `\x1b[2m${s}\x1b[0m`,
        bold: (s) => `\x1b[1m${s}\x1b[0m`,
        red: (s) => `\x1b[31m${s}\x1b[0m`,
        yellow: (s) => `\x1b[33m${s}\x1b[0m`,
        green: (s) => `\x1b[32m${s}\x1b[0m`,
      }
    : { dim: (s) => s, bold: (s) => s, red: (s) => s, yellow: (s) => s, green: (s) => s };

const out = (data, text) => (json ? console.log(JSON.stringify(data, null, 2)) : console.log(text));
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
// Never call process.exit() after writing: on a pipe it drops output that has not flushed (anything past 64 KB).
// Set the exit code and unwind instead.
class CliExit extends Error {}
const fail = (message, code = 1) => {
  if (json) console.log(JSON.stringify({ ok: false, error: message }));
  else console.error(c.red(`✗ ${message}`));
  process.exitCode = code;
  throw new CliExit(message);
};

// ---------- registry access (read-only, HTTPS unless localhost) ----------
async function fetchJson(path) {
  const url = new URL(path, `${registry}/`);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local)
    fail(`Refusing to fetch over ${url.protocol} from ${url.host}. Use an https registry.`);
  const res = await fetch(url, { headers: { accept: 'application/json' }, redirect: 'follow' }).catch((e) =>
    fail(`Cannot reach ${url}: ${e.message}`),
  );
  if (!res.ok) fail(`${url} answered ${res.status}. Check the item name with \`dtheo list\`.`);
  const text = await res.text();
  if (text.length > 2_000_000) fail(`${url} is larger than 2 MB; refusing to process it.`);
  try {
    return JSON.parse(text);
  } catch {
    fail(`${url} did not return JSON.`);
  }
}

/** Resolve an item and its registry dependencies, depth-first, each once. */
async function resolveItems(names) {
  const seen = new Map();
  const visit = async (name) => {
    const key = name.replace(/^.*\/r\//, '').replace(/\.json$/, '');
    if (seen.has(key)) return;
    const item = await fetchJson(`r/${encodeURIComponent(key)}.json`);
    if (!item || typeof item.name !== 'string' || !Array.isArray(item.files))
      fail(`Item "${key}" is not a valid registry item.`);
    seen.set(key, null);
    for (const dep of item.registryDependencies ?? []) await visit(dep);
    seen.set(key, item);
  };
  for (const n of names) await visit(n);
  return [...seen.values()];
}

/** Where a registry file lands in the project, refusing anything outside it. */
function targetFor(file) {
  const srcDir = existsSync(join(cwd, 'src')) && !existsSync(join(cwd, 'app')) ? 'src' : '';
  const rel = file.target ?? file.path.replace(/^registry\/dtheo\//, '');
  if (isAbsolute(rel) || normalize(rel).split(sep).includes('..'))
    fail(`Refusing unsafe path "${rel}" from the registry.`);
  const full = resolve(cwd, srcDir, rel);
  if (!full.startsWith(cwd + sep)) fail(`Refusing to write outside the project: ${rel}`);
  return full;
}

/** The install command for the project's package manager, or null when there is nothing to install. */
function installCommand(packages, dev) {
  if (!packages.size) return null;
  const pm = existsSync(join(cwd, 'pnpm-lock.yaml'))
    ? 'pnpm add'
    : existsSync(join(cwd, 'bun.lock')) || existsSync(join(cwd, 'bun.lockb'))
      ? 'bun add'
      : existsSync(join(cwd, 'yarn.lock'))
        ? 'yarn add'
        : 'npm install';
  return `${pm}${dev ? ' -D' : ''} ${[...packages].sort().join(' ')}`;
}

/** Copy items into the project. Returns the result and its report lines; the caller prints them. */
async function copyItems(names) {
  const items = await resolveItems(names);
  const written = [];
  const skipped = [];
  const deps = new Set();
  // Type packages, such as @types/d3-scale: without them a TypeScript build fails on the chart imports.
  const devDeps = new Set();
  // Items share files (field and select both ship input.tsx): write or report each target once.
  const seen = new Set();
  for (const item of items) {
    for (const d of item.dependencies ?? []) deps.add(d);
    for (const d of item.devDependencies ?? []) devDeps.add(d);
    for (const file of item.files) {
      if (typeof file.content !== 'string') fail(`Item "${item.name}" has a file without content.`);
      const target = targetFor(file);
      const rel = relative(cwd, target);
      if (seen.has(target)) continue;
      seen.add(target);
      if (existsSync(target) && !flags.has('--overwrite')) {
        skipped.push(rel);
        continue;
      }
      if (!flags.has('--dry-run')) {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, file.content);
      }
      written.push(rel);
    }
  }
  const install = installCommand(deps, false);
  const installDev = installCommand(devDeps, true);
  const result = {
    ok: true,
    items: items.map((i) => i.name),
    written,
    skipped,
    install,
    installDev,
    dryRun: flags.has('--dry-run'),
  };
  const lines = [
    `${c.green('✓')} ${flags.has('--dry-run') ? 'Would add' : 'Added'} ${items.map((i) => c.bold(i.name)).join(', ')}`,
    ...written.map((f) => `  ${c.dim('+')} ${f}`),
    ...skipped.map((f) => `  ${c.yellow('=')} ${f} ${c.dim('(exists; --overwrite to replace)')}`),
  ];
  if (install || installDev)
    lines.push(
      '',
      'Install dependencies:',
      ...[install, installDev].filter(Boolean).map((cmd) => `  ${cmd}`),
    );
  return { items, result, lines };
}

async function add(names) {
  if (!names.length) fail('Name at least one item: dtheo add button select');
  const { result, lines } = await copyItems(names);
  out(result, lines.join('\n'));
}

// The global stylesheet is the CSS file that imports Tailwind; these are where Next.js, Vite and others put it.
const globalCssFiles = [
  'app/globals.css',
  'src/app/globals.css',
  'src/index.css',
  'src/styles/globals.css',
  'styles/globals.css',
  'src/globals.css',
  'src/styles.css',
  'src/app.css',
  'app/app.css',
];
const tailwindImport = /^@import\s+["']tailwindcss["'][^\n]*$/m;

/**
 * Top-level rules that beat dtheo/ui's theme: unlayered rules win over its base layer, and a later @theme
 * replaces its fonts and colors. The create-next-app starter ships all of them (white :root colors, a Geist
 * @theme, an Arial body).
 */
function overridingRules(css) {
  return topLevelRules(css).filter(
    ({ selector, body }) =>
      (/^(:root|html|@media\b)/.test(selector) && /--(background|foreground)\s*:/.test(body)) ||
      (/^@theme\b/.test(selector) && /--(font|color)-[\w-]+\s*:/.test(body)) ||
      (/^body\b/.test(selector) && /^\s*(background|color|font-family)\s*:/m.test(body)),
  );
}

/**
 * Each top-level block with its exact extent, found by matching braces, so a one-line rule or a nested
 * block cannot make a deletion run into the next rule. Skips comments and strings.
 */
function topLevelRules(css) {
  const rules = [];
  let depth = 0;
  let from = 0;
  let open = -1;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      i = css.indexOf('*/', i + 2);
      if (i < 0) break;
      i++;
    } else if (ch === '"' || ch === "'") {
      i = css.indexOf(ch, i + 1);
      if (i < 0) break;
    } else if (ch === ';' && depth === 0) from = i + 1;
    else if (ch === '{' && depth++ === 0) open = i;
    else if (ch === '}' && depth > 0 && --depth === 0) {
      const lead = css.slice(from, open).match(/^(?:\s|\/\*[\s\S]*?\*\/)*/)[0].length;
      const start = from + lead;
      rules.push({
        selector: css.slice(start, open).trim().replace(/\s+/g, ' '),
        body: css.slice(open + 1, i),
        line: css.slice(0, start).split('\n').length,
        start,
        end: i + 1,
      });
      from = i + 1;
    }
  }
  return rules;
}

/** The CSS without the given rules and the blank lines they leave behind. */
function withoutRules(css, rules) {
  let next = css;
  for (const r of rules.toReversed()) next = next.slice(0, r.start) + next.slice(r.end);
  return `${next.replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

/** The global CSS file with the stylesheet imported once, right after Tailwind, relative to that file. */
function planStyles(stylesheet) {
  const file = globalCssFiles
    .map((p) => join(cwd, p))
    .find((p) => existsSync(p) && tailwindImport.test(readFileSync(p, 'utf8')));
  if (!file) return { file: null, specifier: null, imported: false, overrides: [] };
  const css = readFileSync(file, 'utf8');
  let specifier = relative(dirname(file), stylesheet).split(sep).join('/');
  if (!specifier.startsWith('.')) specifier = `./${specifier}`;
  const imported = !/@import\s+["'][^"']*dtheo\.css["']/.test(css);
  const next = imported ? css.replace(tailwindImport, (line) => `${line}\n@import "${specifier}";`) : css;
  // Line numbers refer to the file with the import added.
  return {
    path: file,
    before: css,
    next,
    file: relative(cwd, file),
    specifier,
    imported,
    overrides: overridingRules(next),
  };
}

/**
 * Ask a yes/no question when a person runs init in a terminal. Scripts and agents get no prompt: they pass
 * --remove-overrides, or read the list and decide.
 */
async function confirm(lines, question) {
  if (json || flags.has('--dry-run') || !process.stdin.isTTY || !process.stdout.isTTY) return false;
  console.log(lines.splice(0).join('\n'));
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^(y|yes)?$/i.test(answer.trim());
}

async function init() {
  const { items, result, lines } = await copyItems(['styles', 'utils', 'theme']);
  const sheet = items.find((i) => i.name === 'styles')?.files[0];
  const plan = planStyles(sheet ? targetFor(sheet) : join(cwd, 'styles/dtheo.css'));
  const { path, before, next, ...css } = plan;
  const dry = flags.has('--dry-run');
  if (!css.file)
    lines.push(
      '',
      'Import the stylesheet once in the CSS file that imports Tailwind, with a path relative to that file:',
      '  @import "tailwindcss";',
      '  @import "../styles/dtheo.css";',
    );
  else if (css.imported)
    lines.push(
      '',
      `${c.green('✓')} ${dry ? 'Would import' : 'Imported'} ${css.specifier} in ${c.bold(css.file)}`,
    );
  else lines.push('', `${c.dim('=')} ${css.file} already imports dtheo.css`);
  let after = next;
  css.removed = false;
  if (css.overrides.length) {
    const width = String(Math.max(...css.overrides.map((o) => o.line))).length;
    lines.push(
      '',
      `${c.yellow('!')} ${css.file} has rules that override the dtheo/ui theme. The Next.js starter adds them:`,
      ...css.overrides.map((o) => `    ${c.dim(`line ${String(o.line).padStart(width)}`)}  ${o.selector}`),
    );
    css.removed = flags.has('--remove-overrides') || (await confirm(lines, '  Delete them? (Y/n) '));
    if (css.removed) {
      after = withoutRules(next, css.overrides);
      lines.push(`${c.green('✓')} ${dry ? 'Would delete' : 'Deleted'} them from ${c.bold(css.file)}`);
    } else
      lines.push(
        `  Delete them and keep the two @import lines, or run ${c.bold('dtheo init --remove-overrides')}.`,
      );
  }
  if (path && after !== before && !dry) writeFileSync(path, after);
  css.overrides = css.overrides.map(({ selector, line }) => ({ selector, line }));
  out({ ...result, css }, lines.join('\n'));
}

/**
 * Every word of the query must match an item's name, title, category (Charts, Inputs, Overlays…) or kind (ui,
 * component, lib, file). Descriptions are searched only when nothing matches by name, so `list chart` lists the
 * charts and not every item that mentions one.
 */
function matchItems(items, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  const matches = (text) => words.every((w) => text.toLowerCase().includes(w));
  const byName = items.filter((i) =>
    matches(
      `${i.name} ${i.title ?? ''} ${i.meta?.category ?? ''} ${String(i.type ?? '').replace(/^registry:/, '')}`,
    ),
  );
  return byName.length
    ? byName
    : items.filter((i) => matches(`${i.name} ${i.title ?? ''} ${i.description ?? ''}`));
}

async function list(query) {
  const index = await fetchJson('r/registry.json');
  const all = index.items ?? [];
  const items = matchItems(all, query);
  if (!items.length) {
    // Like grep: nothing found is a failed lookup for a script, so exit 1. JSON stays an array.
    process.exitCode = 1;
    if (json) console.log('[]');
    else console.error(`No items match "${query}". Run \`dtheo list\` to see all ${all.length}.`);
    return;
  }
  out(
    items.map(({ name, title, description, type, meta }) => ({
      name,
      title,
      description,
      type,
      ...(meta?.category ? { category: meta.category } : {}),
    })),
    items.map((i) => `${c.bold(i.name.padEnd(16))} ${c.dim(i.description ?? '')}`).join('\n'),
  );
}

// ---------- check (offline) ----------
const exts = /\.(tsx|jsx|ts|js|mdx|css)$/;
// Dependencies, build output and test reports: generated files, not UI code someone wrote.
const skipped = new Set([
  'node_modules',
  '.next',
  'dist',
  '.git',
  'build',
  'out',
  'coverage',
  '.vercel',
  '.turbo',
  'playwright-report',
  'test-results',
  'storybook-static',
]);
const skipDir = (path) => skipped.has(basename(String(path)));

function collect(paths) {
  const files = [];
  const walk = (p) => {
    if (!existsSync(p)) return;
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const name of readdirSync(p)) if (!skipped.has(name)) walk(join(p, name));
    } else if (exts.test(p)) files.push(p);
  };
  for (const p of paths) {
    if (/[*?[{]/.test(p)) {
      // Node's own glob, so `**`, `{a,b}` and character classes behave like the shell.
      for (const match of globSync(p, { cwd, exclude: skipDir })) {
        const abs = resolve(cwd, match);
        if (exts.test(abs) && statSync(abs).isFile()) files.push(abs);
      }
    } else walk(resolve(cwd, p));
  }
  return [...new Set(files)];
}

function check(paths) {
  const files = collect(paths.length ? paths : ['.']);
  // Checking nothing must not look like passing.
  if (!files.length) fail(`No .ts, .tsx, .js, .jsx or .css files matched ${paths.join(' ') || '.'}.`);
  const results = files.flatMap((file) =>
    checkSource(readFileSync(file, 'utf8'), { file }).map((f) => ({ file: relative(cwd, file), ...f })),
  );
  const errors = results.filter((r) => r.severity === 'error').length;
  const warnings = results.length - errors;
  if (json)
    console.log(
      JSON.stringify({ ok: errors === 0, files: files.length, errors, warnings, findings: results }, null, 2),
    );
  else {
    for (const r of results) {
      console.log(
        `${c.dim(`${r.file}:${r.line}:${r.column}`)} ${r.severity === 'error' ? c.red('error') : c.yellow('warn ')} ${c.bold(r.rule)} ${r.message}\n  ${c.dim('→')} ${r.fix}`,
      );
    }
    console.log(
      `\n${plural(files.length, 'file')} checked: ${errors ? c.red(plural(errors, 'error')) : c.green('0 errors')}, ${plural(warnings, 'warning')}.`,
    );
  }
  process.exitCode = errors ? 1 : 0;
}

const indentJson = (value) => JSON.stringify(value, null, 2).replace(/^/gm, '  ');

const mcpTools = [
  'list_components',
  'get_component',
  'get_component_source',
  'search_docs',
  'get_tokens',
  'get_guidelines',
  'check_ui_code',
];

function mcp() {
  const url = `${registry}/mcp`;
  const claudeCode = `claude mcp add --transport http dtheo ${url}`;
  // VS Code reads `servers`, with the transport type; Cursor, Windsurf and most other clients read `mcpServers`.
  const vscode = { servers: { dtheo: { type: 'http', url } } };
  const vscodeCommand = `code --add-mcp '${JSON.stringify({ name: 'dtheo', type: 'http', url })}'`;
  const mcpServers = { mcpServers: { dtheo: { url } } };
  out(
    {
      url,
      claudeCode,
      vscode: { file: '.vscode/mcp.json', command: vscodeCommand, json: vscode },
      cursor: { file: '.cursor/mcp.json', json: mcpServers },
      windsurf: { file: '~/.codeium/windsurf/mcp_config.json', json: mcpServers },
      // The mcpServers shape most other clients read.
      json: mcpServers,
      tools: mcpTools,
    },
    [
      `${c.bold('dtheo/ui MCP server')} ${c.dim(url)}`,
      '',
      'Claude Code:',
      `  ${claudeCode}`,
      '',
      'VS Code (.vscode/mcp.json):',
      indentJson(vscode),
      `  or run: ${vscodeCommand}`,
      '',
      'Cursor (.cursor/mcp.json), Windsurf (~/.codeium/windsurf/mcp_config.json) and most other clients:',
      indentJson(mcpServers),
      '',
      `Tools: ${mcpTools.join(', ')}`,
    ].join('\n'),
  );
}

const help = `${c.bold('dtheo')} ${c.dim('· add components and check UI code against the dtheo/ui design system')}

  dtheo init                  add utils, theme scope and styles
  dtheo add <item...>         copy components and their dependencies into your project
  dtheo list [query]          list registry items
  dtheo check [paths...]      check UI code offline (${ruleList.length} rules); exits 1 on errors
  dtheo rules                 explain every check rule
  dtheo mcp                   print MCP config for Claude Code, VS Code, Cursor and others

Options: --registry <url>  --cwd <dir>  --overwrite  --dry-run  --json  --help (-h)  --version (-v)
         --remove-overrides   init: delete global CSS rules that override the theme, without asking
Docs: ${registry}/docs/cli`;

const version = () => JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const unknownShort = [...shortFlags].find((f) => f !== '-v' && f !== '-h');
// --version and --help win over a command, so `dtheo add --help` prints help instead of adding nothing.
const action =
  flags.has('--version') || shortFlags.has('-v')
    ? '--version'
    : flags.has('--help') || shortFlags.has('-h')
      ? 'help'
      : command;

try {
  if (unknownShort) fail(`Unknown option "${unknownShort}". Run \`dtheo help\`.`);
  switch (action) {
    case '--version':
      out({ version: version() }, version());
      break;
    case 'init':
      await init();
      break;
    case 'add':
      await add(rest);
      break;
    case 'list':
      await list(rest.join(' '));
      break;
    case 'check':
      check(rest);
      break;
    case 'rules':
      out(
        ruleList,
        ruleList
          .map(
            (r) =>
              `${c.bold(r.id.padEnd(22))} ${r.severity === 'error' ? c.red('error') : c.yellow('warn ')} ${r.message}\n${' '.repeat(23)}${c.dim(r.fix)}`,
          )
          .join('\n'),
      );
      break;
    case 'mcp':
      mcp();
      break;
    case undefined:
    case 'help':
      console.log(help);
      break;
    default:
      fail(`Unknown command "${command}". Run \`dtheo help\`.`);
  }
} catch (error) {
  if (!(error instanceof CliExit)) throw error;
}
