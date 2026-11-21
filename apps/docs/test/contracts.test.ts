import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { categories, components } from '@dtheo/ui/meta';
import {
  exampleImports,
  installedPaths,
  installItems,
  registryAliases,
  registryClosure,
  registryItem,
  registryNames,
} from '@/lib/registry';
import { ardManifest } from '@/lib/ard';
import { brand, starIn, starPath, tilePath } from '@/lib/brand';
import { componentMarkdown, llmsTxt } from '@/lib/markdown';
import { pagesMarkdown } from '@/lib/pages-md';
import { installCommand, shadcnCommand, site } from '@/lib/site';
import { exampleSource } from '@/lib/source';
import { pageUsage, usedIn } from '@/lib/usage';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const examples = fileURLToPath(new URL('../examples/', import.meta.url));

/** The properties a type literal or interface body declares without `?`. */
const own = (members: ts.NodeArray<ts.TypeElement>) =>
  members.flatMap((m) =>
    ts.isPropertySignature(m) && !m.questionToken && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name))
      ? [m.name.text]
      : [],
  );

/**
 * The props each exported component (a capitalized function) requires, as its own source declares them: inline
 * object types, local interfaces and type aliases, intersections and `Omit<…>`. Props a Base UI or React type
 * requires are left out; the docs say those pass through.
 */
function requiredProps(file: string) {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const local = new Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>();
  for (const st of sf.statements)
    if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) local.set(st.name.text, st);
  const collect = (node: ts.TypeNode | undefined): string[] => {
    if (!node) return [];
    if (ts.isParenthesizedTypeNode(node)) return collect(node.type);
    if (ts.isTypeLiteralNode(node)) return own(node.members);
    if (ts.isIntersectionTypeNode(node)) return node.types.flatMap(collect);
    if (!ts.isTypeReferenceNode(node) || !ts.isIdentifier(node.typeName)) return [];
    const [first, keys] = node.typeArguments ?? [];
    if (node.typeName.text === 'Omit' && first && keys) {
      const dropped = (ts.isUnionTypeNode(keys) ? [...keys.types] : [keys]).flatMap((k) =>
        ts.isLiteralTypeNode(k) && ts.isStringLiteral(k.literal) ? [k.literal.text] : [],
      );
      return collect(first).filter((p) => !dropped.includes(p));
    }
    const decl = local.get(node.typeName.text);
    if (decl && ts.isTypeAliasDeclaration(decl)) return collect(decl.type);
    if (decl)
      return [
        ...own(decl.members),
        ...(decl.heritageClauses ?? []).flatMap((h) =>
          h.types.flatMap((t) =>
            ts.isIdentifier(t.expression) ? collect(ts.factory.createTypeReferenceNode(t.expression)) : [],
          ),
        ),
      ];
    return [];
  };
  const found = new Map<string, string[]>();
  for (const st of sf.statements)
    if (
      ts.isFunctionDeclaration(st) &&
      st.name &&
      /^[A-Z]/.test(st.name.text) &&
      st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    )
      found.set(st.name.text, collect(st.parameters[0]?.type));
  return found;
}

/** Bare module specifiers a file imports (`react`, `@base-ui/react/dialog`, `d3-scale`), as package names. */
const npmImports = (source: string) =>
  [...source.matchAll(/(?:from|import) '((?:@[\w-]+\/)?[\w-]+)(?:\/[^']*)?'/g)]
    .map((m) => m[1]!)
    .filter((name) => !name.startsWith('@/'));
/** Peers every consumer already has. */
const peers = new Set(['react', 'react-dom']);

