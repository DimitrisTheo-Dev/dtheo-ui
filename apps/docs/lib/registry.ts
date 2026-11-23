import 'server-only';
import { components, type ComponentMeta } from '@dtheo/ui/meta';
import { exampleSource, libItems, repoFile } from './source';
import { site } from './site';

export interface RegistryFile {
  path: string;
  type: 'registry:ui' | 'registry:lib' | 'registry:component' | 'registry:file';
  target: string;
  content?: string;
}

export interface RegistryItem {
  $schema?: string;
  name: string;
  type: 'registry:ui' | 'registry:lib' | 'registry:component' | 'registry:file';
  title: string;
  description: string;
  dependencies: string[];
  devDependencies?: string[];
  registryDependencies: string[];
  files: RegistryFile[];
  docs?: string;
  meta?: Record<string, unknown>;
}

const itemUrl = (name: string) => `${site.url}/r/${name}.json`;

const isLibItem = (name: string) => (libItems as readonly string[]).includes(name);
/** Where a UI component's `../lib/<name>` import lives once installed: its own lib item, or next to the component. */
const libTarget = (name: string) => (isLibItem(name) ? `@/lib/${name}` : `@/components/ui/${name}`);

/** Rewrite relative imports to the conventional shadcn layout so copied files work in any project. */
function rewriteUi(source: string) {
  return source
    .replace(/from '\.\.\/lib\/([\w-]+)'/g, (_, name: string) => `from '${libTarget(name)}'`)
    .replace(/from '\.\/([\w-]+)'/g, "from '@/components/ui/$1'");
}

/** The same for a file in packages/ui/src/lib: its siblings are lib files too. */
function rewriteLib(source: string) {
  return source.replace(/from '\.\/([\w-]+)'/g, (_, name: string) => `from '${libTarget(name)}'`);
}

/** The single stylesheet a consumer imports after Tailwind: theme mapping, tokens, base layer and component CSS. */
const strip = (css: string) => css.replace(/^@import[^\n]*\n/gm, '');

function stylesheet() {
  return [
    `/* ${site.name} ${site.version}. Import once in your global CSS, right after Tailwind, with a path relative to that file; \`dtheo init\` does it for you. */`,
    '/* dtheo-check-disable-file raw-color -- this file is the design tokens: the one place color values live. */',
    strip(repoFile('packages/ui/src/styles/theme.css')),
    strip(repoFile('packages/ui/src/styles/tokens.css')),
    strip(repoFile('packages/ui/src/styles/base.css')),
    strip(repoFile('packages/ui/src/styles/components.css')),
  ].join('\n');
}

/** The items that are not components. Without content, only what resolving and listing them needs. */
function baseItems(withContent = true): RegistryItem[] {
  const content = (read: () => string) => (withContent ? { content: read() } : {});
  return [
    {
      name: 'utils',
      type: 'registry:lib',
      title: 'Utilities',
      description: 'The cn() class-name helper, aware of dtheo/ui’s type, radius and spacing scales.',
      dependencies: ['clsx', 'tailwind-merge'],
      registryDependencies: [],
      files: [
        {
          path: 'registry/dtheo/lib/utils.ts',
          type: 'registry:lib',
          target: 'lib/utils.ts',
          ...content(() => repoFile('packages/ui/src/lib/utils.ts')),
        },
      ],
    },
    {
      name: 'theme',
      type: 'registry:lib',
      title: 'Theme scope',
      description:
        'ThemeScope applies a mode and preset to a subtree; overlays opened inside keep its theme.',
      dependencies: [],
      registryDependencies: [itemUrl('utils')],
      files: [
        {
          path: 'registry/dtheo/lib/theme.tsx',
          type: 'registry:lib',
          target: 'lib/theme.tsx',
          ...content(() => rewriteLib(repoFile('packages/ui/src/lib/theme.tsx'))),
        },
      ],
    },
    {
      name: 'popup',
      type: 'registry:lib',
      title: 'Popup classes',
      description: 'The surface and row classes menus, selects, comboboxes and popovers share.',
      dependencies: [],
      registryDependencies: [itemUrl('utils')],
      files: [
        {
          path: 'registry/dtheo/lib/popup.ts',
          type: 'registry:lib',
          target: 'lib/popup.ts',
          ...content(() => rewriteLib(repoFile('packages/ui/src/lib/popup.ts'))),
        },
      ],
    },
    {
      name: 'lab-data',
      type: 'registry:lib',
      title: 'Lab data',
      description:
        'Synthetic bench data for the chart examples: the R-0412 step test against its reference, its run history, a Bode response, a vibration spectrum, 412 runs and a live bench. Not real measurements.',
      dependencies: [],
      registryDependencies: [],
      files: [
        {
          path: 'registry/dtheo/lib/lab-data.ts',
          type: 'registry:lib',
          target: 'lib/lab-data.ts',
          ...content(() => repoFile('apps/docs/lib/lab-data.ts')),
        },
      ],
    },
    {
      name: 'styles',
      type: 'registry:file',
      title: 'Styles',
      description:
        'Tokens for two presets (Graphite and Carbon, each in light and dark), the Tailwind v4 theme mapping and base styles.',
      dependencies: [],
      registryDependencies: [],
      // The shadcn CLI prints this after an install, once however many items needed the stylesheet.
      docs: [
        `${site.name}: import the stylesheet once, right after Tailwind, in your global CSS. In app/globals.css:`,
        '  @import "tailwindcss";',
        '  @import "../styles/dtheo.css";',
        'Delete any other theme in that file (shadcn init adds :root, .dark, @theme inline and @layer base); it overrides this one.',
        `Guide: ${site.url}/docs/installation#using-the-shadcn-cli-instead`,
      ].join('\n'),
      files: [
        {
          path: 'registry/dtheo/styles/dtheo.css',
          type: 'registry:file',
          target: 'styles/dtheo.css',
          ...content(() => stylesheet()),
        },
      ],
    },
  ];
}

