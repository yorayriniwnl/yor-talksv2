import { expect, test as base, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

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
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your people.');
    await expect(page.getByText(/0?1(?:st)? December 2026/i).first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Your username', exact: true })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: consentLabel, exact: true })).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Get early access', exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    expect(preregistrationApi.submissions).toEqual([]);
    if (path === '/preregister') {
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
      await page.screenshot({ path: 'test-results/preregister-desktop.png', fullPage: true });
    }
  });
}

test('mobile pre-registration remains readable without horizontal scrolling', async ({ page, preregistrationApi }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/preregister');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Get early access', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Get early access', exact: true })).toBeVisible();
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
  const submit = page.getByRole('button', { name: 'Get early access', exact: true });

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
  await page.getByRole('button', { name: 'Get early access', exact: true }).click();

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

test('an existing email receives a generic acknowledgement without another member pass', async ({ page, preregistrationApi }) => {
  preregistrationApi.respond = (route) => json(route, { isExisting: true, launchDate, perks });
  await page.goto('/preregister');
  await fillRegistration(page, 'existing@example.test', 'new_username');
  await page.getByRole('button', { name: 'Get early access', exact: true }).click();

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
  await page.getByRole('button', { name: 'Get early access', exact: true }).click();

  await expect(page.getByRole('alert')).toContainText(/temporarily unavailable|try again/i);
  await expect(page.getByRole('textbox', { name: 'Email address', exact: true })).toHaveValue('ada@example.test');
  await expect(page.getByRole('textbox', { name: 'Your username', exact: true })).toHaveValue('ada_lovelace');
  await expect(page.getByRole('checkbox', { name: consentLabel, exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Get early access', exact: true })).toBeEnabled();

  preregistrationApi.respond = (route) => json(route, newPass(), 201);
  await page.getByRole('button', { name: 'Get early access', exact: true }).click();
  await expect(page.getByRole('heading', { name: confirmation })).toBeVisible();
  expect(preregistrationApi.submissions).toHaveLength(2);
  expect(preregistrationApi.submissions[1]).toEqual(preregistrationApi.submissions[0]);
});
