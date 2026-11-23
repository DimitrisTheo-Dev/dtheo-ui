import { expect, test } from '@playwright/test';
import { components as meta } from '../packages/ui/src/meta/index.ts';

interface Shot {
  name: string;
  path: string;
  locator?: string;
  /** Click the preview's first button or combobox and shoot the viewport. */
  open?: boolean;
}

// Visual regression: a pixel diff of the screens and previews that define the look.
// Update baselines on purpose with `pnpm test:visual --update-snapshots`, then review the diff.
// Screens, and the foundation page whose numbers are easiest to break by accident.
const screens: Shot[] = [
  { name: 'home-hero', path: '/', locator: 'main > section:first-child' },
  { name: 'run-history', path: '/examples/run-history' },
  { name: 'run-review', path: '/examples/run-review' },
  { name: 'motor-map', path: '/examples/motor-map' },
  { name: 'assistant', path: '/examples/assistant' },
  { name: 'color', path: '/docs/foundations/color', locator: 'main' },
];

// Every component and chart, read from the contracts, so a new one cannot ship without a baseline. The live stream
// chart draws a different frame every time and is covered by its own e2e test instead.
const unstable = new Set(['stream-chart']);
const components: Shot[] = meta
  .filter((c) => !unstable.has(c.slug))
  .map((c) => ({
    name: c.slug,
    path: `/docs/${c.package === 'charts' ? 'charts' : 'components'}/${c.slug}`,
    locator: '[data-slot="preview"]',
  }));

// Overlays open: what a reviewer cannot see in a closed preview. Shot as the viewport, where the popup lands.
const open: Shot[] = ['dialog', 'alert-dialog', 'sheet', 'menu', 'popover', 'select'].map((slug) => ({
  name: `${slug}-open`,
  path: `/docs/components/${slug}`,
  open: true,
}));

// The data states of the run history: the screen designed for each of them, not only for live data.
const states: Shot[] = ['loading', 'empty', 'no-results', 'error', 'partial'].map((state) => ({
  name: `run-history-${state}`,
  path: `/examples/run-history?state=${state}`,
}));

const shots = [...screens, ...components, ...open, ...states];

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
      // Shoot the page people see: after React has hydrated, with fonts loaded and motion settled.
      await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
      await page.evaluate(() => document.fonts.ready);
      if (shot.open) {
        await page
          .locator('[data-slot="preview"]')
          .first()
          .locator('button, [role="combobox"]')
          .first()
          .click();
        await page
          .locator('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')
          .first()
          .waitFor();
      }
      const target = shot.locator ? page.locator(shot.locator).first() : page;
      await expect(target).toHaveScreenshot(`${shot.name}-${theme}.png`, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.002,
      });
    });
  }
}
