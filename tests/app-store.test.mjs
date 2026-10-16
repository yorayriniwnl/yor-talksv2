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

test('a definitively expired refresh clears private UI state immediately', async (t) => {
  const { useAppStore, api, setStoredTokens } = await store(t);
  useAppStore.setState({
    currentUser: { id: 'fixture-user', notificationsEnabled: true },
    posts: [{ id: 'private-post' }],
    conversations: [{ id: 'private-conversation' }],
    messagesByConversation: { 'private-conversation': [{ id: 'private-message' }] },
  });
  setStoredTokens({ accessToken: 'expired-token' });
  t.mock.method(globalThis, 'fetch', async (url) => url.endsWith('/auth/refresh')
    ? Response.json({ success: false, message: 'Invalid refresh token' }, { status: 401 })
    : Response.json({ success: false }, { status: 401 }));

  await assert.rejects(api.request('/private-data'), /Your session expired/);
  assert.equal(useAppStore.getState().currentUser, null);
  assert.deepEqual(useAppStore.getState().posts, []);
  assert.deepEqual(useAppStore.getState().conversations, []);
  assert.deepEqual(useAppStore.getState().messagesByConversation, {});
});

test('video loading distinguishes a failed fetch from an empty library and can retry', async (t) => {
  const { useAppStore, api } = await store(t);
  t.mock.method(api, 'getVideos', async () => { throw new Error('Videos unavailable'); });
  await useAppStore.getState().loadVideos();
  assert.equal(useAppStore.getState().videosLoaded, false);
  assert.match(useAppStore.getState().videosError, /could not load/i);

  t.mock.method(api, 'getVideos', async () => []);
  await useAppStore.getState().loadVideos();
  assert.equal(useAppStore.getState().videosLoaded, true);
  assert.equal(useAppStore.getState().videosError, null);
  assert.deepEqual(useAppStore.getState().videos, []);
});

const sessionSnapshotCases = [
  ['loadWorldPreferences', 'getCreatorWorkspace', undefined, (id) => [{ kind: 'preference', itemKey: 'world', payload: { city: id } }], (state) => state.worldPreferences.city],
  ['loadFavoriteCreators', 'getFavoriteCreatorIds', undefined, (id) => [id], (state) => state.favoriteCreatorIds[0]],
  ['loadCloseFriends', 'getCloseFriends', undefined, (id) => [{ id }], (state) => state.closeFriends[0]?.id],
  ['loadSavedPosts', 'getSavedPosts', undefined, (id) => ({ data: [{ id, savedByMe: true }] }), (state) => state.posts[0]?.id],
  ['loadLikedPosts', 'getLikedPosts', undefined, (id) => ({ data: [{ id, likedByMe: true }] }), (state) => state.posts[0]?.id],
  ['loadUserFeed', 'getUserFeed', 'creator', (id) => [{ id, authorId: 'creator' }], (state) => state.posts[0]?.id],
  ['loadPost', 'getPost', 'post', (id) => ({ id }), (state) => state.posts[0]?.id],
  ['loadCommunities', 'getCommunities', undefined, (id) => [{ id }], (state) => state.communities[0]?.id],
  ['loadAchievements', 'getAchievements', undefined, (id) => [{ id }], (state) => state.achievements[0]?.id],
  ['loadUserProfile', 'getProfileByUsername', 'creator', (id) => ({ id }), (state) => Object.keys(state.users)[0]],
  ['loadStories', 'getStories', undefined, (id) => [{ id }], (state) => state.stories[0]?.id],
  ['loadNotes', 'getNotes', undefined, (id) => [{ id }], (state) => state.notes[0]?.id],
  ['loadEvents', 'getEvents', undefined, (id) => [{ id }], (state) => state.events[0]?.id],
  ['loadProducts', 'getProducts', undefined, (id) => [{ id }], (state) => state.products[0]?.id],
  ['loadArticles', 'getArticles', undefined, (id) => [{ id }], (state) => state.articles[0]?.id],
  ['loadStreams', 'getStreams', undefined, (id) => [{ id }], (state) => state.liveStreams[0]?.id],
];

