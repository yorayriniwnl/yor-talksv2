import { test, expect } from '@playwright/test';
import { complianceUser, complianceAdultEligibility, complianceJson, installComplianceApiBoundary } from './frontend-compliance-fixtures';

test.describe('enabled push synthetic profile', () => {
  test.setTimeout(120_000);
  test.skip(process.env.FRONTEND_COMPLIANCE_PUSH !== 'true', 'Requires the explicit local push test build; no live provider is contacted.');

  test('push opt-out and teen eligibility suppress permission prompts and subscription requests', async ({ page }) => {
    const requests: string[] = [];
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Notification', { configurable: true, value: class {
        static permission = 'default';
        static requestPermission() { throw new Error('No permission should be requested'); }
      } });
    });
    await installComplianceApiBoundary(page, { ...complianceUser, settings: { ...complianceUser.settings, notificationsEnabled: false } });
    page.on('request', request => { if (request.url().includes('/notifications/push/')) requests.push(request.url()); });
    await page.goto('/settings');
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await page.waitForTimeout(6_000); // Pass the application's five-second opt-in prompt delay.
    await expect(page.getByRole('region', { name: 'Push notification preferences' })).toHaveCount(0);
    expect(requests).toEqual([]);

    await page.route('**/api/users/me', route => complianceJson(route, complianceUser));
    await page.route('**/api/users/me/eligibility', route => complianceJson(route, { ...complianceAdultEligibility, experience: 'teen_13_17', maximumContentRating: 'regular' }));
    await page.reload();
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await page.waitForTimeout(6_000);
    await expect(page.getByRole('region', { name: 'Push notification preferences' })).toHaveCount(0);
    expect(requests).toEqual([]);
  });

  test('push permission is requested only by choice and one subscription is saved', async ({ page }) => {
    let publicKeys = 0;
    let subscriptions = 0;
    await page.addInitScript(() => {
      const state = window as unknown as { permissionRequests: number };
      state.permissionRequests = 0;
      Object.defineProperty(window, 'Notification', { configurable: true, value: class {
        static permission = 'default';
        static async requestPermission() { state.permissionRequests++; return 'granted'; }
      } });
      Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} });
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
        register: async () => ({}),
        ready: Promise.resolve({ pushManager: {
          getSubscription: async () => null,
          subscribe: async () => ({ toJSON: () => ({ endpoint: 'https://push.example.test/disposable', keys: { p256dh: 'synthetic-key', auth: 'synthetic-auth' } }) }),
        } }),
      } });
    });
    await installComplianceApiBoundary(page);
    await page.route('**/api/notifications/push/public-key', route => { publicKeys++; return complianceJson(route, { publicKey: 'AQID' }); });
    await page.route('**/api/notifications/push/subscribe', route => { subscriptions++; return complianceJson(route, { id: 'synthetic-subscription' }); });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/settings');
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    const prompt = page.getByRole('region', { name: 'Push notification preferences' });
    await expect(prompt).toBeVisible({ timeout: 10_000 });
    expect(await page.evaluate(() => (window as unknown as { permissionRequests: number }).permissionRequests)).toBe(0);
    expect(publicKeys).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await prompt.getByRole('button', { name: 'Turn On Alerts' }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => subscriptions).toBe(1);
    expect(publicKeys).toBe(1);
    expect(await page.evaluate(() => (window as unknown as { permissionRequests: number }).permissionRequests)).toBe(1);
    await expect(prompt).toHaveCount(0);
  });
});
