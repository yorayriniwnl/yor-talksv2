import { expect, test as base, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { pool } from '../lib/db/src/index.js';
import preregisterRoutes from '../api-server/src/routes/preregister.js';

const launchDate = '2026-12-01T00:00:00+05:30';
const consentLabel = 'Email me about the launch and early member perks.';
const confirmation = /You[’']re on the list\./;
const perks = [
  { id: 'founder-badge', title: 'Founder badge', description: 'A little recognition for being here first.', icon: 'Award', rarity: 'Founder' },
];

function newPass() {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    username: 'ada_lovelace',
    referralCode: 'YOR-DEF456',
    passNumber: 'YOR-000001',
    createdAt: '2026-10-19T10:00:00.000Z',
    launchDate,
    perks,
    isExisting: false,
  };
}

type PreregisterPayload = {
  email: string;
  username: string;
  launchUpdatesConsent: boolean;
  referralCode?: string;
};

type ApiFixture = {
  submissions: PreregisterPayload[];
  stallAuthentication: boolean;
  authenticationRequests: number;
  completeAuthentication: () => Promise<void>;
  respond: (route: Route, payload: PreregisterPayload) => Promise<void>;
};

async function json(route: Route, data: unknown, status = 200, message = 'OK') {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status < 400, message, data, errors: [], meta: {} }),
  });
}

// Every registration is intercepted before it can reach a real backend or
// mailing service. Unrelated third-party requests are blocked as well.
const test = base.extend<{ preregistrationApi: ApiFixture }>({
  preregistrationApi: async ({ page }, use) => {
    const unexpected: string[] = [];
    const heldAuthentication: Route[] = [];
    const fixture: ApiFixture = {
      submissions: [],
      stallAuthentication: false,
      authenticationRequests: 0,
      completeAuthentication: async () => {
        fixture.stallAuthentication = false;
        await Promise.all(heldAuthentication.splice(0).map((route) => json(route, null, 401, 'No active session')));
      },
      respond: (route) => json(route, newPass(), 201),
    };

    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();

      const request = route.request();
      if (url.pathname === '/api/auth/refresh' && request.method() === 'POST') {
        fixture.authenticationRequests++;
        if (fixture.stallAuthentication) {
          heldAuthentication.push(route);
          return;
        }
        return json(route, null, 401, 'No active session');
      }
      if (url.pathname === '/api/preregister/stats' && request.method() === 'GET') {
        return json(route, { totalRegistered: 0, targetSpots: 10000, spotsRemaining: 10000, launchDate, perks });
      }
      if (url.pathname === '/api/preregister' && request.method() === 'POST') {
        const payload = request.postDataJSON() as PreregisterPayload;
        fixture.submissions.push(payload);
        return fixture.respond(route, payload);
      }

      unexpected.push(`${request.method()} ${url.pathname}`);
      return json(route, null, 500, 'Unexpected request in pre-registration browser test');
    });

    await use(fixture);
    await Promise.all(heldAuthentication.map((route) => route.abort().catch(() => undefined)));
    expect(unexpected, 'Public pre-registration must not make unexpected API calls').toEqual([]);
  },
});

async function fillRegistration(page: Page, email = 'ada@example.test', username = 'ada_lovelace') {
  await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Your username', exact: true }).fill(username);
  await page.getByRole('checkbox', { name: consentLabel, exact: true }).check();
}

