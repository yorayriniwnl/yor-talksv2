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
