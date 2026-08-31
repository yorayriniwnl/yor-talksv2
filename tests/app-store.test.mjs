import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: "export { useAppStore } from './social/src/lib/store.ts'; export { api, setStoredTokens } from './social/src/lib/api-client.ts';",
    resolveDir: process.cwd(),
  },
  tsconfig: 'social/tsconfig.json', bundle: true, write: false,
  platform: 'browser', format: 'esm', define: { 'import.meta.env': '{}' },
});

async function store(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  const source = `${bundle.outputFiles[0].text}\n// ${randomUUID()}\n`;
  const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  module.useAppStore.setState({ currentUser: { id: 'fixture-user', notificationsEnabled: true }, isInitializing: false });
  return module;
}

test('a saved notification preference remains canonical across settings remounts', async (t) => {
  const { useAppStore, api } = await store(t);
  t.mock.method(api, 'updateSettings', async () => ({ notificationsEnabled: false }));
  await useAppStore.getState().updateNotificationPreference(false);
  assert.equal(useAppStore.getState().currentUser.notificationsEnabled, false);
  t.mock.method(api, 'updateSettings', async () => { throw new Error('Offline'); });
  await assert.rejects(useAppStore.getState().updateNotificationPreference(true), /Offline/);
  assert.equal(useAppStore.getState().currentUser.notificationsEnabled, false);
});

test('failed privacy saves retain confirmed settings and release the save lock', async (t) => {
  const { useAppStore, api } = await store(t);
  let reject;
  t.mock.method(api, 'updatePrivacy', () => new Promise((_, fail) => { reject = fail; }));
  const pending = useAppStore.getState().updatePrivacy({ messageRequests: false });
  assert.equal(useAppStore.getState().privacy.messageRequests, true);
  assert.equal(useAppStore.getState().privacySaving, true);
  await assert.rejects(useAppStore.getState().updatePrivacy({ profileVisibility: 'private' }), /finish saving/);
  reject(new Error('Offline'));
  await assert.rejects(pending, /Offline/);
  assert.equal(useAppStore.getState().privacy.messageRequests, true);
  assert.equal(useAppStore.getState().privacySaving, false);
});

test('mark-all leaves newly arriving notifications unread and coalesces duplicate actions', async (t) => {
  const { useAppStore, api } = await store(t);
  const old = { id: 'old', read: false, createdAt: '2026-08-31T00:00:00Z' };
  const arrival = { id: 'arrival', read: false, createdAt: '2026-08-31T01:00:00Z' };
  useAppStore.setState({ notifications: [old] });
  let release;
  const apiCall = t.mock.method(api, 'markAllNotificationsRead', () => new Promise((done) => { release = done; }));
  const marking = useAppStore.getState().markAllNotificationsRead();
  await useAppStore.getState().markAllNotificationsRead();
  useAppStore.setState({ notifications: [arrival, old] });
  release();
  await marking;
  assert.equal(apiCall.mock.callCount(), 1);
  assert.deepEqual(useAppStore.getState().notifications.map(({ id, read }) => ({ id, read })), [{ id: 'arrival', read: false }, { id: 'old', read: true }]);
  assert.equal(useAppStore.getState().notificationsMarkingAll, false);
});

test('late notification refreshes cannot restore read badges or cross a logout boundary', async (t) => {
  const { useAppStore, api } = await store(t);
  const old = { id: 'old', read: false, createdAt: '2026-08-31T00:00:00Z' };
  useAppStore.setState({ notifications: [old] });
  let release;
  t.mock.method(api, 'getNotifications', () => new Promise((done) => { release = done; }));
  const loading = useAppStore.getState().loadNotifications();
  useAppStore.setState({ notifications: [{ ...old, read: true }] });
  release([{ ...old, readAt: null }]);
  await loading;
  assert.equal(useAppStore.getState().notifications[0].read, true);
  const previousSessionLoad = useAppStore.getState().loadNotifications();
  t.mock.method(api, 'logout', async () => {});
  await useAppStore.getState().logout();
  release([{ ...old, readAt: null }]);
  await previousSessionLoad;
  assert.deepEqual(useAppStore.getState().notifications, []);
  assert.equal(useAppStore.getState().notificationsLoading, false);
  assert.equal(useAppStore.getState().notificationsLoaded, false);
});