for (const path of ['/preregister', '/launch']) {
  test(`${path} is public and announces the December launch`, async ({ page, preregistrationApi }) => {
    preregistrationApi.stallAuthentication = true;
    await page.goto(path);
    await expect.poll(() => preregistrationApi.authenticationRequests).toBe(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Your world\.\s*Your privacy\.\s*Rooted in India\./);
    await expect(page).toHaveTitle(/Yor Talks/);
    await expect(page.locator('.pr-hero-description')).toContainText('A premium social experience');
    await expect(page.locator('header').getByText('Aditi & Ayush.', { exact: true })).toBeInViewport();
    await expect(page.getByText(/0?1(?:st)? December 2026/i).first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Your username', exact: true })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: consentLabel, exact: true })).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Join the launch list', exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    expect(preregistrationApi.submissions).toEqual([]);
    if (path === '/preregister') {
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
      await page.screenshot({ path: 'test-results/preregister-desktop.png', fullPage: true });
    }
  });
}

test('India residency and EU-inspired privacy are clear commitments without staged friends imagery', async ({ page, preregistrationApi }) => {
  const friendsImageRequests: string[] = [];
  page.on('request', (request) => {
    if (/yor-talks-friends/i.test(request.url())) friendsImageRequests.push(request.url());
  });
  await page.goto('/preregister');

  const commitments = page.locator('#pr-commitments');
  await expect(commitments.getByRole('heading', { name: /starts with trust/i })).toBeVisible();
  await expect(commitments.getByRole('heading', { name: /data.*India/i })).toBeVisible();
  await expect(commitments.getByRole('heading', { name: /Privacy with substance/i })).toBeVisible();
  await expect(commitments.getByRole('heading', { name: /Premium in every detail/i })).toBeVisible();
  await expect(commitments).toContainText(/EU.*principles/i);
  const privacyPolicy = commitments.getByRole('link', { name: 'Read our privacy approach', exact: true });
  const privacyControls = commitments.getByRole('link', { name: 'Your privacy controls', exact: true });
  await expect(privacyPolicy).toHaveAttribute('href', '/privacy');
  await expect(privacyControls).toHaveAttribute('href', '/privacy');
  await expect(privacyPolicy).toBeVisible();
  await expect(privacyControls).toBeVisible();

  const residency = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Will my data stay in India?' }) });
  await residency.locator('summary').click();
  await expect(residency.locator('p')).toBeVisible();
  await expect(residency.locator('p')).toContainText(/India/i);
  await expect(residency.locator('p')).toContainText(/pending|not yet|not.*verif|before launch/i);

  const compliance = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Is Yor Talks GDPR compliant?' }) });
  await compliance.locator('summary').click();
  await expect(compliance.locator('p')).toBeVisible();
  await expect(compliance.locator('p')).toContainText(/EU.*principles/i);
  await expect(compliance.locator('p')).toContainText(/not.*(?:claim|certif|complian)|no.*(?:claim|certif)/i);

  await privacyControls.click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: 'Privacy Notice', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/preregister$/);
  await expect(commitments.getByRole('heading', { name: /starts with trust/i })).toBeVisible();

  await expect(page.locator('img[src*="yor-talks-friends"], source[srcset*="yor-talks-friends"]')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /three friends.*rooftop/i })).toHaveCount(0);
  expect(friendsImageRequests, 'The staged friends photo must not be fetched').toEqual([]);
  expect(preregistrationApi.submissions).toEqual([]);
});

test('mobile pre-registration remains readable without horizontal scrolling', async ({ page, preregistrationApi }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/preregister');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('header').getByText('Aditi & Ayush.', { exact: true })).toBeInViewport();
  await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Join the launch list', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Join the launch list', exact: true })).toBeVisible();
  const size = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
  }));
  expect(size.page).toBeLessThanOrEqual(size.viewport + 1);
  expect(preregistrationApi.submissions).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/preregister-mobile.png', fullPage: true });
});

