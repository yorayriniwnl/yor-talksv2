import { test, expect } from '@playwright/test';
import { complianceJson, installComplianceApiBoundary } from './frontend-compliance-fixtures';

test('guardian permission outages are retryable and preserve last confirmed records', async ({ page }) => {
  await installComplianceApiBoundary(page);
  let unavailable = true;
  await page.route('**/api/users/me/guardian-authorizations', route => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Synthetic permission outage' }) })
    : complianceJson(route, [{ id: '97000000-0000-4000-8000-000000000001', purposes: ['account_activation'], status: 'granted', expiresAt: '2027-10-18T12:00:00.000Z' }]));
  await page.goto('/eligibility');
  const section = page.getByRole('heading', { name: 'Parent or guardian permissions', exact: true }).locator('..');
  await expect(section.getByRole('alert')).toContainText('could not be refreshed');
  await expect(section.getByText('No parent or guardian permissions are recorded for this account.')).toHaveCount(0);
  unavailable = false;
  await section.getByRole('button', { name: 'Retry permissions' }).click();
  await expect(section.getByText('granted', { exact: true })).toBeVisible();
  await expect(section.getByRole('alert')).toHaveCount(0);
  unavailable = true;
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(section.getByRole('alert')).toContainText('last confirmed records');
  await expect(section.getByText('granted', { exact: true })).toBeVisible();
  await expect(section.getByRole('button', { name: 'Withdraw permission' })).toBeVisible();
});
