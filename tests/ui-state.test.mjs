import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

async function loadSource(path) {
  const result = await build({ entryPoints: [path], bundle: true, write: false, platform: 'browser', format: 'esm' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { isUnreadMessage, hasUnreadConversation, upsertMessage, reconcileMessageSnapshot } = await loadSource('social/src/lib/message-state.ts');
const { safeInternalRedirect } = await loadSource('social/src/lib/safe-redirect.ts');
const { utcTimestamp, normalizeApiTimestamps } = await loadSource('social/src/lib/timestamps.ts');
const message = { id: 'one', conversationId: 'chat', senderId: 'other', content: 'hello', createdAt: '2026-08-31T00:00:00Z', read: false };

test('unread state excludes outgoing, deleted, read, and signed-out messages', () => {
  assert.equal(isUnreadMessage(message, 'viewer'), true);
  assert.equal(isUnreadMessage(message, 'other'), false);
  assert.equal(isUnreadMessage(message), false);
  assert.equal(isUnreadMessage({ ...message, read: true }, 'viewer'), false);
  assert.equal(isUnreadMessage({ ...message, deletedAt: message.createdAt }, 'viewer'), false);
  assert.equal(hasUnreadConversation({ lastMessage: message }, 'viewer'), true);
});

test('HTTP and socket message acknowledgements reconcile by identity', () => {
  const echoed = upsertMessage([message], { ...message, read: true });
  assert.equal(echoed.length, 1);
  assert.equal(echoed[0].read, true);
  assert.equal(upsertMessage(echoed, message)[0].read, true, 'late acknowledgements cannot unread a message');
  const earlier = { ...message, id: 'earlier', createdAt: '2026-08-30T00:00:00Z' };
  assert.deepEqual(upsertMessage(echoed, earlier).map((item) => item.id), ['earlier', 'one']);
  assert.equal(upsertMessage(echoed, { ...message, deletedAt: message.createdAt }).length, 0);
});

test('a late message snapshot preserves live additions, edits and deletions', () => {
  const deleted = { ...message, id: 'deleted' };
  const added = { ...message, id: 'added' };
  const edited = { ...message, content: 'edited live', read: true };
  const merged = reconcileMessageSnapshot([message, deleted], [edited, added], [message, deleted]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((item) => item.id === message.id)?.content, 'edited live');
  assert.equal(merged.some((item) => item.id === 'deleted'), false);
  assert.equal(merged.some((item) => item.id === 'added'), true);
});

test('post-login redirects reject external, encoded, control-character and self-loop paths', () => {
  for (const value of [null, '', 'https://attacker.example', '//attacker.example', '/\\attacker.example', '/%5cattacker.example', '/%2fattack', '/\n/attack', '/auth', '/auth?redirect=/auth', '/%zz']) {
    assert.equal(safeInternalRedirect(value), '/', String(value));
  }
  assert.equal(safeInternalRedirect('/messages/chat?view=unread#latest'), '/messages/chat?view=unread#latest');
});

test('database UTC timestamps retain the same instant in every browser timezone', () => {
  const value = '2026-08-31 10:15:30.123456';
  assert.equal(utcTimestamp(value), '2026-08-31T10:15:30.123456Z');
  assert.equal(utcTimestamp('2026-08-31T10:15:30+05:30'), '2026-08-31T10:15:30+05:30');
  assert.equal(utcTimestamp('2026-08-31T10:15:30Z'), '2026-08-31T10:15:30Z');
  assert.equal(utcTimestamp('not a date'), 'not a date');
  const normalized = normalizeApiTimestamps({ data: [{ createdAt: value, content: value, seenAt: null }], meta: {} });
  assert.equal(normalized.data[0].createdAt.endsWith('Z'), true);
  assert.equal(normalized.data[0].content, value, 'never rewrite user content');
  assert.equal(normalized.data[0].seenAt, null);
});
