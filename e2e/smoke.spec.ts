import { expect, test } from '@playwright/test';
import { horizontalOverflow, sitemapPaths, watchErrors } from './helpers';

// The sitemap is the list of public routes; every one must render cleanly.
test('the sitemap lists the docs, components, charts and examples', async ({ request }) => {
  const paths = await sitemapPaths(request);
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

test('every docs page links to the repo and credits its author', async ({ page }) => {
  for (const path of ['/', '/docs/components', '/docs/installation']) {
    await page.goto(path);
    await expect(page.getByRole('link', { name: 'dtheo/ui on GitHub' }), path).toHaveAttribute(
      'href',
      'https://github.com/DimitrisTheo-Dev/dtheo-ui',
    );
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'dtheo.dev' }), path).toHaveAttribute(
      'href',
      'https://dtheo.dev',
    );
    await expect(footer.getByRole('link', { name: 'GitHub' }), path).toBeVisible();
  }
});

test('every route renders without errors or sideways scroll @phone', async ({ page, request }, info) => {
  test.setTimeout(10 * 60_000);
  const failures: string[] = [];
  for (const path of await sitemapPaths(request)) {
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

test('every page shares as itself: its own title, text, address and card', async ({ request }) => {
  test.setTimeout(5 * 60_000);
  const tags = async (path: string) => {
    const html = await (await request.get(path)).text();
    const tag = (key: string) =>
      html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];
    return {
      title: tag('og:title'),
      description: tag('og:description'),
      url: tag('og:url'),
      image: tag('og:image'),
      twitter: [tag('twitter:card'), tag('twitter:title'), tag('twitter:description'), tag('twitter:image')],
    };
  };
  const home = await tags('/');
  expect(home.url && new URL(home.url).pathname).toBe('/');
  const failures: string[] = [];
  for (const path of await sitemapPaths(request)) {
    const og = path === '/' ? home : await tags(path);
    if (path !== '/') {
      if (!og.url || new URL(og.url).pathname !== path) failures.push(`${path}: og:url is ${og.url}`);
      if (og.title === home.title) failures.push(`${path}: og:title is the homepage's (${og.title})`);
      if (og.description === home.description) failures.push(`${path}: og:description is the homepage's`);
    }
    if (!og.image) failures.push(`${path}: no og:image`);
    // X reads its own tags; they must show the same card.
    const twitter = ['summary_large_image', og.title, og.description, og.image];
    if (og.twitter.join('\n') !== twitter.join('\n')) failures.push(`${path}: twitter:* differ from og:*`);
  }
  expect(failures).toEqual([]);
  // A 404 has no address of its own: no og:url, and certainly not the homepage's.
  const missing = await tags('/docs/components/does-not-exist');
  expect(missing.title).toMatch(/^Page not found/);
  expect(missing.url).toBeUndefined();
  expect(missing.image).toBeTruthy();
});

test('unknown routes return a real 404', async ({ page }) => {
  const res = await page.goto('/docs/components/does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('the old loop address lands on How it works, page and Markdown', async ({ request }) => {
  for (const [from, to] of [
    ['/docs/loop', '/docs/how-it-works'],
    ['/docs/loop.md', '/docs/how-it-works.md'],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toBe(to);
  }
});
