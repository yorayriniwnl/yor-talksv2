import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../social/public/sw.js', import.meta.url), 'utf8');
const origin = 'https://yor-talks.example.test';

function worker(existingWindows = []) {
  const listeners = new Map();
  const opened = [];
  const self = {
    location: { origin },
    addEventListener: (name, listener) => listeners.set(name, listener),
    clients: {
      matchAll: async () => existingWindows,
      openWindow: async url => { opened.push(url); },
    },
  };
  vm.runInNewContext(source, { self, URL });
  return {
    opened,
    async click(url, action = 'open') {
      let completion;
      let closed = false;
      listeners.get('notificationclick')({
        action,
        notification: { data: { url }, close: () => { closed = true; } },
        waitUntil: work => { completion = work; },
      });
      await completion;
      assert.equal(closed, true);
    },
  };
}

test('notification targets allow only application pages on this origin', async () => {
  for (const target of [
    'https://outside.example.test/phish', '//outside.example.test/phish', 'javascript:alert(1)',
    'data:text/html,unsafe', 'https://user:password@yor-talks.example.test/messages',
    '/api/users/me', '/api', '/elsewhere/../api/users/me', 'http://[invalid', {}, null,
  ]) {
    const app = worker();
    await app.click(target);
    assert.deepEqual(app.opened, [`${origin}/`]);
  }
  const app = worker();
  await app.click('/messages/conversation?view=unread#latest');
  assert.deepEqual(app.opened, [`${origin}/messages/conversation?view=unread#latest`]);
});

test('notifications focus an existing canonical page and dismiss without navigation', async () => {
  let focused = 0;
  const app = worker([{ url: `${origin}/notifications`, focus: async () => { focused++; } }]);
  await app.click('/notifications');
  assert.equal(focused, 1);
  assert.deepEqual(app.opened, []);
  await app.click('/messages', 'dismiss');
  assert.equal(focused, 1);
  assert.deepEqual(app.opened, []);
});
