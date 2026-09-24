import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['social/src/lib/api-client.ts'], bundle: true, write: false,
  platform: 'browser', format: 'esm', define: { 'import.meta.env': '{}' },
});
async function client(t) {
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem: () => null, removeItem: () => {} },
  });
  t.after(() => storage ? Object.defineProperty(globalThis, 'localStorage', storage) : Reflect.deleteProperty(globalThis, 'localStorage'));
  const source = `${bundle.outputFiles[0].text}\n// ${randomUUID()}\n//# sourceURL=api-client-test.js`;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const ok = (data) => Response.json({ success: true, data, meta: {} });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

test('rate-limit errors display actionable text instead of machine error codes', async (t) => {
  const { api } = await client(t);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: false, message: 'Too many requests. Please try again later.', errors: ['rate_limit_exceeded'] }, { status: 429, headers: { 'Retry-After': '90' } }));
  await assert.rejects(api.getCurrentUser(), /Please try again in 2 minutes/);
});

test('a late refresh cannot restore tokens after logout', async (t) => {
  const { api, setStoredTokens, getStoredTokens } = await client(t);
  const response = deferred();
  t.mock.method(globalThis, 'fetch', () => response.promise);
  const refreshing = api.refreshSession();
  setStoredTokens(null);
  response.resolve(ok({ accessToken: 'previous-session' }));
  assert.equal(await refreshing, null);
  assert.equal(getStoredTokens(), null);
});

test('a previous account response cannot enter the next account session', async (t) => {
  const { api, setStoredTokens, getStoredTokens } = await client(t);
  const response = deferred();
  t.mock.method(globalThis, 'fetch', () => response.promise);
  setStoredTokens({ accessToken: 'account-one' });
  const request = api.getCurrentUser();
  setStoredTokens({ accessToken: 'account-two' });
  response.resolve(ok({ id: 'private-account-one-data' }));
  await assert.rejects(request, /session changed/i);
  assert.equal(getStoredTokens().accessToken, 'account-two');
});

test('a late unauthorized request does not refresh after logout', async (t) => {
  const { api, setStoredTokens } = await client(t);
  const response = deferred();
  const fetchMock = t.mock.method(globalThis, 'fetch', () => response.promise);
  setStoredTokens({ accessToken: 'account-one' });
  const request = api.getCurrentUser();
  setStoredTokens(null);
  response.resolve(Response.json({ success: false }, { status: 401 }));
  await assert.rejects(request, /session changed/i);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('refreshes coalesce without invalidating other reads in the same session', async (t) => {
  const { api, getStoredTokens } = await client(t);
  const response = deferred();
  const fetchMock = t.mock.method(globalThis, 'fetch', () => response.promise);
  const first = api.refreshSession();
  const second = api.refreshSession();
  response.resolve(ok({ accessToken: 'current-session' }));
  assert.equal((await first).accessToken, 'current-session');
  assert.equal((await second).accessToken, 'current-session');
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(getStoredTokens().accessToken, 'current-session');
});

test('bad login credentials do not trigger refresh-cookie authentication', async (t) => {
  const { api } = await client(t);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ success: false, errors: ['Incorrect credentials'] }, { status: 401 }));
  await assert.rejects(api.login({ identifier: 'tester', password: 'incorrect' }), /Incorrect credentials/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('logout still clears memory when browser storage is unavailable', async (t) => {
  const { setStoredTokens, getStoredTokens } = await client(t);
  localStorage.removeItem = () => { throw new Error('Storage denied'); };
  setStoredTokens({ accessToken: 'current-session' });
  assert.doesNotThrow(() => setStoredTokens(null));
  assert.equal(getStoredTokens(), null);
});

test('an expired access token refreshes once and retries with the new bearer', async (t) => {
  const { api, setStoredTokens } = await client(t);
  setStoredTokens({ accessToken: 'expired-token' });
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/auth/refresh')) return ok({ accessToken: 'rotated-token' });
    if (options.headers.Authorization === 'Bearer rotated-token') return ok({ id: 'current-user' });
    return Response.json({ success: false }, { status: 401 });
  });
  assert.deepEqual(await api.getCurrentUser(), { id: 'current-user' });
  assert.equal(fetchMock.mock.callCount(), 3);
});

test('authenticated auth actions refresh and retry while credential establishment stays isolated', async (t) => {
  const { api, setStoredTokens } = await client(t);
  setStoredTokens({ accessToken: 'expired-token' });
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/auth/refresh')) return ok({ accessToken: 'rotated-token' });
    if (url.endsWith('/auth/2fa/setup') && options.headers.Authorization === 'Bearer rotated-token') {
      return ok({ secret: 'secret', otpauthUrl: 'otpauth://totp/test' });
    }
    return Response.json({ success: false }, { status: 401 });
  });
  assert.deepEqual(await api.setupTwoFactor(), { secret: 'secret', otpauthUrl: 'otpauth://totp/test' });
  assert.equal(fetchMock.mock.callCount(), 3);
});

test('logout is cookie-backed and prevents refresh from restoring the session', async (t) => {
  const { api, setStoredTokens, getStoredTokens } = await client(t);
  setStoredTokens({ accessToken: 'expired-token' });
  const fetchMock = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return ok(null);
  });
  await api.logout();
  assert.equal(getStoredTokens(), null);
  assert.equal(await api.refreshSession(), null);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('an explicit logout marker survives client reinitialization until the next login', async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
  });
  t.after(() => previous ? Object.defineProperty(globalThis, 'localStorage', previous) : Reflect.deleteProperty(globalThis, 'localStorage'));
  const loadClient = async () => {
    const source = `${bundle.outputFiles[0].text}\n// ${randomUUID()}\n//# sourceURL=api-client-reload-test.js`;
    return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  };
  const first = await loadClient();
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/auth/logout')) {
      assert.equal(options.headers.Authorization, undefined);
      return ok(null);
    }
    return ok({ accessToken: 'restored-session' });
  });
  first.setStoredTokens({ accessToken: 'expired-token' });
  await first.api.logout();
  assert.equal(storage.get('yortalks-logged-out'), '1');

  const reloaded = await loadClient();
  assert.equal(await reloaded.api.refreshSession(), null);
  assert.equal(fetchMock.mock.callCount(), 1);
  reloaded.setStoredTokens({ accessToken: 'new-login' });
  assert.equal(storage.has('yortalks-logged-out'), false);
  assert.equal((await reloaded.api.refreshSession()).accessToken, 'restored-session');
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('a temporary refresh outage preserves the session token and returns a retryable error', async (t) => {
  const { api, setStoredTokens, getStoredTokens } = await client(t);
  setStoredTokens({ accessToken: 'expired-token' });
  t.mock.method(globalThis, 'fetch', async (url) => url.endsWith('/auth/refresh')
    ? Response.json({ success: false, message: 'Unavailable' }, { status: 503 })
    : Response.json({ success: false }, { status: 401 }));
  await assert.rejects(api.getCurrentUser(), /Could not verify your session/);
  assert.equal(getStoredTokens()?.accessToken, 'expired-token');
});

test('paginated private data obeys the same session boundary', async (t) => {
  const { api, setStoredTokens } = await client(t);
  setStoredTokens({ accessToken: 'previous-account' });
  const response = deferred();
  t.mock.method(globalThis, 'fetch', () => response.promise);
  const request = api.getFeed('following');
  setStoredTokens(null);
  response.resolve(ok([{ id: 'previous-private-post' }]));
  await assert.rejects(request, /session changed/i);
});