test('notification failures are distinguishable from empty success and can retry', async (t) => {
  const { useAppStore, api } = await store(t);
  t.mock.method(api, 'getNotifications', async () => { throw new Error('Offline'); });
  await useAppStore.getState().loadNotifications();
  assert.equal(useAppStore.getState().notificationsLoaded, false);
  assert.match(useAppStore.getState().notificationsError, /could not refresh/);
  t.mock.method(api, 'getNotifications', async () => []);
  await useAppStore.getState().loadNotifications();
  assert.equal(useAppStore.getState().notificationsLoaded, true);
  assert.equal(useAppStore.getState().notificationsError, null);
});

for (const kind of ['Block', 'Mute']) {
  const field = kind === 'Block' ? 'blockedUserIds' : 'mutedUserIds';
  const action = `toggle${kind}User`;
  const method = `${kind.toLowerCase()}User`;
  test(`failed ${kind.toLowerCase()} actions never claim success or change confirmed preferences`, async (t) => {
    const { useAppStore, api } = await store(t);
    const post = { id: 'post', authorId: 'target' };
    useAppStore.setState({ posts: [post] });
    t.mock.method(api, method, async () => { throw new Error('Offline'); });
    assert.equal(await useAppStore.getState()[action]('target'), false);
    assert.deepEqual(useAppStore.getState().currentUser[field] ?? [], []);
    assert.deepEqual(useAppStore.getState().posts, [post]);
  });

  test(`${kind.toLowerCase()} updates coalesce duplicates and preserve other targets across reordered responses`, async (t) => {
    const { useAppStore, api } = await store(t);
    const posts = ['first', 'second', 'other'].map((authorId) => ({ id: authorId, authorId }));
    useAppStore.setState({ posts, stories: posts, notes: posts, feedPostIds: posts.map((post) => post.id) });
    const releases = new Map();
    const call = t.mock.method(api, method, (id) => new Promise((resolve) => { releases.set(id, resolve); }));
    const first = useAppStore.getState()[action]('first');
    const duplicate = useAppStore.getState()[action]('first');
    const second = useAppStore.getState()[action]('second');
    assert.equal(call.mock.callCount(), 2);
    assert.deepEqual(useAppStore.getState().currentUser[field] ?? [], []);
    releases.get('second')({});
    await second;
    releases.get('first')({});
    assert.equal(await first, true);
    assert.equal(await duplicate, true);
    assert.deepEqual(new Set(useAppStore.getState().currentUser[field]), new Set(['first', 'second']));
    assert.deepEqual(useAppStore.getState().feedPostIds, ['other']);
    assert.equal(useAppStore.getState().stories.length, 1);
    assert.equal(useAppStore.getState().notes.length, 1);
  });
}

test('a previous-session block acknowledgement cannot change the next account', async (t) => {
  const { useAppStore, api } = await store(t);
  let release;
  t.mock.method(api, 'blockUser', () => new Promise((resolve) => { release = resolve; }));
  const blocking = useAppStore.getState().toggleBlockUser('target');
  t.mock.method(api, 'logout', async () => {});
  await useAppStore.getState().logout();
  useAppStore.setState({ currentUser: { id: 'next-user', blockedUserIds: ['keep-this-block'] } });
  release({ blockedUsers: ['target'] });
  assert.equal(await blocking, false);
  assert.deepEqual(useAppStore.getState().currentUser.blockedUserIds, ['keep-this-block']);
});

test('in-flight social snapshots cannot restore a newly blocked creator', async (t) => {
  const { useAppStore, api } = await store(t);
  const releases = new Map();
  for (const method of ['getFeed', 'getStories', 'getNotes']) {
    t.mock.method(api, method, () => new Promise((resolve) => { releases.set(method, resolve); }));
  }
  const loading = Promise.all(['loadFeed', 'loadStories', 'loadNotes'].map((method) => useAppStore.getState()[method]()));
  t.mock.method(api, 'blockUser', async () => ({}));
  assert.equal(await useAppStore.getState().toggleBlockUser('target'), true);
  const stale = { id: 'stale', authorId: 'target', content: 'Old snapshot', createdAt: '2026-08-31T00:00:00Z' };
  releases.get('getFeed')({ data: [stale], nextCursor: null, hasMore: false });
  releases.get('getStories')([stale]);
  releases.get('getNotes')([stale]);
  await loading;
  assert.deepEqual(useAppStore.getState().posts, []);
  assert.deepEqual(useAppStore.getState().stories, []);
  assert.deepEqual(useAppStore.getState().notes, []);
});
