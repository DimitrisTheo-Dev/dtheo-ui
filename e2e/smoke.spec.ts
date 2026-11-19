import { expect, test } from '@playwright/test';
import { horizontalOverflow, watchErrors } from './helpers';

// The sitemap is the list of public routes; every one must render cleanly.
const routes = async (request: import('@playwright/test').APIRequestContext) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
};

test('the sitemap lists the docs, components, charts and examples', async ({ request }) => {
  const paths = await routes(request);
  expect(paths.length).toBeGreaterThan(50);
  for (const prefix of [
    '/docs/components/',
    '/docs/charts/',
    '/docs/foundations/',
    '/docs/patterns/',
    '/examples/',
  ])
    expect(
      paths.some((p) => p.startsWith(prefix)),
      prefix,
    ).toBe(true);
});

test('every route renders without errors or sideways scroll @phone', async ({ page, request }, info) => {
  test.setTimeout(10 * 60_000);
  const failures: string[] = [];
  for (const path of await routes(request)) {
    const errors = watchErrors(page);
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    if (res?.status() !== 200) failures.push(`${path}: HTTP ${res?.status()}`);
    const overflow = await horizontalOverflow(page);
    if (overflow > 0) failures.push(`${path}: ${overflow}px horizontal overflow at ${info.project.name}`);
    for (const e of errors) failures.push(`${path}: ${e.slice(0, 200)}`);
    await expect(page.locator('h1').first(), path).toBeVisible();
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  }
  expect(failures).toEqual([]);
});

test('unknown routes return a real 404', async ({ page }) => {
  const res = await page.goto('/docs/components/does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
