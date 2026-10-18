import { expect, test } from '@playwright/test';
import { complianceJson, complianceUser, installComplianceApiBoundary } from './frontend-compliance-fixtures';

test('demonstration routes render local preview art without requesting external stock images or music', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await installComplianceApiBoundary(page);
  const externalMedia: string[] = [];
  page.on('request', request => {
    if (!['image', 'media'].includes(request.resourceType())) return;
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(baseURL!).origin) externalMedia.push(request.url());
  });
  const routes = [
    ['/achievements', 'Your achievements'], ['/bazaar', 'Indie Game Hub'], ['/calendar', 'Esports Schedule & Match Calendar'],
    ['/lounge', 'देसी Spatial Audio Lounge'], ['/overlays', 'Yor Overlay Studio'], ['/podcasts', 'Live Audio Stage & Podcast'],
    ['/points-shop', 'Steam Points Shop'], ['/rankings', 'National Clan Elo & Power Rankings'], ['/predictions', "Esports Pick'em & Predictions Arena"],
    ['/scrims', 'Esports Scrims & Map Veto Hub'], ['/comms', 'Squad Voice Comms & Spatial Matrix'], ['/tournaments', 'Yor Esports Arena'],
  ];
  let localIllustrations = 0;
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true, level: 1 })).toBeVisible();
    const illustrations = page.locator('img[src^="/images/demo-preview-"]');
    if (await illustrations.count()) {
      await expect(illustrations.first()).toHaveJSProperty('complete', true);
      await expect(illustrations.first()).toHaveJSProperty('naturalWidth', 1200);
      localIllustrations++;
    }
  }
  expect(localIllustrations).toBeGreaterThan(0);
  expect(externalMedia).toEqual([]);
});

test('replacing static demo imagery preserves actual server-provided listing media', async ({ page }) => {
  await installComplianceApiBoundary(page);
  // Use the existing permitted upload host; this exact synthetic URL is fully
  // intercepted. An arbitrary .test host is correctly rejected by the CSP.
  const mediaUrl = 'https://res.cloudinary.com/yor-compliance/image/upload/synthetic-upload.svg';
  let mediaRequests = 0;
  await page.route(mediaUrl, async route => {
    mediaRequests++;
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#315e78"/></svg>' });
  });
  await page.route('**/api/products', route => complianceJson(route, [{ id: '40000000-0000-4000-8000-000000000002', sellerId: complianceUser.id,
    title: 'Synthetic uploaded-photo listing', description: 'Browser fixture for real server-provided media handling.', price: 45, images: [mediaUrl], category: 'Other',
    condition: 'used', createdAt: '2026-10-18T00:00:00.000Z', availability: 'active', savedByMe: false, contentRating: 'regular' }]));
  await page.goto('/marketplace');
  const image = page.getByRole('img', { name: 'Synthetic uploaded-photo listing', exact: true });
  await expect(image).toHaveAttribute('src', mediaUrl);
  await expect(image).toHaveJSProperty('naturalWidth', 120);
  expect(mediaRequests).toBeGreaterThan(0);
  await expect(page.getByText('No product photo supplied')).toHaveCount(0);
});
