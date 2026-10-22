import { expect, test, type Page, type Route } from '@playwright/test';

const owner = {
  id: '1cc96a14-2728-46fd-ae3c-cbf15fd9db1a', username: 'ada', email: 'ada@example.test',
  fullName: 'Ada Lovelace', avatarUrl: null, role: 'user', permissions: [], verified: true,
  createdAt: '2026-08-28T09:00:00.000Z', updatedAt: '2026-08-28T09:00:00.000Z',
  followerCount: 0, followingCount: 0, following: [], postCount: 0,
  settings: { notificationsEnabled: true, privateAccount: false, contentFilter: 'regular' },
  privacy: { profileVisibility: 'public', messageRequests: true, allowDmFromStrangers: true },
  termsVersion: 'test-public-beta-1', termsAcceptedAt: '2026-08-30T00:00:00.000Z',
};
const alpha = { ...owner, id: '62717fa5-5428-4e1f-8d0d-c825d6ad70c7', username: 'alpha', fullName: 'Alpha Tester' };
const beta = { ...owner, id: 'dcfd5a98-59c4-4b6c-9814-fdc9c35f5cab', username: 'beta', fullName: 'Beta Tester' };
const shield = { id: '96802e81-2832-4b91-9e21-63044c3f4c73', type: 'email', createdAt: '2026-08-28T09:00:00.000Z' };
const unhandledRequests = new WeakMap<Page, string[]>();

test.afterEach(async ({ page }) => {
  expect(unhandledRequests.get(page) ?? [], 'All settings API calls must be explicitly mocked').toEqual([]);
});

async function json(route: Route, data: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, errors: [], meta: {} }) });
}
async function unavailable(route: Route, message = 'Temporarily unavailable') {
  await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message }) });
}
async function installSettingsBoundary(page: Page) {
  const unhandled: string[] = [];
  unhandledRequests.set(page, unhandled);
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/refresh') return json(route, { accessToken: 'settings-test-session' });
    if (path === '/users/me') return json(route, owner);
    if (path === '/users/me/eligibility') return json(route, {
      experience: 'adult_18_plus', activated: true, maximumContentRating: 'mature', revision: 'a'.repeat(64),
      capabilities: { social: true, publish: true, messaging: true, payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true, analytics: true, profiling: true },
      policyVersions: ['test-policy-v1'], reason: null, publicBrowsingAllowed: true,
    });
    if (path === '/users/me/premium-profile') return json(route, {
      selection: { bioStyleId: 'default', messageFontId: 'default', storyFontId: 'default', appIconId: 'yor-default' },
      options: { bioStyles: [{ id: 'default', label: 'Default' }], messageStyles: [{ id: 'default', label: 'Default' }], storyStyles: [{ id: 'default', label: 'Default' }], appIcons: [{ id: 'yor-default', label: 'Yor', platforms: ['web'] }] }, enabledFeatures: {},
    });
    const lists = ['/feed', '/users/me/guardian-authorizations', '/users/me/close-friends', '/users/me/contact-shields', '/users/me/follow-requests', '/users/me/favorites/creators', '/conversations', '/notifications', '/stories', '/notes', '/videos', '/articles', '/events', '/products', '/products/orders', '/communities', '/creator/workspace', '/achievements/me'];
    if (route.request().method() === 'GET' && lists.includes(path)) return json(route, []);
    if (path === '/users/search') return json(route, [alpha, beta]);
    if (path === '/auth/2fa/challenges' && route.request().method() === 'GET') return json(route, []);
    if (path === '/readyz') return json(route, { status: 'ready' });
    unhandled.push(`${route.request().method()} ${path}`);
    return unavailable(route, 'Unhandled test route');
  });
}

async function installRecoveryBoundary(page: Page) {
  await installSettingsBoundary(page);
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
  await page.route('https://accounts.google.com/gsi/client', (route) => route.abort());
}