for (const transition of ['logout', 'another account', 'same account reauthentication']) {
  test(`pending private snapshots cannot repopulate state after ${transition}`, async (t) => {
    const { useAppStore, api } = await store(t);
    const releases = new Map();
    const pending = [];
    for (const [action, method, argument] of sessionSnapshotCases) {
      t.mock.method(api, method, () => new Promise((resolve) => { releases.set(method, resolve); }));
      pending.push(useAppStore.getState()[action](argument));
    }
    t.mock.method(api, 'getProfileComments', () => new Promise((resolve) => { releases.set('comments', resolve); }));
    t.mock.method(api, 'getProfileShowcases', () => new Promise((resolve) => { releases.set('showcases', resolve); }));
    pending.push(useAppStore.getState().loadProfileInteractions('creator'));
    if (transition !== 'another account') {
      t.mock.method(api, 'logout', async () => {});
      await useAppStore.getState().logout();
    }
    if (transition !== 'logout') {
      const id = transition === 'another account' ? 'next-user' : 'fixture-user';
      useAppStore.setState({ currentUser: { id, favoriteCreatorIds: ['confirmed-favorite'] } });
    }
    const before = useAppStore.getState();
    for (const [, method, , response] of sessionSnapshotCases) releases.get(method)(response('previous-session-private-record'));
    releases.get('comments')([{ id: 'old-comment', author: { id: 'private-comment-author' } }]);
    releases.get('showcases')([{ id: 'old-showcase' }]);
    await Promise.all(pending);
    const after = useAppStore.getState();
    for (const key of ['currentUser', 'favoriteCreatorIds', 'closeFriends', 'users', 'posts', 'savedPostIds', 'savedPostsLoaded', 'savedPostsLoading', 'savedPostsLoadingMore', 'savedPostsError', 'savedPostsErrorCursor', 'savedPostsCursor', 'savedPostsHasMore', 'communities', 'achievements', 'stories', 'notes', 'events', 'products', 'articles', 'liveStreams', 'worldPreferences', 'profileComments', 'showcases']) {
      assert.deepEqual(after[key], before[key], `${key} must belong to the current session`);
    }
  });
}

test('reordered snapshot responses keep the most recently requested data', async (t) => {
  const { useAppStore, api } = await store(t);
  for (const [action, method, argument, response, inspect] of sessionSnapshotCases) {
    if (action === 'loadUserProfile') continue; // Profile reads intentionally coalesce while in flight.
    const releases = [];
    t.mock.method(api, method, () => new Promise((resolve) => { releases.push(resolve); }));
    useAppStore.setState({ posts: [] });
    const older = useAppStore.getState()[action](argument);
    const newer = useAppStore.getState()[action](argument);
    releases[1](response('fresh'));
    await newer;
    releases[0](response('outdated'));
    await older;
    assert.equal(inspect(useAppStore.getState()), 'fresh', `${action} must discard its older response`);
  }
  assert.deepEqual(useAppStore.getState().currentUser.favoriteCreatorIds, ['fresh']);
});

test('a failed old event refresh cannot erase a newer successful refresh', async (t) => {
  const { useAppStore, api } = await store(t);
  let reject;
  t.mock.method(api, 'getEvents', () => new Promise((_, fail) => { reject = fail; }));
  const older = useAppStore.getState().loadEvents();
  t.mock.method(api, 'getEvents', async () => [{ id: 'fresh' }]);
  await useAppStore.getState().loadEvents();
  reject(new Error('Old request failed'));
  await older;
  assert.equal(useAppStore.getState().events[0]?.id, 'fresh');
});

