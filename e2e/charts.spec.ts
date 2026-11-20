import { expect, test } from '@playwright/test';

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
