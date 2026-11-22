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
  registry: {
    items: [
      { name: 'lab-data', type: 'registry:lib', title: 'Lab data', description: 'Synthetic data for the chart examples.' },
      { name: 'button', type: 'registry:ui', title: 'Button', description: 'Actions.', meta: { category: 'Actions' } },
      {
        name: 'line-chart',
        type: 'registry:component',
        title: 'Line chart',
        description: 'Series against time with limits.',
        meta: { category: 'Charts' },
      },
      {
        name: 'heatmap',
        type: 'registry:component',
        title: 'Heatmap',
        description: 'A value per cell of a grid.',
        meta: { category: 'Charts' },
      },
    ],
  },
  // Both ship input.tsx, like the real field and select.
  field: { name: 'field', files: [registryFile('components/ui/field.tsx'), registryFile('components/ui/input.tsx')] },
  select: {
    name: 'select',
    files: [registryFile('components/ui/select.tsx'), registryFile('components/ui/input.tsx')],
  },
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
/** `dtheo list` against the local registry, with its exit status. */
const list = (...args) =>
  withRegistry((url) =>
    runCli(process.execPath, [bin, 'list', ...args, '--registry', url]).then(
      (r) => ({ status: 0, ...r }),
      (e) => ({ status: e.code, stdout: e.stdout, stderr: e.stderr }),
    ),
  );

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
  'raw-color': ['<div style={{ color: "#ff0000" }} />', '<div className="text-destructive-foreground" />'],
  'palette-color': ['<div className="bg-blue-500" />', '<div className="bg-primary" />'],
  'raw-white-black': [
    '<div className="bg-white p-4" />',
    '<div className="bg-card p-4"><span className="bg-destructive text-white" /></div>',
  ],
  'primary-text': [
    '<a className="text-primary" href="/runs">Runs</a>',
    '<a className="text-link" href="/runs"><SparklesIcon className="text-primary" aria-hidden="true" /> Runs</a>',
  ],
  'text-size-token': ['<p className="text-sm" />', '<p className="text-body" />'],
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
  'motion-duration': [
    '<div className="transition-opacity duration-700" />',
    '<div className="transition-opacity duration-150" />',
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
  'ignore-reason': [
    '// dtheo-check-ignore-next-line\nconst c = "#fff";',
    '// dtheo-check-ignore-next-line (the knob is white in both modes)\nconst c = "#fff";',
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
    expect(count('const a = "#fff"; // dtheo-check-ignore: the brand mark', 'raw-color')).toBe(0);
    expect(count('// dtheo-check-ignore-next-line (the brand mark)\nconst a = "#fff";', 'raw-color')).toBe(0);
    expect(count('// dtheo-check-disable-file raw-color -- tokens\nconst a = "#fff";', 'raw-color')).toBe(0);
    // A file directive for one rule leaves the others on.
    expect(
      count('// dtheo-check-disable-file raw-color -- tokens\n<div className="transition-all" />', 'transition-all'),
    ).toBe(1);
  });

  it('requires a reason on every directive, and cannot be switched off', () => {
    const bare = [
      'const a = "#fff"; // dtheo-check-ignore',
      '{/* dtheo-check-ignore-next-line */}\n<div className="bg-white" />',
      '// dtheo-check-disable-file raw-color\nconst a = "#fff";',
      // Disabling every rule does not disable this one.
      '// dtheo-check-disable-file\nconst a = "#fff";',
    ];
    for (const src of bare) expect(count(src, 'ignore-reason'), src).toBe(1);
    // A bare directive still suppresses what it names; the finding is the missing reason, and it is an error.
    const findings = checkSource('// dtheo-check-ignore-next-line\nconst a = "#fff";', { file: 'x.tsx' });
    expect(findings.map((f) => [f.rule, f.severity, f.line])).toEqual([['ignore-reason', 'error', 1]]);
    const reasoned = [
      'const a = "#fff"; // dtheo-check-ignore: focus moves to the first control',
      '{/* dtheo-check-ignore-next-line (a phone corner, drawn to scale) */}',
      '/* Opaque card when transparency is reduced. dtheo-check-ignore-next-line */',
      '// dtheo-check-disable-file raw-color, ease-in -- documentation that quotes the rules',
    ];
    for (const src of reasoned) expect(count(src, 'ignore-reason'), src).toBe(0);
  });

  it('takes directives only from comments, and flags a file directive that names no real rule', () => {
    // A string that quotes a directive excuses nothing.
    expect(count('const tip = "dtheo-check-ignore: why"; const a = "#fff";', 'raw-color')).toBe(1);
    expect(count('const tip = "use dtheo-check-ignore-next-line";\nconst a = "#fff";', 'raw-color')).toBe(1);
    expect(count('const tip = "dtheo-check-ignore-next-line";', 'ignore-reason')).toBe(0);
    // A misspelled id switches nothing off, so it is an error, not a silent no-op.
    expect(count('// dtheo-check-disable-file raw-colour -- brand swatches\nconst a = "#fff";', 'ignore-reason')).toBe(1);
    expect(count('// dtheo-check-disable-file raw-colour -- brand swatches\nconst a = "#fff";', 'raw-color')).toBe(1);
    // Markdown's HTML comments still carry a directive.
    expect(count('<!-- dtheo-check-ignore-next-line (brand swatch) -->\n<div style={{ color: "#fff" }} />', 'raw-color', 'x.md')).toBe(0);
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

  it('catches the mistakes agents make most', () => {
    const planted = [
      ['<p className="text-sm">Small print</p>', 'text-size-token'],
      ['<h1 className="text-2xl">Run R-0412</h1>', 'text-size-token'],
      ['<a className="text-primary" href="/runs">All runs</a>', 'primary-text'],
      ['<div className="transition-opacity duration-700" />', 'motion-duration'],
      ['<button onClick={onDelete}><Trash2 /></button>', 'icon-button-label'],
      ['<Button variant="ghost" onClick={onDelete}><Trash2 /></Button>', 'icon-button-label'],
      ["<span style={{ color: 'red' }}>Failed</span>", 'raw-color'],
      ["<div style={{ transition: 'all 300ms' }} />", 'transition-all'],
      ["<div style={{ transition: 'all' }} />", 'transition-all'],
      ['<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} />', 'scale-zero'],
    ];
    for (const [src, rule] of planted) expect(count(src, rule), src).toBe(1);
  });

  it('leaves the look-alikes alone', () => {
    const fine = [
      ['<p className="text-body text-sm-foo" />', 'text-size-token'],
      ['<span className="bg-primary text-primary-foreground hover:text-primary-foreground/80" />', 'primary-text'],
      ['<div className="[&_svg]:text-primary" />', 'primary-text'],
      ['<FlaskConicalIcon className="size-4 text-primary" aria-hidden="true" />', 'primary-text'],
      ['<div className="duration-120 duration-240 duration-400 duration-0 duration-[180ms]" />', 'motion-duration'],
      ['<button aria-label="Delete run"><Trash2 /></button>', 'icon-button-label'],
      ['<Button variant="ghost"><Trash2 /> Delete</Button>', 'icon-button-label'],
      ['<button {...props}><XIcon /></button>', 'icon-button-label'],
      ['<SelectTrigger><SelectValue /></SelectTrigger>', 'icon-button-label'],
      ["const s = { color: red, fill: 'currentColor', background: 'transparent' };", 'raw-color'],
      ["<div style={{ transition: 'opacity 150ms ease-out' }} />", 'transition-all'],
      ["<motion.div initial={{ scale: 0.96 }} style={{ scaleX: 0 }} className=\"scale-x-0\" />", 'scale-zero'],
    ];
    for (const [src, rule] of fine) expect(count(src, rule), src).toBe(0);
  });

  it('flags slow transitions in classes, style objects and CSS', () => {
    expect(count('<div className="duration-300 duration-[600ms] duration-[1s]" />', 'motion-duration')).toBe(3);
    expect(count("<div style={{ transitionDuration: '700ms' }} />", 'motion-duration')).toBe(1);
    expect(count('.a { transition: transform 150ms, opacity 1s; }', 'motion-duration', 'a.css')).toBe(1);
    expect(count('.a { transition: opacity var(--duration-toast) ease; }', 'motion-duration', 'a.css')).toBe(0);
  });

  it('finds raw colors inside arbitrary values and named colors in styles', () => {
    expect(count('<div className="shadow-[0_0_0_1px_#f00]" />', 'raw-color')).toBe(1);
    expect(count('<div className="drop-shadow-[0_1px_1px_oklch(0_0_0/0.4)]" />', 'raw-color')).toBe(1);
    expect(count('<div className="bg-[red] shadow-[0_0_0_1px_red]" />', 'raw-color')).toBe(2);
    expect(count("const s = { border: '1px solid red', backgroundColor: 'white' };", 'raw-color')).toBe(2);
    expect(count('.a { color: red; }', 'raw-color', 'a.css')).toBe(1);
    // Masks use black and white as alpha, and variables are not literals.
    expect(
      count(
        '<div className="mask-[linear-gradient(to_bottom,black,transparent)] shadow-[0_0_0_1px_var(--ring)]" />',
        'raw-color',
      ),
    ).toBe(0);
  });

  it('judges outline-none per element, not per file', () => {
    expect(
      count('<input className="outline-none" />\n<button className="focus-visible:ring-3" />', 'outline-none'),
    ).toBe(1);
    const covered = [
      "const item = cva('outline-none', { variants: { v: { a: 'focus-visible:ring-3' } } });",
      "const field = cn('outline-none', 'focus-visible:border-ring');",
      '<div className="has-[input:focus-visible]:ring-3"><input className="outline-none" /></div>',
      '<input data-focus="field" className="outline-none" />',
      '<MenuPrimitive.Positioner className="z-50 outline-none" />',
    ];
    for (const src of covered) expect(count(src, 'outline-none'), src).toBe(0);
  });

  it('reads class lists, not prose or comments that mention a class', () => {
    const prose = `export function Rules() {
  return (
    <ul className="flex flex-col gap-2 text-body">
      <li>Never use transition-all: name the properties you animate.</li>
      <li>Corners like rounded-[6px] or rounded-lg drift from the tokens.</li>
      <li>A bg-blue-500 class does nothing here, and text-sm is not a role.</li>
      <li>Don't enter from scale-0 or with ease-in; outline-none hides focus.</li>
      <p title="Avoid transition-all">{'transition-all'}</p>
    </ul>
  );
}
// transition-all, rounded-lg and bg-blue-500 in a comment
/* text-sm */`;
    expect(checkSource(prose, { file: 'rules.tsx' })).toEqual([]);
    // The same classes in class-bearing places are still caught.
    const classes = [
      ['<div className={cn("p-2", open && "transition-all")} />', 'transition-all'],
      ["const button = cva('rounded-lg', { variants: { size: { sm: 'text-sm' } } });", 'radius-token'],
      ["const button = cva('rounded-lg', { variants: { size: { sm: 'text-sm' } } });", 'text-size-token'],
      ["<div className={`p-2 ${open ? 'bg-blue-500' : ''}`} />", 'palette-color'],
      ["const sizes = { sm: 'h-7 text-sm', lg: 'h-9 text-lg' };", 'text-size-token'],
      ['---\ntitle: x\n---\n\n<div className="rounded-lg" />\n\n```tsx\n<div className="rounded-lg" />\n```', 'radius-token'],
    ];
    for (const [src, rule] of classes)
      expect(count(src, rule, src.startsWith('---') ? 'page.mdx' : 'x.tsx'), src).toBeGreaterThan(0);
    expect(count(classes[3][0], 'palette-color')).toBe(1);
    expect(count(classes[4][0], 'text-size-token')).toBe(2);
    expect(count(classes[5][0], 'radius-token', 'page.mdx')).toBe(1);
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
      // Not an icon size, and it has text: the text is the name. With only an icon it has none, whatever its size.
      expect(count('<Button size="sm"><TrashIcon /> Delete</Button>', 'icon-button-label')).toBe(0);
      expect(count('<Button size="sm"><TrashIcon /></Button>', 'icon-button-label')).toBe(1);
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

  it('reads a # that starts a reference as text, and a color on a line with a link as a color', () => {
    const references = [
      "const title = 'Run #482';",
      '<Badge label="Issue #1024" />',
      "document.querySelector('#feed');",
      '<a href="#faced">Faced</a>',
      '<Link href="/docs#cafe">Docs</Link>',
      '<use href="/icons.svg#add" />',
      "const mask = 'url(#fade)';",
    ];
    for (const src of references) expect(count(src, 'raw-color'), src).toBe(0);
    const colors = [
      '<Link href="/runs" className="bg-[#0070f3]">Runs</Link>',
      "const border = '1px solid #e5e5e5';",
      'const a = "#fff";',
      "<div style={{ color: '#fff' }} />",
      '<div className="shadow-[0_0_0_1px_#f00]" />',
    ];
    for (const src of colors) expect(count(src, 'raw-color'), src).toBe(1);
  });

  it('lets token files define colors', () => {
    expect(count('--primary: oklch(0.55 0.2 257);', 'raw-color', 'tokens.css')).toBe(0);
  });

  it('reads an icon import that spans lines', () => {
    const src = `import {\n  Trash2,\n  type LucideIcon,\n} from 'lucide-react';\nexport const a = <button><Trash2 /></button>;`;
    expect(count(src, 'icon-button-label')).toBe(1);
  });

  // The MCP check_ui_code tool runs the check on up to 60,000 characters from anyone.
  it('stays fast and in one piece on input built to be slow or deeply nested', () => {
    const crafted = [
      `// import${'\n'.repeat(59_990)}`,
      'import x '.repeat(6_000),
      '`${'.repeat(20_000),
      '<div className={'.repeat(3_700),
    ];
    for (const src of crafted) {
      const start = performance.now();
      expect(() => checkSource(src, { file: 'x.tsx' })).not.toThrow();
      expect(performance.now() - start).toBeLessThan(1_000);
    }
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

  it('fails clearly on an unknown command or option', () => {
    const run = spawnSync(process.execPath, [bin, 'nope'], { encoding: 'utf8' });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Unknown command');
    const option = spawnSync(process.execPath, [bin, '-x'], { encoding: 'utf8' });
    expect(option.status).toBe(1);
    expect(option.stderr).toContain('Unknown option "-x"');
  });

  it('prints its version and its help', () => {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    for (const flag of ['--version', '-v']) {
      const run = spawnSync(process.execPath, [bin, flag], { encoding: 'utf8' });
      expect(run.status, flag).toBe(0);
      expect(run.stdout.trim(), flag).toBe(version);
    }
    for (const args of [['--help'], ['-h'], ['add', '--help']]) {
      const run = spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
      expect(run.status, args.join(' ')).toBe(0);
      expect(run.stdout, args.join(' ')).toContain('dtheo check [paths...]');
    }
  });

  it('counts files, errors and warnings in words', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dtheo-check-'));
    writeFileSync(join(dir, 'one.tsx'), '<div className="bg-white ease-in" />\n');
    const run = spawnSync(process.execPath, [bin, 'check', dir], { encoding: 'utf8' });
    expect(run.stdout).toContain('1 file checked: 1 error, 1 warning.');
  });

  it('lists by category and name, and says when nothing matches', async () => {
    const charts = await list('chart', '--json');
    expect(JSON.parse(charts.stdout).map((i) => i.name)).toEqual(['line-chart', 'heatmap']);
    // Descriptions are the fallback when no name, title or category matches.
    expect(JSON.parse((await list('synthetic', '--json')).stdout).map((i) => i.name)).toEqual(['lab-data']);
    const none = await list('zzz');
    expect(none.status).toBe(1);
    expect(none.stderr).toContain('No items match "zzz"');
    const noneJson = await list('zzz', '--json');
    expect(noneJson.status).toBe(1);
    expect(JSON.parse(noneJson.stdout)).toEqual([]);
  });

  it('reports a file two items share once', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dtheo-add-'));
    const add = (...flags) =>
      withRegistry((url) =>
        runCli(process.execPath, [bin, 'add', 'field', 'select', ...flags, '--registry', url, '--cwd', dir]),
      );
    expect(JSON.parse((await add('--json')).stdout).written).toEqual([
      'components/ui/field.tsx',
      'components/ui/input.tsx',
      'components/ui/select.tsx',
    ]);
    const again = (await add()).stdout;
    expect(again.match(/components\/ui\/input\.tsx/g)).toHaveLength(1);
  });

  it('prints the MCP config each client reads', () => {
    const config = JSON.parse(
      execFileSync(process.execPath, [bin, 'mcp', '--json', '--registry', 'https://ui.example.dev'], {
        encoding: 'utf8',
      }),
    );
    const url = 'https://ui.example.dev/mcp';
    // VS Code reads `servers` with a type, not `mcpServers`.
    expect(config.vscode.json).toEqual({ servers: { dtheo: { type: 'http', url } } });
    expect(config.cursor.json).toEqual({ mcpServers: { dtheo: { url } } });
    expect(config.json).toEqual({ mcpServers: { dtheo: { url } } });
    const text = execFileSync(process.execPath, [bin, 'mcp', '--registry', 'https://ui.example.dev'], {
      encoding: 'utf8',
    });
    expect(text).toContain('VS Code (.vscode/mcp.json):');
    expect(text).toMatch(/"servers"/);
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
