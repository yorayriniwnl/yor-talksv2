import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

type Method = 'getPremiumBilling' | 'getCheckouts';
type FixtureWindow = Window & {
  __deferredClient: {
    api: Record<Method, () => Promise<unknown>>;
    setStoredTokens: (tokens: { accessToken: string } | null) => void;
    getStoredTokens: () => { accessToken: string } | null;
  };
  __deferredResult: { state: 'pending' | 'resolved' | 'rejected'; value?: unknown; status?: number; message?: string };
};

let modules: Map<string, string>;
let parserPaths: Record<Method, string>;

test.beforeAll(async () => {
  // Compile the actual client and its unchanged schemas. The fixture exposes
  // only their real exports; no session or validation hook enters product code.
  // write:false keeps the synthetic build in memory, outside application output.
  const result = await build({
    entryPoints: [path.resolve('social/src/lib/api-client.ts')],
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    outdir: path.join(tmpdir(), `yor-deferred-validation-${randomUUID()}`),
    entryNames: 'client-fixture',
    chunkNames: '[name]-[hash]',
    define: { 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: '/api' }) },
    write: false,
    metafile: true,
  });
  modules = new Map(result.outputFiles.map(file => [`/${path.basename(file.path)}`, file.text]));
  const findParserPath = (source: string) => {
    const output = Object.entries(result.metafile.outputs).find(([, info]) => info.entryPoint?.replace(/\\/g, '/').endsWith(source));
    if (!output) throw new Error(`Expected a deferred schema module for ${source}`);
    const pathname = `/${path.basename(output[0])}`;
    if (pathname === '/client-fixture.js' || !modules.has(pathname)) throw new Error(`Schema is not a separate served chunk: ${source}`);
    return pathname;
  };
  parserPaths = {
    getPremiumBilling: findParserPath('/premium-billing-contract.ts'),
    getCheckouts: findParserPath('/checkout-contract.ts'),
  };
});

const scenarios: { method: Method; apiPath: string; value: unknown }[] = [
  {
    method: 'getPremiumBilling',
    apiPath: '/api/premium/me',
    value: {
      catalog: { available: false, plan: null, operationalFeatures: {}, automaticRenewal: false,
        billingModel: 'prepaid_fixed_term', testMode: true, supportEmail: 'support@example.test' },
      subscription: null, orders: [], enabledFeatures: {},
    },
  },
  {
    method: 'getCheckouts',
    apiPath: '/api/billing/checkouts',
    value: [{ checkoutId: '10000000-0000-4000-8000-000000000001', product: 'tip', providerOrderId: null,
      status: 'creation_unknown', providerState: 'unknown', lastPaymentStatus: null, amountMinor: 19900,
      currency: 'INR', createdAt: '2026-10-09T00:00:00.000Z', keyId: 'synthetic-test-key' }],
  },
];

