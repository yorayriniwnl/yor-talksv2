import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['social/src/lib/api-client.ts'], bundle: true, write: false,
  platform: 'browser', format: 'esm', define: { 'import.meta.env': '{}' },
});
const eligibilityBundle = await build({
  entryPoints: ['social/src/lib/eligibility-contract.ts'], bundle: true, write: false,
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
async function eligibilityContract() {
  const source = `${eligibilityBundle.outputFiles[0].text}\n// ${randomUUID()}\n//# sourceURL=eligibility-contract-test.js`;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const ok = (data) => Response.json({ success: true, data, meta: {} });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

test('rate-limit errors display actionable text instead of machine error codes', async (t) => {
  const { api } = await client(t);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: false, message: 'Too many requests. Please try again later.', errors: ['rate_limit_exceeded'] }, { status: 429, headers: { 'Retry-After': '90' } }));
  await assert.rejects(api.getCurrentUser(), /Please try again in 2 minutes/);
});

for (const [label, run] of [
  ['email verification', api => api.verifyEmail('one-time-token')],
  ['password confirmation', api => api.confirmPasswordReset('one-time-token', 'ValidPassword1!')],
  ['password reset request', api => api.requestPasswordReset('person@example.test')],
  ['public verification resend', api => api.resendPublicVerificationEmail('person@example.test')],
]) test(`${label} survives unrelated session restoration without attaching account credentials`, async t => {
  const { api, setStoredTokens, getStoredTokens } = await client(t);
  const response = deferred();
  let sent;
  t.mock.method(globalThis, 'fetch', (_url, options) => { sent = options; return response.promise; });
  setStoredTokens({ accessToken: 'unrelated-account' });
  const operation = run(api);
  setStoredTokens(null);
  response.resolve(ok({ accepted: true }));
  assert.deepEqual(await operation, { accepted: true });
  assert.equal(sent.headers.Authorization, undefined);
  assert.equal(getStoredTokens(), null);
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

test('eligibility and receipt contracts reject extra or self-asserted authority', async () => {
  const { eligibilityDecisionSchema, challengeReceiptSchema, contactRulesSchema, groupInvitationSchema } = await eligibilityContract();
  const decision = {
    experience: 'adult_18_plus', activated: true,
    capabilities: { social: true, publish: true, messaging: true, payments: false, seller: false, memberships: false, live: false, rtc: false, ai: false, analytics: true, profiling: true },
    maximumContentRating: 'regular', policyVersions: ['policy-v1'], revision: 'a'.repeat(64), reason: null, publicBrowsingAllowed: true,
  };
  assert.equal(eligibilityDecisionSchema.safeParse(decision).success, true);
  assert.equal(eligibilityDecisionSchema.safeParse({ ...decision, ageConfirmedAt: new Date().toISOString() }).success, false);
  assert.equal(eligibilityDecisionSchema.safeParse({ ...decision, experience: 'unknown' }).success, false);
  assert.equal(challengeReceiptSchema.safeParse({ challengeId: randomUUID(), nextStep: 'verification_required', redirectUrl: 'javascript:alert(1)', expiresAt: new Date(Date.now() + 60_000).toISOString() }).success, false);
  assert.equal(contactRulesSchema.safeParse({ decision, guardianContactsRequired: false, guardianPolicyVersions: {}, guardianNoticeVersions: {}, privateGuardianReference: 'secret' }).success, false);
  const invitation = { id: randomUUID(), conversationId: randomUUID(), inviterId: randomUUID(), recipientId: randomUUID(), status: 'pending', memberIds: [randomUUID()], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), requiresYourAcceptance: true, guardianApprovalRequired: false };
  assert.equal(groupInvitationSchema.safeParse(invitation).success, true);
  assert.equal(groupInvitationSchema.safeParse({ ...invitation, messageHistory: ['private content'] }).success, false);
});

test('registration keeps the one-time enrollment credential out of URLs and omits checkbox age claims', async (t) => {
  const { api } = await client(t);
  const nonce = 'n'.repeat(43);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ok({ user: {}, verificationRequired: true }));
  await api.register({ username: 'tester', email: 'tester@example.test', password: 'StrongPassword1!', fullName: 'Test User', acceptedTerms: true, enrollmentId: randomUUID(), registrationNonce: nonce });
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(String(url).includes(nonce), false);
  assert.equal(JSON.parse(options.body).registrationNonce, nonce);
  assert.equal('confirmedAge' in JSON.parse(options.body), false);
});

