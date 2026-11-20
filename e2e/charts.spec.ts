import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

test('pointing at the highlighted scatter point shows its tooltip', async ({ page }) => {
  await page.goto('/docs/charts/scatter-chart');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const chart = page.locator('[data-slot="scatter-chart"]').first();
  // The called-out point is a vector ring with its label beside it; the legend sits above the plot.
  const ring = chart.locator('circle[r="7"]');
  const label = await chart.locator('circle[r="7"] + text').textContent();
  expect(label).toBeTruthy();
  const box = (await ring.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const tooltip = chart.locator('[data-slot="scatter-tooltip"]');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(label!);
});

// Server and browser must print the same digits, or React throws away the server HTML (error #418) and the
// re-render resets the theme the visitor chose.
test.describe('in a comma-decimal locale', () => {
  test.use({ locale: 'de-DE' });

  for (const path of ['/', '/docs/charts/histogram', '/examples/tuning']) {
    test(`${path} hydrates cleanly and keeps a stored light theme`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.addInitScript(() => {
        try {
          localStorage.setItem('dtheo-theme', 'light');
        } catch {}
      });
      await page.goto(path);
      await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => (1234.5).toLocaleString())).toBe('1.234,5');
      await expect(page.locator('html')).not.toHaveClass(/dark/);
      expect(errors).toEqual([]);
    });
  }
});
