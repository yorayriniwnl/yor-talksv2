import { expect, test, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { complianceJson, complianceUser, installComplianceApiBoundary } from './frontend-compliance-fixtures';

const consentKey = 'yor:telemetry:consent:v1';
const queueKey = 'yor:telemetry:queue:v1';

async function signedOut(page: Page) {
  await installComplianceApiBoundary(page);
  await page.route('**/api/auth/refresh', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
}

test('all legal notices and grievance intake remain public without loading Google or optional telemetry', async ({ page }) => {
  await signedOut(page);
  const optionalRequests: string[] = [];
  page.on('request', request => {
    if (/accounts\.google\.com|\/telemetry\/events/.test(request.url())) optionalRequests.push(request.url());
  });
  for (const [path, title] of [
    ['/privacy', 'Privacy Notice'], ['/terms', 'Terms of Use'], ['/cookies', 'Cookies and Browser Storage'],
    ['/community-guidelines', 'Community Guidelines'], ['/grievance', 'Trust & Safety Report Portal'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
  await page.goto('/auth');
  await expect(page.getByRole('button', { name: 'Continue with Google', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cookies and storage notice', exact: true })).toBeVisible();
  expect(optionalRequests).toEqual([]);
  expect(await page.evaluate(([consent, queue]) => [localStorage.getItem(consent), localStorage.getItem(queue)], [consentKey, queueKey])).toEqual([null, null]);
});

test('Google loads only after a deliberate choice, supports retry, and resizes on narrow screens', async ({ page }) => {
  await signedOut(page);
  await page.setViewportSize({ width: 320, height: 900 });
  let loads = 0;
  await page.route('https://accounts.google.com/gsi/client', route => {
    loads++;
    if (loads === 1) return route.abort();
    return route.fulfill({ contentType: 'application/javascript', body: `window.google={accounts:{id:{initialize(){},renderButton(parent,options){const button=document.createElement('button');button.type='button';button.textContent='Sign in with Google';button.dataset.renderedWidth=String(options.width);button.style.width=options.width+'px';parent.append(button)}}}};` });
  });
  await page.goto('/auth');
  await expect(page.getByRole('button', { name: 'Continue with Google', exact: true })).toBeVisible();
  expect(loads).toBe(0);
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Google sign-in couldn’t load' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true }).last()).toBeEnabled();
  await page.getByRole('button', { name: 'Retry Google sign-in', exact: true }).click();
  const google = page.getByRole('group', { name: 'Google sign-in', exact: true });
  const button = google.getByRole('button', { name: 'Sign in with Google', exact: true });
  await expect(button).toBeVisible();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(async () => Number(await button.getAttribute('data-rendered-width'))).toBeLessThanOrEqual(await page.locator('.operator-google-access__button').evaluate(element => element.clientWidth));
  }
  expect(loads).toBe(2);
});

test('registration leaves consent unchecked and keeps privacy acknowledgement distinct from optional tracking', async ({ page }) => {
  await signedOut(page);
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Create account', exact: true }).first().click();
  const checkbox = page.getByRole('checkbox');
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toHaveAccessibleName(/I accept the Terms and Community Guidelines, and acknowledge the Privacy Notice/);
  await page.locator('#auth-form-panel').getByRole('button', { name: /^Create account/ }).click();
  await expect(checkbox).toBeFocused();
  await expect(checkbox).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/Accept the Terms and Community Guidelines, and acknowledge the Privacy Notice to continue/)).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), consentKey)).toBeNull();
});

test('terms reacceptance focuses missing consent, retains a failed choice, and submits once', async ({ page }) => {
  await installComplianceApiBoundary(page, { ...complianceUser, termsVersion: 'old-terms', termsAcceptedAt: null });
  let submissions = 0;
  let release: () => void = () => undefined;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/users/me/consent', async route => {
    submissions++;
    expect(route.request().postDataJSON()).toEqual({ acceptedTerms: true });
    if (submissions === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Synthetic acceptance outage' }) });
    await barrier;
    return complianceJson(route, { user: complianceUser });
  });
  await page.goto('/explore');
  await expect(page).toHaveURL(/\/consent$/);
  const checkbox = page.getByRole('checkbox');
  await expect(checkbox).not.toBeChecked();
  await page.getByRole('button', { name: 'Accept and continue', exact: true }).click();
  await expect(checkbox).toBeFocused();
  await expect(checkbox).toHaveAttribute('aria-describedby', 'terms-acceptance-error');
  expect(submissions).toBe(0);
  await checkbox.check();
  await page.getByRole('button', { name: 'Accept and continue', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic acceptance outage');
  await expect(checkbox).toBeChecked();
  try {
    await page.locator('form').evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
    await expect.poll(() => submissions).toBe(2);
  } finally { release(); }
  await expect(page).not.toHaveURL(/\/consent$/);
  expect(await page.evaluate(key => localStorage.getItem(key), consentKey)).toBeNull();
});

test('inactive analytics reflects removal of a previous saved choice from another tab', async ({ page, context }) => {
  await installComplianceApiBoundary(page);
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/telemetry/events')) requests.push(request.url()); });
  await page.goto('/cookies');
  await page.evaluate(({key,owner}) => localStorage.setItem(key,owner), {key:consentKey,owner:complianceUser.id});
  await page.goto('/settings');
  const clear = page.getByRole('button', { name: 'Clear saved analytics choice', exact: true });
  await expect(clear).toBeVisible();
  const other = await context.newPage();
  try {
    await signedOut(other);
    await other.goto('/cookies');
    await expect(other.getByRole('heading', { name: 'Cookies and Browser Storage', exact: true })).toBeVisible();
    await other.evaluate(key => localStorage.removeItem(key), consentKey);
    await expect(clear).toHaveCount(0);
    await expect(page.getByText('No optional analytics permission is saved for this account on this device.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(clear).toHaveCount(0);
    expect(await page.evaluate(([consent, queue]) => [localStorage.getItem(consent), localStorage.getItem(queue)], [consentKey, queueKey])).toEqual([null, null]);
    expect(requests).toEqual([]);
  } finally { await other.close(); }
});

test('a different server terms version produces a visible error and keeps social access restricted', async ({ page }) => {
  const outdated = { ...complianceUser, termsVersion: 'different-server-terms', termsAcceptedAt: '2026-08-30T00:00:00.000Z' };
  const requests = await installComplianceApiBoundary(page, outdated);
  await page.route('**/api/users/me/consent', route => complianceJson(route, { user: outdated }));
  await page.goto('/consent');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Accept and continue', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('could not confirm acceptance of the terms version shown here');
  await expect(page).toHaveURL(/\/consent$/);
  expect(requests.get('/feed') ?? 0).toBe(0);
  expect(requests.get('/stories') ?? 0).toBe(0);
  expect(requests.get('/conversations') ?? 0).toBe(0);
  await page.goto('/explore');
  await expect(page).toHaveURL(/\/consent$/);
  expect(requests.get('/feed') ?? 0).toBe(0);
});

test('dormant batcher rejects a new choice with blocked storage or ineligible account', async ({ page }) => {
  await installTelemetryHarness(page);
  const result = await page.evaluate(async () => {
    const telemetry = (window as any).TelemetryCompliance;
    let sends = 0;
    window.fetch = async () => { sends++; return new Response('{}', { status: 200 }); };
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'yor:telemetry:consent:v1') throw new DOMException('Synthetic storage denial', 'SecurityError');
      return original.call(this, key, value);
    };
    telemetry.setTelemetryEligibility(true, 'synthetic-owner');
    const blockedGrant = telemetry.setTelemetryConsent(true);
    telemetry.enqueueTelemetry({ type: 'navigation' });
    await telemetry.flush();
    Storage.prototype.setItem = original;
    telemetry.setTelemetryEligibility(false, 'synthetic-owner');
    const ineligibleGrant = telemetry.setTelemetryConsent(true);
    telemetry.enqueueTelemetry({ type: 'navigation' });
    await telemetry.flush();
    return { blockedGrant, ineligibleGrant, sends, stored: localStorage.getItem('yor:telemetry:consent:v1') };
  });
  expect(result).toEqual({ blockedGrant: false, ineligibleGrant: false, sends: 0, stored: null });
});

test('dormant batcher keeps previous-owner events out of a later account session', async ({ page }) => {
  await installTelemetryHarness(page);
  const result = await page.evaluate(async () => {
    const telemetry = (window as any).TelemetryCompliance;
    let finish: () => void = () => undefined;
    let sends = 0;
    let aborted = false;
    window.fetch = async (_input, init) => {
      sends++;
      init?.signal?.addEventListener('abort', () => { aborted = true; });
      await new Promise<void>(resolve => { finish = resolve; });
      return new Response('{}', { status: 200 });
    };
    telemetry.setTelemetryEligibility(true, 'first-owner');
    telemetry.setTelemetryConsent(true);
    telemetry.enqueueTelemetry({ type: 'navigation' });
    const pending = telemetry.flush();
    telemetry.setTelemetryEligibility(true, 'second-owner');
    telemetry.enqueueTelemetry({ type: 'navigation' });
    finish();
    await pending;
    await telemetry.flush();
    return { sends, aborted, consent: telemetry.hasTelemetryConsent(), savedQueue: localStorage.getItem('yor:telemetry:queue:v1') };
  });
  expect(result).toEqual({ sends: 1, aborted: true, consent: false, savedQueue: null });
});

test('grievance validation matches accepted field limits and tracking errors focus the ticket field', async ({ page }) => {
  await signedOut(page);
  await page.goto('/grievance');
  await page.getByRole('button', { name: 'Submit report', exact: true }).click();
  await expect(page.getByLabel('Your Full Name *', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Reported Post / Reel / Profile URL *', { exact: true })).toHaveAttribute('maxlength', '500');
  await expect(page.getByLabel('Detailed Description & Evidence *', { exact: true })).toHaveAttribute('maxlength', '10000');
  await page.getByRole('button', { name: 'Track Existing Ticket', exact: true }).click();
  await page.getByRole('button', { name: 'Track ticket', exact: true }).click();
  await expect(page.getByLabel('Ticket ID', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Ticket ID', { exact: true })).toHaveAttribute('aria-invalid', 'true');
});

// Exercise the actual batching source in a browser, with only the auth-token
// provider substituted. This harness does not mount or enable app tracking.
async function installTelemetryHarness(page: Page) {
  const bundled = await build({
    entryPoints: [fileURLToPath(new URL('../social/src/lib/telemetryBatcher.ts', import.meta.url))],
    bundle: true, write: false, format: 'iife', globalName: 'TelemetryCompliance', platform: 'browser',
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'synthetic-auth-token', setup(builder) {
      builder.onResolve({ filter: /^\.\/api-client$/ }, () => ({ path: 'auth-boundary', namespace: 'synthetic' }));
      builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({ contents: 'export function getStoredTokens(){return {accessToken:"synthetic-telemetry-token"}}', loader: 'js' }));
    } }],
  });
  await page.route('**/frontend-compliance-telemetry-harness', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Telemetry source harness</title>' }));
  await page.goto('/frontend-compliance-telemetry-harness');
  await page.addScriptTag({ content: bundled.outputFiles[0].text });
}

test('telemetry withdrawal blocks unload delivery and aborts an in-flight batch without restoring its queue', async ({ page }) => {
  await installTelemetryHarness(page);
  const result = await page.evaluate(async () => {
    const telemetry = (window as any).TelemetryCompliance;
    let sends = 0;
    let aborted = false;
    let finish: () => void = () => undefined;
    window.fetch = async (_input, init) => {
      sends++;
      init?.signal?.addEventListener('abort', () => { aborted = true; });
      await new Promise<void>(resolve => { finish = resolve; });
      return new Response('{}', { status: 200 });
    };
    telemetry.enqueueTelemetry({ type: 'navigation' });
    const beforePermission = sends;
    telemetry.setTelemetryEligibility(true, 'synthetic-owner');
    telemetry.setTelemetryConsent(true);
    telemetry.enqueueTelemetry({ type: 'navigation' });
    const pending = telemetry.flush();
    await telemetry.flush();
    telemetry.setTelemetryConsent(false);
    window.dispatchEvent(new Event('beforeunload'));
    finish();
    await pending;
    return { beforePermission, sends, aborted, consent: telemetry.hasTelemetryConsent(), storedQueue: localStorage.getItem('yor:telemetry:queue:v1') };
  });
  expect(result).toEqual({ beforePermission: 0, sends: 1, aborted: true, consent: false, storedQueue: null });
});

test('cross-tab analytics rejection clears queued events before the unload send path', async ({ page }) => {
  await installTelemetryHarness(page);
  const result = await page.evaluate(async () => {
    const telemetry = (window as any).TelemetryCompliance;
    let sends = 0;
    window.fetch = async () => { sends++; return new Response('{}', { status: 200 }); };
    telemetry.setTelemetryEligibility(true, 'synthetic-owner');
    telemetry.setTelemetryConsent(true);
    telemetry.enqueueTelemetry({ type: 'navigation' });
    localStorage.removeItem('yor:telemetry:consent:v1');
    window.dispatchEvent(new StorageEvent('storage', { key: 'yor:telemetry:consent:v1', newValue: null }));
    window.dispatchEvent(new Event('beforeunload'));
    await telemetry.flush();
    return { sends, storedQueue: localStorage.getItem('yor:telemetry:queue:v1') };
  });
  expect(result).toEqual({ sends: 0, storedQueue: null });
});
