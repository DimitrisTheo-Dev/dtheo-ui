import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${here('./apps/docs/')}` },
      { find: 'server-only', replacement: here('./scripts/test/empty.mjs') },
    ],
  },
  test: {
    include: ['packages/*/test/**/*.test.{ts,tsx,mjs}', 'apps/docs/test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