describe('component contracts', () => {
  it('have unique slugs and known categories', () => {
    const slugs = components.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of components) expect(categories).toContain(c.category);
  });

  for (const c of components) {
    describe(c.slug, () => {
      it('points at files that exist and export what the contract says', () => {
        const source = c.files
          .map((f) => readFileSync(`${repo}packages/${c.package}/src/${f}`, 'utf8'))
          .join('\n');
        for (const name of c.exports) {
          expect(source, `${c.slug} exports ${name}`).toMatch(
            new RegExp(
              `export (?:function|const|class|interface|type) ${name}\\b|export \\{[^}]*\\b${name}\\b`,
            ),
          );
        }
      });

      it('lists every prop its components require, and marks it required', () => {
        const documented = new Map((c.props ?? []).map((p) => [p.name, p]));
        const required = new Set<string>();
        for (const file of c.files.filter((f) => f.endsWith('.tsx')))
          for (const [name, props] of requiredProps(`${repo}packages/${c.package}/src/${file}`))
            if (c.exports.includes(name))
              for (const prop of props.filter((p) => p !== 'children')) {
                required.add(prop);
                expect(documented.get(prop)?.required, `${c.slug}: ${name} requires ${prop}`).toBe(true);
              }
        for (const p of c.props ?? [])
          if (p.required) expect(required, `${c.slug}: ${p.name} is marked required`).toContain(p.name);
      });

      it('has every example it lists', () => {
        for (const id of c.examples) expect(existsSync(`${examples}${id}.tsx`), `${id}.tsx`).toBe(true);
      });

      it('says when to use it and when not to', () => {
        expect(c.description.length).toBeGreaterThan(20);
        expect(c.use.length).toBeGreaterThan(0);
        expect(c.avoid?.length ?? 0, `${c.slug} needs an "avoid" list`).toBeGreaterThan(0);
      });
    });
  }
});