test('malformed email verification links show a recoverable error without an API request or page crash', async ({ page }) => {
  await installRecoveryBoundary(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let requests = 0;
  await page.route('**/api/auth/verify-email/**', (route) => { requests++; return json(route, null); });
  // Vite's static server rejects malformed URL bytes before serving the app.
  // Enter this invalid route through the client to exercise frontend recovery.
  await page.goto('/verify-email');
  await expect(page.getByRole('heading', { name: 'Link not accepted.' })).toBeVisible();
  await page.evaluate(() => history.pushState(null, '', '/verify-email/%E0%A4%A'));
  await expect(page.getByRole('heading', { name: 'Link not accepted.' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('incomplete or invalid');
  await expect(page.getByRole('link', { name: 'Continue to sign in' })).toBeVisible();
  expect(requests).toBe(0);
  expect(errors).toEqual([]);
});

test('password recovery is usable while session restoration is still pending', async ({ page }) => {
  await installSettingsBoundary(page);
  let releaseRefresh!: () => void;
  const refresh = new Promise<void>((resolve) => { releaseRefresh = resolve; });
  let refreshing = false;
  await page.route('**/api/auth/refresh', async (route) => {
    refreshing = true;
    await refresh;
    return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) });
  });
  await page.goto('/reset-password?token=valid-link');
  await expect.poll(() => refreshing).toBe(true);
  await expect(page.getByLabel('New password', { exact: true })).toBeEnabled();
  await page.getByLabel('New password', { exact: true }).fill('NewStrongPass1!');
  releaseRefresh();
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue('NewStrongPass1!');
});

for (const gate of ['consent', 'eligibility'] as const) {
  test(`account recovery remains available to signed-in users awaiting ${gate}`, async ({ page }) => {
    await installSettingsBoundary(page);
    if (gate === 'consent') await page.route('**/api/users/me', (route) => json(route, { ...owner, termsAcceptedAt: null }));
    else await page.route('**/api/users/me/eligibility', (route) => json(route, {
      experience: 'unknown', activated: false, maximumContentRating: 'child_safe', revision: 'b'.repeat(64),
      capabilities: { social: false, publish: false, messaging: false, payments: false, seller: false, memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
      policyVersions: ['test-policy-v1'], reason: 'verification_required', publicBrowsingAllowed: true,
    }));
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await page.evaluate(() => window.history.pushState({}, '', '/reset-password?token=valid-link'));
    await expect(page.getByLabel('New password', { exact: true })).toBeEnabled();
    await page.evaluate(() => window.history.pushState({}, '', '/verify-email'));
    await expect(page.getByRole('heading', { name: 'Link not accepted.' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('incomplete or invalid');
    await expect(page).toHaveURL(/\/verify-email$/);
  });
}

test('email verification ignores an earlier link response and lets a failed current link retry', async ({ page }) => {
  await installRecoveryBoundary(page);
  let releaseEarlier!: () => void;
  const earlier = new Promise<void>((resolve) => { releaseEarlier = resolve; });
  let earlierRequests = 0;
  let currentRequests = 0;
  await page.route('**/api/auth/verify-email/earlier-link', async (route) => {
    earlierRequests++;
    await earlier;
    return json(route, { user: owner });
  });
  await page.route('**/api/auth/verify-email/current-link', (route) => {
    currentRequests++;
    return currentRequests === 1 ? unavailable(route, 'The current link could not be verified. Please retry.') : json(route, { user: owner });
  });
  await page.goto('/verify-email/earlier-link');
  await expect.poll(() => earlierRequests).toBe(1);
  await page.evaluate(() => window.history.pushState({}, '', '/verify-email/current-link'));
  await expect(page.getByRole('alert')).toContainText('The current link could not be verified');
  const earlierResponse = page.waitForResponse('**/api/auth/verify-email/earlier-link');
  releaseEarlier();
  await earlierResponse;
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByRole('heading', { name: 'Link not accepted.' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await expect(page.getByRole('heading', { name: 'Email confirmed.' })).toBeVisible();
  expect(currentRequests).toBe(2);
});

test('password recovery focuses invalid fields, locks pending submissions, retains failures, and announces success', async ({ page }) => {
  await installRecoveryBoundary(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let writes = 0;
  await page.route('**/api/auth/reset-password/confirm', async (route) => {
    writes++;
    expect(route.request().postDataJSON()).toEqual({ token: 'valid-link', newPassword: 'NewStrongPass1!' });
    if (writes === 1) { await pending; return unavailable(route, 'Could not update your password. Please retry.'); }
    return json(route, null);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reset-password?token=valid-link');
  const password = page.getByLabel('New password', { exact: true });
  const confirmation = page.getByLabel('Confirm password', { exact: true });
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(password).toBeFocused();
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAttribute('aria-describedby', /reset-password-error/);
  await password.fill('NewStrongPass1!');
  await confirmation.fill('Mismatch1!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
  await confirmation.fill('NewStrongPass1!');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await confirmation.press('Enter');
  await expect(password).toBeDisabled();
  await expect(confirmation).toBeDisabled();
  await page.locator('form').dispatchEvent('submit');
  await expect.poll(() => writes).toBe(1);
  release();
  await expect(page.getByRole('alert')).toContainText('Could not update your password');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(password).toHaveValue('NewStrongPass1!');
  await expect(confirmation).toHaveValue('NewStrongPass1!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('heading', { name: 'Password updated.' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Continue to sign in' })).toBeVisible();
  expect(writes).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('password recovery follows query-only token changes and ignores the previous form response', async ({ page }) => {
  await installRecoveryBoundary(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const tokens: string[] = [];
  await page.route('**/api/auth/reset-password/confirm', async (route) => {
    const token = route.request().postDataJSON().token;
    tokens.push(token);
    if (token === 'earlier-link') await pending;
    return json(route, null);
  });
  await page.goto('/reset-password?token=earlier-link');
  await page.getByLabel('New password', { exact: true }).fill('NewStrongPass1!');
  await page.getByLabel('Confirm password', { exact: true }).fill('NewStrongPass1!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect.poll(() => tokens).toEqual(['earlier-link']);
  await page.evaluate(() => window.history.pushState({}, '', '/reset-password?token=current-link'));
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Update password' })).toBeEnabled();
  const earlierResponse = page.waitForResponse('**/api/auth/reset-password/confirm');
  release();
  await earlierResponse;
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByRole('heading', { name: 'Set a new password.' })).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('CurrentStrongPass1!');
  await page.getByLabel('Confirm password', { exact: true }).fill('CurrentStrongPass1!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('heading', { name: 'Password updated.' })).toBeVisible();
  expect(tokens).toEqual(['earlier-link', 'current-link']);
  await page.evaluate(() => window.history.pushState({}, '', '/reset-password'));
  await expect(page.getByRole('alert')).toContainText('This password reset link is incomplete');
  await expect(page.getByRole('button', { name: 'Update password' })).toBeDisabled();
  await page.locator('form').dispatchEvent('submit');
  expect(tokens).toEqual(['earlier-link', 'current-link']);
});

test('privacy lists and Close Friends search distinguish failure from empty results and retry', async ({ page }) => {
  await installSettingsBoundary(page);
  let listsUnavailable = true;
  let searchUnavailable = true;
  await page.route('**/api/users/me/close-friends', (route) => listsUnavailable ? unavailable(route) : json(route, [alpha]));
  await page.route('**/api/users/me/contact-shields', (route) => listsUnavailable ? unavailable(route) : json(route, [shield]));
  await page.route('**/api/users/search?**', (route) => searchUnavailable ? unavailable(route) : json(route, [alpha]));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  const friends = page.getByRole('region', { name: 'Close Friends', exact: true });
  const shields = page.getByRole('region', { name: 'IRL Shield', exact: true });
  await expect(friends.getByRole('alert')).toContainText('Could not load your Close Friends');
  await expect(shields.getByRole('alert')).toContainText('Could not load your IRL Shield list');
  await expect(friends.getByText(/Your private circle is empty/)).toHaveCount(0);
  await expect(shields.getByText(/No protected contacts yet/)).toHaveCount(0);
  await expect(shields.getByRole('button', { name: 'Shield email contacts' })).toBeDisabled();
  listsUnavailable = false;
  await friends.getByRole('button', { name: 'Retry Close Friends', exact: true }).click();
  await shields.getByRole('button', { name: 'Retry IRL Shield', exact: true }).click();
  await expect(friends.getByRole('button', { name: 'Remove @alpha from your private circle' })).toBeVisible();
  await expect(shields.getByRole('button', { name: 'Remove protected contact 1' })).toBeVisible();
  const search = friends.getByRole('textbox', { name: 'Search people for Close Friends' });
  await search.fill('alpha');
  await expect(friends.getByRole('alert')).toContainText('Could not search people');
  await expect(friends.getByText(/No people found/)).toHaveCount(0);
  searchUnavailable = false;
  await friends.getByRole('button', { name: 'Retry people search' }).click();
  await expect(friends.getByRole('button', { name: 'Remove @alpha from Close Friends', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('Close Friends keeps each pending membership locked across searches and supports direct circle removal', async ({ page }) => {
  await installSettingsBoundary(page);
  let releaseAlpha!: () => void;
  const pendingAlpha = new Promise<void>((resolve) => { releaseAlpha = resolve; });
  let alphaWrites = 0;
  let betaWrites = 0;
  let removeFails = true;
  await page.route(`**/api/users/${alpha.id}/close-friend`, async (route) => {
    alphaWrites++;
    await pendingAlpha;
    return json(route, { friendId: alpha.id, closeFriend: true });
  });
  await page.route(`**/api/users/${beta.id}/close-friend`, async (route) => {
    betaWrites++;
    if (route.request().method() === 'DELETE' && removeFails) return unavailable(route, 'Could not remove Beta. Please retry.');
    return json(route, { friendId: beta.id, closeFriend: route.request().method() !== 'DELETE' });
  });
  await page.goto('/settings');
  const friends = page.getByRole('region', { name: 'Close Friends', exact: true });
  const search = friends.getByRole('textbox', { name: 'Search people for Close Friends' });
  await search.fill('tester');
  const addAlpha = friends.getByRole('button', { name: 'Add @alpha to Close Friends' });
  await addAlpha.click();
  await expect(addAlpha).toBeDisabled();
  await friends.getByRole('button', { name: 'Add @beta to Close Friends' }).click();
  await expect(friends.getByRole('button', { name: 'Remove @beta from your private circle' })).toBeVisible();
  await expect(addAlpha).toBeDisabled();
  await search.fill('different search');
  await expect(addAlpha).toBeDisabled();
  expect(alphaWrites).toBe(1);
  releaseAlpha();
  await expect(friends.getByRole('button', { name: 'Remove @alpha from your private circle' })).toBeVisible();
  await search.clear();
  const removeBeta = friends.getByRole('button', { name: 'Remove @beta from your private circle' });
  await removeBeta.click();
  await expect(friends.getByRole('alert')).toContainText('Could not remove Beta');
  await expect(removeBeta).toBeEnabled();
  removeFails = false;
  await removeBeta.click();
  await expect(removeBeta).toHaveCount(0);
  expect(betaWrites).toBe(3);
});

test('IRL Shield prevents duplicate submits, retains failed input, and confirms removal before updating the list', async ({ page }) => {
  await installSettingsBoundary(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let writes = 0;
  let removeFails = true;
  await page.route('**/api/users/me/contact-shields', async (route) => {
    if (route.request().method() === 'GET') return json(route, []);
    writes++;
    if (writes === 1) { await pending; return unavailable(route, 'Could not protect this contact. Try again.'); }
    return json(route, [shield]);
  });
  await page.route(`**/api/users/me/contact-shields/${shield.id}`, (route) => removeFails ? unavailable(route, 'Could not remove protection. Try again.') : json(route, null));
  await page.goto('/settings');
  const shields = page.getByRole('region', { name: 'IRL Shield', exact: true });
  const input = shields.getByRole('textbox', { name: 'Email to shield' });
  await input.fill('protected@example.test, incomplete-address');
  await expect(shields.getByRole('button', { name: 'Shield email contacts' })).toBeEnabled();
  await input.press('Enter');
  await expect(shields.getByRole('alert')).toContainText('Check each email address');
  expect(writes).toBe(0);
  await expect(input).toHaveValue('protected@example.test, incomplete-address');
  await input.fill('protected@example.test');
  await expect(shields.getByRole('button', { name: 'Shield email contacts' })).toBeEnabled();
  await input.press('Enter');
  await expect(input).toBeDisabled();
  await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter' });
  expect(writes).toBe(1);
  release();
  await expect(shields.getByRole('alert')).toContainText('Could not protect this contact');
  await expect(input).toHaveValue('protected@example.test');
  await input.press('Enter');
  await expect(input).toHaveValue('');
  const remove = shields.getByRole('button', { name: 'Remove protected contact 1' });
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(shields.getByRole('alert')).toContainText('Could not remove protection');
  await expect(remove).toBeEnabled();
  removeFails = false;
  await remove.click();
  await expect(remove).toHaveCount(0);
  await expect(shields.getByText(/No protected contacts yet/)).toBeVisible();
  expect(writes).toBe(2);
});

test('two-factor setup and removal show errors, support Enter, and preserve locked pending codes', async ({ page }) => {
  await installSettingsBoundary(page);
  let setupRequests = 0;
  let confirmRequests = 0;
  let disableRequests = 0;
  let releaseConfirm!: () => void;
  const pendingConfirm = new Promise<void>((resolve) => { releaseConfirm = resolve; });
  let releaseDisable!: () => void;
  const pendingDisable = new Promise<void>((resolve) => { releaseDisable = resolve; });
  await page.route('**/api/auth/2fa/setup', (route) => {
    setupRequests++;
    return setupRequests === 1 ? unavailable(route, 'Could not start setup. Please retry.') : json(route, {
      secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/Yor:ada?secret=JBSWY3DPEHPK3PXP&issuer=Yor',
    });
  });
  await page.route('**/api/auth/2fa/confirm', async (route) => {
    confirmRequests++;
    expect(route.request().postDataJSON()).toEqual({ code: '123456' });
    if (confirmRequests === 1) { await pendingConfirm; return unavailable(route, 'This authenticator code could not be confirmed. Try again.'); }
    return json(route, null);
  });
  await page.route('**/api/auth/2fa/disable', async (route) => {
    disableRequests++;
    expect(route.request().postDataJSON()).toEqual({ code: '654321' });
    if (disableRequests === 1) { await pendingDisable; return unavailable(route, 'Could not disable two-factor authentication. Try again.'); }
    return json(route, null);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  const security = page.getByRole('group', { name: 'Two-factor authentication', exact: true });
  await security.getByRole('button', { name: 'Set up', exact: true }).click();
  await expect(security.getByRole('alert')).toContainText('Could not start setup');
  await security.getByRole('button', { name: 'Set up', exact: true }).click();
  const code = security.getByRole('textbox', { name: 'Authenticator confirmation code' });
  await expect(code).toBeVisible();
  await security.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(code).toBeFocused();
  await expect(code).toHaveAttribute('aria-invalid', 'true');
  await expect(code).toHaveAttribute('aria-describedby', 'two-factor-error');
  await code.fill('123456');
  await expect(security.getByRole('alert')).toHaveCount(0);
  await code.press('Enter');
  await expect(code).toBeDisabled();
  await expect(security.getByRole('button', { name: 'Cancel setup' })).toBeDisabled();
  await security.locator('form').dispatchEvent('submit');
  await expect.poll(() => confirmRequests).toBe(1);
  releaseConfirm();
  await expect(security.getByRole('alert')).toContainText('could not be confirmed');
  await expect(code).toHaveValue('123456');
  await code.press('Enter');
  await expect(security.getByText('Enabled', { exact: true })).toBeVisible();
  await security.getByRole('button', { name: 'Disable two-factor authentication', exact: true }).click();
  const currentCode = security.getByRole('textbox', { name: 'Current authenticator code' });
  await security.getByRole('button', { name: 'Disable', exact: true }).click();
  await expect(currentCode).toBeFocused();
  await expect(currentCode).toHaveAttribute('aria-invalid', 'true');
  await currentCode.fill('654321');
  await currentCode.press('Enter');
  await expect(currentCode).toBeDisabled();
  await expect(security.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  await security.locator('form').dispatchEvent('submit');
  await expect.poll(() => disableRequests).toBe(1);
  releaseDisable();
  await expect(security.getByRole('alert')).toContainText('Could not disable');
  await expect(currentCode).toHaveValue('654321');
  await security.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(security.getByRole('alert')).toHaveCount(0);
  await expect(security.getByText('Enabled', { exact: true })).toBeVisible();
  await security.getByRole('button', { name: 'Disable two-factor authentication', exact: true }).click();
  await expect(currentCode).toHaveValue('');
  await currentCode.fill('654321');
  await currentCode.press('Enter');
  await expect(security.getByRole('button', { name: 'Set up', exact: true })).toBeVisible();
  expect(confirmRequests).toBe(2);
  expect(disableRequests).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('premium identity locks all styles while saving and restores the previous selection on failure', async ({ page }) => {
  await installSettingsBoundary(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let writes = 0;
  await page.route('**/api/users/me/premium-profile', async (route) => {
    if (route.request().method() === 'GET') return json(route, {
      selection: { bioStyleId: 'default', messageFontId: 'default', storyFontId: 'default', appIconId: 'yor-default' },
      options: {
        bioStyles: [{ id: 'default', label: 'Default' }, { id: 'serif', label: 'Serif' }],
        messageStyles: [{ id: 'default', label: 'Default' }, { id: 'mono', label: 'Mono' }],
        storyStyles: [{ id: 'default', label: 'Default' }],
        appIcons: [{ id: 'yor-default', label: 'Yor', platforms: ['web'] }],
      },
      enabledFeatures: { CUSTOM_BIO_FONT: true, MESSAGE_FONT: true },
    });
    writes++;
    expect(route.request().postDataJSON()).toEqual({ bioStyleId: 'serif' });
    if (writes === 1) { await pending; return unavailable(route, 'Could not save this style. Please try again.'); }
    return json(route, { ...owner, bioStyleId: 'serif' });
  });
  await page.goto('/settings');
  const identity = page.getByRole('region', { name: 'Premium identity' });
  await identity.getByRole('combobox', { name: 'Bio style' }).click();
  await page.getByRole('option', { name: 'Serif', exact: true }).click();
  await expect(identity.getByRole('combobox', { name: 'Bio style' })).toBeDisabled();
  await expect(identity.getByRole('combobox', { name: 'Message font' })).toBeDisabled();
  await expect(identity.getByRole('combobox', { name: 'Story font' })).toBeDisabled();
  await expect(identity.getByRole('button', { name: 'Yor web' })).toBeDisabled();
  await expect.poll(() => writes).toBe(1);
  release();
  await expect(identity.getByRole('alert')).toContainText('Could not save this style');
  await expect(identity.getByRole('combobox', { name: 'Bio style' })).toHaveText('Default');
  await expect(identity.getByRole('combobox', { name: 'Message font' })).toBeEnabled();
  await identity.getByRole('combobox', { name: 'Bio style' }).click();
  await page.getByRole('option', { name: 'Serif', exact: true }).click();
  await expect(identity.getByRole('combobox', { name: 'Bio style' })).toBeEnabled();
  await expect(identity.getByRole('combobox', { name: 'Bio style' })).toHaveText('Serif');
  await expect(identity.getByRole('alert')).toHaveCount(0);
  expect(writes).toBe(2);
});
