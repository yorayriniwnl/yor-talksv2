import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { complianceJson, complianceUser, installComplianceApiBoundary } from './frontend-compliance-fixtures';

test.use({ video: 'off' });

for (const scheme of ['light', 'dark'] as const) {
  test(`photo description uses the existing Story text contract, survives retry and is read as image alt in ${scheme}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.addInitScript(value => localStorage.setItem('theme', value), scheme);
    await installComplianceApiBoundary(page);
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    const mediaId = '40000000-0000-4000-8000-000000001019';
    const description = 'An author-entered description of a synthetic fixture photo.';
    let uploaded = 0;
    let published: Record<string, unknown> | null = null;
    const payloads: Record<string, unknown>[] = [];
    await page.route('**/api/highlights', route => complianceJson(route, []));
    await page.route('**/api/media/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/presign')) {
        expect(route.request().postDataJSON()).toMatchObject({ purpose: 'story', mimeType: 'image/png', size: image.length });
        return complianceJson(route, { id: mediaId, mediaId, status: 'pending', purpose: 'story', mimeType: 'image/png', maxFileSize: 5 * 1024 * 1024, mode: 'server', uploadUrl: `/api/media/${mediaId}/upload` });
      }
      if (path.endsWith('/upload')) { uploaded++; return complianceJson(route, { id: mediaId, mediaId, status: 'uploaded' }); }
      if (path.endsWith('/finalize')) return complianceJson(route, { id: mediaId, mediaId, status: 'approved', mimeType: 'image/png', size: image.length, url: `/api/media/${mediaId}/content?token=synthetic.signed` });
      return route.fulfill({ contentType: 'image/png', body: image });
    });
    await page.route('**/api/stories', route => {
      if (route.request().method() === 'GET') return complianceJson(route, published ? [published] : []);
      const payload = route.request().postDataJSON();
      payloads.push(payload);
      if (payloads.length === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Synthetic retryable publication failure' }) });
      published = { ...payload, id: '90000000-0000-4000-8000-000000001019', authorId: complianceUser.id, mediaUrl: `/api/media/${mediaId}/content?token=synthetic.signed`, createdAt: '2026-10-19T00:00:00.000Z', expiresAt: '2099-10-19T00:00:00.000Z', viewerIds: [complianceUser.id] };
      return complianceJson(route, published);
    });
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Add a story', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const builder = page.getByRole('dialog', { name: 'Create Story', exact: true });
    await expect(builder).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(builder).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await builder.getByRole('button', { name: 'Photo Story', exact: true }).click();
    await builder.locator('#story-image-file').setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: image });
    const field = builder.getByRole('textbox', { name: 'Photo description (optional)', exact: true });
    await field.fill(description);
    await expect(builder.getByRole('img', { name: description, exact: true })).toBeVisible();
    await builder.locator('#story-content-category').selectOption('technology');
    expect(await builder.evaluate(element => getComputedStyle(element).overflowY)).toBe('auto');
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const publish = builder.getByRole('button', { name: 'Share Story Live', exact: true });
    await publish.focus();
    await expect(publish).toBeFocused();
    const bounds = await publish.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(640);
    await page.keyboard.press('Enter');
    await expect(publish).toBeEnabled();
    await expect(field).toHaveValue(description);
    expect(payloads).toHaveLength(1);
    await publish.click();
    await expect(builder).toHaveCount(0);
    expect(payloads).toHaveLength(2);
    expect(uploaded).toBe(1);
    for (const payload of payloads) {
      expect(payload).toMatchObject({ type: 'image', textContent: description, mediaId });
      expect(payload).not.toHaveProperty('altText');
    }
    await page.reload();
    await page.getByRole('button', { name: 'Open your story', exact: true }).click();
    const viewer = page.getByRole('dialog', { name: "Ada Lovelace's story", exact: true });
    await expect(viewer.getByRole('img', { name: `Ada Lovelace's story: ${description}`, exact: true })).toBeVisible();
    const viewerAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const directory = resolve('docs/audits/frontend-compliance-2026-10-17/evidence/advanced-accessibility');
    mkdirSync(directory, { recursive: true });
    const report = { scheme, existingContract: 'POST /stories textContent with type=image', authoritativePayloads: payloads, uploadCount: uploaded, builder: { violations: result.violations, incomplete: result.incomplete }, viewer: { violations: viewerAudit.violations, incomplete: viewerAudit.incomplete } };
    writeFileSync(resolve(directory, `story-description-${scheme}.json`), JSON.stringify(report, null, 2));
    await info.attach(`story-description-${scheme}.json`, { contentType: 'application/json', body: JSON.stringify(report, null, 2) });
    expect(result.violations, 'Story builder axe violations').toEqual([]);
    expect(viewerAudit.violations, 'Story viewer axe violations').toEqual([]);
  });
}
