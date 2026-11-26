import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { presets } from '../packages/tokens/src/index.ts';
import { watchErrors } from './helpers';

test('⌘K search finds a component and opens it', async ({ page }) => {
  await page.goto('/docs');
  await page.keyboard.press('ControlOrMeta+k');
  const search = page.getByRole('combobox', { name: 'Search commands' });
  await expect(search).toBeFocused();
  // One field in its own window: the caret shows focus, so the input draws no ring.
  await expect(search).toHaveCSS('outline-style', 'none');
  await search.fill('number field');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/docs\/components\/number-field$/);
});

test('⌘K search finds a page by what it covers, not only by its name', async ({ page }) => {
  await page.goto('/docs');
  await page.keyboard.press('ControlOrMeta+k');
  const search = page.getByRole('combobox', { name: 'Search commands' });
  // The words a launch review typed and got nothing for, with the page each one should find.
  for (const [query, title] of [
    ['Bode', 'Frequency chart'],
    ['Cpk', 'Histogram'],
    ['MCP', 'For agents'],
    ['contrast', 'Color'],
    ['tokens', 'Theming'],
    ['limit', 'Line chart'],
    ['dark mode', 'Theming'],
    ['telemetry', 'Stream chart'],
    ['shadcn', 'Installation'],
  ]) {
    await search.fill(query);
    // The name itself must show, not only a long description beside it.
    const option = page.getByRole('option', { name: new RegExp(`^${title}`) });
    await expect(option.getByText(title, { exact: true }), query).toBeVisible();
  }
  // A name still wins: other pages mention tables, but Enter opens the Table page.
  await search.fill('table');
  await expect(page.getByRole('option').first()).toHaveText(/^Table/);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/docs\/components\/table$/);
});

test('⌘K search says what to try when nothing matches', async ({ page }) => {
  await page.goto('/docs');
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox', { name: 'Search commands' }).fill('qwertyuiop');
  await expect(page.getByText(/^No pages match\. Try a component name/)).toBeVisible();
  await page.getByRole('button', { name: 'Browse all components' }).click();
  await expect(page).toHaveURL(/\/docs\/components$/);
  await expect(page.getByRole('combobox', { name: 'Search commands' })).toBeHidden();
});

test('the theme toggle switches and survives a reload', async ({ page }) => {
  await page.goto('/docs');
  const html = page.locator('html');
  await expect(html).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(html).not.toHaveClass(/dark/);
  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
});

test('archiving a run asks first, then confirms with a toast', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/examples/run-review');
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Archive run…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Archive R-0412?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Keep run' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Archive run' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('R-0412 archived')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a run is never offered for comparison with itself', async ({ page }) => {
  await page.goto('/examples/run-review');
  await page.getByRole('button', { name: 'Actions for R-0412' }).click();
  let menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Open R-0412' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Compare with/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  // The reference run compares with R-0412 but is already the reference.
  await page.getByRole('button', { name: 'Actions for R-0409' }).click();
  menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Compare with R-0412' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Set as reference' })).toHaveCount(0);
});

test('the retune dialog explains an invalid gain and blocks the run', async ({ page }) => {
  await page.goto('/examples/run-review');
  await page.getByRole('button', { name: 'Queue retune run' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Queue a retune run' });
  const kp = dialog.getByRole('textbox', { name: 'Kp' });
  await kp.fill('4.5');
  await kp.blur();
  await expect(dialog.getByText('Lower Kp below 4.20 to reduce overshoot.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Queue run' })).toBeDisabled();
  await kp.fill('3.6');
  await kp.blur();
  await dialog.getByRole('button', { name: 'Queue run' }).click();
  await expect(page.getByText('Retune run queued')).toBeVisible();
});

test('a chart can be read with the keyboard', async ({ page }) => {
  await page.goto('/docs/charts/line-chart');
  const chart = page.locator('[data-slot="line-chart"]').first();
  await chart.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('End');
  // The live region announces the reading at the cursor.
  await expect(chart.locator('[aria-live]')).not.toBeEmpty();
});

test('loading buttons keep their name and width', async ({ page }) => {
  await page.goto('/docs/components/button');
  const button = page.getByRole('button', { name: 'Queue retune run' }).first();
  const before = await button.boundingBox();
  await button.click();
  await expect(button).toHaveAttribute('aria-busy', 'true');
  const during = await button.boundingBox();
  expect(Math.round(during!.width)).toBe(Math.round(before!.width));
});

test('the phone navigation opens and closes @phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout only');
  await page.goto('/examples/run-review');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const nav = page.getByRole('dialog', { name: 'Navigation' });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: /Motor maps/ }).click();
  await expect(page).toHaveURL(/\/examples\/motor-map$/);
});