for (const scenario of scenarios) test(`${scenario.method} rejects account A data when the deferred validator loads after account B signs in`, async ({ page }) => {
  // Each Playwright page has a fresh context, so both parser modules start cold.
  let releaseParser!: () => void;
  const parserGate = new Promise<void>(resolve => { releaseParser = resolve; });
  let parserRequests = 0;
  const authorization: (string | undefined)[] = [];
  const unexpected: string[] = [];
  await page.route('**/*', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/__deferred-client/') {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><link rel="icon" href="data:,"></head><body><script type="module">import * as client from "/client-fixture.js";window.__deferredClient=client;</script></body></html>' });
    }
    if (pathname === scenario.apiPath && request.method() === 'GET') {
      authorization.push(request.headers().authorization);
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: 'OK', data: scenario.value, errors: [], meta: {} }) });
    }
    const module = modules.get(pathname);
    if (module !== undefined) {
      if (pathname === parserPaths[scenario.method]) { parserRequests++; await parserGate; }
      return route.fulfill({ contentType: 'text/javascript', body: module });
    }
    unexpected.push(`${request.method()} ${pathname}`);
    await route.abort();
  });

  try {
    await page.goto('/__deferred-client/');
    await page.waitForFunction(() => Boolean((window as FixtureWindow).__deferredClient));
    expect(parserRequests, 'Schemas must remain deferred until a billing response arrives').toBe(0);
    await page.evaluate(method => {
      const fixture = window as FixtureWindow;
      fixture.__deferredClient.setStoredTokens({ accessToken: 'synthetic-account-A' });
      fixture.__deferredResult = { state: 'pending' };
      void fixture.__deferredClient.api[method]().then(value => {
        fixture.__deferredResult = { state: 'resolved', value };
      }, error => {
        fixture.__deferredResult = { state: 'rejected', status: error.status, message: error.message };
      });
    }, scenario.method);
    await expect.poll(() => parserRequests).toBe(1);
    expect(authorization).toEqual(['Bearer synthetic-account-A']);
    expect(await page.evaluate(() => (window as FixtureWindow).__deferredResult)).toEqual({ state: 'pending' });

    await page.evaluate(() => (window as FixtureWindow).__deferredClient.setStoredTokens({ accessToken: 'synthetic-account-B' }));
    releaseParser();
    await expect.poll(() => page.evaluate(() => (window as FixtureWindow).__deferredResult)).toEqual({
      state: 'rejected', status: 409, message: 'Your session changed. Please try again.',
    });
    expect(await page.evaluate(() => (window as FixtureWindow).__deferredClient.getStoredTokens())).toEqual({ accessToken: 'synthetic-account-B' });

    // A fresh B request must pass the same real schema. This also proves that
    // malformed fixture data or a broken module cannot explain the rejection.
    expect(await page.evaluate(method => (window as FixtureWindow).__deferredClient.api[method](), scenario.method)).toEqual(scenario.value);
    expect(authorization).toEqual(['Bearer synthetic-account-A', 'Bearer synthetic-account-B']);
    expect(parserRequests).toBe(1);
    expect(unexpected).toEqual([]);
  } finally {
    releaseParser();
  }
});

test('a failed validator download rejects billing data without invalidating the current session', async ({ page }) => {
  const [premium, checkouts] = scenarios;
  let failedParserRequests = 0;
  const authorization: (string | undefined)[] = [];
  const unexpected: string[] = [];
  await page.route('**/*', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/__deferred-client/') {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><link rel="icon" href="data:,"></head><body><script type="module">import * as client from "/client-fixture.js";window.__deferredClient=client;</script></body></html>' });
    }
    const scenario = scenarios.find(item => item.apiPath === pathname);
    if (scenario && request.method() === 'GET') {
      authorization.push(request.headers().authorization);
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: 'OK', data: scenario.value, errors: [], meta: {} }) });
    }
    const module = modules.get(pathname);
    if (module !== undefined) {
      if (pathname === parserPaths[premium.method]) {
        failedParserRequests++;
        return route.abort('failed');
      }
      return route.fulfill({ contentType: 'text/javascript', body: module });
    }
    unexpected.push(`${request.method()} ${pathname}`);
    await route.abort();
  });

  await page.goto('/__deferred-client/');
  await page.waitForFunction(() => Boolean((window as FixtureWindow).__deferredClient));
  const result = await page.evaluate(method => {
    const fixture = window as FixtureWindow;
    fixture.__deferredClient.setStoredTokens({ accessToken: 'synthetic-current-account' });
    return fixture.__deferredClient.api[method]().then(
      value => ({ state: 'resolved', value }),
      error => ({ state: 'rejected', status: error.status, message: error.message }),
    );
  }, premium.method);
  expect(failedParserRequests).toBe(1);
  expect(result).toEqual({
    state: 'rejected', status: 503, message: 'Billing details could not be loaded. Reload this page and try again.',
  });
  expect(await page.evaluate(() => (window as FixtureWindow).__deferredClient.getStoredTokens())).toEqual({ accessToken: 'synthetic-current-account' });

  // An independent validated request must still use the same live session.
  // An attempted refresh or logout is caught by the route allowlist above.
  expect(await page.evaluate(method => (window as FixtureWindow).__deferredClient.api[method](), checkouts.method)).toEqual(checkouts.value);
  expect(authorization).toEqual(['Bearer synthetic-current-account', 'Bearer synthetic-current-account']);
  expect(unexpected).toEqual([]);
});
