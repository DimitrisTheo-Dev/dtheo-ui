import { expect, test } from '@playwright/test';
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
for (const path of ['/examples/run-review', '/examples/tuning', '/examples/motor-map', '/examples/assistant']) {
  test(`⌘K and the sidebar search open the palette on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
    await page.keyboard.press('ControlOrMeta+k');
    const search = page.getByRole('combobox', { name: 'Search commands' });
    await expect(search).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(search).toBeHidden();
    await page.locator('[data-slot="sidebar"]').getByRole('button', { name: /^Search/ }).click();
    await expect(search).toBeFocused();
    // The sidebar never jumps to a "#" that goes nowhere: unbuilt destinations are disabled, not dead links.
    await expect(page.locator('[data-slot="sidebar-item"][href^="#"]')).toHaveCount(0);
  });
}

test.describe('the Lab assistant on a 14-inch MacBook window', () => {
  test.use({ viewport: { width: 1512, height: 860 } });

  test('runs the action that was clicked, not a suggestion drawn over it', async ({ page }) => {
    await page.goto('/examples/assistant');
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Queue retune (Kp 3.60)' }).click();
    await expect(page.getByText('Retune run queued')).toBeVisible();
    // No question was sent: the conversation still ends with the scripted answer.
    await expect(page.getByText('Summarize today’s failed runs', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('log').getByText('Reading run data…')).toHaveCount(0);
  });
});

test('⌘E exports the run review samples, as the menu says', async ({ page }) => {
  await page.goto('/examples/run-review');
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  await page.keyboard.press('ControlOrMeta+e');
  await expect(page.getByText('Export started')).toBeVisible();
});