test('shift-click selects every row in between, like a mail inbox', async ({ page }) => {
  await page.goto('/docs/patterns/data-table');
  // Five rows per page: click the first, Shift-click the fourth.
  const box = (i: number) =>
    page
      .getByRole('row')
      .nth(i + 1)
      .getByRole('checkbox');
  await box(0).click();
  await box(3).click({ modifiers: ['Shift'] });
  for (const i of [0, 1, 2, 3]) await expect(box(i)).toBeChecked();
  await expect(box(4)).not.toBeChecked();
  await expect(page.getByText('4 selected')).toBeVisible();
  // A Shift-click that clears takes the range with it, from the last row clicked.
  await box(1).click({ modifiers: ['Shift'] });
  for (const i of [1, 2, 3]) await expect(box(i)).not.toBeChecked();
  await expect(box(0)).toBeChecked();
});

test('get started turns two choices into one command', async ({ page }) => {
  await page.goto('/docs');
  const main = page.getByRole('main');
  await expect(main.getByText('Pick what you are building')).toBeVisible();
  // The whole card is the target, not just its checkbox.
  await main.getByText('Data table', { exact: true }).click();
  await expect(main.getByRole('checkbox', { name: /Data table/ })).toBeChecked();
  const terminal = main.locator('pre').first();
  await expect(terminal).toContainText('npx dtheo add table input-group select checkbox menu empty');
  await main.getByText('Your agent', { exact: true }).click();
  await expect(main.locator('pre').first()).toContainText('claude mcp add');
  await expect(main.getByText(/^Build a data table with the dtheo\/ui design system\./)).toBeVisible();
  await expect(main.getByRole('link', { name: 'Data table pattern' })).toBeVisible();
});

test('get started points to docs pages, never to an example app', async ({ page }) => {
  await page.goto('/docs');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const main = page.getByRole('main');
  for (const name of ['Dashboard', 'Data table', 'Forms', 'Settings']) {
    await main.getByText(name, { exact: true }).click();
  }
  await expect(main.getByRole('link', { name: 'Charts' })).toBeVisible();
  await expect(main.locator('a[href^="/examples"]')).toHaveCount(0);
});

test('the sidebar filter stays at the top while the list scrolls', async ({ page }) => {
  await page.goto('/docs/components/button');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const aside = page.getByRole('complementary', { name: 'Docs sidebar' });
  await aside.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(aside.getByRole('searchbox', { name: 'Filter the docs' })).toBeInViewport();
  await page.keyboard.press('/');
  await page.keyboard.type('tooltip');
  await expect(aside.getByRole('link', { name: 'Tooltip' })).toBeVisible();
});

test('a card pressed at its very edge still selects', async ({ page }) => {
  await page.goto('/docs');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const card = page.getByRole('list', { name: 'Pick one or more' }).getByRole('listitem').first();
  const box = (await card.boundingBox())!;
  // Hold long enough for the press animation to finish, then release 1 px inside the edge.
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  await expect(card.getByRole('checkbox')).toBeChecked();
});

test('a link styled as a button is still a link', async ({ page }) => {
  await page.goto('/');
  const start = page.getByRole('main').getByRole('link', { name: 'Get started' });
  await expect(start).toBeVisible();
  await expect(start).not.toHaveAttribute('role', 'button');
});