test('group invitation API accepts owner-safe metadata and rejects any message history', async (t) => {
  const { api } = await client(t);
  const invitation = { id: randomUUID(), conversationId: randomUUID(), inviterId: randomUUID(), recipientId: randomUUID(), status: 'pending', memberIds: [randomUUID()], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), requiresYourAcceptance: true, guardianApprovalRequired: false };
  let response = [invitation];
  t.mock.method(globalThis, 'fetch', async () => ok(response));
  assert.deepEqual(await api.getGroupInvitations(), [invitation]);
  response = [{ ...invitation, messageHistory: [{ content: 'private message' }] }];
  await assert.rejects(api.getGroupInvitations());
});

for (const [name, path, signIn] of [
  ['password', '/auth/login', (api) => api.login({ identifier: 'next@example.test', password: 'SyntheticPassword1!' })],
  ['Google', '/auth/google', (api) => api.loginWithGoogle({ credential: 'synthetic-google-credential' })],
  ['email OTP', '/auth/email-otp/verify', (api) => api.loginWithEmailOtp({ email: 'next@example.test', code: '123456' })],
  ['two-factor completion', '/auth/2fa/challenges/synthetic-challenge/complete', (api) => api.completeTwoFactorLogin('synthetic-challenge')],
]) {
  test(`${name} sign-in waits for a pending logout response before installing its cookie`, async (t) => {
    const { api, setStoredTokens, getStoredTokens } = await client(t);
    setStoredTokens({ accessToken: 'previous-account' });
    const logoutResponse = deferred();
    const loginResponse = deferred();
    const started = [];
    let cookie = 'previous-account';
    t.mock.method(globalThis, 'fetch', (url, options) => {
      started.push(url.replace('/api', ''));
      assert.equal(options.credentials, 'include');
      const isLogout = url.endsWith('/auth/logout');
      return (isLogout ? logoutResponse.promise : loginResponse.promise).then((response) => {
        cookie = isLogout ? null : 'next-account';
        return response;
      });
    });
    const logout = api.logout();
    assert.equal(getStoredTokens(), null, 'local sign-out is immediate');
    await nextTurn();
    const login = signIn(api);
    await nextTurn();
    assert.deepEqual(started, ['/auth/logout']);
    logoutResponse.resolve(ok(null));
    await logout;
    await nextTurn();
    assert.deepEqual(started, ['/auth/logout', path]);
    loginResponse.resolve(ok({ user: { id: 'next-user' }, tokens: { accessToken: 'next-account' } }));
    await login;
    assert.equal(cookie, 'next-account', 'an earlier logout cannot erase the newer cookie');
  });
}

test('competing credential responses are ordered across sign-in methods', async (t) => {
  const { api } = await client(t);
  const passwordResponse = deferred();
  const googleResponse = deferred();
  const started = [];
  let cookie;
  t.mock.method(globalThis, 'fetch', (url) => {
    started.push(url);
    const password = url.endsWith('/auth/login');
    return (password ? passwordResponse.promise : googleResponse.promise).then((response) => {
      cookie = password ? 'old-attempt' : 'latest-attempt';
      return response;
    });
  });
  const older = api.login({ identifier: 'old@example.test', password: 'SyntheticPassword1!' });
  await nextTurn();
  const latest = api.loginWithGoogle({ credential: 'synthetic-google-credential' });
  await nextTurn();
  assert.deepEqual(started, ['/api/auth/login']);
  passwordResponse.resolve(ok({ user: { id: 'old' }, tokens: { accessToken: 'old' } }));
  await older;
  await nextTurn();
  assert.deepEqual(started, ['/api/auth/login', '/api/auth/google']);
  googleResponse.resolve(ok({ user: { id: 'latest' }, tokens: { accessToken: 'latest' } }));
  await latest;
  assert.equal(cookie, 'latest-attempt');
});

test('an in-flight rotation finishes before logout and the next sign-in exchange', async (t) => {
  const { api, setStoredTokens, getStoredTokens } = await client(t);
  setStoredTokens({ accessToken: 'old-account' });
  const responses = new Map(['/auth/refresh', '/auth/logout', '/auth/login'].map((path) => [path, deferred()]));
  const started = [];
  let cookie = 'old-account';
  t.mock.method(globalThis, 'fetch', (url) => {
    const path = url.replace('/api', '');
    started.push(path);
    return responses.get(path).promise.then((response) => {
      cookie = path === '/auth/logout' ? null : path === '/auth/login' ? 'next-account' : 'old-rotated';
      return response;
    });
  });
  const refreshing = api.refreshSession();
  await nextTurn();
  const logout = api.logout();
  const login = api.login({ identifier: 'next@example.test', password: 'SyntheticPassword1!' });
  await nextTurn();
  assert.deepEqual(started, ['/auth/refresh']);
  assert.equal(getStoredTokens(), null);
  responses.get('/auth/refresh').resolve(ok({ accessToken: 'old-rotated' }));
  assert.equal(await refreshing, null);
  await nextTurn();
  assert.deepEqual(started, ['/auth/refresh', '/auth/logout']);
  responses.get('/auth/logout').resolve(ok(null));
  await logout;
  await nextTurn();
  assert.deepEqual(started, ['/auth/refresh', '/auth/logout', '/auth/login']);
  responses.get('/auth/login').resolve(ok({ user: { id: 'next' }, tokens: { accessToken: 'next-account' } }));
  await login;
  assert.equal(cookie, 'next-account');
});

