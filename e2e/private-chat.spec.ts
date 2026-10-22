import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { generateIdentity, type IdentityBackup } from '../social/src/lib/private-chat-crypto';

const aId = 'f214f684-624b-4d7c-bfc0-1b399127dce1';
const bId = 'f214f684-624b-4d7c-bfc0-1b399127dce2';
const threadId = 'f214f684-624b-4d7c-bfc0-1b399127dce3';
const passphrase = 'Orbit-Willow-97-silver-corner';
const users = [aId, bId].map((id, i) => ({
  id, username: i ? 'bela' : 'ada', fullName: i ? 'Bela Shah' : 'Ada Rao',
  email: `${i ? 'bela' : 'ada'}@example.test`, bio: '', avatarUrl: null, role: 'user',
  permissions: [], createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z',
  followerCount: 1, followingCount: 1, postCount: 0, verified: true, followers: [], following: [],
  settings: { notificationsEnabled: false }, privacy: {},
  termsVersion: 'test-public-beta-1', termsAcceptedAt: '2026-10-20T00:00:00Z', onboardingCompleted: true,
}));
const eligibility = {
  experience: 'adult_18_plus', activated: true, maximumContentRating: 'mature',
  policyVersions: ['test-policy-v1'], revision: 'a'.repeat(64), reason: null, publicBrowsingAllowed: true,
  capabilities: { social: true, publish: true, messaging: true, payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true, analytics: true, profiling: true },
};
const thread = { id: threadId, participantIds: [aId, bId], createdAt: '2026-10-20T10:00:00.000Z', updatedAt: '2026-10-20T10:00:00.000Z' };
type Envelope = { id: string; threadId: string; senderId: string; ciphertext: string; createdAt: string };
type Broker = {
  identities: Map<string, IdentityBackup>;
  messages: Envelope[];
  requests: Array<{ path: string; body: string }>;
  hasThread: boolean;
  failNextSend: boolean;
  denyThread: boolean;
};
const broker = (): Broker => ({ identities: new Map(), messages: [], requests: [], hasThread: false, failNextSend: false, denyThread: false });
const publicIdentity = (value: IdentityBackup) => ({ userId: value.userId, publicKey: value.publicKey, fingerprint: value.fingerprint, createdAt: '2026-10-20T00:00:00.000Z' });
async function json(route: Route, data: unknown, status = 200, message = 'OK') {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: status < 400, message, data, errors: [], meta: {} }) });
}
async function install(page: Page, index: number, state: Broker, backup?: IdentityBackup) {
  const profile = users[index];
  if (backup) await page.addInitScript(({ id, value }) => localStorage.setItem(`yor:private-chat:encrypted-key:v1:${id}`, JSON.stringify(value)), { id: profile.id, value: backup });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/socket.io')) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const path = url.pathname.slice(4);
    const method = request.method();
    state.requests.push({ path, body: request.postData() || '' });
    if (path === '/auth/refresh') return json(route, { accessToken: `synthetic-${index}` });
    if (path === '/users/me') return json(route, profile);
    if (path === '/users/me/eligibility') return json(route, eligibility);
    if (path === '/users/search') return json(route, [users[1 - index]]);
    if (/^\/users\/[0-9a-f-]{36}$/.test(path)) return json(route, users.find(user => path.endsWith(user.id)));
    if (path === '/users/me/premium-profile') return json(route, {
      selection: { bioStyleId: 'default', messageFontId: 'default', storyFontId: 'default', appIconId: 'yor-default' },
      options: { bioStyles: [], messageStyles: [], storyStyles: [], appIcons: [] }, enabledFeatures: {},
    });
    if (path === '/private-messages/identity') {
      if (method === 'GET') return json(route, state.identities.has(profile.id) ? publicIdentity(state.identities.get(profile.id)!) : null);
      const value = request.postDataJSON();
      expect(Object.keys(value).sort()).toEqual(['fingerprint', 'publicKey']);
      expect(value.publicKey).not.toContain('PRIVATE KEY');
      const created = { ...value, userId: profile.id, version: 1 } as IdentityBackup;
      state.identities.set(profile.id, created);
      return json(route, publicIdentity(created));
    }
    if (path === '/private-messages/threads') {
      if (method === 'GET') return json(route, { items: state.hasThread ? [thread] : [] });
      if (state.identities.size !== 2) return json(route, null, 409, 'Both people need to set up private chats first');
      state.hasThread = true;
      return json(route, { thread, members: [...state.identities.values()].map(publicIdentity) }, 201);
    }
    if (path.startsWith(`/private-messages/threads/${threadId}`)) {
      if (state.denyThread) return json(route, null, 403, 'This private conversation is unavailable');
      if (path === `/private-messages/threads/${threadId}`) return json(route, { thread, members: [...state.identities.values()].map(publicIdentity) });
      if (method === 'GET') {
        const after = Number(url.searchParams.get('after') || '0');
        const items = state.messages.slice(after, after + 10);
        return json(route, { items, nextCursor: String(after + items.length), hasMore: state.messages.length > after + items.length });
      }
      const value = request.postDataJSON();
      expect(Object.keys(value).sort()).toEqual(['ciphertext', 'id']);
      expect(value.ciphertext).toMatch(/^-----BEGIN PGP MESSAGE-----/);
      if (!state.messages.some(message => message.id === value.id)) state.messages.push({
        ...value, threadId, senderId: profile.id, createdAt: new Date(Date.now() + state.messages.length).toISOString(),
      });
      if (state.failNextSend) { state.failNextSend = false; return route.abort('failed'); }
      return json(route, state.messages.find(message => message.id === value.id), 201);
    }
    const empty = ['/feed', '/notifications', '/users/me/follow-requests', '/users/me/close-friends', '/users/me/favorites/creators', '/users/me/contact-shields', '/users/me/guardian-authorizations', '/conversations', '/stories', '/notes', '/videos', '/articles', '/events', '/products', '/products/orders', '/communities', '/creator/workspace', '/achievements/me', '/group-invitations'];
    if (method === 'GET' && (empty.includes(path) || /^\/users\/[0-9a-f-]{36}\/(following|followers|feed|showcases|profile-comments|pinned-posts|posts)$/.test(path))) return json(route, []);
    if (path === '/readyz') return json(route, { status: 'ready' });
    throw new Error(`Unexpected private chat fixture request: ${method} ${path}`);
  });
}
async function unlock(page: Page) {
  await page.goto('/private-messages');
  await page.getByLabel('Recovery passphrase', { exact: true }).fill(passphrase);
  await page.getByRole('button', { name: 'Unlock this tab', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your private conversations', exact: true })).toBeVisible({ timeout: 30_000 });
}
async function enterThread(page: Page, peerName: string, peerFingerprint: string) {
  await page.getByLabel('Find someone for a private chat').fill(peerName.split(' ')[0]);
  await page.getByRole('button', { name: new RegExp(peerName) }).click();
  await expect(page.getByRole('button', { name: 'Send privately', exact: true })).toBeDisabled();
  await page.getByLabel('Fingerprint received directly from them').fill(peerFingerprint);
  await page.getByRole('button', { name: 'Verify fingerprint', exact: true }).click();
}

test('new identity requires an encrypted recovery download before enrollment and never uploads a secret', async ({ page }) => {
  test.setTimeout(90_000);
  const state = broker(); await install(page, 0, state);
  await page.goto('/private-messages');
  await page.getByLabel('Recovery passphrase', { exact: true }).fill(passphrase);
  await page.getByLabel('Confirm your recovery passphrase', { exact: true }).fill(passphrase);
  await page.getByRole('button', { name: 'Create my protected key', exact: true }).click();
  const activate = page.getByRole('button', { name: 'Activate private chats', exact: true });
  await expect(activate).toBeVisible({ timeout: 30_000 });
  await expect(activate).toBeDisabled();
  expect(state.identities.size).toBe(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download recovery file', exact: true }).click();
  const file = await download;
  const backup = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(backup.encryptedPrivateKey).toContain('BEGIN PGP PRIVATE KEY BLOCK');
  expect(JSON.stringify(backup)).not.toContain(passphrase);
  await page.getByLabel('I saved this file and can remember its passphrase.').check();
  await activate.click();
  await expect(page.getByRole('heading', { name: 'Your private conversations', exact: true })).toBeVisible({ timeout: 30_000 });
  expect(state.identities.size).toBe(1);
  expect(JSON.stringify(state.requests)).not.toContain(passphrase);
  expect(JSON.stringify(state.requests)).not.toContain('PRIVATE KEY BLOCK');
  await page.getByLabel('Find someone for a private chat').fill('Bela');
  await page.getByRole('button', { name: /Bela Shah/ }).click();
  await expect(page.getByRole('alert')).toContainText('Both people need');
  expect(state.requests.filter(value => value.path === '/messages')).toHaveLength(0);
  await page.getByRole('button', { name: 'Lock this tab', exact: true }).click();
  await page.evaluate(owner => localStorage.removeItem(`yor:private-chat:encrypted-key:v1:${owner}`), aId);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Restore your key', exact: true })).toBeVisible();
  await page.getByLabel('Import a recovery file').setInputFiles({
    name: 'yor-private-chat-recovery.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByLabel('Recovery passphrase', { exact: true }).fill(passphrase);
  await page.getByRole('button', { name: 'Unlock this tab', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your private conversations', exact: true })).toBeVisible();
  expect(state.requests.filter(value => value.path === '/private-messages/identity' && value.body)).toHaveLength(1);
});

test('two isolated browsers decrypt text/files, deduplicate a lost receipt and hide tampered or revoked history', async ({ browser }) => {
  test.setTimeout(120_000);
  const state = broker();
  const [alice, bob] = await Promise.all([generateIdentity(aId, passphrase), generateIdentity(bId, passphrase)]);
  state.identities.set(aId, alice); state.identities.set(bId, bob);
  const first = await browser.newContext(), second = await browser.newContext();
  try {
    const a = await first.newPage(), b = await second.newPage();
    await install(a, 0, state, alice); await install(b, 1, state, bob);
    await Promise.all([unlock(a), unlock(b)]);
    await enterThread(a, 'Bela Shah', bob.fingerprint);
    await enterThread(b, 'Ada Rao', alice.fingerprint);
    const secret = 'PRIVATE-SENTINEL-984ac3: dinner at the little cafe';
    const attachmentText = 'ATTACHMENT-SENTINEL-923e17';
    await a.getByLabel('Private message', { exact: true }).fill(secret);
    await a.getByLabel('Attach an encrypted file').setInputFiles({ name: 'private-note.txt', mimeType: 'text/plain', buffer: Buffer.from(attachmentText) });
    await expect(a.locator('.pc-selected-file')).toContainText('private-note.txt');
    state.failNextSend = true;
    await a.getByRole('button', { name: 'Send privately', exact: true }).click();
    await expect(a.getByRole('button', { name: 'Retry encrypted delivery', exact: true })).toBeEnabled();
    await a.getByRole('button', { name: 'Retry encrypted delivery', exact: true }).click();
    await expect(a.getByRole('status').filter({ hasText: 'Encrypted message sent.' })).toBeVisible();
    expect(state.messages).toHaveLength(1);
    await expect(b.getByText(secret, { exact: true })).toBeVisible({ timeout: 15_000 });
    const download = b.waitForEvent('download');
    await b.getByRole('button', { name: 'private-note.txt', exact: true }).click();
    expect(await readFile((await (await download).path())!, 'utf8')).toBe(attachmentText);
    expect(JSON.stringify(state.requests)).not.toContain(secret);
    expect(JSON.stringify(state.requests)).not.toContain(attachmentText);
    expect(JSON.stringify(state.requests)).not.toContain('private-note.txt');
    expect(JSON.stringify(state.requests)).not.toContain(passphrase);
    expect(JSON.stringify(state.requests)).not.toContain('PRIVATE KEY BLOCK');
    expect(JSON.stringify(state.messages)).not.toContain(secret);
    state.messages.push({ ...state.messages[0], id: 'f214f684-624b-4d7c-bfc0-1b399127dce4', createdAt: new Date().toISOString() });
    await expect(b.getByText('This message could not be verified and decrypted. Its content is hidden.')).toBeVisible({ timeout: 15_000 });
    await a.getByRole('button', { name: 'Lock this tab', exact: true }).click();
    await expect(a.getByText(secret, { exact: true })).toHaveCount(0);
    await expect(a.getByRole('button', { name: 'Unlock this tab', exact: true })).toBeVisible();
    await b.evaluate(({ owner, peer }) => localStorage.removeItem(`yor:private-chat:verified:v1:${owner}:${peer}`), { owner: bId, peer: aId });
    await b.reload();
    await b.getByLabel('Recovery passphrase', { exact: true }).fill('incorrect passphrase');
    await b.getByRole('button', { name: 'Unlock this tab', exact: true }).click();
    await expect(b.getByRole('alert')).toContainText('Could not unlock');
    expect(state.requests.filter(value => value.path === '/messages')).toHaveLength(0);
    await unlock(b);
    await b.getByRole('button', { name: /Ada Rao.*Encrypted on your devices/ }).click();
    await expect(b.getByRole('button', { name: 'Verify fingerprint', exact: true })).toBeVisible();
    await expect(b.getByText(secret, { exact: true })).toHaveCount(0);
    await b.getByLabel('Fingerprint received directly from them').fill(alice.fingerprint);
    await b.getByRole('button', { name: 'Verify fingerprint', exact: true }).click();
    await expect(b.getByText(secret, { exact: true })).toBeVisible({ timeout: 15_000 });
    await b.getByLabel('Private message', { exact: true }).fill('Delivery that loses its receipt');
    state.failNextSend = true;
    await b.getByRole('button', { name: 'Send privately', exact: true }).click();
    await expect(b.getByRole('button', { name: 'Retry encrypted delivery', exact: true })).toBeEnabled();
    state.denyThread = true;
    await expect(b.getByRole('alert')).toContainText('unavailable', { timeout: 15_000 });
    await expect(b.getByText(secret, { exact: true })).toHaveCount(0);
    await expect(b.getByRole('button', { name: 'Retry encrypted delivery', exact: true })).toBeDisabled();
    await b.getByRole('button', { name: 'Dismiss pending delivery', exact: true }).click();
    await expect(b.getByRole('status')).toContainText('It may already have arrived');
    await expect(b.getByRole('button', { name: /Ada Rao.*Encrypted on your devices/ })).toBeEnabled();
    await expect(b.getByRole('button', { name: 'Send privately', exact: true })).toBeDisabled();
    state.denyThread = false;
    await expect(b.getByText(secret, { exact: true })).toBeVisible({ timeout: 15_000 });
  } finally { await Promise.all([first.close(), second.close()]); }
});

test('private-chat setup is accessible and fits a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await install(page, 0, broker());
  await page.goto('/private-messages');
  await expect(page.getByRole('button', { name: 'Create my protected key', exact: true })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
  const result = await new AxeBuilder({ page }).include('.pc-page').analyze();
  expect(result.violations.filter(value => ['serious', 'critical'].includes(value.impact!))).toEqual([]);
  await page.screenshot({ path: 'test-results/private-chat-mobile.png', fullPage: true });
});