function componentItem(meta: ComponentMeta, withContent: boolean): RegistryItem {
  const charts = meta.package === 'charts';
  const files: RegistryFile[] = meta.files
    .filter((f) => !f.endsWith('.css'))
    .map((f) => {
      const name = f.split('/').pop()!;
      const raw = () => repoFile(`packages/${meta.package}/src/${f}`);
      return {
        path: `registry/dtheo/${charts ? 'charts' : 'ui'}/${name}`,
        type: charts ? 'registry:component' : 'registry:ui',
        target: charts ? `components/charts/${name}` : `components/ui/${name}`,
        ...(withContent ? { content: charts ? raw() : rewriteUi(raw()) } : {}),
      };
    });
  // Every item needs the stylesheet: it defines the classes components use (h-control-md, rounded-control,
  // text-body, bg-card). Without it they render unstyled. Both CLIs skip a dependency's file when it exists.
  const deps = new Set(['styles', ...meta.registryDependencies.filter((d) => d !== meta.slug)]);
  // d3 ships no TypeScript types, so a TypeScript build fails on the chart imports without these.
  const types = meta.dependencies.filter((d) => d.startsWith('d3-')).map((d) => `@types/${d}`);
  if (!charts) {
    deps.add('utils');
    // utils, theme and popup are items of their own: a file that imports one needs that item.
    for (const f of meta.files)
      for (const [, name] of repoFile(`packages/ui/src/${f}`).matchAll(/from '\.\.\/lib\/([\w-]+)'/g))
        if (isLibItem(name!)) deps.add(name!);
  }
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: meta.slug,
    type: charts ? 'registry:component' : 'registry:ui',
    title: meta.title,
    description: meta.description,
    dependencies: meta.dependencies.filter((d) => !['clsx', 'tailwind-merge'].includes(d) || charts),
    ...(types.length ? { devDependencies: types } : {}),
    registryDependencies: [...deps].map(itemUrl),
    files,
    docs: `${meta.title} docs: ${site.url}/docs/${charts ? 'charts' : 'components'}/${meta.slug}`,
    meta: { category: meta.category, level: meta.level, exports: meta.exports },
  };
}

export function registryIndex() {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'dtheo',
    homepage: site.url,
    items: [...baseItems(false), ...components.map((m) => componentItem(m, false))],
  };
}

/** The component a name means: its slug, or one of its aliases (the file a pasted import names, `toggle-group`). */
export function componentByName(name: string) {
  return components.find((c) => c.slug === name) ?? components.find((c) => c.aliases?.includes(name));
}

function findItem(name: string, withContent: boolean): RegistryItem | null {
  const base = baseItems(withContent).find((i) => i.name === name);
  if (base) return { $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...base };
  const meta = componentByName(name);
  return meta ? componentItem(meta, withContent) : null;
}

/** The item as /r/<name>.json serves it, with every file's content. */
export const registryItem = (name: string) => findItem(name, true);

export const registryNames = () => [...baseItems(false).map((i) => i.name), ...components.map((c) => c.slug)];

/** Other names the registry answers to, so `dtheo add toggle-group` works like `dtheo add toggle`. */
export const registryAliases = () => components.flatMap((c) => c.aliases ?? []);

const depName = (dep: string) => dep.replace(/^.*\/r\//, '').replace(/\.json$/, '');

/** The named items and every item they pull in, the way `dtheo add` and the shadcn CLI resolve them. */
export function registryClosure(names: string[]) {
  const seen = new Set<string>();
  const visit = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    for (const dep of findItem(name, false)?.registryDependencies ?? []) visit(depName(dep));
  };
  for (const name of names) visit(name);
  return seen;
}

/** The import paths (`components/ui/button`, `lib/utils`) that adding these items writes. */
export function installedPaths(names: Iterable<string>) {
  return new Set(
    [...names].flatMap((n) => findItem(n, false)?.files.map((f) => f.target.replace(/\.tsx?$/, '')) ?? []),
  );
}

/** Which item to add for an import path: the item named after the file, else the first one that writes it. */
function itemFor(path: string) {
  const file = path.split('/').pop()!;
  const writes = registryNames().filter((n) => installedPaths([n]).has(path));
  return writes.find((n) => n === file) ?? writes[0];
}

/** The `@/…` paths an example imports once its imports are rewritten for a consumer's project. */
export const exampleImports = (id: string) =>
  [...exampleSource(id).matchAll(/from '@\/([\w/-]+)'/g)].map((m) => m[1]!);

/**
 * What a component page tells you to add: the component, then every item its examples import that it does not
 * bring along, so the code on the page builds once pasted. The synthetic lab data is left out on purpose: nobody
 * should ship it by accident, and the pasted example says how to add it (`npx dtheo add lab-data`).
 */
export function installItems(meta: ComponentMeta) {
  const names = [meta.slug];
  const covered = installedPaths(registryClosure(names));
  for (const path of meta.examples.flatMap(exampleImports)) {
    if (covered.has(path) || path === 'lib/lab-data') continue;
    const item = itemFor(path);
    if (!item) continue; // the contract tests fail on an import nothing provides
    names.push(item);
    for (const p of installedPaths(registryClosure([item]))) covered.add(p);
  }
  // An item listed early can be brought along by one found later; list only what the command needs.
  return names.filter(
    (n, i) => i === 0 || !names.some((m, j) => j !== i && m !== n && registryClosure([m]).has(n)),
  );
}