for (const action of ['updateProfile', 'updatePremiumProfile']) {
  test(`a late ${action} acknowledgement cannot replace the next account identity`, async (t) => {
    const { useAppStore, api } = await store(t);
    let release;
    t.mock.method(api, action, () => new Promise((resolve) => { release = resolve; }));
    const pending = useAppStore.getState()[action]({});
    useAppStore.getState().expireSession();
    useAppStore.setState({ currentUser: { id: 'next-user', displayName: 'Next user' } });
    release({ id: 'fixture-user', fullName: 'Old account' });
    await pending;
    assert.equal(useAppStore.getState().currentUser.id, 'next-user');
    assert.equal(useAppStore.getState().currentUser.displayName, 'Next user');
    assert.deepEqual(useAppStore.getState().users, {});
  });
}

for (const nextUserId of ['next-user', 'fixture-user']) {
  test(`private chat completions and failed rollbacks stay in their original session (${nextUserId})`, async (t) => {
    const { useAppStore, api } = await store(t);
    const privateMessage = { id: 'private-message', conversationId: 'private-chat', senderId: 'fixture-user', content: 'Private message', createdAt: '2026-10-16T00:00:00Z' };
    useAppStore.setState({
      messagesByConversation: { 'private-chat': [privateMessage] },
      conversations: [{ id: 'private-chat', participantIds: ['fixture-user', 'recipient'], lastMessage: privateMessage }],
      notes: [{ id: 'private-note', authorId: 'fixture-user' }],
      users: { friend: { id: 'friend' } },
    });
    const releases = new Map();
    const failures = new Map();
    t.mock.method(api, 'getConversationMessages', (_id, options) => new Promise((resolve) => { releases.set(options.direction, resolve); }));
    for (const method of ['sendMessage', 'sendMessageToConversation', 'createGroupChat', 'createNote', 'createPost']) {
      t.mock.method(api, method, () => new Promise((resolve) => { releases.set(method, resolve); }));
    }
    for (const method of ['setConversationVanishMode', 'deleteNote', 'favoriteCreator', 'addCloseFriend']) {
      t.mock.method(api, method, () => new Promise((_, reject) => { failures.set(method, reject); }));
    }
    const pending = [
      useAppStore.getState().loadOlderConversationMessages('private-chat'),
      useAppStore.getState().syncConversationMessages('private-chat'),
      useAppStore.getState().sendDirectMessage('recipient', 'Private message'),
      useAppStore.getState().sendMessageToConversation('private-chat', 'Private message'),
      useAppStore.getState().createGroupChat(['recipient'], 'Private group'),
      useAppStore.getState().setConversationVanishMode('private-chat', true),
      useAppStore.getState().deleteNote('private-note'),
      useAppStore.getState().toggleFavoriteCreator('friend'),
      useAppStore.getState().toggleCloseFriend('friend'),
      useAppStore.getState().createNote({ content: 'Private note', audience: 'close_friends' }),
      useAppStore.getState().addPost('Private post', []),
    ];
    const settled = Promise.allSettled(pending);
    useAppStore.getState().expireSession();
    useAppStore.setState({ currentUser: { id: nextUserId, favoriteCreatorIds: ['confirmed-favorite'] }, favoriteCreatorIds: ['confirmed-favorite'] });
    const before = useAppStore.getState();
    releases.get('older')([privateMessage]);
    releases.get('newer')([privateMessage]);
    releases.get('sendMessage')(privateMessage);
    releases.get('sendMessageToConversation')(privateMessage);
    releases.get('createGroupChat')({ id: 'private-group' });
    releases.get('createNote')({ id: 'private-note', authorId: 'fixture-user' });
    releases.get('createPost')({ id: 'private-post', authorId: 'fixture-user' });
    for (const reject of failures.values()) reject(new Error('Old session request failed'));
    await settled;
    const after = useAppStore.getState();
    for (const key of ['currentUser', 'favoriteCreatorIds', 'closeFriends', 'users', 'posts', 'notes', 'conversations', 'messagesByConversation']) {
      assert.deepEqual(after[key], before[key], `${key} must not receive an old session acknowledgement or rollback`);
    }
  });
}

