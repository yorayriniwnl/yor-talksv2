import { expect, test } from '@playwright/test';
import { installApiBoundary, json, post, user } from './helpers/social-boundary';

const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

test('the home and modal composer share an attached draft across SPA navigation', async ({ page }) => {
  await installApiBoundary(page);
  await page.goto('/');
  const home = page.locator('fieldset.yor-composer[data-compact="true"]');
  const draftText = 'Keep this thought and its image while I browse.';
  await home.getByRole('textbox', { name: 'Write a post' }).fill(draftText);
  await home.locator('#home-post-content-category').selectOption('technology');
  await home.locator('input[type="file"]').setInputFiles({ name: 'retained-draft.png', mimeType: 'image/png', buffer: imageBytes });
  const attachment = home.getByRole('img', { name: 'Selected upload' });
  await expect(attachment).toHaveJSProperty('naturalWidth', 1);
  const attachmentUrl = await attachment.getAttribute('src');
  expect(attachmentUrl).toMatch(/^blob:/);

  await page.getByRole('button', { name: 'Create a post', exact: true }).first().click();
  const modal = page.getByRole('dialog', { name: 'Create post', exact: true });
  await expect(modal.getByRole('textbox', { name: 'Write a post' })).toHaveValue(draftText);
  await expect(modal.locator('#post-content-category')).toHaveValue('technology');
  await expect(modal.getByRole('img', { name: 'Selected upload' })).toHaveAttribute('src', attachmentUrl!);
  await modal.getByRole('textbox', { name: 'Write a post' }).fill(`${draftText} One more detail.`);
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(home.getByRole('textbox', { name: 'Write a post' })).toHaveValue(`${draftText} One more detail.`);

  const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await navigation.getByRole('button', { name: 'More', exact: true }).click();
  await navigation.getByRole('button', { name: 'Saved', exact: true }).click();
  await expect(page).toHaveURL(/\/saved$/);
  await expect(home).toHaveCount(0);
  await page.getByRole('button', { name: 'Create a post', exact: true }).first().click();
  await expect(modal.getByRole('textbox', { name: 'Write a post' })).toHaveValue(`${draftText} One more detail.`);
  await expect(modal.getByRole('img', { name: 'Selected upload' })).toHaveAttribute('src', attachmentUrl!);
  await expect(modal.getByRole('img', { name: 'Selected upload' })).toHaveJSProperty('naturalWidth', 1);
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await navigation.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(home.getByRole('textbox', { name: 'Write a post' })).toHaveValue(`${draftText} One more detail.`);
  await expect(home.getByRole('img', { name: 'Selected upload' })).toHaveJSProperty('naturalWidth', 1);
  await home.getByRole('button', { name: 'Remove image', exact: true }).click();
  await expect(home.getByRole('img', { name: 'Selected upload' })).toHaveCount(0);
});

