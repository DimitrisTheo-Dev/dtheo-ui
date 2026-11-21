import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { sitemapPaths } from './helpers';

const pages = [
  '/',
  '/docs',
  '/docs/components',
  '/docs/agents',
  '/docs/components/button',
  '/docs/components/field',
  '/docs/components/table',
  '/docs/charts/line-chart',
  '/docs/foundations/color',
  '/docs/patterns/forms',
  '/docs/patterns/data-table',
  '/examples/run-review',
  '/examples/motor-map',
  '/examples/tuning',
  '/docs/charts/frequency-chart',
  '/examples/assistant',
];

for (const theme of ['dark', 'light'] as const) {
  for (const path of pages) {
    test(`${path} has no serious accessibility violations (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => {
        try {
          localStorage.setItem('dtheo-theme', t);
        } catch {}
      }, theme);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // Audit the page people use: after React has hydrated and Base UI has wired up labels and ids.
      await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map(
          (v) =>
            `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(' '))
              .join(' | ')}`,
        );
      expect(serious).toEqual([]);
    });
  }
}

// Screen-reader users move by headings and landmarks, so every page in the sitemap keeps one h1, one main and an
// outline that never skips a level (axe files these under best practices, which the WCAG run above leaves out).
test('every page has a whole outline', async ({ page, request }) => {
  test.setTimeout(240_000);
  const paths = await sitemapPaths(request);
  expect(paths.length).toBeGreaterThan(20);
  const problems: string[] = [];
  for (const path of paths) {
    await page.goto(path);
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
    const { violations } = await new AxeBuilder({ page })
      .withRules(['heading-order', 'page-has-heading-one', 'landmark-one-main', 'empty-heading'])
      .analyze();
    for (const v of violations) problems.push(`${path} ${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`);
  }
  expect(problems).toEqual([]);
});
