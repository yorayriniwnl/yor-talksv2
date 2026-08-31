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
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  t.after(() => previous ? Object.defineProperty(globalThis, 'localStorage', previous) : Reflect.deleteProperty(globalThis, 'localStorage'));
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
