import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