test('saved-post failures stay retryable and preserve the last confirmed collection', async (t) => {
  const { useAppStore, api } = await store(t);
  t.mock.method(api, 'getSavedPosts', async () => { throw new Error('Offline'); });
  await useAppStore.getState().loadSavedPosts();
  assert.equal(useAppStore.getState().savedPostsLoaded, false);
  assert.equal(useAppStore.getState().savedPostsLoading, false);
  assert.match(useAppStore.getState().savedPostsError, /could not load/i);
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [{ id: 'saved', savedByMe: true }] }));
  await useAppStore.getState().loadSavedPosts();
  assert.equal(useAppStore.getState().savedPostsLoaded, true);
  assert.equal(useAppStore.getState().savedPostsError, null);
  const saved = useAppStore.getState().posts;
  t.mock.method(api, 'getSavedPosts', async () => { throw new Error('Offline again'); });
  await useAppStore.getState().loadSavedPosts();
  assert.deepEqual(useAppStore.getState().posts, saved);
  assert.equal(useAppStore.getState().savedPostsLoaded, true);
  assert.match(useAppStore.getState().savedPostsError, /could not load/i);
});

test('a successful saved refresh replaces its visible window and clears removed bookmarks', async (t) => {
  const { useAppStore, api } = await store(t);
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [{ id: 'old-bookmark', savedByMe: true }], hasMore: false }));
  await useAppStore.getState().loadSavedPosts();
  assert.deepEqual(useAppStore.getState().savedPostIds, ['old-bookmark']);
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [], hasMore: false }));
  await useAppStore.getState().loadSavedPosts();
  assert.deepEqual(useAppStore.getState().savedPostIds, []);
  assert.equal(useAppStore.getState().posts[0].savedByMe, false);
});

for (const [action, method, loader, readMethod, field] of [
  ['toggleFavoriteCreator', 'favoriteCreator', 'loadFavoriteCreators', 'getFavoriteCreatorIds', 'favoriteCreatorIds'],
  ['toggleCloseFriend', 'addCloseFriend', 'loadCloseFriends', 'getCloseFriends', 'closeFriends'],
]) {
  test(`a failed ${action} preserves another target's confirmed change and invalidates an older snapshot`, async (t) => {
    const { useAppStore, api } = await store(t);
    useAppStore.setState({ users: { first: { id: 'first' }, second: { id: 'second' } } });
    let releaseSnapshot;
    const completions = new Map();
    t.mock.method(api, readMethod, () => new Promise((resolve) => { releaseSnapshot = resolve; }));
    t.mock.method(api, method, (id) => new Promise((resolve, reject) => { completions.set(id, { resolve, reject }); }));
    const loading = useAppStore.getState()[loader]();
    const failed = useAppStore.getState()[action]('first');
    const rejected = assert.rejects(failed, /First failed/);
    const successful = useAppStore.getState()[action]('second');
    completions.get('second').resolve({});
    await successful;
    completions.get('first').reject(new Error('First failed'));
    await rejected;
    releaseSnapshot([]);
    await loading;
    const ids = useAppStore.getState()[field].map((item) => typeof item === 'string' ? item : item.id);
    assert.deepEqual(ids, ['second']);
    if (field === 'favoriteCreatorIds') {
      assert.deepEqual(useAppStore.getState().currentUser.favoriteCreatorIds, ['second']);
      assert.deepEqual(useAppStore.getState().users['fixture-user'].favoriteCreatorIds, ['second']);
    }
  });
}

test('a restored identity from an old initialization cannot replace a newly authenticated account', async (t) => {
  const { useAppStore, api, setStoredTokens } = await store(t);
  setStoredTokens({ accessToken: 'fixture-token' });
  let release;
  t.mock.method(api, 'getCurrentUser', () => new Promise((resolve) => { release = resolve; }));
  const pending = useAppStore.getState().initialize();
  useAppStore.getState().expireSession();
  useAppStore.setState({ currentUser: { id: 'next-user' } });
  release({ id: 'fixture-user' });
  await pending;
  assert.equal(useAppStore.getState().currentUser.id, 'next-user');
  assert.deepEqual(useAppStore.getState().users, {});
});

