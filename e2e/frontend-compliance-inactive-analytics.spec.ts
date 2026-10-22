import { expect, test, type Page } from '@playwright/test';
import { complianceAdultEligibility, complianceUser, installComplianceApiBoundary } from './frontend-compliance-fixtures';

const consentKey = 'yor:telemetry:consent:v1';
const queueKey = 'yor:telemetry:queue:v1';

async function readySettings(page: Page) {
  await page.goto('/settings');
  const content = page.locator('#main-content');
  await expect(content.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  const analytics = content.locator('section').filter({ has: page.getByRole('heading', { name: 'Optional analytics', exact: true }) });
  await expect(analytics.getByText('Optional analytics are off in this release', { exact: true })).toBeVisible();
  return analytics;
}

async function seedPreviousChoice(page: Page) {
  await page.goto('/cookies');
  await expect(page.getByRole('heading', { name: 'Cookies and Browser Storage', exact: true })).toBeVisible();
  await page.evaluate(({ key, owner }) => localStorage.setItem(key, owner), { key: consentKey, owner: complianceUser.id });
}

test('inactive analytics offers no new opt-in and creates no optional storage or telemetry requests', async ({ page }) => {
  await installComplianceApiBoundary(page);
  const optionalRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/telemetry/events')) optionalRequests.push(request.url()); });
  const content = await readySettings(page);
  await expect(content.getByRole('switch', { name: 'Allow optional analytics', exact: true })).toHaveCount(0);
  await expect(content.getByRole('button', { name: 'Clear saved analytics choice', exact: true })).toHaveCount(0);
  await expect(content.getByText('No optional analytics permission is saved for this account on this device.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(content.getByText('Optional analytics are off in this release', { exact: true })).toBeVisible();
  expect(await page.evaluate(([consent, queue]) => [localStorage.getItem(consent), localStorage.getItem(queue)], [consentKey, queueKey])).toEqual([null, null]);
  expect(optionalRequests).toEqual([]);
});

for (const eligible of [true, false]) {
  test(`a previous analytics choice can be cleared and stays cleared for an ${eligible ? 'eligible' : 'ineligible'} account`, async ({ page }) => {
    const decision = eligible ? complianceAdultEligibility : {
      ...complianceAdultEligibility, experience: 'teen_13_17', capabilities: { ...complianceAdultEligibility.capabilities, analytics: false },
    };
    await installComplianceApiBoundary(page, complianceUser, decision);
    const optionalRequests: string[] = [];
    page.on('request', request => { if (request.url().includes('/telemetry/events')) optionalRequests.push(request.url()); });
    await seedPreviousChoice(page);
    const content = await readySettings(page);
    await expect(content.getByText('A previous analytics choice is saved for this account on this device. It does not enable collection. You can remove that choice and any queued optional events here.', { exact: true })).toBeVisible();
    // Seed only a device-local queue; this test never enables a collector or
    // changes the application's authenticated API responses.
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify([{ eventId: 'synthetic-old-event', type: 'navigation' }])), queueKey);
    await content.getByRole('button', { name: 'Clear saved analytics choice', exact: true }).click();
    await expect(content.getByRole('status')).toHaveText('Saved analytics choice and queued optional events removed from this device.');
    expect(await page.evaluate(([consent, queue]) => [localStorage.getItem(consent), localStorage.getItem(queue)], [consentKey, queueKey])).toEqual([null, null]);
    await page.reload();
    await expect(content.getByText('No optional analytics permission is saved for this account on this device.', { exact: true })).toBeVisible();
    await expect(content.getByRole('button', { name: 'Clear saved analytics choice', exact: true })).toHaveCount(0);
    expect(optionalRequests).toEqual([]);
  });
}

test('a blocked storage removal is reported without claiming the saved choice was removed', async ({ page }) => {
  await installComplianceApiBoundary(page);
  await seedPreviousChoice(page);
  const content = await readySettings(page);
  await page.evaluate(key => {
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (candidate) {
      if (candidate === key) throw new DOMException('Synthetic storage removal denial', 'SecurityError');
      return original.call(this, candidate);
    };
  }, consentKey);
  await content.getByRole('button', { name: 'Clear saved analytics choice', exact: true }).click();
  await expect(content.getByRole('alert')).toContainText('your browser could not confirm removal of the saved choice');
  await expect(content.getByRole('status')).toHaveCount(0);
  await expect(content.getByRole('button', { name: 'Clear saved analytics choice', exact: true })).toBeEnabled();
  expect(await page.evaluate(key => localStorage.getItem(key), consentKey)).toBe(complianceUser.id);
});
