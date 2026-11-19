#!/usr/bin/env node
// Captures the example apps for the landing page cards: `pnpm screens` with the dev server on :4100.
// The cards show the real screens, so recapture after a visible change to an example.
import { chromium } from '@playwright/test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '../apps/docs/assets/screens');
const base = process.env.BASE_URL ?? 'http://localhost:4100';
const screens = ['run-review', 'motor-map', 'tuning', 'assistant'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
for (const name of screens) {
  await page.goto(`${base}/examples/${name}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log(`captured ${name}`);
}
await browser.close();