test('old settings acknowledgements cannot overwrite a reauthenticated account', async (t) => {
  const { useAppStore, api } = await store(t);
  const releases = [];
  t.mock.method(api, 'updateSettings', () => new Promise((resolve) => { releases.push(resolve); }));
  const pending = [
    useAppStore.getState().updateNotificationPreference(false),
    useAppStore.getState().updateStoryViewMode('private'),
    useAppStore.getState().updateContentFilter('mature'),
  ];
  useAppStore.getState().expireSession();
  useAppStore.setState({ currentUser: { id: 'fixture-user', notificationsEnabled: true, storyViewMode: 'identified', contentFilter: 'child_safe' } });
  const before = useAppStore.getState().currentUser;
  for (const release of releases) release({ notificationsEnabled: false, storyViewMode: 'private' });
  await Promise.all(pending);
  assert.deepEqual(useAppStore.getState().currentUser, before);
});

test('sign-out clears private data immediately and its late response preserves a new login', async (t) => {
  const { useAppStore, api } = await store(t);
  useAppStore.setState({ posts: [{ id: 'private-post' }], worldPreferences: { ...useAppStore.getState().worldPreferences, city: 'Private city' } });
  let release;
  t.mock.method(api, 'logout', () => new Promise((resolve) => { release = resolve; }));
  const pending = useAppStore.getState().logout();
  assert.equal(useAppStore.getState().currentUser, null);
  assert.deepEqual(useAppStore.getState().posts, []);
  assert.notEqual(useAppStore.getState().worldPreferences.city, 'Private city');
  useAppStore.setState({ currentUser: { id: 'next-user' }, posts: [{ id: 'next-user-post' }] });
  release(null);
  await pending;
  assert.equal(useAppStore.getState().currentUser.id, 'next-user');
  assert.deepEqual(useAppStore.getState().posts, [{ id: 'next-user-post' }]);
});

test('the latest sign-in attempt wins across authentication methods', async (t) => {
  const { useAppStore, api } = await store(t);
  let releasePassword;
  let releaseGoogle;
  t.mock.method(api, 'login', () => new Promise((resolve) => { releasePassword = resolve; }));
  t.mock.method(api, 'loginWithGoogle', () => new Promise((resolve) => { releaseGoogle = resolve; }));
  t.mock.method(api, 'getMyEligibility', async () => ({ activated: false, capabilities: { social: false } }));
  const older = useAppStore.getState().login('old@example.test', 'password');
  const newer = useAppStore.getState().loginWithGoogle('synthetic-google-credential');
  const rejected = assert.rejects(older, /sign-in attempt changed/);
  releaseGoogle({ user: { id: 'next-user' }, tokens: { accessToken: 'synthetic-next-token' } });
  await newer;
  releasePassword({ user: { id: 'fixture-user' }, tokens: { accessToken: 'synthetic-old-token' } });
  await rejected;
  assert.equal(useAppStore.getState().currentUser.id, 'next-user');
  assert.equal(useAppStore.getState().tokens.accessToken, 'synthetic-next-token');
  assert.equal(useAppStore.getState().authError, null);
});

test('saved posts append in cursor order without duplicates and refresh alone clears unloaded bookmarks', async (t) => {
  const { useAppStore, api } = await store(t);
  useAppStore.setState({ posts: [{ id: 'not-yet-loaded', savedByMe: true }] });
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [{ id: 'first', savedByMe: true, content: 'First version' }], hasMore: true, nextCursor: 'older-page' }));
  await useAppStore.getState().loadSavedPosts();
  assert.deepEqual(useAppStore.getState().savedPostIds, ['first']);
  assert.equal(useAppStore.getState().savedPostsCursor, 'older-page');
  assert.equal(useAppStore.getState().posts.find(post => post.id === 'not-yet-loaded').savedByMe, true);
  const append = t.mock.method(api, 'getSavedPosts', async () => ({ data: [{ id: 'first', savedByMe: true, content: 'Updated' }, { id: 'second', savedByMe: true }], hasMore: false }));
  await useAppStore.getState().loadSavedPosts('older-page');
  assert.deepEqual(append.mock.calls[0].arguments, [50, 'older-page']);
  assert.deepEqual(useAppStore.getState().savedPostIds, ['first', 'second']);
  assert.equal(useAppStore.getState().posts.filter(post => post.id === 'first').length, 1);
  assert.equal(useAppStore.getState().posts.find(post => post.id === 'first').content, 'Updated');
  assert.equal(useAppStore.getState().savedPostsHasMore, false);
  assert.equal(useAppStore.getState().posts.find(post => post.id === 'not-yet-loaded').savedByMe, true);
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [], hasMore: false }));
  await useAppStore.getState().loadSavedPosts();
  assert.deepEqual(useAppStore.getState().savedPostIds, []);
  assert.equal(useAppStore.getState().posts.some(post => post.savedByMe), false);
});