test('email, username and explicit launch consent are required before submitting', async ({ page, preregistrationApi }) => {
  await page.goto('/preregister');
  const email = page.getByRole('textbox', { name: 'Email address', exact: true });
  const username = page.getByRole('textbox', { name: 'Your username', exact: true });
  const consent = page.getByRole('checkbox', { name: consentLabel, exact: true });
  const submit = page.getByRole('button', { name: 'Join the launch list', exact: true });

  await submit.click();
  expect(preregistrationApi.submissions).toHaveLength(0);

  await email.fill('not-an-email');
  await username.fill('ada_lovelace');
  await consent.check();
  await submit.click();
  expect(preregistrationApi.submissions).toHaveLength(0);
  await expect(email).toBeVisible();

  await email.fill('ada@example.test');
  await username.fill('a!');
  await submit.click();
  expect(preregistrationApi.submissions).toHaveLength(0);
  await expect(username).toBeVisible();

  await username.fill('ada_lovelace');
  await consent.uncheck();
  await submit.click();
  expect(preregistrationApi.submissions).toHaveLength(0);
  await expect(consent).not.toBeChecked();

  // Once the invalid values are corrected, the same form can be submitted.
  await consent.check();
  await submit.click();
  await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
  expect(preregistrationApi.submissions).toHaveLength(1);
});

test('successful pre-registration normalizes identity and preserves a referral from the URL', async ({ page, preregistrationApi }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { (window as Window & { copiedInvite?: string }).copiedInvite = text; } },
    });
  });
  await page.goto('/preregister?ref=YOR-ABC123');
  await fillRegistration(page, 'Ada@Example.Test', '@Ada_Lovelace');
  await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();

  await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
  expect(preregistrationApi.submissions).toEqual([{
    email: 'ada@example.test',
    username: 'ada_lovelace',
    launchUpdatesConsent: true,
    referralCode: 'YOR-ABC123',
  }]);
  await expect(page.getByText('@ada_lovelace', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Invite your people', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invite link copied');
  const copiedInvite = await page.evaluate(() => (window as Window & { copiedInvite?: string }).copiedInvite);
  expect(copiedInvite).toBe(new URL('/preregister?ref=YOR-DEF456', page.url()).toString());

  const downloadedPass = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save your pass', exact: true }).click();
  const download = await downloadedPass;
  expect(download.suggestedFilename()).toBe('yor-talks-early-member.txt');
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const passText = await readFile(downloadPath!, 'utf8');
  expect(passText).toContain('@ada_lovelace');
  expect(passText).toContain('YOR-000001');
  expect(passText).toContain('1 December 2026, 00:00 IST');
  expect(passText).not.toContain('ada@example.test');
});

test('a saved signup keeps its pass when authentication finishes during submission', async ({ page, preregistrationApi }) => {
  preregistrationApi.stallAuthentication = true;
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const input = args[0];
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.href);
      if (url.pathname === '/api/auth/refresh') {
        // Allow the application's refresh promise chain to consume the 401
        // before the test releases the successful registration response.
        setTimeout(() => {
          (window as Window & { authenticationCompleted?: boolean }).authenticationCompleted = true;
        }, 0);
      }
      return response;
    };
  });

  let finishSignup!: () => void;
  const pendingSignup = new Promise<void>((resolve) => { finishSignup = resolve; });
  preregistrationApi.respond = async (route) => {
    await pendingSignup;
    await json(route, newPass(), 201);
  };

  try {
    await page.goto('/preregister');
    await expect.poll(() => preregistrationApi.authenticationRequests).toBe(1);
    await fillRegistration(page);
    await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();
    await expect.poll(() => preregistrationApi.submissions.length).toBe(1);

    await preregistrationApi.completeAuthentication();
    await page.waitForFunction(() => (window as Window & { authenticationCompleted?: boolean }).authenticationCompleted === true);
    finishSignup();

    await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
    await expect(page.getByText('YOR-000001', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save your pass', exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(preregistrationApi.submissions).toHaveLength(1);
  } finally {
    finishSignup();
  }
});

test('an existing email receives a generic acknowledgement without another member pass', async ({ page, preregistrationApi }) => {
  preregistrationApi.respond = (route) => json(route, { isExisting: true, launchDate, perks });
  await page.goto('/preregister');
  await fillRegistration(page, 'existing@example.test', 'new_username');
  await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();

  await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
  await expect(page.getByText('@new_username', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /copy.*(?:link|referral)|share.*(?:link|pass)/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Invite your people', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save your pass', exact: true })).toHaveCount(0);
  await expect(page.getByText('YOR-000001', { exact: true })).toHaveCount(0);
  expect(preregistrationApi.submissions).toHaveLength(1);
});

