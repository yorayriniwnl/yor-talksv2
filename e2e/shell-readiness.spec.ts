import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installApiBoundary, json, user } from './helpers/social-boundary';

for (const width of [320, 390, 768]) {
  test(`feature navigation is reachable and keyboard safe at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await installApiBoundary(page);
    await page.goto('/');
    await expect(page.getByRole('article')).toBeVisible();
    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    await trigger.click();
    const menu = page.getByRole('dialog', { name: 'Your corner of Yor' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Private messages', exact: true })).toBeVisible();
    await menu.getByRole('searchbox', { name: 'Find a feature' }).fill('saved');
    await expect(menu.getByRole('link')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await menu.getByRole('searchbox', { name: 'Find a feature' }).fill('saved');
    await menu.getByRole('link', { name: 'Saved', exact: true }).click();
    await expect(page).toHaveURL(/\/saved$/);
    await expect(menu).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`saved-${width}.png`), fullPage: true });
  });
}

test('global search finds remote people, exposes failures, and preserves keyboard focus', async ({ page }) => {
  await installApiBoundary(page);
  let unavailable = true;
  const remote = { ...user, id: '10000000-0000-4000-8000-000000000419', username: 'remote_maya', fullName: 'Maya Outside Your Feed' };
  await page.route('**/api/search?*', route => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Search unavailable' }) })
    : json(route, { users: [remote], posts: [] }));
  await page.goto('/');
  const searchTrigger = page.getByRole('button', { name: 'Search Yor', exact: true });
  await searchTrigger.click();
  const dialog = page.getByRole('dialog', { name: 'Search Yor' });
  const input = dialog.getByRole('combobox');
  await expect(input).toBeFocused();
  await input.fill('Maya');
  await expect(dialog.getByRole('button', { name: 'Retry search' })).toBeVisible();
  await expect(dialog.getByText(/No matches/)).toHaveCount(0);
  unavailable = false;
  await dialog.getByRole('button', { name: 'Retry search' }).click();
  await expect(dialog.getByRole('option', { name: /Maya Outside Your Feed/ })).toBeVisible();
  await input.focus();
  const activeId = await input.getAttribute('aria-activedescendant');
  expect(await page.evaluate(id => document.getElementById(id!)?.getAttribute('aria-selected'), activeId)).toBe('true');
  await input.fill('settings');
  await expect(dialog.getByRole('option', { name: 'Settings', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(searchTrigger).toBeFocused();
  await page.keyboard.press('Control+k');
  await dialog.getByRole('button', { name: 'Browse all features' }).click();
  await expect(dialog.getByRole('option', { name: 'Projects', exact: true })).toBeAttached();
  await input.fill('settings');
  // Route shortcuts remain usable immediately, independently of remote search.
  await input.press('Enter');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator('#main-content')).toBeFocused();
});

test('global search discards a late response after the query changes', async ({ page }) => {
  await installApiBoundary(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/search?*', async route => {
    const query = new URL(route.request().url()).searchParams.get('q');
    if (query === 'older') await held;
    await json(route, { users: [{ ...user, id: query, username: query, fullName: query === 'older' ? 'Old result' : 'Current result' }], posts: [] });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Search Yor', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Search Yor' });
  const input = dialog.getByRole('combobox');
  const olderRequest = page.waitForRequest(request => new URL(request.url()).searchParams.get('q') === 'older');
  await input.fill('older');
  await olderRequest;
  try {
    await input.fill('current');
    await expect(dialog.getByRole('option', { name: /Current result/ })).toBeVisible();
  } finally { release(); }
  await expect(dialog.getByRole('option', { name: /Old result/ })).toHaveCount(0);
  await expect(dialog.getByRole('option', { name: /Current result/ })).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`search and navigation meet accessibility checks in ${colorScheme} mode`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.addInitScript(scheme => localStorage.setItem('theme', scheme), colorScheme);
    await installApiBoundary(page);
    await page.goto('/');
    await expect(page.getByRole('article')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`home-${colorScheme}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    let scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`navigation-${colorScheme}.png`) });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Search Yor', exact: true }).click();
    await expect(page.getByRole('combobox')).toBeFocused();
    scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`search-${colorScheme}.png`) });
  });
}

test('desktop More can collapse while a secondary route is active', async ({ page }) => {
  await installApiBoundary(page);
  await page.goto('/saved');
  const more = page.getByRole('button', { name: 'More', exact: true });
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
});