test('duplicate keyboard publication stays locked across composers and a failed draft can retry once', async ({ page }) => {
  await installApiBoundary(page);
  const draftText = 'A failed publication must retain my draft.';
  let writes = 0;
  let releaseFirst!: () => void;
  const firstRequest = new Promise<void>(resolve => { releaseFirst = resolve; });
  await page.route('**/api/posts', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    writes++;
    expect(route.request().postDataJSON()).toMatchObject({ content: draftText, contentCategory: 'technology' });
    if (writes === 1) {
      await firstRequest;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Publication temporarily unavailable' }) });
    }
    return json(route, post(draftText, '292d72b6-6bd1-4693-91e8-b4dc32302c7c'));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a post', exact: true }).first().click();
  const modal = page.getByRole('dialog', { name: 'Create post', exact: true });
  const input = modal.getByRole('textbox', { name: 'Write a post' });
  await input.fill(draftText);
  await modal.locator('#post-content-category').selectOption('technology');
  // Dispatch the repeat keys in one task, before a render can disable the field.
  await input.evaluate(element => {
    for (let repeat = 0; repeat < 3; repeat++) element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, repeat: repeat > 0, bubbles: true, cancelable: true }));
  });
  try {
    await expect.poll(() => writes).toBe(1);
    await expect(input).toBeDisabled();
    await expect(modal.getByRole('button', { name: 'Posting…', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    const home = page.locator('fieldset.yor-composer[data-compact="true"]');
    await expect(home.getByRole('textbox', { name: 'Write a post' })).toHaveValue(draftText);
    await expect(home.getByRole('textbox', { name: 'Write a post' })).toBeDisabled();
    expect(writes).toBe(1);
  } finally { releaseFirst(); }
  const home = page.locator('fieldset.yor-composer[data-compact="true"]');
  await expect(home.getByRole('button', { name: 'Post', exact: true })).toBeEnabled();
  await expect(home.getByRole('textbox', { name: 'Write a post' })).toHaveValue(draftText);
  await expect(home.locator('#home-post-content-category')).toHaveValue('technology');
  await home.getByRole('textbox', { name: 'Write a post' }).press('Control+Enter');
  await expect(page.getByRole('article').getByText(draftText, { exact: true })).toBeVisible();
  await expect(home.getByRole('textbox', { name: 'Write a post' })).toHaveValue('');
  expect(writes).toBe(2);
  expect(await page.evaluate(id => localStorage.getItem(`yor-composer-draft:${id}`), user.id)).toBeNull();
});

test('stories support keyboard navigation, image failure retry, focus containment, and Escape restoration', async ({ page }) => {
  await installApiBoundary(page);
  const createdAt = new Date().toISOString();
  const common = { authorId: user.id, viewerIds: [] as string[], reactions: [], createdAt, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), audience: 'public', contentCategory: 'technology', contentRating: 'regular' };
  const stories = [
    { ...common, id: '50000000-0000-4000-8000-000000000301', type: 'text', mediaUrl: '', textContent: 'A keyboard-accessible story.', backgroundGradient: 'from-fuchsia-600 via-purple-900 to-black' },
    { ...common, id: '50000000-0000-4000-8000-000000000302', type: 'image', mediaUrl: '/feed-readiness-story.png', textContent: '' },
  ];
  const viewed: string[] = [];
  await page.route('**/api/stories', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    return json(route, stories);
  });
  for (const story of stories) await page.route(`**/api/stories/${story.id}/view`, route => {
    expect(route.request().method()).toBe('POST');
    viewed.push(story.id);
    return json(route, { ...story, viewerIds: [user.id] });
  });
  let mediaRequests = 0;
  await page.route('**/feed-readiness-story.png', route => {
    mediaRequests++;
    return mediaRequests === 1
      ? route.fulfill({ status: 503, contentType: 'text/plain', body: 'Temporarily unavailable' })
      : route.fulfill({ status: 200, contentType: 'image/png', body: imageBytes });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open your story', exact: true });
  await trigger.click();
  const viewer = page.getByRole('dialog', { name: 'Stories by Ada Lovelace', exact: true });
  await expect(viewer.getByRole('button', { name: 'Close stories', exact: true })).toBeFocused();
  await expect(viewer.getByText('A keyboard-accessible story.', { exact: true })).toBeVisible();
  const pause = viewer.getByRole('button', { name: 'Pause story', exact: true });
  await pause.focus();
  await page.keyboard.press('Enter');
  await expect(viewer.getByRole('button', { name: 'Resume story', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(viewer.getByText('Story 2 of 2', { exact: true })).toBeVisible();
  await expect(viewer.getByText('This story could not be loaded.', { exact: true })).toBeVisible();
  await viewer.getByRole('button', { name: 'Retry story', exact: true }).click();
  await expect(viewer.getByRole('img', { name: "Ada Lovelace's story", exact: true })).toHaveJSProperty('naturalWidth', 1);
  expect(mediaRequests).toBe(2);
  await viewer.getByRole('button', { name: 'Close stories', exact: true }).focus();
  for (let index = 0; index < 12; index++) await page.keyboard.press('Tab');
  expect(await viewer.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await viewer.getByRole('button', { name: 'Close stories', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(viewer.getByText('Story 1 of 2', { exact: true })).toBeVisible();
  await expect(viewer.getByText('A keyboard-accessible story.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(viewed).toEqual(stories.map(story => story.id));
});