test('an API failure retains entered details and allows a successful retry', async ({ page, preregistrationApi }) => {
  preregistrationApi.respond = (route) => json(route, null, 503, 'Registration is temporarily unavailable. Please try again.');
  await page.goto('/preregister');
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();

  await expect(page.getByRole('alert')).toContainText(/temporarily unavailable|try again/i);
  await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toHaveValue('ada@example.test');
  await expect(page.getByRole('textbox', { name: 'Your username', exact: true })).toHaveValue('ada_lovelace');
  await expect(page.getByRole('checkbox', { name: consentLabel, exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Join the launch list', exact: true })).toBeEnabled();

  preregistrationApi.respond = (route) => json(route, newPass(), 201);
  await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();
  await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
  expect(preregistrationApi.submissions).toHaveLength(2);
  expect(preregistrationApi.submissions[1]).toEqual(preregistrationApi.submissions[0]);
});

test('a network failure preserves signup details and retry restores form focus after success', async ({ page, preregistrationApi }) => {
  preregistrationApi.respond = (route) => route.abort('internetdisconnected');
  await page.goto('/preregister');
  await fillRegistration(page);
  const submit = page.getByRole('button', { name: 'Join the launch list', exact: true });
  const email = page.getByRole('textbox', { name: 'Email address', exact: true });
  await submit.click();

  await expect(page.getByRole('alert')).toContainText(/check your internet connection and try again/i);
  await expect(email).toHaveValue('ada@example.test');
  await expect(page.getByRole('textbox', { name: 'Your username', exact: true })).toHaveValue('ada_lovelace');
  await expect(page.getByRole('checkbox', { name: consentLabel, exact: true })).toBeChecked();
  await expect(submit).toBeEnabled();
  await expect(page.getByRole('heading', { name: confirmation })).toHaveCount(0);

  preregistrationApi.respond = (route) => json(route, newPass(), 201);
  await submit.click();
  await expect(page.getByRole('heading', { name: confirmation })).toBeFocused();
  expect(preregistrationApi.submissions).toHaveLength(2);
  expect(preregistrationApi.submissions[1]).toEqual(preregistrationApi.submissions[0]);
  await page.getByRole('button', { name: 'Back to pre-registration', exact: true }).click();
  await expect(email).toBeFocused();
  await expect(email).toHaveValue('');
});

test('an incomplete successful response cannot create a member pass and can be retried', async ({ page, preregistrationApi }) => {
  preregistrationApi.respond = (route) => json(route, {}, 201);
  await page.goto('/preregister');
  await fillRegistration(page);
  const submit = page.getByRole('button', { name: 'Join the launch list', exact: true });
  await submit.click();

  await expect(page.getByRole('alert')).toContainText(/couldn.t confirm your signup/i);
  await expect(page.getByRole('heading', { name: confirmation })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save your pass', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Invite your people', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toHaveValue('ada@example.test');
  await expect(page.getByRole('textbox', { name: 'Your username', exact: true })).toHaveValue('ada_lovelace');
  await expect(page.getByRole('checkbox', { name: consentLabel, exact: true })).toBeChecked();
  await expect(submit).toBeEnabled();

  preregistrationApi.respond = (route) => json(route, newPass(), 201);
  await submit.click();
  await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
  await expect(page.getByText('YOR-000001', { exact: true })).toBeVisible();
  expect(preregistrationApi.submissions).toHaveLength(2);
});

test('a timed-out signup explains how to retry without losing details', async ({ page, preregistrationApi }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    let timeoutNextSignup = true;
    window.fetch = async (...args) => {
      const input = args[0];
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.href);
      const method = args[1]?.method ?? (input instanceof Request ? input.method : 'GET');
      if (timeoutNextSignup && url.pathname === '/api/preregister' && method.toUpperCase() === 'POST') {
        timeoutNextSignup = false;
        throw new DOMException('The operation timed out.', 'TimeoutError');
      }
      return originalFetch(...args);
    };
  });
  await page.goto('/preregister');
  await fillRegistration(page);
  const submit = page.getByRole('button', { name: 'Join the launch list', exact: true });
  await submit.click();

  await expect(page.getByRole('alert')).toContainText(/request took too long.*please try again/i);
  await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toHaveValue('ada@example.test');
  await expect(page.getByRole('textbox', { name: 'Your username', exact: true })).toHaveValue('ada_lovelace');
  await expect(page.getByRole('checkbox', { name: consentLabel, exact: true })).toBeChecked();
  await expect(submit).toBeEnabled();
  expect(preregistrationApi.submissions).toHaveLength(0);

  await submit.click();
  await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
  expect(preregistrationApi.submissions).toHaveLength(1);
});

test('the social preview shows posts, conversations and communities without submitting a signup', async ({ page, preregistrationApi }) => {
  await page.goto('/preregister');
  const preview = page.getByRole('region', { name: 'Yor Talks social preview' });
  const views = preview.getByRole('group', { name: 'Preview Yor Talks features' });
  await preview.getByRole('button', { name: 'Like sample post' }).click();
  await expect(preview.getByRole('button', { name: 'Like sample post' })).toHaveAttribute('aria-pressed', 'true');
  await preview.getByRole('button', { name: 'Show sample replies' }).click();
  await expect(preview.locator('#ys-sample-replies')).toBeVisible();
  await expect(preview.locator('#ys-sample-replies')).toContainText('A little more of this, please.');
  await preview.getByRole('button', { name: 'Save sample post' }).click();
  await views.getByRole('button', { name: 'Messages', exact: true }).click();
  await expect(preview.getByText('A sample group conversation')).toBeVisible();
  await expect(preview.getByRole('link', { name: 'Join Yor Talks to start a conversation' })).toHaveAttribute('href', '#pr-signup');
  await views.getByRole('button', { name: 'Communities', exact: true }).click();
  await preview.getByRole('button', { name: /On repeat/ }).click();
  await expect(preview.locator('.ys-community-note')).toContainText('For the track you cannot stop playing');
  await views.getByRole('button', { name: 'Your feed', exact: true }).click();
  await expect(preview.getByRole('button', { name: 'Save sample post' })).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByRole('button', { name: 'Like sample post' })).toHaveAttribute('aria-pressed', 'true');
  expect(preregistrationApi.submissions).toEqual([]);
});

