#!/usr/bin/env node
/**
 * Run after `pnpm build`. The MCP route reads component sources when a tool is called, so they ship with the
 * function only through `outputFileTracingIncludes` in apps/docs/next.config.ts. This checks that the build's
 * trace for /mcp really contains every file those globs match: a deploy copies the trace and nothing else.
 * (apps/docs/test/mcp.test.ts checks the other half: every file a tool reads matches the globs.)
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../apps/docs/', import.meta.url));
const traceFile = resolve(docs, '.next/server/app/mcp/route.js.nft.json');
if (!existsSync(traceFile)) {
  console.error(`No trace at ${relative(process.cwd(), traceFile)}. Run \`pnpm build\` first.`);
  process.exit(1);
}

const { default: config } = await import(resolve(docs, 'next.config.ts'));
const globs = config.outputFileTracingIncludes?.['/mcp'] ?? [];
const traced = new Set(
  JSON.parse(readFileSync(traceFile, 'utf8')).files.map((f) => resolve(dirname(traceFile), f)),
);
const wanted = globs.flatMap((glob) => globSync(glob, { cwd: docs }).map((f) => resolve(docs, f)));
const missing = wanted.filter((f) => !traced.has(f));

if (!wanted.length || missing.length) {
  console.error(
    wanted.length
      ? `The /mcp trace is missing ${missing.length} of ${wanted.length} files the route reads:\n${missing.map((f) => `  ${relative(process.cwd(), f)}`).join('\n')}`
      : 'The /mcp tracing globs in apps/docs/next.config.ts match no files.',
  );
  process.exit(1);
}
console.log(`The /mcp trace ships all ${wanted.length} files the route reads.`);