test('a failed saved append retains its page and cursor for retry', async (t) => {
  const { useAppStore, api } = await store(t);
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [{ id: 'first', savedByMe: true }], hasMore: true, nextCursor: 'older-page' }));
  await useAppStore.getState().loadSavedPosts();
  t.mock.method(api, 'getSavedPosts', async () => { throw new Error('Append unavailable'); });
  await useAppStore.getState().loadSavedPosts('older-page');
  assert.deepEqual(useAppStore.getState().savedPostIds, ['first']);
  assert.equal(useAppStore.getState().savedPostsCursor, 'older-page');
  assert.equal(useAppStore.getState().savedPostsErrorCursor, 'older-page');
  assert.equal(useAppStore.getState().savedPostsLoadingMore, false);
  assert.match(useAppStore.getState().savedPostsError, /Older saved posts/);
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [{ id: 'second', savedByMe: true }], hasMore: false }));
  await useAppStore.getState().loadSavedPosts(useAppStore.getState().savedPostsErrorCursor);
  assert.deepEqual(useAppStore.getState().savedPostIds, ['first', 'second']);
  assert.equal(useAppStore.getState().savedPostsError, null);
});

test('saved refresh invalidates an older append and duplicate append clicks send one request', async (t) => {
  const { useAppStore, api } = await store(t);
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [{ id: 'first', savedByMe: true }], hasMore: true, nextCursor: 'older-page' }));
  await useAppStore.getState().loadSavedPosts();
  let release;
  const request = t.mock.method(api, 'getSavedPosts', () => new Promise(resolve => { release = resolve; }));
  const append = useAppStore.getState().loadSavedPosts('older-page');
  await useAppStore.getState().loadSavedPosts('older-page');
  assert.equal(request.mock.callCount(), 1);
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [{ id: 'fresh', savedByMe: true }], hasMore: false }));
  await useAppStore.getState().loadSavedPosts();
  release({ data: [{ id: 'outdated', savedByMe: true }], hasMore: true, nextCursor: 'outdated-cursor' });
  await append;
  assert.deepEqual(useAppStore.getState().savedPostIds, ['fresh']);
  assert.equal(useAppStore.getState().savedPostsCursor, null);
  assert.equal(useAppStore.getState().savedPostsHasMore, false);
  assert.equal(useAppStore.getState().savedPostsLoadingMore, false);
  assert.equal(useAppStore.getState().posts.some(post => post.id === 'outdated'), false);
});

test('empty saved pages remain pageable until the server exhausts hidden bookmarks', async (t) => {
  const { useAppStore, api } = await store(t);
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [], hasMore: true, nextCursor: 'through-hidden' }));
  await useAppStore.getState().loadSavedPosts();
  assert.equal(useAppStore.getState().savedPostsLoaded, true);
  assert.equal(useAppStore.getState().savedPostsHasMore, true);
  assert.equal(useAppStore.getState().savedPostsCursor, 'through-hidden');
  t.mock.method(api, 'getSavedPosts', async () => ({ data: [{ id: 'older-visible', savedByMe: true }], hasMore: false }));
  await useAppStore.getState().loadSavedPosts('through-hidden');
  assert.deepEqual(useAppStore.getState().savedPostIds, ['older-visible']);
  assert.equal(useAppStore.getState().savedPostsHasMore, false);
});
