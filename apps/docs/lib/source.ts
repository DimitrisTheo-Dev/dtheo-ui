import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentMeta } from '@dtheo/ui/meta';

// Static pages call these at build time, but the MCP route calls them on every request. Whatever they read must
// also match the '/mcp' globs in next.config.ts, or it is missing from the deployed function (test/mcp.test.ts).
// Next runs from apps/docs; tests and scripts may run from the repo root. Resolve both the same way.
const docs = existsSync(join(process.cwd(), 'examples'))
  ? process.cwd()
  : join(process.cwd(), 'apps', 'docs');
const repo = join(docs, '..', '..');

let chartModules: Map<string, string> | undefined;

/** Which file defines each public chart export, read from the charts index. */
function chartModule(name: string) {
  if (!chartModules) {
    // Cache the map only once it is complete: if the read throws, the next call tries again instead of finding
    // an empty map and reporting every chart export as missing.
    const map = new Map<string, string>();
    const index = readFileSync(join(repo, 'packages', 'charts', 'src', 'index.ts'), 'utf8');
    for (const [, names, file] of index.matchAll(/export (?:type )?\{([^}]+)\} from '\.\/([\w-]+)'/g))
      for (const n of names!.split(',')) map.set(n.trim(), file!);
    chartModules = map;
  }
  const file = chartModules.get(name);
  if (!file) throw new Error(`@dtheo/charts does not export "${name}"; add it to packages/charts/src/index.ts.`);
  return file;
}

/**
 * Examples import from the workspace packages; a consumer has the files `dtheo add` copied in. Rewrite each import
 * to where the registry puts that file, so code copied from a page or an MCP answer compiles as is.
 */
function toInstalledImports(source: string) {
  return source
    .replaceAll('@dtheo/ui/components/', '@/components/ui/')
    .replace(/'@dtheo\/ui\/lib\/(utils|theme)'/g, "'@/lib/$1'")
    .replace(/'@dtheo\/ui\/lib\/([\w-]+)'/g, "'@/components/ui/$1'")
    .replace(/import (type )?\{([^}]+)\} from '@dtheo\/charts';/g, (_, typeOnly = '', names: string) => {
      const byFile = new Map<string, string[]>();
      for (const spec of names.split(',').map((n) => n.trim()).filter(Boolean)) {
        const file = chartModule(spec.replace(/^type /, ''));
        byFile.set(file, [...(byFile.get(file) ?? []), spec]);
      }
      return [...byFile]
        .map(([file, specs]) => `import ${typeOnly}{ ${specs.join(', ')} } from '@/components/charts/${file}';`)
        .join('\n');
    })
    .replace(
      /^import [^;]+ from '@\/lib\/lab-data';$/m,
      (line) => `// Synthetic demo data: npx dtheo add lab-data, or pass your own.\n${line}`,
    );
}

/** Read an example's source as shown on the docs page (the file a consumer would copy). */
export function exampleSource(id: string) {
  const file = join(docs, 'examples', `${id}.tsx`);
  if (!existsSync(file)) return `// Example "${id}" is not written yet.`;
  return toInstalledImports(readFileSync(file, 'utf8').replace(/^'use client';\n\n?/, ''));
}

/** Read a component's source files, for the registry, the MCP server and the "Source" tab. */
export function componentFiles(meta: ComponentMeta) {
  const root = join(repo, 'packages', meta.package, 'src');
  return meta.files.map((file) => ({
    path: file,
    content: readFileSync(join(root, file), 'utf8'),
  }));
}

export function repoFile(path: string) {
  return readFileSync(join(repo, path), 'utf8');
}
