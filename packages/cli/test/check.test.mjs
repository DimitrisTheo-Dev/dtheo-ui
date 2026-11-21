import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { checkSource, ruleList } from '../src/check.mjs';

const bin = fileURLToPath(new URL('../src/bin.mjs', import.meta.url));
const count = (src, rule, file = 'x.tsx') => checkSource(src, { file }).filter((f) => f.rule === rule).length;
const runCli = promisify(execFile);
const clash = (cls) => count(`<span className="${cls}" />`, 'status-text-on-fill');

/** A registry on localhost, so `init` and `add` run without the network. */
const registryFile = (target) => ({ path: `registry/dtheo/${target}`, target, content: '' });
const registryItems = {
  styles: { name: 'styles', files: [registryFile('styles/dtheo.css')] },
  utils: { name: 'utils', dependencies: ['clsx', 'tailwind-merge'], files: [registryFile('lib/utils.ts')] },
  theme: { name: 'theme', files: [registryFile('lib/theme.tsx')] },
  'line-chart': {
    name: 'line-chart',
    dependencies: ['d3-scale'],
    devDependencies: ['@types/d3-scale'],
    // Like the real registry: dependencies are absolute URLs, fetched from the registry the CLI was given.
    registryDependencies: ['https://ui.dtheo.dev/r/styles.json'],
    files: [registryFile('components/charts/line-chart.tsx')],
  },
};
async function withRegistry(fn) {
  const server = createServer((req, res) => {
    const item = registryItems[req.url.match(/^\/r\/([\w-]+)\.json$/)?.[1]];
    res.writeHead(item ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(item ?? {}));
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

// app/globals.css as create-next-app writes it.
const nextStarterCss = `@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
`;

// One sample per rule that must be caught, and one look-alike that must not be.
const cases = {
  'raw-color': ['<div style={{ color: "#ff0000" }} />', '<div className="text-primary" />'],
  'palette-color': ['<div className="bg-blue-500" />', '<div className="bg-primary" />'],
  'raw-white-black': [
    '<div className="bg-white p-4" />',
    '<div className="bg-card p-4"><span className="bg-destructive text-white" /></div>',
  ],
  'status-text-on-fill': [
    '<span className="bg-destructive text-destructive-foreground" />',
    '<span className="bg-destructive/15 text-destructive-foreground" />',
  ],
  'radius-token': ['<div className="rounded-lg" />', '<div className="rounded-card rounded-full" />'],
  'arbitrary-radius': [
    '<div className="rounded-[5px]" />',
    '<div className="rounded-[calc(var(--radius-control)-2px)]" />',
  ],
  'arbitrary-text-size': ['<p className="text-[13px]" />', '<p className="text-body" />'],
  'arbitrary-spacing': ['<div className="p-[13px]" />', '<div className="p-3" />'],
  'transition-all': [
    '<div className="transition-all duration-150" />',
    '<p>raw colors, transition-all, unlabeled</p>',
  ],
  'scale-zero': [
    '<div className="data-starting-style:scale-0" />',
    '<div className="data-starting-style:scale-96" />',
  ],
  'ease-in': ['<div className="ease-in duration-150" />', '<div className="ease-out duration-150" />'],
  'icon-button-label': [
    '<Button size="icon"><TrashIcon /></Button>',
    '<Button size="icon" aria-label="Delete run"><TrashIcon /></Button>',
  ],
  'img-alt': ['<img src="/a.png" />', '<img src="/a.png" alt="Bench 3" />'],
  'clickable-div': ['<div onClick={open}>Open</div>', '<button onClick={open}>Open</button>'],
  'outline-none': [
    '<input className="outline-none" />',
    '<input className="outline-none focus-visible:ring-3" />',
  ],
  'raw-html': ['<div dangerouslySetInnerHTML={{ __html: html }} />', '<div>{text}</div>'],
  'z-index': ['<div className="z-[9999]" />', '<div className="z-50" />'],
  'placeholder-as-label': [
    '<Field><Input placeholder="Tag" /></Field>',
    '<Field><FieldLabel>Tag</FieldLabel><Input placeholder="e.g. retune-kp" /></Field>',
  ],
};

describe('design check rules', () => {
  it('covers every rule with a test case', () => {
    expect(Object.keys(cases).sort()).toEqual(ruleList.map((r) => r.id).sort());
  });

  for (const [rule, [bad, good]] of Object.entries(cases)) {
    it(`${rule}: catches the mistake and passes the fix`, () => {
      expect(count(bad, rule)).toBeGreaterThan(0);
      expect(count(good, rule)).toBe(0);
    });
  }

  it('gives every finding a message, a fix and a position', () => {
    for (const f of checkSource('<div className="bg-red-500 transition-all" onClick={go} />')) {
      expect(f.message.length).toBeGreaterThan(10);
      expect(f.fix.length).toBeGreaterThan(10);
      expect(f.line).toBe(1);
      expect(f.column).toBeGreaterThan(0);
    }
  });

  it('honors line and file directives', () => {
    expect(count('const a = "#fff"; // dtheo-check-ignore', 'raw-color')).toBe(0);
    expect(count('// dtheo-check-ignore-next-line\nconst a = "#fff";', 'raw-color')).toBe(0);
    expect(count('// dtheo-check-disable-file raw-color -- tokens\nconst a = "#fff";', 'raw-color')).toBe(0);
    // A file directive for one rule leaves the others on.
    expect(
      count('// dtheo-check-disable-file raw-color\n<div className="transition-all" />', 'transition-all'),
    ).toBe(1);
  });

  it('catches an icon-only raw <button>, even with an arrow function in its props', () => {
    const bad =
      '<button onClick={() => (a > b ? open() : close())}>\n  <TrashIcon className="size-4" />\n</button>';
    expect(count(bad, 'icon-button-label')).toBe(1);
    expect(count('<button aria-label="Delete run"><TrashIcon /></button>', 'icon-button-label')).toBe(0);
    expect(count('<button><TrashIcon /> Delete</button>', 'icon-button-label')).toBe(0);
    expect(
      count('<button><TrashIcon /><span className="sr-only">Delete</span></button>', 'icon-button-label'),
    ).toBe(0);
  });

  // Real code puts handlers before labels, spreads props and imports icons without an Icon suffix. Each of these
  // once ended a tag at the ">" of "=>", or missed a name the button really has.
  describe('reads whole JSX tags', () => {
    it('finds the label after an arrow-function prop', () => {
      const src =
        '<Button size="icon" onClick={() => remove(run)} aria-label="Delete run"><TrashIcon /></Button>';
      expect(count(src, 'icon-button-label')).toBe(0);
      expect(
        count('<Button size="icon" onClick={() => remove(run)}><TrashIcon /></Button>', 'icon-button-label'),
      ).toBe(1);
    });

    it('takes the name of the element a button renders as', () => {
      const src = '<Button size="icon" render={<a href="/repo" aria-label="Repository" />} />';
      expect(count(src, 'icon-button-label')).toBe(0);
      expect(count('<Button size="icon" render={<a href="/repo" />} />', 'icon-button-label')).toBe(1);
    });

    it('trusts spread props and text children, and sees through wrappers', () => {
      expect(count('<Button size="icon" {...props}><TrashIcon /></Button>', 'icon-button-label')).toBe(0);
      expect(count('<Button size="icon-sm">{label}</Button>', 'icon-button-label')).toBe(0);
      expect(
        count('<Button size="icon"><span aria-hidden><TrashIcon /></span></Button>', 'icon-button-label'),
      ).toBe(1);
      expect(count('<Button size={"icon"}><TrashIcon /></Button>', 'icon-button-label')).toBe(1);
      // Not an icon size: the text is the name.
      expect(count('<Button size="sm"><TrashIcon /></Button>', 'icon-button-label')).toBe(0);
    });

    it('knows icons imported without an Icon suffix', () => {
      const lucide = "import { Trash2, Pencil as Edit } from 'lucide-react';\n";
      expect(count(`${lucide}<button onClick={go}><Trash2 /></button>`, 'icon-button-label')).toBe(1);
      expect(count(`${lucide}<button onClick={go}><Edit size={14} /></button>`, 'icon-button-label')).toBe(1);
      const ns = "import * as Icons from 'lucide-react';\n<button><Icons.Trash2 /></button>";
      expect(count(ns, 'icon-button-label')).toBe(1);
      // A component that is not an icon may render text, so it is not assumed to be one.
      expect(count('<button><RunName id={id} /></button>', 'icon-button-label')).toBe(0);
    });

    it('finds a click handler after an arrow-function prop, but not one inside a child prop', () => {
      expect(count('<div onKeyDown={() => go()} onClick={open}>Open</div>', 'clickable-div')).toBe(1);
      expect(count('<div title={x > 1 ? "a" : "b"}\n  onClick={open}>Open</div>', 'clickable-div')).toBe(1);
      expect(count('<div render={<Button onClick={open} />}>Open</div>', 'clickable-div')).toBe(0);
    });

    it('needs an alt on the image itself', () => {
      expect(count('<img src={src} onLoad={() => a > b} />', 'img-alt')).toBe(1);
      expect(count('<img src={src} onLoad={() => a > b} alt="Bench 3" />', 'img-alt')).toBe(0);
      expect(count('<img {...imageProps} />', 'img-alt')).toBe(0);
    });

    it('only lets an id stand in for a label when a label points at it', () => {
      expect(count('<Input id="q" placeholder="Search runs" />', 'placeholder-as-label')).toBe(1);
      expect(
        count(
          '<label htmlFor="q">Search</label>\n<Input id="q" placeholder="Search runs" />',
          'placeholder-as-label',
        ),
      ).toBe(0);
      expect(count('<Input id={id} placeholder="Search runs" />', 'placeholder-as-label')).toBe(0);
      expect(count('<label>Search <input placeholder="Search runs" /></label>', 'placeholder-as-label')).toBe(
        0,
      );
      expect(
        count('<Input onChange={(e) => set(e.target.value)} placeholder="Tag" />', 'placeholder-as-label'),
      ).toBe(1);
    });
  });

  describe('status text on a status fill', () => {
    it('catches the shadcn on-fill pair, in any state', () => {
      expect(clash('bg-success text-success-foreground')).toBe(1);
      expect(clash('hover:bg-destructive hover:text-destructive-foreground')).toBe(1);
      // The fill shows on hover and nothing changes the red text then.
      expect(clash('text-destructive-foreground hover:bg-destructive')).toBe(1);
      expect(clash('bg-warning/90 text-warning-foreground')).toBe(1);
    });

    it('passes tints, other text and a state that swaps the text', () => {
      expect(clash('bg-warning/15 text-warning-foreground')).toBe(0);
      expect(clash('bg-destructive text-white')).toBe(0);
      expect(
        clash('text-destructive-foreground data-highlighted:bg-destructive data-highlighted:text-white'),
      ).toBe(0);
      expect(clash('bg-destructive-foreground')).toBe(0);
      expect(clash('bg-destructive text-body text-white')).toBe(0);
    });
  });

  it('lets token files define colors', () => {
    expect(count('--primary: oklch(0.55 0.2 257);', 'raw-color', 'tokens.css')).toBe(0);
  });
});

describe('dtheo CLI', () => {
  it('writes complete JSON on a pipe, even past 64 KB', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dtheo-check-'));
    // ~1,500 findings: far more output than one pipe buffer holds.
    writeFileSync(
      join(dir, 'big.tsx'),
      Array.from({ length: 1500 }, () => 'const c = "#123456";').join('\n'),
    );
    const run = spawnSync(process.execPath, [bin, 'check', dir, '--json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    expect(run.status).toBe(1);
    const report = JSON.parse(run.stdout);
    expect(report.errors).toBe(1500);
    expect(report.findings).toHaveLength(1500);
  });

  it('exits 0 for clean code', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dtheo-check-'));
    writeFileSync(join(dir, 'ok.tsx'), '<div className="bg-card text-foreground" />\n');
    expect(() => execFileSync(process.execPath, [bin, 'check', dir])).not.toThrow();
  });

  it('expands globs and refuses to pass when nothing matched', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dtheo-check-'));
    writeFileSync(join(dir, 'a.tsx'), 'const c = "#123456";\n');
    const hit = spawnSync(process.execPath, [bin, 'check', '**/*.tsx', '--json'], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(JSON.parse(hit.stdout).files).toBe(1);
    const miss = spawnSync(process.execPath, [bin, 'check', 'nothing/**/*.tsx', '--json'], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(miss.status).toBe(1);
    expect(JSON.parse(miss.stdout).error).toMatch(/No .* files matched/);
  });

  it('lists the rules as JSON', () => {
    const rules = JSON.parse(execFileSync(process.execPath, [bin, 'rules', '--json'], { encoding: 'utf8' }));
    expect(rules).toHaveLength(ruleList.length);
  });

  it('fails clearly on an unknown command', () => {
    const run = spawnSync(process.execPath, [bin, 'nope'], { encoding: 'utf8' });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Unknown command');
  });

  it('imports the stylesheet right after Tailwind and flags the starter rules that override it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dtheo-init-'));
    mkdirSync(join(dir, 'app'));
    writeFileSync(join(dir, 'app/globals.css'), nextStarterCss);
    const init = () =>
      withRegistry((url) =>
        runCli(process.execPath, [bin, 'init', '--json', '--registry', url, '--cwd', dir]),
      );

    const report = JSON.parse((await init()).stdout);
    expect(report.css).toMatchObject({
      file: 'app/globals.css',
      specifier: '../styles/dtheo.css',
      imported: true,
    });
    expect(report.css.overrides.map((o) => o.selector)).toEqual([
      ':root',
      '@theme inline',
      '@media (prefers-color-scheme: dark)',
      'body',
    ]);
    // Line numbers point at the file as it reads after the import was added.
    expect(report.css.overrides[0].line).toBe(4);
    const css = () => readFileSync(join(dir, 'app/globals.css'), 'utf8');
    expect(css().startsWith('@import "tailwindcss";\n@import "../styles/dtheo.css";\n')).toBe(true);

    expect(JSON.parse((await init()).stdout).css.imported).toBe(false);
    expect(css().match(/dtheo\.css/g)).toHaveLength(1);
  });

  it('prints the type packages a TypeScript build needs', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dtheo-add-'));
    const { stdout } = await withRegistry((url) =>
      runCli(process.execPath, [bin, 'add', 'line-chart', '--json', '--registry', url, '--cwd', dir]),
    );
    const report = JSON.parse(stdout);
    expect(report.install).toBe('npm install d3-scale');
    expect(report.installDev).toBe('npm install -D @types/d3-scale');
  });

  it('brings the stylesheet with a component, and keeps the one already there', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dtheo-add-'));
    const add = () =>
      withRegistry((url) =>
        runCli(process.execPath, [bin, 'add', 'line-chart', '--json', '--registry', url, '--cwd', dir]),
      );
    expect(JSON.parse((await add()).stdout)).toMatchObject({
      items: ['line-chart', 'styles'],
      written: ['components/charts/line-chart.tsx', 'styles/dtheo.css'],
      skipped: [],
    });

    writeFileSync(join(dir, 'styles/dtheo.css'), '/* the copy init wrote, or one you edited */');
    expect(JSON.parse((await add()).stdout)).toMatchObject({
      written: [],
      skipped: ['components/charts/line-chart.tsx', 'styles/dtheo.css'],
    });
    expect(readFileSync(join(dir, 'styles/dtheo.css'), 'utf8')).toBe(
      '/* the copy init wrote, or one you edited */',
    );
  });

  it('refuses plain-HTTP registries that are not local', () => {
    const run = spawnSync(process.execPath, [bin, 'add', 'button', '--json'], {
      encoding: 'utf8',
      env: { ...process.env, DTHEO_REGISTRY: 'http://example.com' },
    });
    expect(run.status).toBe(1);
    expect(JSON.parse(run.stdout).error).toMatch(/Refusing to fetch over http/);
  });
});
