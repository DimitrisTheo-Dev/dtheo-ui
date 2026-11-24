import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  if (!file)
    throw new Error(`@dtheo/charts does not export "${name}"; add it to packages/charts/src/index.ts.`);
  return file;
}

/**
 * The files in packages/ui/src/lib that the registry ships as their own items, to `lib/<name>`. Any other lib file
 * (use-row-selection) travels with the component that uses it, to `components/ui/<name>`.
 */
export const libItems = ['utils', 'theme', 'popup'] as const;

/**
 * Examples import from the workspace packages; a consumer has the files `dtheo add` copied in. Rewrite each import
 * to where the registry puts that file, so code copied from a page or an MCP answer compiles as is.
 */
function toInstalledImports(source: string) {
  return source
    .replaceAll('@dtheo/ui/components/', '@/components/ui/')
    .replace(/'@dtheo\/ui\/lib\/([\w-]+)'/g, (_, name: string) =>
      (libItems as readonly string[]).includes(name) ? `'@/lib/${name}'` : `'@/components/ui/${name}'`,
    )
    .replace(/import (type )?\{([^}]+)\} from '@dtheo\/charts';/g, (_, typeOnly = '', names: string) => {
      const byFile = new Map<string, string[]>();
      for (const spec of names
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)) {
        const file = chartModule(spec.replace(/^type /, ''));
        byFile.set(file, [...(byFile.get(file) ?? []), spec]);
      }
      return [...byFile]
        .map(
          ([file, specs]) => `import ${typeOnly}{ ${specs.join(', ')} } from '@/components/charts/${file}';`,
        )
        .join('\n');
    })
    .replace(
      /^import [^;]+ from '@\/lib\/lab-data';$/m,
      (line) => `// Synthetic demo data: npx dtheo add lab-data, or pass your own.\n${line}`,
    );
}

/**
 * Read an example's source as shown on the docs page (the file a consumer would copy). It keeps `'use client'`:
 * examples hold state and handle events, so in a Next.js app the pasted file must be a client component.
 */
export function exampleSource(id: string) {
  const file = join(docs, 'examples', `${id}.tsx`);
  if (!existsSync(file)) return `// Example "${id}" is not written yet.`;
  return toInstalledImports(readFileSync(file, 'utf8'));
}

export function repoFile(path: string) {
  return readFileSync(join(repo, path), 'utf8');
}
