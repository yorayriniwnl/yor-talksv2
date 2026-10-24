import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { complianceJson, installComplianceApiBoundary } from './frontend-compliance-fixtures';

test.use({ video: 'off' });
for (const colorScheme of ['light', 'dark'] as const) {
  test(`companion keeps audio controls clear when the player grows in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.addInitScript(scheme => localStorage.setItem('theme', scheme), colorScheme);
    await installComplianceApiBoundary(page);
    await page.route('**/api/videos/saved*', route => complianceJson(route, [], { hasMore: false, nextCursor: null }));
    await page.goto('/');
    await expect(page.getByRole('article')).toBeVisible();
    const player = page.getByRole('region', { name: 'Ambient audio player' });
    const companion = page.getByRole('complementary', { name: 'On-screen companion' });
    const assertClear = async () => {
      await expect.poll(async () => {
        const audio = await player.boundingBox();
        const pet = await companion.boundingBox();
        return pet!.y + pet!.height <= audio!.y - 4;
      }).toBe(true);
    };
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await assertClear();
      await player.getByRole('button', { name: 'Choose ambience' }).click();
      await expect(player.getByRole('group', { name: 'Generated soundscapes' })).toBeVisible();
      await assertClear();
      await player.getByRole('button', { name: 'Choose ambience' }).click();
      await assertClear();
    }
    await page.goto('/saved');
    await expect(page.getByRole('heading', { name: 'Nothing saved yet.', exact: true })).toBeVisible();
    await assertClear();
    const evidence = path.resolve('docs/audits/frontend-compliance-2026-10-17/evidence/accessibility');
    mkdirSync(evidence, { recursive: true });
    if (colorScheme === 'light') await page.setViewportSize({ width: 390, height: 900 });
    await assertClear();
    await page.screenshot({ path: path.join(evidence, colorScheme === 'light' ? 'navigation-390-light.png' : 'navigation-1440-dark.png'), fullPage: true });
  });
}
