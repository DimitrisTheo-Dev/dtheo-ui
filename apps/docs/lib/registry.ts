import 'server-only';
import { components, type ComponentMeta } from '@dtheo/ui/meta';
import { repoFile } from './source';
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
  registryDependencies: string[];
  files: RegistryFile[];
  docs?: string;
  meta?: Record<string, unknown>;
}

const itemUrl = (name: string) => `${site.url}/r/${name}.json`;

/** Rewrite relative imports to the conventional shadcn layout so copied files work in any project. */
function rewriteUi(source: string) {
  return source
    .replace(/from '\.\.\/lib\/utils'/g, "from '@/lib/utils'")
    .replace(/from '\.\.\/lib\/theme'/g, "from '@/lib/theme'")
    .replace(/from '\.\/([\w-]+)'/g, "from '@/components/ui/$1'");
}

/** The single stylesheet a consumer imports after Tailwind: theme mapping, tokens, base layer and component CSS. */
const strip = (css: string) => css.replace(/^@import[^\n]*\n/gm, '');

function stylesheet() {
  return [
    `/* ${site.name} ${site.version}. Import after Tailwind: @import "tailwindcss"; @import "./styles/dtheo.css"; */`,
    '/* dtheo-check-disable-file raw-color -- this file is the design tokens: the one place color values live. */',
    strip(repoFile('packages/ui/src/styles/theme.css')),
    strip(repoFile('packages/ui/src/styles/tokens.css')),
    strip(repoFile('packages/ui/src/styles/base.css')),
    strip(repoFile('packages/ui/src/styles/components.css')),
  ].join('\n');
}

const baseItems = (): RegistryItem[] => [
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
        content: repoFile('packages/ui/src/lib/utils.ts'),
      },
    ],
  },
  {
    name: 'theme',
    type: 'registry:lib',
    title: 'Theme scope',
    description: 'ThemeScope applies a mode and preset to a subtree; overlays opened inside keep its theme.',
    dependencies: [],
    registryDependencies: [itemUrl('utils')],
    files: [
      {
        path: 'registry/dtheo/lib/theme.tsx',
        type: 'registry:lib',
        target: 'lib/theme.tsx',
        content: rewriteUi(repoFile('packages/ui/src/lib/theme.tsx')).replace(
          "from '@/components/ui/utils'",
          "from '@/lib/utils'",
        ),
      },
    ],
  },
  {
    name: 'lab-data',
    type: 'registry:lib',
    title: 'Lab data',
    description:
      'Synthetic bench data for the chart examples: a Bode response, a spectrum, 412 runs and a live bench. Not real measurements.',
    dependencies: [],
    registryDependencies: [],
    files: [
      {
        path: 'registry/dtheo/lib/lab-data.ts',
        type: 'registry:lib',
        target: 'lib/lab-data.ts',
        content: repoFile('apps/docs/lib/lab-data.ts'),
      },
    ],
  },
  {
    name: 'styles',
    type: 'registry:file',
    title: 'Styles',
    description: 'Tokens for three presets in light and dark, the Tailwind v4 theme mapping and base styles.',
    dependencies: [],
    registryDependencies: [],
    files: [
      {
        path: 'registry/dtheo/styles/dtheo.css',
        type: 'registry:file',
        target: 'styles/dtheo.css',
        content: stylesheet(),
      },
    ],
  },
];

function componentItem(meta: ComponentMeta, withContent: boolean): RegistryItem {
  const charts = meta.package === 'charts';
  const files: RegistryFile[] = meta.files
    .filter((f) => !f.endsWith('.css'))
    .map((f) => {
      const name = f.split('/').pop()!;
      const raw = repoFile(`packages/${meta.package}/src/${f}`);
      return {
        path: `registry/dtheo/${charts ? 'charts' : 'ui'}/${name}`,
        type: charts ? 'registry:component' : 'registry:ui',
        target: charts ? `components/charts/${name}` : `components/ui/${name}`,
        ...(withContent ? { content: charts ? raw : rewriteUi(raw) } : {}),
      };
    });
  const deps = new Set(meta.registryDependencies.filter((d) => d !== meta.slug));
  if (!charts) {
    deps.add('utils');
    if (meta.files.some((f) => repoFile(`packages/ui/src/${f}`).includes("'../lib/theme'")))
      deps.add('theme');
  }
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: meta.slug,
    type: charts ? 'registry:component' : 'registry:ui',
    title: meta.title,
    description: meta.description,
    dependencies: meta.dependencies.filter((d) => !['clsx', 'tailwind-merge'].includes(d) || charts),
    registryDependencies: [...deps].map(itemUrl),
    files,
    docs: `${site.url}/docs/${charts ? 'charts' : 'components'}/${meta.slug}`,
    meta: { category: meta.category, level: meta.level, exports: meta.exports },
  };
}

export function registryIndex() {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'dtheo',
    homepage: site.url,
    items: [
      ...baseItems().map(({ files, ...i }) => ({ ...i, files: files.map(({ content: _c, ...f }) => f) })),
      ...components.map((m) => componentItem(m, false)),
    ],
  };
}

export function registryItem(name: string): RegistryItem | null {
  const base = baseItems().find((i) => i.name === name);
  if (base) return { $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...base };
  const meta = components.find((c) => c.slug === name);
  return meta ? componentItem(meta, true) : null;
}

export const registryNames = () => [...baseItems().map((i) => i.name), ...components.map((c) => c.slug)];