test('world districts work with keyboard navigation and keep their panels in sync', async ({ page, preregistrationApi }) => {
  await page.goto('/preregister');
  const commons = page.getByRole('tab', { name: /The Commons/ });
  const studio = page.getByRole('tab', { name: /Creator Studio/ });
  const dream = page.getByRole('tab', { name: /Dream Dock/ });
  await commons.focus();
  await page.keyboard.press('ArrowRight');
  await expect(studio).toBeFocused();
  await expect(studio).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Your ideas deserve a first take.');
  await page.keyboard.press('End');
  await expect(dream).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Give a thought somewhere to go.');
  await page.keyboard.press('Home');
  await expect(commons).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Your people have a place.');
  expect(preregistrationApi.submissions).toEqual([]);
});

test('the world preview waits until its section approaches the viewport', async ({ page, preregistrationApi }) => {
  const worldRequests: string[] = [];
  page.on('request', request => {
    if (/YorWorldPreview(?:[-.]|\.tsx)/i.test(request.url())) worldRequests.push(request.url());
  });
  await page.goto('/preregister');
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await page.waitForLoadState('networkidle');
  expect(worldRequests, 'The initial view must not fetch the 3D world module').toEqual([]);
  await expect(page.locator('.yw-world')).toHaveCount(0);
  await expect(page.locator('.yw-canvas-host canvas')).toHaveCount(0);

  await page.locator('#pr-world').scrollIntoViewIfNeeded();
  await expect(page.locator('.yw-world')).toBeVisible();
  expect(worldRequests.length, 'Approaching the section must load its interactive module').toBeGreaterThan(0);
  expect(preregistrationApi.submissions).toEqual([]);
});

