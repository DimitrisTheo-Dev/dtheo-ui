import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { sitemapPaths } from './helpers';

const pages = [
  '/',
  '/docs',
  '/docs/components',
  '/docs/agents',
  '/docs/loop',
  '/docs/components/button',
  '/docs/components/field',
  '/docs/components/table',
  '/docs/components/data-table',
  '/docs/charts/line-chart',
  '/docs/foundations/color',
  '/docs/foundations/engineering-data',
  '/docs/patterns/forms',
  '/docs/patterns/data-table',
  '/examples/run-history',
  '/examples/run-review',
  '/examples/motor-map',
  '/examples/tuning',
  '/docs/charts/frequency-chart',
  '/examples/assistant',
];

// The example apps in the states their toolbar previews: placeholders, errors and gaps must be as accessible as the
// data they stand in for. Checked in the dark theme, where the warning and error fills are lowest in contrast.
const states = [
  '/examples/run-history?state=loading',
  '/examples/run-history?state=no-results',
  '/examples/run-history?state=partial',
  '/examples/run-review?state=loading',
  '/examples/run-review?state=error',
  '/examples/run-review?state=partial',
  '/examples/motor-map?state=error',
  '/examples/tuning?state=error',
  '/examples/tuning?state=partial',
];

for (const theme of ['dark', 'light'] as const) {
  for (const path of [...pages, ...(theme === 'dark' ? states : [])]) {
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
      // Entrances fade in for a second or two. A contrast check taken mid-fade measures the fade, not the design,
      // so wait for every animation that ends (a spinner never does) before auditing.
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => undefined)),
        ),
      );
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
