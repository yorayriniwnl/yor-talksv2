// Non-destructive service-level audit probes. These assert the observed defects,
// not desired behavior. A failure after remediation means the finding needs review.
// Run from api-server: node --import tsx ../docs/audits/2026-09-26/probes.mts
// Uses only in-memory repository fixtures; never connects to a database/provider.
import assert from 'node:assert/strict';
import { SearchService } from '../../../api-server/src/services/search-service.ts';
import { ContentSafetyService } from '../../../api-server/src/services/content-safety-service.ts';
import { FeatureEntitlementService } from '../../../api-server/src/services/feature-entitlement-service.ts';
import { resolveFeatureFlags } from '../../../api-server/src/features/premium-features.ts';
import { StorageService } from '../../../api-server/src/services/storage-service.ts';
import { env } from '../../../api-server/src/config/env.ts';
import { pool } from '../../../lib/db/src/index.ts';
import { AuthService } from '../../../api-server/src/services/auth-service.ts';
import { createHash } from 'node:crypto';

const users = new Map([
  ['author', { id: 'author', settings: { contentFilter: 'regular' }, privacy: { profileVisibility: 'public' }, accountStatus: 'active' }],
  ['outsider', { id: 'outsider', settings: { contentFilter: 'regular' }, privacy: { profileVisibility: 'public' }, accountStatus: 'active' }],
]);
let lookups = 0;
const userRepository = {
  findById: async (id: string) => { lookups++; return users.get(id); },
  list: async () => [],
  isFollowing: async () => false,
  isCloseFriend: async () => false,
};
const safety = new ContentSafetyService(userRepository as never);
const candidates = ['followers', 'close_friends'].map((audience) => ({
  id: audience, authorId: 'author', content: 'audience restricted audit fixture',
  audience, contentRating: 'regular', distributionMode: 'feed_and_profile',
}));
const search = new SearchService(userRepository as never, { search: async () => candidates } as never, {
  getShieldedUserIds: async () => new Set(), filterVisibleUsers: async () => [],
} as never, safety);
const result = await search.search('audit', 'outsider');
assert.deepEqual(result.posts.map((post) => post.id), ['followers', 'close_friends']);
console.log('CONFIRMED: search returns both audience-restricted posts to a non-follower/non-close-friend.');

users.get('author')!.accountStatus = 'suspended';
assert.equal(await safety.canViewAuthorContent('author', 'outsider'), true);
console.log('CONFIRMED: shared content visibility still permits a suspended public author.');

lookups = 0;
await safety.filterVisibleByAuthor(Array.from({ length: 50 }, () => candidates[0]), 'outsider', (post) => post.authorId);
assert.equal(lookups, 101);
console.log('CONFIRMED: 50 same-author candidates cause 101 user lookups in the shared visibility filter.');

const flags = resolveFeatureFlags({});
const entitlements = new FeatureEntitlementService({ findActiveOverride: async () => undefined }, flags);
const snapshot = await entitlements.getSnapshot('unpaid-fixture-user');
assert.equal(Object.values(snapshot).every(Boolean), true);
console.log(`CONFIRMED: all ${Object.keys(snapshot).length} premium flags enabled for an unpaid fixture user with default configuration.`);

const originalCloud = [env.CLOUDINARY_CLOUD_NAME, env.CLOUDINARY_API_KEY, env.CLOUDINARY_API_SECRET];
const originalNow = Date.now;
try {
  env.CLOUDINARY_CLOUD_NAME = 'audit-fixture';
  env.CLOUDINARY_API_KEY = 'audit-fixture';
  env.CLOUDINARY_API_SECRET = 'audit-fixture-not-a-real-secret';
  Date.now = () => 1_790_400_000_000;
  const storage = new StorageService();
  const image = storage.createDirectUploadSignature('image', 'posts');
  const video = storage.createDirectUploadSignature('video', 'posts');
  assert.equal(image.signature, video.signature);
  assert.equal(image.maxFileSize, 10 * 1024 * 1024);
  console.log('CONFIRMED: image and video upload grants share a signature; size is response metadata, not a signed constraint.');

  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  let storedHash = '';
  const auth = new AuthService(userRepository as never, {
    getStrict: async () => storedHash,
    hashToken: async (value: string) => hash(value),
    rotateValueStrict: async (_key: string, before: string, after: string) => {
      if (before !== storedHash) return false;
      storedHash = after;
      return true;
    },
  } as never);
  const oldToken = (auth as any).issueRefreshToken(users.get('outsider'), 'audit-device');
  storedHash = hash(oldToken);
  const rotated = await auth.refreshAccessToken(oldToken);
  assert.equal(rotated?.refreshToken, oldToken);
  assert.ok(await auth.refreshAccessToken(oldToken));
  console.log('CONFIRMED: refresh within the same second reissues an identical token and accepts the old token again.');
} finally {
  Date.now = originalNow;
  [env.CLOUDINARY_CLOUD_NAME, env.CLOUDINARY_API_KEY, env.CLOUDINARY_API_SECRET] = originalCloud;
  await pool.end();
}
