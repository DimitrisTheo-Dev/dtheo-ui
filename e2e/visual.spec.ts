import { expect, test } from '@playwright/test';

// Visual regression: a pixel diff of the screens and previews that define the look.
// Update baselines on purpose with `pnpm test:visual --update-snapshots`, then review the diff.
const shots: Array<{ name: string; path: string; locator?: string }> = [
  { name: 'home-hero', path: '/', locator: 'main > section:first-child' },
  { name: 'run-review', path: '/examples/run-review' },
  { name: 'motor-map', path: '/examples/motor-map' },
  { name: 'assistant', path: '/examples/assistant' },
  { name: 'button', path: '/docs/components/button', locator: '[data-slot="preview"]' },
  { name: 'table', path: '/docs/components/table', locator: '[data-slot="preview"]' },
  { name: 'metric', path: '/docs/components/metric', locator: '[data-slot="preview"]' },
  { name: 'line-chart', path: '/docs/charts/line-chart', locator: '[data-slot="preview"]' },
  { name: 'heatmap', path: '/docs/charts/heatmap', locator: '[data-slot="preview"]' },
  { name: 'color', path: '/docs/foundations/color', locator: 'main' },
];

test.describe.configure({ mode: 'parallel' });

for (const theme of ['dark', 'light'] as const) {
  for (const shot of shots) {
    test(`${shot.name} (${theme})`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'baselines are desktop only');
      await page.addInitScript((t) => {
        try {
          localStorage.setItem('dtheo-theme', t);
        } catch {}
      }, theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(shot.path);
      await page.waitForLoadState('networkidle');
      // Audit the page people use: after React has hydrated and Base UI has wired up labels and ids.
      await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
      await page.evaluate(() => document.fonts.ready);
      const target = shot.locator ? page.locator(shot.locator).first() : page;
      await expect(target).toHaveScreenshot(`${shot.name}-${theme}.png`, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.002,
      });
    });
  }
}
