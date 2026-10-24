import { expect, test } from '@playwright/test';
import { complianceJson, complianceUser, installComplianceApiBoundary } from './frontend-compliance-fixtures';

// All prices, identities, orders and policies in this file are synthetic fixtures.
const plan = { key: 'compliance-synthetic', name: 'Synthetic Premium', priceMinor: 19900, currency: 'INR', durationDays: 30,
  features: ['MESSAGE_FONT'], termsVersion: 'synthetic-1', refundPolicy: 'Synthetic policy only: contact test support for refund review.' };
const order = { id: '962a9d20-cbe9-45ef-873b-772eaa991670', providerOrderId: 'order_syntheticCompliance', amountMinor: 19900,
  currency: 'INR', status: 'created', lastPaymentStatus: null, createdAt: '2026-10-17T00:00:00.000Z', paidAt: null, plan, keyId: 'rzp_test_synthetic' };
const premium = { catalog: { available: true, plan, operationalFeatures: { MESSAGE_FONT: true }, automaticRenewal: false,
  billingModel: 'prepaid_fixed_term', testMode: true, supportEmail: 'support@example.test' }, subscription: null, orders: [], enabledFeatures: {} };

test('disabled payments override an available Premium catalog while recovery and cancellation remain usable', async ({ page }) => {
  test.skip(process.env.FRONTEND_COMPLIANCE_PAYMENTS === 'true', 'Covers the default build, where payments are disabled.');
  await installComplianceApiBoundary(page);
  let pending = false, cancellations = 0, recoveries = 0;
  const providerRequests: string[] = [];
  const writes: string[] = [];
  page.on('request', request => { if (request.url().includes('razorpay.com')) providerRequests.push(request.url()); });
  await page.route('**/api/premium/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'GET' && path === '/api/premium/me') return complianceJson(route, { ...premium, orders: pending ? [order] : [] });
    writes.push(path);
    if (path.endsWith('/recover')) { recoveries++; return complianceJson(route, { ...premium, orders: [order] }); }
    if (path.endsWith('/cancel')) { cancellations++; return complianceJson(route, { ...premium, orders: [{ ...order, status: 'cancelled' }] }); }
    throw new Error(`Unexpected Premium mutation: ${path}`);
  });
  await page.goto('/premium');
  await expect(page.getByText(/Premium checkout is paused/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upgrade to Yor Premium' })).toBeDisabled();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByText(plan.refundPolicy)).toBeVisible();
  await expect(page.getByText('Curated message styles', { exact: true })).toBeVisible();
  await expect(page.getByText('Optional private Story viewing', { exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
  pending = true;
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume checkout' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Recover payment', exact: true }).click();
  await expect.poll(() => recoveries).toBe(1);
  await page.getByRole('button', { name: 'Cancel checkout', exact: true }).click();
  await expect.poll(() => cancellations).toBe(1);
  expect(providerRequests).toEqual([]);
  expect(writes.some(path => path === '/api/premium/orders')).toBe(false);
});

test('disabled creator payments cannot resume a created provider order and still allow cancellation', async ({ page }) => {
  await installComplianceApiBoundary(page);
  const item = { checkoutId: order.id, product: 'membership', providerOrderId: order.providerOrderId, status: 'created', providerState: 'created',
    lastPaymentStatus: null, amountMinor: 4900, currency: 'INR', createdAt: order.createdAt, subscriptionId: null, keyId: 'rzp_test_synthetic' };
  let cancelled = false;
  const providerRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('razorpay.com')) providerRequests.push(request.url()); });
  await page.route('**/api/billing/checkouts**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'GET') return complianceJson(route, [item]);
    if (path.endsWith('/cancel')) { cancelled = true; return complianceJson(route, [{ ...item, status: 'cancelled' }]); }
    throw new Error(`Unexpected billing mutation: ${path}`);
  });
  await page.goto('/billing');
  await expect(page.getByText(/Payments are paused for this beta/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue payment' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Recover payment status' })).toBeEnabled();
  await page.getByRole('button', { name: 'Cancel pending checkout' }).click();
  await expect.poll(() => cancelled).toBe(true);
  await expect(page.getByText('cancelled', { exact: true })).toBeVisible();
  expect(providerRequests).toEqual([]);
});

test('marketplace missing product imagery is explicit and save controls are named', async ({ page }) => {
  await installComplianceApiBoundary(page);
  await page.route('**/api/products', route => complianceJson(route, [{ id: '40000000-0000-4000-8000-000000000001', sellerId: complianceUser.id,
    title: 'Synthetic photo-free listing', description: 'Synthetic listing for image fallback verification.', price: 45, images: [], category: 'Other',
    condition: 'used', createdAt: order.createdAt, availability: 'active', savedByMe: false, contentRating: 'regular' }]));
  const stockRequests: string[] = [];
  page.on('request', request => { if (/picsum|unsplash/.test(request.url())) stockRequests.push(request.url()); });
  await page.goto('/marketplace');
  await expect(page.getByText('No product photo supplied')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Synthetic photo-free listing' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Buy now' })).toHaveCount(0);
  expect(stockRequests).toEqual([]);
});

test('illustrative activity and pass progress cannot read as genuine audience or urgency', async ({ page }) => {
  await installComplianceApiBoundary(page);
  await page.route('https://images.unsplash.com/**', route => route.abort());
  await page.goto('/podcasts');
  await expect(page.getByText('Illustrative speakers and audience counts. Live audio is not connected.')).toBeVisible();
  await expect(page.getByText(/Active Listeners|LIVE STAGE SPEAKERS/)).toHaveCount(0);
  await expect(page.getByText(/sample listeners/).first()).toBeVisible();
  await page.goto('/rankings');
  await expect(page.getByText(/Illustrative teams, rankings and statistics/)).toBeVisible();
  await expect(page.getByText('Sample rankings', { exact: true })).toBeVisible();
  await page.goto('/pass');
  await expect(page.getByText('Not scheduled', { exact: true })).toBeVisible();
  await expect(page.getByText(/Sample pass level/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Elite Pass unavailable' })).toBeDisabled();
  await expect(page.getByText(/42 Days|Ends In|₹299/)).toHaveCount(0);
  await page.goto('/comms');
  await expect(page.getByText('Illustrative participants and controls. Live voice and microphone capture are not connected.')).toBeVisible();
  await expect(page.getByText(/12ms|Ultra-Low Latency|Mic Live/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Mute preview', exact: true }).click();
  await expect(page.getByText('Mute preview updated locally. No microphone or live voice connection is active.')).toBeVisible();
  await page.goto('/lounge');
  await expect(page.getByText('Illustrative participants and local soundboard. Live voice and microphone capture are not connected.')).toBeVisible();
  await expect(page.getByText('Mic Active', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mark hand (preview)', exact: true }).click();
  await expect(page.getByText('Hand preview updated locally. No stage event was sent.')).toBeVisible();
  await page.goto('/tournaments');
  await page.getByRole('button', { name: 'Sample predictions (no rewards)' }).click();
  await expect(page.getByText('Illustrative match predictions only. Picks cannot be submitted and no Karma or points are awarded.')).toBeVisible();
  await expect(page.getByText(/\+100 Karma Reward|earn \+100/)).toHaveCount(0);
});
