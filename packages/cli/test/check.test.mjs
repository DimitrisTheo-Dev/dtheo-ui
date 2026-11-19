import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkSource, ruleList } from '../src/check.mjs';

const bin = fileURLToPath(new URL('../src/bin.mjs', import.meta.url));
const count = (src, rule, file = 'x.tsx') => checkSource(src, { file }).filter((f) => f.rule === rule).length;

// One sample per rule that must be caught, and one look-alike that must not be.
const cases = {
  'raw-color': ['<div style={{ color: "#ff0000" }} />', '<div className="text-primary" />'],
  'palette-color': ['<div className="bg-blue-500" />', '<div className="bg-primary" />'],
  'raw-white-black': [
    '<div className="bg-white p-4" />',
    '<div className="bg-card p-4"><span className="bg-destructive text-white" /></div>',
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

  it('refuses plain-HTTP registries that are not local', () => {
    const run = spawnSync(process.execPath, [bin, 'add', 'button', '--json'], {
      encoding: 'utf8',
      env: { ...process.env, DTHEO_REGISTRY: 'http://example.com' },
    });
    expect(run.status).toBe(1);
    expect(JSON.parse(run.stdout).error).toMatch(/Refusing to fetch over http/);
  });
});