// Every Actuator Lab tool shows the same "Search ⌘K" box in its sidebar, so every one of them must answer to it.
for (const path of [
  '/examples/run-history',
  '/examples/run-review',
  '/examples/tuning',
  '/examples/motor-map',
  '/examples/assistant',
]) {
  test(`⌘K and the sidebar search open the palette on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
    await page.keyboard.press('ControlOrMeta+k');
    const search = page.getByRole('combobox', { name: 'Search commands' });
    await expect(search).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(search).toBeHidden();
    await page
      .locator('[data-slot="sidebar"]')
      .getByRole('button', { name: /^Search/ })
      .click();
    await expect(search).toBeFocused();
    // The sidebar never jumps to a "#" that goes nowhere: unbuilt destinations are disabled, not dead links.
    await expect(page.locator('[data-slot="sidebar-item"][href^="#"]')).toHaveCount(0);
  });
}

const middle = (box: { y: number; height: number }) => box.y + box.height / 2;

// The composer's fade sits over the end of the thread. It used to take the clicks meant for the message actions it
// fades over, so at laptop sizes "Queue retune" did nothing, or a click landed on a suggestion and sent that instead.
// Put the button under the fade and click where it is drawn, the way a person does.
for (const [width, height] of [
  [1280, 900],
  [1440, 900],
  [1512, 860],
] as const) {
  test(`the assistant's actions take a click through the composer's fade at ${width} × ${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/examples/assistant');
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
    const action = page.getByRole('button', { name: 'Queue retune (Kp 3.60)' });
    const fade = page.locator('#composer').locator('xpath=ancestor::form/..');
    // Scroll the thread so the button's middle sits 16 px into the fade (its top 40 px are padding).
    const offset = middle((await action.boundingBox())!) - ((await fade.boundingBox())!.y + 16);
    await page
      .locator('[data-slot="app-main"]')
      .evaluate((el, top) => el.scrollBy({ top, behavior: 'instant' }), offset);
    const box = (await action.boundingBox())!;
    const top = (await fade.boundingBox())!.y;
    expect(middle(box)).toBeGreaterThan(top);
    expect(middle(box)).toBeLessThan(top + 40);
    await page.mouse.click(box.x + box.width / 2, middle(box));
    await expect(page.getByText('Retune run queued')).toBeVisible();
    // Nothing was sent: the suggestions are still offered.
    await expect(page.getByRole('button', { name: 'Summarize today’s failed runs' })).toBeVisible();
  });
}

test('⌘E downloads the run review samples, as the menu says', async ({ page }) => {
  await page.goto('/examples/run-review');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const download = page.waitForEvent('download');
  await page.keyboard.press('ControlOrMeta+e');
  const file = await download;
  expect(file.suggestedFilename()).toBe('r-0412-samples.csv');
  const lines = readFileSync(await file.path(), 'utf8')
    .trim()
    .split('\n');
  expect(lines[0]).toBe(
    'time_ms,command_Nm,torque_Nm,reference_torque_Nm,phase_current_A,reference_phase_current_A',
  );
  expect(lines).toHaveLength(1002);
  await expect(page.getByText('Exported r-0412-samples.csv')).toBeVisible();
});

// ---------- Run history: the data table at full size ----------

test('run history filters with live counts, and says what hides the rest', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/examples/run-history');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const table = page.getByRole('table', { name: 'Runs on RA-14 hip pitch' });
  await expect(table).toHaveAttribute('aria-rowcount', '413');
  // 412 rows, but only the ones in view are in the page.
  expect(await table.locator('tbody tr[data-index]').count()).toBeLessThan(60);

  await page.getByRole('button', { name: /^Filter by Result/ }).click();
  await page.getByRole('menuitemcheckbox', { name: /Fail/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText(/^21 of 412 runs, filtered$/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Filter by Result.*Fail/ })).toBeVisible();

  await page.getByRole('textbox', { name: 'Search runs' }).fill('R-9');
  await expect(page.getByText('No runs match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByText(/^412 of 412 runs$/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('run history moves through rows with the keyboard and opens the reviewed run', async ({ page }) => {
  await page.goto('/examples/run-history');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const rows = page.locator('[data-slot="data-table"] tbody tr[data-index]');
  await rows.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toBeFocused();
  await expect(page.getByRole('heading', { level: 2, name: /R-0411/ })).toBeVisible();
  // End reaches the oldest run, far outside the first window, and it is drawn and focused.
  await page.keyboard.press('End');
  await expect(page.locator('tr[aria-rowindex="413"]')).toBeFocused();
  await expect(page.getByRole('heading', { level: 2, name: /R-0001/ })).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/examples\/run-review$/);
});

