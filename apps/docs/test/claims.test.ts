import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastPairs } from '@dtheo/tokens';
import { components } from '@dtheo/ui/meta';
import { ruleList } from 'dtheo/check';

/**
 * The README, DESIGN.md and the CLI README state counts in words ("22 rules", "159 checks"). The landing page reads
 * them from source; these files can't, so this test holds every count they state to the number the code has.
 */
const repo = new URL('../../../', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, repo), 'utf8');

const actual = {
  pairs: contrastPairs.length,
  checks: (JSON.parse(read('packages/tokens/dist/contrast.json')) as unknown[]).length,
  rules: ruleList.length,
  components: components.filter((c) => c.package === 'ui').length,
  charts: components.filter((c) => c.package === 'charts').length,
  tools: read('apps/docs/app/mcp/route.ts').match(/registerTool\(/g)?.length ?? 0,
  // The routes e2e/a11y.spec.ts runs axe on: the quoted paths in its `pages` list.
  routes: /const pages = \[([^\]]*)\]/.exec(read('e2e/a11y.spec.ts'))?.[1]?.match(/'\//g)?.length ?? 0,
};

const claims: Array<[RegExp, keyof typeof actual]> = [
  [/\b(\d+) (?:text, UI and focus-ring color )?pairs\b/g, 'pairs'],
  [/\b(\d+) checks\b/g, 'checks'],
  [/\b(\d+) rules\b/g, 'rules'],
  [/\b(\d+) components\b/g, 'components'],
  [/\b(\d+) (?:engineering )?charts\b/g, 'charts'],
  [/\b(\d+) (?:MCP )?tools\b/g, 'tools'],
  [/\b(\d+) routes\b/g, 'routes'],
];

describe('counts the docs state', () => {
  it('match the code', () => {
    // Every count is positive, so a broken lookup can't pass by stating 0.
    for (const [name, n] of Object.entries(actual)) expect(n, name).toBeGreaterThan(0);
  });

  for (const file of ['README.md', 'DESIGN.md', 'packages/cli/README.md']) {
    it(`in ${file} match the code`, () => {
      const text = read(file);
      const stated = claims.flatMap(([re, key]) => [...text.matchAll(re)].map((m) => [key, Number(m[1])] as const));
      expect(stated.length).toBeGreaterThan(0);
      for (const [key, n] of stated) expect(n, `${file}: "${n} ${key}"`).toBe(actual[key]);
    });
  }
});
