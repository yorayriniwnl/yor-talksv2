import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { complianceJson, complianceUser, installComplianceApiBoundary } from './frontend-compliance-fixtures';

const evidenceDirectory = resolve('docs/audits/frontend-compliance-2026-10-17/evidence/accessibility');

// Axe creates transient documents. Keep screenshots/traces without encoding a
// separate video for each document during the multi-route contrast matrix.
test.use({ video: 'off' });

async function audit(page: Page, testInfo: TestInfo, label: string, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
  if (include) builder.include(include);
  const result = await builder.analyze();
  mkdirSync(evidenceDirectory, { recursive: true });
  writeFileSync(resolve(evidenceDirectory, `${label}-axe.json`), JSON.stringify({ url: page.url(), violations: result.violations, incomplete: result.incomplete, passedRules: result.passes.map(rule => rule.id) }, null, 2));
  await testInfo.attach(`${label}-axe.json`, { contentType: 'application/json', body: JSON.stringify({ url: page.url(), violations: result.violations, incomplete: result.incomplete }, null, 2) });
  expect(result.violations, `axe violations on ${label}`).toEqual([]);
}

async function expectFocusTrapped(page: Page, dialog: Locator) {
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let step = 0; step < 24; step++) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
  }
}

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`principal navigation and empty states at ${width}px in ${colorScheme} mode`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', entry => { if (entry.type() === 'error') errors.push(entry.text()); });
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.addInitScript(scheme => localStorage.setItem('theme', scheme), colorScheme);
      await installComplianceApiBoundary(page);
      await page.route('**/api/videos/saved*', route => complianceJson(route, [], { hasMore: false, nextCursor: null }));
      for (const path of ['/', '/explore', '/messages', '/notifications', '/worlds', '/saved']) {
        await page.goto(path);
        await expect(page.locator('#main-content')).toBeVisible();
        await expect(page.locator('.premium-topbar__heading')).toBeVisible();
        if (path === '/') await expect(page.getByRole('article')).toBeVisible();
        if (path === '/explore') await expect(page.getByRole('button', { name: 'Open post: A real signal delivered through the feed boundary.' })).toBeVisible();
        if (path === '/messages') await expect(page.locator('.operator-inbox__empty').getByRole('button', { name: 'Start a conversation', exact: true })).toBeVisible();
        if (path === '/notifications') await expect(page.locator('.operator-activity-empty')).toBeVisible();
        if (path === '/worlds') await expect(page.getByRole('heading', { name: 'No world matches that signal.', exact: true })).toBeVisible();
        if (path === '/saved') await expect(page.getByRole('heading', { name: 'Nothing saved yet.', exact: true })).toBeVisible();
        const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
        expect(dimensions.document, `Horizontal overflow at ${path}`).toBeLessThanOrEqual(dimensions.viewport + 1);
        await audit(page, testInfo, `${path.slice(1) || 'home'}-${width}-${colorScheme}`);
        if (width < 1024) {
          const navigation = await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).boundingBox();
          const player = await page.getByRole('region', { name: 'Ambient audio player' }).boundingBox();
          expect(player!.y + player!.height, 'Audio controls must stay above the mobile navigation').toBeLessThanOrEqual(navigation!.y);
        }
      }
      expect(errors).toEqual([]);
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach(`navigation-${width}-${colorScheme}.png`, { contentType: 'image/png', body: screenshot });
      if (width === 390 || width === 1440) writeFileSync(resolve(evidenceDirectory, `navigation-${width}-${colorScheme}.png`), screenshot);
    });
  }

  test(`composer, search, and story support keyboard cancellation and restored focus in ${colorScheme} mode`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 640 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.addInitScript(scheme => localStorage.setItem('theme', scheme), colorScheme);
    await installComplianceApiBoundary(page);
    const stories = [0, 1].map(index => ({ id: `90000000-0000-4000-8000-00000000000${index}`, authorId: complianceUser.id, type: 'text', textContent: `Synthetic readable story ${index + 1}`, backgroundGradient: 'linear-gradient(135deg, #18181b, #27272a)', createdAt: '2026-10-17T12:00:00.000Z', expiresAt: '2099-10-18T12:00:00.000Z', viewerIds: [complianceUser.id], audience: 'public', contentRating: 'regular', contentCategory: 'technology' }));
    const voiceStory = { ...stories[0], id: '90000000-0000-4000-8000-000000000002', type: 'voice', textContent: 'Synthetic voice description', mediaUrl: `data:audio/wav;base64,${readFileSync(new URL('./fixtures/delivery.wav', import.meta.url)).toString('base64')}` };
    await page.route('**/api/stories', route => complianceJson(route, [...stories, voiceStory]));
    await page.goto('/');
    await expect(page.getByRole('article')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();

    const create = page.getByRole('button', { name: 'Create post', exact: true });
    await create.focus();
    await page.keyboard.press('Enter');
    const composer = page.getByRole('dialog', { name: 'Create post', exact: true });
    await expect(composer).toBeVisible();
    await composer.getByRole('button', { name: 'Add a poll', exact: true }).click();
    await expect(composer.getByRole('textbox', { name: 'Write a post' })).toBeVisible();
    const bounds = await composer.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(640);
    expect(await composer.evaluate(element => getComputedStyle(element).overflowY)).toBe('auto');
    await expectFocusTrapped(page, composer);
    await audit(page, testInfo, `composer-${colorScheme}`);
    await page.keyboard.press('Escape');
    await expect(composer).toHaveCount(0);
    await expect(create).toBeFocused();

    const search = page.getByRole('button', { name: 'Search Yor', exact: true });
    await search.focus();
    await page.keyboard.press('Enter');
    const palette = page.getByRole('dialog', { name: 'Search Yor', exact: true });
    await expect(palette.getByRole('combobox', { name: 'Search Yor', exact: true })).toBeFocused();
    await expectFocusTrapped(page, palette);
    await audit(page, testInfo, `search-${colorScheme}`);
    await page.keyboard.press('Escape');
    await expect(palette).toHaveCount(0);
    await expect(search).toBeFocused();

    const storyTrigger = page.getByRole('button', { name: 'Open your story', exact: true });
    await storyTrigger.focus();
    await page.keyboard.press('Enter');
    const story = page.getByRole('dialog', { name: "Ada Lovelace's story", exact: true });
    await expect(story).toBeVisible();
    await expect(story.getByText('Synthetic readable story 1', { exact: true })).toBeVisible();
    await expect(story.getByRole('button', { name: 'Resume story', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(story.getByText('Synthetic readable story 2', { exact: true })).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(story.getByText('Synthetic readable story 1', { exact: true })).toBeVisible();
    await expectFocusTrapped(page, story);
    await audit(page, testInfo, `story-${colorScheme}`);
    const screenshot = await page.screenshot();
    await testInfo.attach(`story-${colorScheme}.png`, { contentType: 'image/png', body: screenshot });
    writeFileSync(resolve(evidenceDirectory, `story-${colorScheme}.png`), screenshot);
    await story.getByRole('button', { name: 'Next story', exact: true }).click();
    await story.getByRole('button', { name: 'Next story', exact: true }).click();
    const audio = story.locator('audio');
    await expect(audio).toBeVisible();
    await audio.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(story.getByText('Synthetic voice description', { exact: true })).toBeVisible();
    await expect(audio).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(story).toHaveCount(0);
    await expect(storyTrigger).toBeFocused();
  });

  test(`populated conversation and chart data expose readable content in ${colorScheme} mode`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.addInitScript(scheme => localStorage.setItem('theme', scheme), colorScheme);
    await installComplianceApiBoundary(page, { ...complianceUser, followerCount: 0 });
    const peer = { ...complianceUser, id: '10000000-0000-4000-8000-000000000999', fullName: 'Synthetic Peer', username: 'peer' };
    const conversation = { id: '20000000-0000-4000-8000-000000000999', participantA: complianceUser.id, participantB: peer.id, participantIds: [complianceUser.id, peer.id], updatedAt: complianceUser.createdAt };
    const originalMessage = { id: '30000000-0000-4000-8000-000000000998', conversationId: conversation.id, senderId: peer.id, recipientId: complianceUser.id, content: 'Earlier synthetic message.', createdAt: complianceUser.createdAt, seenAt: complianceUser.createdAt };
    const message = { ...originalMessage, id: '30000000-0000-4000-8000-000000000999', senderId: complianceUser.id, recipientId: peer.id, content: 'A readable synthetic message.', replyToId: originalMessage.id };
    await page.route('**/api/conversations', route => complianceJson(route, [{ conversation }]));
    await page.route(`**/api/users/${peer.id}`, route => complianceJson(route, peer));
    await page.route('**/api/conversations/*/messages*', route => complianceJson(route, [originalMessage, message]));
    await page.goto(`/messages/${conversation.id}`);
    await expect(page.getByRole('article').getByText(message.content, { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Synthetic unsent draft.');
    const composerBounds = await page.locator('.operator-composer').boundingBox();
    const audioBounds = await page.getByRole('region', { name: 'Ambient audio player' }).boundingBox();
    expect(audioBounds!.y, 'Audio controls must not obscure the message composer').toBeGreaterThanOrEqual(composerBounds!.y + composerBounds!.height);
    await audit(page, testInfo, `populated-messages-${colorScheme}`);
    const messageScreenshot = await page.screenshot();
    writeFileSync(resolve(evidenceDirectory, `message-${colorScheme}.png`), messageScreenshot);
    await testInfo.attach(`message-${colorScheme}.png`, { contentType: 'image/png', body: messageScreenshot });
    await page.goto('/dashboard');
    await expect(page.getByText('Not available', { exact: true })).toBeVisible();
    for (const heading of ['Total Posts', 'Waves Received', 'Followers', 'Engagement Rate']) {
      await expect(page.getByRole('heading', { name: heading, exact: true }).locator('..')).toHaveCSS('opacity', '1');
    }
    const table = page.getByRole('table', { name: 'Current interactions on loaded posts, grouped by publication day' });
    await expect(table).toHaveCount(1);
    await expect(table.getByRole('row')).toHaveCount(8);
    await audit(page, testInfo, `dashboard-${colorScheme}`);
  });
}

test('collapsed sidebar names the profile and additional navigation controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem('yor-sidebar-collapsed', 'true'));
  await installComplianceApiBoundary(page);
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Sidebar navigation', exact: true });
  await expect(navigation.getByRole('button', { name: 'More', exact: true })).toBeVisible();
  await expect(page.locator('aside').getByRole('link', { name: "Open Ada Lovelace's profile (@ada)", exact: true })).toBeVisible();
});

test('install prompt remains named and within a narrow viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await installComplianceApiBoundary(page);
  await page.goto('/');
  await expect(page.getByRole('article')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })));
  const prompt = page.getByRole('region', { name: 'Install Yor Talks', exact: true });
  await expect(prompt).toBeVisible();
  const bounds = await prompt.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  await audit(page, testInfo, 'install-prompt', '[aria-label="Install Yor Talks"]');
  await prompt.getByRole('button', { name: 'Dismiss install prompt', exact: true }).click();
  await expect(prompt).toHaveCount(0);
});