test('Tab brings a run history header into view with its whole focus ring @phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'the table scrolls sideways only on a phone');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/examples/run-history');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const area = page.locator('[data-slot="data-table"]');
  const rise = area.getByRole('button', { name: /^Rise/ });
  // Arrive the way a keyboard user does: Tab across the header from the first sort button.
  await area.getByRole('button', { name: /^Run/ }).focus();
  await area.evaluate((el) => el.scrollTo({ left: 0 }));
  for (let i = 0; i < 8 && !(await rise.evaluate((el) => el === document.activeElement)); i++)
    await page.keyboard.press('Tab');
  await expect(rise).toBeFocused();
  const [button, edge] = await Promise.all([rise.boundingBox(), area.boundingBox()]);
  // The ring is a 2px line 2px out from the button.
  expect(button!.x - 4).toBeGreaterThanOrEqual(edge!.x);
  expect(button!.x + button!.width + 4).toBeLessThanOrEqual(edge!.x + edge!.width);
});

test('run history shows every result badge whole, without an ellipsis', async ({ page }) => {
  await page.goto('/examples/run-history');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const cut = await page.locator('[data-slot="data-table"] td [data-slot="badge"]').evaluateAll((badges) =>
    badges
      .filter((badge) => {
        // A cell clips its content with an ellipsis, so the badge must fit inside the cell's padding.
        const cell = badge.closest('td')!;
        const room = cell.getBoundingClientRect().right - parseFloat(getComputedStyle(cell).paddingRight);
        return badge.getBoundingClientRect().right > room + 0.5;
      })
      .map((badge) => badge.textContent),
  );
  expect(cut).toEqual([]);
});

test('run history compares checked runs side by side', async ({ page }) => {
  await page.goto('/examples/run-history');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  await page.getByRole('checkbox', { name: 'Select R-0412' }).click();
  await expect(page.getByText('check one more to compare')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Select R-0409' }).click({ modifiers: ['Shift'] });
  await expect(page.getByText(/^4 selected/)).toBeVisible();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare 4 runs' });
  await expect(dialog.getByRole('table')).toBeVisible();
  // R-0412 overshoots 17.6 %: marked in words for a screen reader, not only in red.
  await expect(
    dialog
      .getByRole('row', { name: /^Overshoot/ })
      .getByText(', over the limit')
      .first(),
  ).toBeAttached();
});

test('run history keeps each preview state in the URL', async ({ page }) => {
  for (const [state, text] of [
    ['empty', 'No runs on RA-14 yet'],
    ['no-results', 'No runs match these filters'],
    ['error', 'Runs could not be loaded'],
    ['partial', /Peak current is missing for \d+ runs/],
  ] as const) {
    await page.goto(`/examples/run-history?state=${state}`);
    await expect(page.getByText(text)).toBeVisible();
  }
  await page.getByRole('button', { name: /State: Partial data/ }).click();
  await page.getByRole('menuitemradio', { name: /Live data/ }).click();
  await expect(page).toHaveURL(/\/examples\/run-history$/);
});

// Each tool previews the states it can be in, and each state says what failed and what still holds.
for (const [path, state, text] of [
  ['/examples/run-review', 'error', 'Traces could not be loaded'],
  ['/examples/run-review', 'partial', 'Phase current was not recorded'],
  ['/examples/motor-map', 'error', /Sweep .* could not be loaded/],
  ['/examples/tuning', 'error', 'Bench 3 is not streaming'],
  ['/examples/tuning', 'partial', 'No vibration data for R-0412'],
] as const) {
  test(`${path} previews its ${state} state, and Retry or the menu returns to live data`, async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto(`${path}?state=${state}`);
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
    const message = page.getByText(text, { exact: typeof text === 'string' });
    await expect(message).toBeVisible();
    const retry = page.getByRole('button', { name: 'Retry' });
    if (state === 'error') await retry.click();
    else {
      await page.getByRole('button', { name: /^State:/ }).click();
      await page.getByRole('menuitemradio', { name: /Live data/ }).click();
    }
    await expect(message).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    expect(errors).toEqual([]);
  });
}