describe('registry', () => {
  it('serves an item for every component, with copyable imports', () => {
    for (const c of components) {
      const item = registryItem(c.slug);
      expect(item, c.slug).not.toBeNull();
      for (const file of item!.files) {
        const where = `${c.slug}/${file.path}`;
        expect(file.content, where).not.toMatch(/from '\.\.\//);
        expect(file.content, where).not.toMatch(/@dtheo\//);
      }
    }
  });

  // `dtheo add <item>` writes the item and its registry dependencies, and prints the npm packages they list. For
  // every item, that has to be all its files need: a missing file or package is a build error after the add.
  it('brings everything an item imports when it is added on its own', () => {
    for (const name of registryNames()) {
      const item = registryItem(name)!;
      const closure = registryClosure([name]);
      const paths = installedPaths(closure);
      const packages = new Set([...closure].flatMap((n) => registryItem(n)!.dependencies));
      const here = new Set(item.files.map((f) => f.target.replace(/\.tsx?$/, '')));
      for (const file of item.files.filter((f) => /\.tsx?$/.test(f.target))) {
        const where = `${name}: ${file.target}`;
        const dir = file.target.split('/').slice(0, -1).join('/');
        for (const [, path] of file.content!.matchAll(/from '@\/([\w/-]+)'/g))
          expect(paths, `${where} imports @/${path}`).toContain(path);
        // Chart files keep their relative imports; the sibling has to ship in the same item.
        for (const [, sibling] of file.content!.matchAll(/from '\.\/([\w-]+)'/g))
          expect(here, `${where} imports ./${sibling}`).toContain(`${dir}/${sibling}`);
        for (const pkg of npmImports(file.content!).filter((p) => !peers.has(p)))
          expect(packages, `${where} imports ${pkg}`).toContain(pkg);
      }
    }
  });

  it('lists only the npm packages its files import', () => {
    // The CLI prints these for the consumer to install; a package nothing imports is a dependency they carry.
    for (const c of components) {
      const item = registryItem(c.slug)!;
      const imported = new Set(item.files.flatMap((f) => npmImports(f.content!)));
      for (const dep of item.dependencies) expect(imported, `${c.slug} lists ${dep}`).toContain(dep);
    }
  });

  it('answers to the file name a pasted import uses', () => {
    // A pasted example says `@/components/ui/toggle-group`; `dtheo add toggle-group` must find the toggle item.
    const names = new Set(registryNames());
    for (const alias of registryAliases())
      expect(names, `${alias} is an alias and an item`).not.toContain(alias);
    for (const c of components) {
      for (const file of registryItem(c.slug)!.files) {
        const base = file.target
          .split('/')
          .pop()!
          .replace(/\.tsx?$/, '');
        const writers = components.filter((o) =>
          registryItem(o.slug)!.files.some((f) => f.target === file.target),
        );
        if (names.has(base) || writers.length > 1) continue;
        expect(registryItem(base)?.name, `${file.target} → dtheo add ${base}`).toBe(c.slug);
      }
    }
  });

  it('shows examples that build after running the install line on their page', () => {
    const shown = new Set(components.flatMap((c) => c.examples));
    for (const file of readdirSync(examples).filter((f) => f.endsWith('.tsx')))
      expect(shown, `${file} is on a component page`).toContain(file.replace(/\.tsx$/, ''));
    for (const c of components) {
      const added = installedPaths(registryClosure(installItems(c)));
      for (const id of c.examples) {
        const source = exampleSource(id);
        expect(source, id).not.toMatch(/@dtheo\//);
        for (const path of exampleImports(id)) {
          // The synthetic data stays out of the install line, so nobody ships it by accident; the example says
          // how to add it, right above the import.
          if (path === 'lib/lab-data')
            expect(source, id).toMatch(/npx dtheo add lab-data.*\nimport [^;]+ from '@\/lib\/lab-data'/);
          else expect(added, `${c.slug} page, ${id} example: @/${path}`).toContain(path);
        }
      }
    }
  });

  it('gives the same install line on the page, in the Markdown and over MCP', () => {
    for (const c of components) {
      const items = installItems(c);
      expect(items[0], c.slug).toBe(c.slug);
      const md = componentMarkdown(c);
      expect(md, c.slug).toContain(installCommand(...items));
      expect(md, c.slug).toContain(shadcnCommand(...items));
    }
    // Dialog's example uses a field, a number field and a toast: the line adds them, and not what Dialog brings.
    expect(installCommand(...installItems(components.find((c) => c.slug === 'dialog')!))).toBe(
      'npx dtheo@latest add dialog field number-field toast',
    );
  });

  it('shows example code that runs as a client component once pasted', () => {
    // Examples hold state and handle events; without the directive a Next.js page fails to build.
    for (const c of components)
      for (const id of c.examples) {
        const source = exampleSource(id);
        if (/\bReact\.use[A-Z]|\buse[A-Z]\w*\(|\bon[A-Z]\w*=\{/.test(source))
          expect(source.startsWith("'use client';\n"), `${id} starts with 'use client'`).toBe(true);
      }
  });

  it('lists the TypeScript types each untyped package it imports needs', () => {
    // The charts package builds with these, so the names are real and the versions are known to work.
    const { devDependencies: built } = JSON.parse(
      readFileSync(`${repo}packages/charts/package.json`, 'utf8'),
    );
    for (const c of components) {
      const item = registryItem(c.slug)!;
      const d3 = new Set(
        item.files.flatMap((f) => npmImports(f.content!)).filter((p) => p.startsWith('d3-')),
      );
      for (const dep of d3) {
        expect(item.devDependencies, c.slug).toContain(`@types/${dep}`);
        expect(built, `@types/${dep}`).toHaveProperty([`@types/${dep}`]);
      }
      for (const types of item.devDependencies ?? [])
        expect(d3, `${c.slug} lists ${types}`).toContain(types.replace('@types/', ''));
    }
  });

  it('brings the stylesheet with every component and chart', () => {
    // Without styles/dtheo.css, h-control-md, rounded-control, text-body and the color roles do not exist, and a
    // component added with the shadcn CLI renders as an unstyled box.
    for (const c of components) {
      const item = registryItem(c.slug)!;
      expect(item.registryDependencies, c.slug).toContain(`${site.url}/r/styles.json`);
      expect(item.docs, c.slug).toContain(
        `/docs/${c.package === 'charts' ? 'charts' : 'components'}/${c.slug}`,
      );
    }
    // The shadcn CLI prints an item's docs after installing it: say how to import the stylesheet.
    expect(registryItem('styles')!.docs).toContain('@import "../styles/dtheo.css";');
  });

  it('only depends on items it can serve', () => {
    const names = new Set(registryNames());
    for (const c of components)
      for (const dep of c.registryDependencies) expect(names, `${c.slug} → ${dep}`).toContain(dep);
  });
});

describe('brand', () => {
  it('draws the same star in the favicon as in the logo', () => {
    // app/icon.svg is a static file, so it cannot import the path; this keeps the copy honest.
    const icon = readFileSync(`${repo}apps/docs/app/icon.svg`, 'utf8');
    expect(icon).toContain(`d="${starPath}"`);
    expect(icon).toContain(`d="${tilePath}"`);
    expect(icon).toContain(`transform="${starIn(16)}"`);
    for (const color of [brand.top, brand.middle, brand.ink, brand.star]) expect(icon).toContain(`"${color}"`);
  });
});

describe('agent surfaces', () => {
  it('publishes an ARD manifest registries can index', () => {
    const { entries } = ardManifest();
    const ids = entries.map((e) => e.identifier);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of entries) {
      // ARD v0.91: a host-anchored URN, a name, an application media type, url xor data, and 2-5 sample queries.
      expect(e.identifier).toMatch(/^urn:air:ui\.dtheo\.dev(:[a-zA-Z0-9._-]+)+$/);
      expect(e.displayName).toBeTruthy();
      expect(e.type).toMatch(/^application\/[\w.+-]+$/);
      expect(('url' in e) !== ('data' in e), `${e.identifier} has exactly one of url and data`).toBe(true);
      expect(e.representativeQueries.length).toBeGreaterThanOrEqual(2);
      expect(e.representativeQueries.length).toBeLessThanOrEqual(5);
    }
  });

  it('lists every component in llms.txt', () => {
    const txt = llmsTxt();
    for (const c of components) expect(txt).toContain(c.title);
  });

  it('only records usage of real components', () => {
    const slugs = new Set(components.map((c) => c.slug));
    for (const page of Object.values(pageUsage))
      for (const slug of page.uses) expect(slugs, `${page.title} uses ${slug}`).toContain(slug);
  });

  it('keeps the generated usage graph current', () => {
    const run = spawnSync(process.execPath, [`${repo}scripts/gen-usage.mjs`, '--check'], {
      encoding: 'utf8',
    });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });

  it('uses every component in at least one real screen', () => {
    const unused = components.filter((c) => {
      const { pages, composedBy } = usedIn(c.slug);
      return pages.length === 0 && composedBy.length === 0;
    });
    expect(unused.map((c) => c.slug)).toEqual([]);
  });
});

/** The import paths (`components/ui/button`) the named registry items write. */
const installed = (names: string[]) =>
  new Set(names.flatMap((n) => registryItem(n)!.files.map((f) => f.target.replace(/\.tsx?$/, ''))));

describe('installation page', () => {
  // Followed literally in a fresh Next.js app, the steps have to build: every file the layout imports must have
  // been added by an earlier command, on both the dtheo and the shadcn path.
  const md = pagesMarkdown.installation!;
  const section = (heading: string) => md.split(`\n## ${heading}\n`)[1]!.split('\n## ')[0]!;
  const code = (heading: string) =>
    [...section(heading).matchAll(/```\w*\n([\s\S]*?)```/g)].map((m) => m[1]!);
  const layout = code('5. Mount the providers')[0]!;
  const imports = [...layout.matchAll(/from "@\/([\w/-]+)"/g)].map((m) => m[1]!);

  it('adds every component the root layout imports', () => {
    expect(imports.length).toBeGreaterThan(0);
    const added = code('4. Add components')[0]!
      .match(/ add (.+)/)![1]!
      .trim()
      .split(/\s+/);
    for (const path of imports) expect(installed(added), path).toContain(path);

    const shadcn = code('Using the shadcn CLI instead')[0]!;
    const viaShadcn = [...shadcn.matchAll(/\/r\/([\w-]+)\.json/g)].map((m) => m[1]!);
    for (const path of imports) expect(installed(viaShadcn), `shadcn: ${path}`).toContain(path);
  });

  it('writes a layout that keeps the global CSS and the mode and preset from step 3', () => {
    expect(layout).toContain('import "./globals.css";');
    expect(layout).toContain(code('3. Choose a mode and preset')[0]!.trim());
  });
});