test('a failed cookie exchange releases the queue for the next sign-in', async (t) => {
  const { api } = await client(t);
  const response = deferred();
  const started = [];
  t.mock.method(globalThis, 'fetch', (url) => {
    started.push(url);
    return url.endsWith('/auth/logout') ? response.promise : Promise.resolve(ok({ user: {}, tokens: { accessToken: 'next' } }));
  });
  const logout = api.logout();
  const rejected = assert.rejects(logout, /Unavailable/);
  const login = api.login({ identifier: 'next@example.test', password: 'SyntheticPassword1!' });
  await nextTurn();
  assert.deepEqual(started, ['/api/auth/logout']);
  response.resolve(Response.json({ success: false, message: 'Unavailable' }, { status: 503 }));
  await rejected;
  await login;
  assert.deepEqual(started, ['/api/auth/logout', '/api/auth/login']);
});

test('account deletion releases its cookie exchange before refreshing and retrying', async (t) => {
  const { api, setStoredTokens } = await client(t);
  setStoredTokens({ accessToken: 'expired-account-token' });
  const started = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    started.push(url);
    if (url.endsWith('/auth/refresh')) return ok({ accessToken: 'rotated-account-token' });
    return options.headers.Authorization === 'Bearer rotated-account-token'
      ? ok(null)
      : Response.json({ success: false }, { status: 401 });
  });
  await api.deleteAccount('SyntheticPassword1!');
  assert.deepEqual(started, ['/api/users/me', '/api/auth/refresh', '/api/users/me']);
});

test('cookie exchanges in separate clients share the same browser lock', async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let lockTail = Promise.resolve();
  const lockNames = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: {
    request(name, _options, work) {
      lockNames.push(name);
      const operation = lockTail.then(work);
      lockTail = operation.then(() => undefined, () => undefined);
      return operation;
    },
  } } });
  t.after(() => previous ? Object.defineProperty(globalThis, 'navigator', previous) : Reflect.deleteProperty(globalThis, 'navigator'));
  const firstClient = await client(t);
  const secondClient = await client(t);
  const response = deferred();
  const started = [];
  t.mock.method(globalThis, 'fetch', (url) => {
    started.push(url);
    return url.endsWith('/auth/login') ? response.promise : Promise.resolve(ok(null));
  });
  const signingIn = firstClient.api.login({ identifier: 'first@example.test', password: 'SyntheticPassword1!' });
  await nextTurn();
  const signingOut = secondClient.api.logout();
  await nextTurn();
  assert.deepEqual(started, ['/api/auth/login']);
  response.resolve(ok({ user: {}, tokens: { accessToken: 'first' } }));
  await Promise.all([signingIn, signingOut]);
  assert.deepEqual(started, ['/api/auth/login', '/api/auth/logout']);
  assert.deepEqual(lockNames, ['yor-session-refresh', 'yor-session-refresh']);
});

test('saved collection clients preserve cursor metadata and encode opaque cursors', async (t) => {
  const { api } = await client(t);
  const paths = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    paths.push(url);
    return Response.json({ success: true, data: [{ id: 'saved' }], meta: { hasMore: true, nextCursor: 'next-cursor', limit: 50 } });
  });
  const posts = await api.getSavedPosts(50, 'opaque+/=?');
  const videos = await api.getSavedVideosPage(50, 'opaque+/=?');
  assert.deepEqual(posts, { data: [{ id: 'saved' }], hasMore: true, nextCursor: 'next-cursor' });
  assert.deepEqual(videos, posts);
  assert.deepEqual(await api.getSavedVideos(), [{ id: 'saved' }], 'the existing video array helper retains its return shape');
  assert.deepEqual(paths, ['/api/posts/saved?limit=50&cursor=opaque%2B%2F%3D%3F', '/api/videos/saved?limit=50&cursor=opaque%2B%2F%3D%3F', '/api/videos/saved']);
});