// The landing hero shows the agent's result working, not a picture of it.
test('the landing demo card sends a test, saves, and names its icon-only button', async ({ page }) => {
  await page.goto('/');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const hero = page.locator('main > section').first();
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText('Build clean UIs with your coding agent.');
  await hero.getByRole('button', { name: 'Send a test message' }).click();
  await expect(hero.getByRole('status')).toHaveText('Test message sent to #releases');
  await hero.getByRole('switch', { name: 'Weekly summary' }).click();
  await expect(hero.getByRole('status')).toHaveText('');
  await hero.getByRole('button', { name: 'Save changes' }).click();
  await expect(hero.getByRole('status')).toHaveText('Saved');
});

// The generated stylesheet decides which colors a preset scope gets from the mode classes around it. These are the
// nestings it promises, read back from the browser rather than from the selectors.
test('a preset scope takes the nearest mode, and a mode scope inside it keeps its corners', async ({
  page,
}) => {
  await page.goto('/docs');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  const carbon = presets.find((p) => p.id === 'carbon')!;
  const graphite = presets.find((p) => p.id === 'graphite')!;
  const read = (root: 'dark' | 'light', html: string) =>
    page.evaluate(
      ([mode, markup]) => {
        const rootEl = document.documentElement;
        const before = rootEl.className;
        rootEl.classList.remove('dark', 'light');
        if (mode === 'dark') rootEl.classList.add('dark');
        const host = document.createElement('div');
        host.innerHTML = markup!;
        document.body.append(host);
        const style = getComputedStyle(host.querySelector('[data-probe]')!);
        const out = {
          background: style.getPropertyValue('--background').trim(),
          radius: style.getPropertyValue('--radius-control').trim(),
          scheme: style.colorScheme,
        };
        host.remove();
        rootEl.className = before;
        return out;
      },
      [root, html] as const,
    );
  const radius = carbon.geometry['radius-control'];
  // The build pipeline rewrites color syntax, so each nesting is compared with a scope that names its own mode.
  const light = (await read('light', '<div class="light" data-preset="carbon" data-probe></div>')).background;
  const dark = (await read('light', '<div class="dark" data-preset="carbon" data-probe></div>')).background;
  const graphiteLight = await read('light', '<div data-probe></div>');
  expect(new Set([light, dark, graphiteLight.background]).size).toBe(3);
  expect(graphiteLight.radius).toBe(graphite.geometry['radius-control']);

  // On a dark page a preset with no mode of its own is dark; on a light page, light.
  expect(await read('dark', '<div data-preset="carbon" data-probe></div>')).toMatchObject({
    background: dark,
    radius,
  });
  expect(await read('light', '<div data-preset="carbon" data-probe></div>')).toMatchObject({
    background: light,
    radius,
  });
  // Its own class wins over the page.
  expect((await read('dark', '<div class="light" data-preset="carbon" data-probe></div>')).background).toBe(
    light,
  );
  // A light scope between a dark page and the preset is the nearer mode, and color-scheme agrees with the colors.
  expect(
    await read('dark', '<div class="light"><div data-preset="carbon" data-probe></div></div>'),
  ).toMatchObject({ background: light, scheme: 'light' });
  expect(
    (await read('light', '<div class="dark"><div data-preset="carbon" data-probe></div></div>')).background,
  ).toBe(dark);
  // A mode scope inside the preset changes its colors and keeps its corners.
  expect(
    await read('dark', '<div data-preset="carbon"><div class="light" data-probe></div></div>'),
  ).toMatchObject({ background: light, radius });
  // And a plain light scope on a dark page is still Graphite, corners included.
  expect(await read('dark', '<div class="light" data-probe></div>')).toEqual(graphiteLight);
});
