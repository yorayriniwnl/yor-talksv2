import { test as base, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const test = base.extend<{ demo: Locator }>({
  demo: async ({ page }, use) => {
    const unexpectedRequests: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname !== '/api/auth/refresh') {
        unexpectedRequests.push(`${route.request().method()} ${url.pathname}`);
      }
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, error: 'No active session' }),
      });
    });
    await page.goto('/preregister');
    const demo = page.getByRole('region', { name: 'Yor Talks social preview', exact: true });
    await expect(demo).toBeVisible();
    await use(demo);
    expect(unexpectedRequests, 'Trying the demo must not create accounts, posts, messages or memberships').toEqual([]);
    expect(errors, 'The preview must not throw browser errors').toEqual([]);
  },
});

test('a visitor can save a post, send a message and join a community without signing up', async ({ demo }) => {
  const navigation = demo.getByRole('group', { name: 'Preview Yor Talks features' });
  await demo.getByRole('button', { name: 'Saved', exact: true }).click();
  await expect(demo.getByText('Keep a little inspiration.')).toBeVisible();
  await demo.getByRole('button', { name: 'Explore the feed' }).click();
  await demo.getByRole('button', { name: 'Like sample post' }).click();
  await demo.getByRole('button', { name: 'Save sample post' }).click();
  await demo.getByRole('button', { name: 'Saved', exact: true }).click();
  await expect(demo.getByRole('button', { name: 'Like sample post' })).toHaveAttribute('aria-pressed', 'true');
  await demo.getByRole('button', { name: 'Show sample replies' }).click();
  await expect(demo.getByText('A little more of this, please.')).toBeVisible();
  const reply = demo.getByRole('textbox', { name: 'Reply to the demo post', exact: true });
  await expect(reply).toBeFocused();
  await expect(demo.getByRole('button', { name: 'Send demo reply' })).toBeDisabled();
  await reply.fill('   ');
  await expect(demo.getByRole('button', { name: 'Send demo reply' })).toBeDisabled();
  const thought = 'Love this light. <b>Still just a thought.</b>';
  await reply.fill(thought);
  await reply.press('Enter');
  await expect(demo.getByRole('list', { name: 'Replies to the demo post' })).toContainText(thought);
  await expect(reply).toBeEmpty();
  await expect(reply).toBeFocused();

  await navigation.getByRole('button', { name: 'Messages', exact: true }).click();
  await expect(demo.getByRole('button', { name: 'Send demo message' })).toBeDisabled();
  await demo.getByRole('textbox', { name: 'Message the sample group' }).fill('See you at the photo walk!');
  await demo.getByRole('textbox', { name: 'Message the sample group' }).press('Enter');
  await expect(demo.getByRole('log')).toContainText('See you at the photo walk!');
  await expect(demo.getByRole('textbox', { name: 'Message the sample group' })).toBeEmpty();
  await expect(demo.getByRole('textbox', { name: 'Message the sample group' })).toBeFocused();

  await navigation.getByRole('button', { name: 'Communities', exact: true }).click();
  await demo.getByRole('button', { name: 'On repeat', exact: true }).click();
  await demo.getByRole('button', { name: 'Join community', exact: true }).click();
  await expect(demo.getByRole('button', { name: 'Joined', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await demo.getByRole('button', { name: 'The photo walk', exact: true }).click();
  await expect(demo.getByRole('button', { name: 'Join community', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await demo.getByRole('button', { name: 'On repeat', exact: true }).click();
  await expect(demo.getByRole('button', { name: 'Joined', exact: true })).toBeVisible();
  await navigation.getByRole('button', { name: 'Messages', exact: true }).click();
  await expect(demo.getByRole('log')).toContainText('See you at the photo walk!');
  await navigation.getByRole('button', { name: 'Your feed', exact: true }).click();
  await expect(demo.getByRole('button', { name: 'Save sample post' })).toHaveAttribute('aria-pressed', 'true');
  await expect(demo.getByRole('list', { name: 'Replies to the demo post' })).toContainText(thought);
});

test('a Studio creation keeps its selected look and caption when added to the feed', async ({ demo }) => {
  await demo.getByRole('group', { name: 'Preview Yor Talks features' }).getByRole('button', { name: 'Studio', exact: true }).click();
  await demo.getByRole('button', { name: 'Monochrome', exact: true }).click();
  await expect(demo.getByRole('img', { name: 'Your sample photo with the selected Studio look' })).toHaveCSS('filter', 'grayscale(1) contrast(1.12)');
  const caption = 'An afternoon worth remembering. <script>just text</script>';
  await demo.getByRole('textbox', { name: 'Give it a thought' }).fill(caption);
  await demo.getByRole('button', { name: 'Add to demo feed' }).click();
  await expect(demo.getByRole('region', { name: 'Your feed demo', exact: true })).toBeFocused();
  await expect(demo.getByText(caption, { exact: false })).toBeVisible();
  await expect(demo.getByRole('img', { name: 'Afternoon light over cobalt glass, a film camera, flowers and a handwritten notebook' })).toHaveCSS('filter', 'grayscale(1) contrast(1.12)');
  await demo.getByRole('button', { name: 'Save sample post' }).click();
  await demo.getByRole('button', { name: 'Saved', exact: true }).click();
  await expect(demo.getByText(caption, { exact: false })).toBeVisible();
});

test('the guided tour supports keyboard use and focuses its invitation when finished', async ({ page, demo }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const start = demo.getByRole('button', { name: 'Show me around' });
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(demo.getByRole('region', { name: 'Your feed demo', exact: true })).toBeFocused();
  await expect(demo.getByRole('button', { name: 'Previous tour step' })).toBeDisabled();
  for (const screen of ['Messages', 'Communities', 'Studio']) {
    const next = demo.getByRole('button', { name: 'Next', exact: true });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(demo.getByRole('region', { name: `${screen} demo`, exact: true })).toBeFocused();
  }
  await demo.getByRole('button', { name: 'Finish tour' }).click();
  await expect(demo.getByRole('heading', { name: 'Your world comes next.' })).toBeFocused();
  await expect(demo.getByRole('status')).toContainText('Tour complete.');
  await demo.getByRole('button', { name: 'Keep exploring' }).click();
  await expect(start).toBeVisible();
  await expect(demo.getByRole('region', { name: 'Your feed demo', exact: true })).toBeFocused();
});

for (const width of [375, 1440]) {
  test(`creating a post completes the tour and leads to signup at ${width}px`, async ({ page, demo }) => {
    await page.setViewportSize({ width, height: 900 });
    await demo.getByRole('button', { name: 'Expand demo', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Expanded Yor Talks demo' });
    await dialog.getByRole('button', { name: 'Take the tour', exact: true }).click();
    for (let step = 0; step < 3; step++) {
      await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await dialog.getByRole('button', { name: 'Golden hour', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Give it a thought' }).fill('A first look, made my own.');
    await dialog.getByRole('button', { name: 'Add to demo feed' }).click();
    await expect(dialog.getByRole('region', { name: 'Your feed demo', exact: true })).toBeVisible();
    await expect(dialog.getByText('A first look, made my own.', { exact: false })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Your world comes next.' })).toBeFocused();
    await expect(dialog.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('link', { name: 'Join the launch list', exact: true })).toBeInViewport({ ratio: 1 });
    const accessibility = await new AxeBuilder({ page }).include('dialog').analyze();
    expect(accessibility.violations).toEqual([]);
    await dialog.screenshot({ path: `test-results/yor-demo-tour-complete-${width}.png` });
    await dialog.getByRole('link', { name: 'Join the launch list', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('#pr-signup')).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toBeInViewport();
  });
}

test('expanding preserves the demo, Escape restores focus and the signup link leaves the dialog', async ({ page, demo }) => {
  await demo.getByRole('button', { name: 'Like sample post' }).click();
  const expand = demo.getByRole('button', { name: 'Expand demo' });
  await expand.click();
  const dialog = page.getByRole('dialog', { name: 'Expanded Yor Talks demo' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Like sample post' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(expand).toBeFocused();
  await expand.click();
  await dialog.getByRole('group', { name: 'Preview Yor Talks features' }).getByRole('button', { name: 'Messages', exact: true }).click();
  await dialog.getByRole('link', { name: 'Join Yor Talks to start a conversation' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#pr-signup')).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toBeInViewport();
});

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`all demo screens fit a ${width}px viewport`, async ({ page, demo }) => {
    await page.setViewportSize({ width, height: 900 });
    const navigation = demo.getByRole('group', { name: 'Preview Yor Talks features' });
    for (const screen of ['Your feed', 'Messages', 'Communities', 'Studio']) {
      await navigation.getByRole('button', { name: screen, exact: true }).click();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        panelWidth: document.querySelector('#yd-demo-panel')!.clientWidth,
        panelScrollWidth: document.querySelector('#yd-demo-panel')!.scrollWidth,
      }));
      expect(dimensions.page, `${screen} page overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
      expect(dimensions.panelScrollWidth, `${screen} demo overflow`).toBeLessThanOrEqual(dimensions.panelWidth + 1);
      if (width === 375 || width === 1440) {
        const result = await new AxeBuilder({ page }).include('#pr-demo').analyze();
        expect(result.violations, `${screen} accessibility`).toEqual([]);
        await demo.screenshot({ path: `test-results/yor-demo-${width}-${screen.toLowerCase().replaceAll(' ', '-')}.png` });
      }
    }
    await navigation.getByRole('button', { name: 'Your feed', exact: true }).click();
    await demo.getByRole('button', { name: 'Show sample replies' }).click();
    await demo.getByRole('textbox', { name: 'Reply to the demo post', exact: true }).fill('A small moment worth sharing.');
    await demo.getByRole('button', { name: 'Send demo reply', exact: true }).click();
    if (width === 375 || width === 1440) {
      const replyAccessibility = await new AxeBuilder({ page }).include('#pr-demo').analyze();
      expect(replyAccessibility.violations).toEqual([]);
      await demo.screenshot({ path: `test-results/yor-demo-${width}-replies.png` });
    }
    await demo.getByRole('button', { name: 'Show sample replies' }).click();
    if (width === 375 || width === 1440) {
      await demo.screenshot({ path: `test-results/yor-demo-${width}.png` });
    }
    if (width === 375) {
      await demo.getByRole('button', { name: 'Expand demo' }).click();
      const dialog = page.getByRole('dialog', { name: 'Expanded Yor Talks demo' });
      await dialog.evaluate(element => { element.scrollTop = 300; });
      await expect(dialog.getByRole('button', { name: 'Close expanded demo' })).toBeInViewport();
      const result = await new AxeBuilder({ page }).include('dialog').analyze();
      expect(result.violations).toEqual([]);
      await page.keyboard.press('Escape');
    }
    if (width === 375 || width === 1440) {
      await page.setViewportSize({ width, height: width === 375 ? 1900 : 1520 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `test-results/preregister-app-demo-${width === 375 ? 'mobile' : 'desktop'}.png` });
    }
  });
}