test('the world keeps an illustrated preview and working districts without WebGL', async ({ page, preregistrationApi }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
        if (/webgl/i.test(contextId)) return null;
        return Reflect.apply(original, this, [contextId, ...args]);
      },
    });
  });
  await page.goto('/preregister');
  await page.locator('#pr-world').scrollIntoViewIfNeeded();
  await expect(page.locator('.yw-world')).toHaveAttribute('data-world-renderer', 'fallback');
  await expect(page.getByRole('img', { name: 'Yor World concept environment with a monumental illuminated portal' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'World camera controls' })).toHaveCount(0);
  await page.getByRole('tab', { name: /Dream Dock/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Give a thought somewhere to go.');
  expect(preregistrationApi.submissions).toEqual([]);
});

test('Studio applies the selected visual filter to its sample media', async ({ page, preregistrationApi }) => {
  await page.goto('/preregister');
  const controls = page.getByRole('group', { name: 'Try a Studio visual filter' });
  const sample = page.getByRole('img', { name: 'Sample photo with blue glassware, a camera and flowers' });
  await controls.getByRole('button', { name: 'Noir', exact: true }).click();
  await expect(controls.getByRole('button', { name: 'Noir', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(sample).toHaveCSS('filter', 'grayscale(1) contrast(1.6)');
  await controls.getByRole('button', { name: 'Original', exact: true }).click();
  await expect(sample).toHaveCSS('filter', 'none');
  expect(preregistrationApi.submissions).toEqual([]);
});

test('Dream shapes a visitor idea into relevant roles and next steps', async ({ page, preregistrationApi }) => {
  await page.goto('/preregister');
  const idea = page.getByRole('textbox', { name: 'What would you make with the right people?' });
  const shape = page.getByRole('button', { name: 'Shape this idea' });
  await idea.fill('tiny');
  await shape.click();
  await expect(page.getByRole('alert')).toHaveText('Give your idea a little more detail.');
  await idea.fill('Build an app that helps neighbours share gardening tools.');
  await shape.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('Product designer', { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Build the smallest working prototype' })).toBeVisible();
  await page.getByRole('button', { name: 'Start a podcast', exact: true }).click();
  await expect(idea).toHaveValue(/Start a podcast/);
  await expect(page.getByText('Producer + sound', { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Record a rough first session' })).toBeVisible();
  expect(preregistrationApi.submissions).toEqual([]);
});

base.describe('browser execution against real local API', () => {
  let server: express.Express;
  let listener: import('node:http').Server;
  let realApiBase: string;
  const createdEmails: string[] = [];

  base.beforeAll(async () => {
    server = express();
    server.use(express.json());
    server.use('/api', preregisterRoutes);
    listener = server.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => listener.once('listening', resolve));
    const addr = listener.address() as AddressInfo;
    realApiBase = `http://127.0.0.1:${addr.port}`;
  });

  base.afterAll(async () => {
    listener?.closeAllConnections();
    listener?.close();
    for (const email of createdEmails) {
      await pool.query('DELETE FROM preregistrations WHERE email = $1', [email]).catch(() => {});
    }
  });

  base.beforeEach(async ({ page }) => {
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
      if (url.pathname === '/api/auth/refresh') {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, data: null, message: 'No active session' }),
        });
      }
      if (url.pathname.startsWith('/api/preregister')) {
        const response = await fetch(`${realApiBase}${url.pathname}${url.search}`, {
          method: route.request().method(),
          headers: route.request().headers(),
          body: route.request().postDataBuffer() || undefined,
        });
        const body = await response.arrayBuffer();
        return route.fulfill({
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: Buffer.from(body),
        });
      }
      return route.continue();
    });
  });

  base('real API: successful signup persists to database and renders founder pass', async ({ page }) => {
    const email = `real_e2e_${randomUUID().slice(0, 8)}@example.test`;
    const username = `real_e2e_${randomUUID().slice(0, 8)}`;
    createdEmails.push(email);

    await page.goto('/preregister');
    await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
    await page.getByRole('textbox', { name: 'Your username', exact: true }).fill(username);
    await page.getByRole('checkbox', { name: consentLabel, exact: true }).check();
    await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();

    await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
    await expect(page.getByText(`@${username}`, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/^FOUNDER-[0-9A-F-]{36}$/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save your pass', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Invite your people', exact: true })).toBeVisible();

    // Verify database record
    const result = await pool.query('SELECT * FROM preregistrations WHERE email = $1', [email]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].username).toBe(username);
    expect(result.rows[0].launch_updates_consented_at).not.toBeNull();
  });

  base('real API: duplicate email receives generic acknowledgement without disclosing details', async ({ page }) => {
    const email = `dup_e2e_${randomUUID().slice(0, 8)}@example.test`;
    const originalUsername = `orig_${randomUUID().slice(0, 8)}`;
    createdEmails.push(email);

    // Initial registration
    await page.goto('/preregister');
    await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
    await page.getByRole('textbox', { name: 'Your username', exact: true }).fill(originalUsername);
    await page.getByRole('checkbox', { name: consentLabel, exact: true }).check();
    await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();
    await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();

    // Submit duplicate with another username
    await page.goto('/preregister');
    await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
    await page.getByRole('textbox', { name: 'Your username', exact: true }).fill('attacker_handle');
    await page.getByRole('checkbox', { name: consentLabel, exact: true }).check();
    await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();

    // Generic receipt shown
    await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
    await expect(page.getByText('@attacker_handle', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save your pass', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Invite your people', exact: true })).toHaveCount(0);
    await expect(page.getByText(/^FOUNDER-[0-9A-F-]{36}$/)).toHaveCount(0);

    // Database still contains original username
    const result = await pool.query('SELECT * FROM preregistrations WHERE email = $1', [email]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].username).toBe(originalUsername);
  });

  base('real API: username conflict is surfaced and user can retry with a unique username', async ({ page }) => {
    const takenUsername = `taken_${randomUUID().slice(0, 8)}`;
    const initialEmail = `initial_${randomUUID().slice(0, 8)}@example.test`;
    createdEmails.push(initialEmail);

    // Register initial user to take the username
    await page.goto('/preregister');
    await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(initialEmail);
    await page.getByRole('textbox', { name: 'Your username', exact: true }).fill(takenUsername);
    await page.getByRole('checkbox', { name: consentLabel, exact: true }).check();
    await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();
    await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();

    // Second visitor attempts same username
    const retryEmail = `retry_${randomUUID().slice(0, 8)}@example.test`;
    createdEmails.push(retryEmail);
    await page.goto('/preregister');
    await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(retryEmail);
    await page.getByRole('textbox', { name: 'Your username', exact: true }).fill(takenUsername);
    await page.getByRole('checkbox', { name: consentLabel, exact: true }).check();
    await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();

    // Conflict error appears
    await expect(page.getByRole('alert')).toContainText(/choose another preferred username/i);
    await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toHaveValue(retryEmail);
    await expect(page.getByRole('checkbox', { name: consentLabel, exact: true })).toBeChecked();

    // Change username and retry
    const uniqueUsername = `unique_${randomUUID().slice(0, 8)}`;
    await page.getByRole('textbox', { name: 'Your username', exact: true }).fill(uniqueUsername);
    await page.getByRole('button', { name: 'Join the launch list', exact: true }).click();

    // Registration succeeds
    await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
    await expect(page.getByText(`@${uniqueUsername}`, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/^FOUNDER-[0-9A-F-]{36}$/)).toBeVisible();

    const result = await pool.query('SELECT * FROM preregistrations WHERE email = $1', [retryEmail]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].username).toBe(uniqueUsername);
  });
});
