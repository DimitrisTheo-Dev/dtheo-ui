#!/usr/bin/env node
/**
 * dtheo: add dtheo/ui components to a React project, and check UI code against the system.
 *
 *   dtheo init                     add utils, theme scope and the stylesheet
 *   dtheo add <item...>            copy components (and what they need) into your project
 *   dtheo list [query]             list registry items
 *   dtheo check [paths...]         check UI code for design-system mistakes (offline)
 *   dtheo mcp                      print MCP client config for your editor or agent
 *
 * Options: --registry <url> (default https://ui.dtheo.dev or $DTHEO_REGISTRY), --cwd <dir>,
 *          --overwrite, --dry-run, --json, --help
 */
import { existsSync, globSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { checkSource, ruleList } from './check.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split('=').slice(1).join('=') : undefined;
};
const positional = args.filter(
  (a, i) => !a.startsWith('--') && !['--registry', '--cwd'].includes(args[i - 1]),
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

async function add(names) {
  if (!names.length) fail('Name at least one item: dtheo add button select');
  const items = await resolveItems(names);
  const written = [];
  const skipped = [];
  const deps = new Set();
  for (const item of items) {
    for (const d of item.dependencies ?? []) deps.add(d);
    for (const file of item.files) {
      if (typeof file.content !== 'string') fail(`Item "${item.name}" has a file without content.`);
      const target = targetFor(file);
      const rel = relative(cwd, target);
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
  const pm = existsSync(join(cwd, 'pnpm-lock.yaml'))
    ? 'pnpm add'
    : existsSync(join(cwd, 'bun.lock')) || existsSync(join(cwd, 'bun.lockb'))
      ? 'bun add'
      : existsSync(join(cwd, 'yarn.lock'))
        ? 'yarn add'
        : 'npm install';
  const install = deps.size ? `${pm} ${[...deps].sort().join(' ')}` : null;
  out(
    { ok: true, items: items.map((i) => i.name), written, skipped, install, dryRun: flags.has('--dry-run') },
    [
      `${c.green('✓')} ${flags.has('--dry-run') ? 'Would add' : 'Added'} ${items.map((i) => c.bold(i.name)).join(', ')}`,
      ...written.map((f) => `  ${c.dim('+')} ${f}`),
      ...skipped.map((f) => `  ${c.yellow('=')} ${f} ${c.dim('(exists; --overwrite to replace)')}`),
      install ? `\nInstall dependencies:\n  ${install}` : '',
    ].join('\n'),
  );
}

async function list(query) {
  const index = await fetchJson('r/registry.json');
  const items = (index.items ?? []).filter(
    (i) => !query || `${i.name} ${i.title} ${i.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  out(
    items.map(({ name, title, description, type }) => ({ name, title, description, type })),
    items.map((i) => `${c.bold(i.name.padEnd(16))} ${c.dim(i.description ?? '')}`).join('\n'),
  );
}

// ---------- check (offline) ----------
const exts = /\.(tsx|jsx|ts|js|mdx|css)$/;
const skipDir = (path) => ['node_modules', '.next', 'dist', '.git', 'build'].includes(basename(String(path)));

function collect(paths) {
  const files = [];
  const walk = (p) => {
    if (!existsSync(p)) return;
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const name of readdirSync(p))
        if (!['node_modules', '.next', 'dist', '.git', 'build'].includes(name)) walk(join(p, name));
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
      `\n${files.length} files checked: ${errors ? c.red(`${errors} errors`) : c.green('0 errors')}, ${warnings} warnings.`,
    );
  }
  process.exitCode = errors ? 1 : 0;
}

function mcp() {
  const url = `${registry}/mcp`;
  out(
    {
      url,
      claudeCode: `claude mcp add --transport http dtheo ${url}`,
      json: { mcpServers: { dtheo: { url } } },
    },
    [
      `${c.bold('dtheo/ui MCP server')} ${c.dim(url)}`,
      '',
      'Claude Code:',
      `  claude mcp add --transport http dtheo ${url}`,
      '',
      'Cursor, VS Code, Windsurf (mcp.json):',
      JSON.stringify({ mcpServers: { dtheo: { url } } }, null, 2).replace(/^/gm, '  '),
      '',
      `Tools: list_components, get_component, get_component_source, search_docs, get_tokens, get_guidelines, check_ui_code`,
    ].join('\n'),
  );
}

const help = `${c.bold('dtheo')} ${c.dim('· add components and check UI code against the dtheo/ui design system')}

  dtheo init                  add utils, theme scope and styles
  dtheo add <item...>         copy components and their dependencies into your project
  dtheo list [query]          list registry items
  dtheo check [paths...]      check UI code offline (${ruleList.length} rules); exits 1 on errors
  dtheo rules                 explain every check rule
  dtheo mcp                   print MCP config for Claude Code, Cursor and others

Options: --registry <url>  --cwd <dir>  --overwrite  --dry-run  --json
Docs: ${registry}/docs/cli`;

try {
  switch (command) {
    case 'init':
      await add(['styles', 'utils', 'theme']);
      if (!json)
        console.log(
          `\nImport the styles once in your global CSS, after Tailwind:\n  @import "tailwindcss";\n  @import "./styles/dtheo.css";`,
        );
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
      if (flags.has('--help')) console.log(help);
      else fail(`Unknown command "${command}". Run \`dtheo help\`.`);
  }
} catch (error) {
  if (!(error instanceof CliExit)) throw error;
}
