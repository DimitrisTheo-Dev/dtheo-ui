import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentMeta } from '@dtheo/ui/meta';

// Next runs from apps/docs; tests and scripts may run from the repo root. Resolve both the same way.
const docs = existsSync(join(process.cwd(), 'examples'))
  ? process.cwd()
  : join(process.cwd(), 'apps', 'docs');
const repo = join(docs, '..', '..');

/** Read an example's source as shown on the docs page (the file a consumer would copy). */
export function exampleSource(id: string) {
  const file = join(docs, 'examples', `${id}.tsx`);
  if (!existsSync(file)) return `// Example "${id}" is not written yet.`;
  return readFileSync(file, 'utf8')
    .replace(/^'use client';\n\n?/, '')
    .replaceAll('@dtheo/ui/components/', '@/components/ui/');
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
