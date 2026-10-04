import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { db, pool } from '@workspace/db';
import { postsTable } from '@workspace/db/schema';
import { UserRepository } from '../repositories/user-repository.js';
import { createTestUser } from './test-helpers.js';
import { MediaLifecycleError, MediaService, type MediaModerator } from '../services/media-service.js';
import { withApprovedMedia } from '../services/media-publication.js';
import { hydrateMediaValue } from '../services/media-response.js';
import { MediaModerationUnavailableError, MediaProviderUnavailableError, MediaVerificationError, MediaTooLargeError,
  type MediaProvider, type MediaUploadIntent, type VerifiedMedia } from '../services/media-provider.js';

after(() => pool.end());
const users = new UserRepository();
const bytes = Buffer.from('verified synthetic bytes');
function fixtureProvider(overrides: Partial<MediaProvider> = {}): MediaProvider {
  return {
    prepareUpload: async intent => ({ directAllowed: false, uploadUrl: 'https://api.cloudinary.com/v1_1/fixture/image/upload', cloudName: 'fixture', apiKey: 'fixture',
      resourceType: intent.resourceType, publicId: intent.publicId, maxFileSize: 2 * 1024 * 1024, fields: {} }),
    uploadBuffer: async () => {},
    verifyUpload: async intent => verified(intent), verifyIdentity: async () => {},
    signedDeliveryUrl: identity => `https://fixture.invalid/signed/${identity.assetId}`,
    signedPosterUrl: () => null,
    deleteAsset: async () => {}, deletePendingUpload: async () => {}, deleteUpload: async () => {}, deleteExpected: async () => {},
    inspectReadiness: async () => ({ storage: true, presets: true, direct: false, errorCodes: [] }), ...overrides,
  };
}
function verified(intent: MediaUploadIntent): VerifiedMedia {
  return { assetId: 'a'.repeat(32), publicId: intent.publicId, resourceType: intent.resourceType, deliveryType: 'authenticated', version: 1, format: 'png',
    buffer: bytes, bytes: bytes.length, mimeType: 'image/png', sha256: createHash('sha256').update(bytes).digest('hex'), width: 2, height: 2 };
}
const approve: MediaModerator = { assertReady: async () => {}, moderate: async () => ({ decision: 'approve', reasons: [] }) };
function latch() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
async function reservation(service: MediaService, ownerId: string, purpose = 'post') {
  return service.prepareUpload(ownerId, { purpose, mimeType: 'image/png', size: bytes.length, filename: 'fixture.png' });
}
async function row(id: string) { return (await pool.query('SELECT * FROM media_assets WHERE id=$1', [id])).rows[0]; }
const code = (expected: string) => (error: unknown) => error instanceof MediaLifecycleError && error.code === expected;

test('reservations bind unique provider paths to owner and purpose, with no provider grant on the bounded transport', async () => {
  const owner = await createTestUser(users);
  const seen: MediaUploadIntent[] = [];
  const service = new MediaService(fixtureProvider({ prepareUpload: async intent => { seen.push(intent); return fixtureProvider().prepareUpload(intent); } }), approve);
  const first = await reservation(service, owner.id), second = await reservation(service, owner.id);
  assert.notEqual(first.id, second.id);
  assert.equal(first.mode, 'server'); assert.equal('fields' in first, false);
  assert.equal(first.uploadUrl, `/api/media/${first.id}/upload`);
  assert.equal(seen[0].publicId, `yor-talks/${owner.id}/${first.id}`);
  assert.equal((await row(first.id)).owner_id, owner.id);
  for (const input of [{ purpose: 'unknown', mimeType: 'image/png', size: 1 }, { purpose: 'avatar', mimeType: 'video/mp4', size: 1 },
    { purpose: 'post', mimeType: 'image/svg+xml', size: 1 }, { purpose: 'avatar', mimeType: 'image/png', size: 2 * 1024 * 1024 + 1 },
    { purpose: 'post', mimeType: 'image/png', size: 0 }]) {
    await assert.rejects(() => service.prepareUpload(owner.id, { ...input, filename: 'a' }), MediaLifecycleError);
  }
  assert.equal(seen.length, 2);
});

test('upload and finalize reject another account before making any provider calls', async () => {
  const owner = await createTestUser(users), other = await createTestUser(users);
  let writes = 0, reads = 0;
  const service = new MediaService(fixtureProvider({ uploadBuffer: async () => { writes++; }, verifyUpload: async intent => { reads++; return verified(intent); } }), approve);
  const media = await reservation(service, owner.id);
  await assert.rejects(() => service.upload(other.id, media.id, { buffer: bytes, mimetype: 'image/png' }), code('media_owner_mismatch'));
  await assert.rejects(() => service.finalizeUpload(other.id, media.id), code('media_owner_mismatch'));
  await assert.rejects(() => service.deleteUpload(other.id, media.id), code('media_owner_mismatch'));
  await assert.rejects(() => service.upload(owner.id, media.id, { buffer: bytes, mimetype: 'image/jpeg' }), code('media_metadata_mismatch'));
  await assert.rejects(() => service.upload(owner.id, media.id, { buffer: Buffer.from('wrong size'), mimetype: 'image/png' }), code('media_metadata_mismatch'));
  assert.equal(writes, 0); assert.equal(reads, 0); assert.equal((await row(media.id)).status, 'pending');
});

test('database constraints cannot mistake NULL verification/moderation metadata for approval', async () => {
  const owner = await createTestUser(users), service = new MediaService(fixtureProvider(), approve);
  const media = await reservation(service, owner.id);
  await assert.rejects(() => pool.query("UPDATE media_assets SET status='approved' WHERE id=$1", [media.id]), (error: unknown) => (error as { code?: string }).code === '23514');
  await service.finalizeUpload(owner.id, media.id);
  for (const field of ['sha256', 'verified_mime', 'verified_bytes', 'provider_version', 'provider_format', 'moderation_json']) {
    await assert.rejects(() => pool.query(`UPDATE media_assets SET ${field}=NULL WHERE id=$1`, [media.id]), (error: unknown) => (error as { code?: string }).code === '23514');
  }
  assert.equal((await row(media.id)).status, 'approved');
});

test('uploaded media has no delivery URL; finalize is idempotent after explicit verified approval', async () => {
  const owner = await createTestUser(users); let reads = 0, decisions = 0;
  const service = new MediaService(fixtureProvider({ verifyUpload: async intent => { reads++; return verified(intent); } }),
    { ...approve, moderate: async (...args) => { decisions++; return approve.moderate(...args); } });
  const media = await reservation(service, owner.id);
  const uploaded = await service.upload(owner.id, media.id, { buffer: bytes, mimetype: 'image/png' });
  assert.equal(uploaded.status, 'uploaded'); assert.equal(uploaded.url, undefined);
  const result = await service.finalizeUpload(owner.id, media.id);
  assert.equal(result.status, 'approved'); assert.equal(result.url, `media:${media.id}`);
  assert.deepEqual(await service.finalizeUpload(owner.id, media.id), result);
  assert.equal(reads, 1); assert.equal(decisions, 1);
  const persisted = await row(media.id);
  assert.equal(persisted.moderation_json.decision, 'approve'); assert.equal(persisted.sha256.length, 64);
  assert.equal(persisted.verification_token, null);
});

test('upload retries acknowledge committed identical owner bytes without another provider write and preserve them across moderation retries', async () => {
  const owner = await createTestUser(users), other = await createTestUser(users);
  let writes = 0, decisions = 0;
  const service = new MediaService(fixtureProvider({ uploadBuffer: async () => { writes++; } }), {
    ...approve, moderate: async () => {
      decisions++;
      if(decisions===1)throw new MediaModerationUnavailableError();
      return { decision: 'approve', reasons: [] };
    },
  });
  const media = await reservation(service, owner.id);
  const file = { buffer: bytes, mimetype: 'image/png' };
  // Commit the first request but intentionally discard its response, as a
  // transport failure would. The same grant/File can now resume finalization.
  await service.upload(owner.id, media.id, file);
  assert.equal((await row(media.id)).sha256, createHash('sha256').update(bytes).digest('hex'));
  const retried = await service.upload(owner.id, media.id, file);
  assert.equal(retried.status, 'uploaded'); assert.equal(retried.url, undefined);
  assert.equal(writes, 1);
  const changed = Buffer.from(bytes); changed[0] ^= 1;
  await assert.rejects(() => service.upload(owner.id, media.id, { ...file, buffer: changed }), code('media_metadata_mismatch'));
  await assert.rejects(() => service.upload(other.id, media.id, file), code('media_owner_mismatch'));
  await assert.rejects(() => service.finalizeUpload(owner.id, media.id), code('media_moderation_unavailable'));
  assert.equal((await row(media.id)).status, 'failed');
  assert.equal((await service.upload(owner.id, media.id, file)).status, 'failed');
  assert.equal((await row(media.id)).sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal((await service.finalizeUpload(owner.id, media.id)).status, 'approved');
  assert.equal((await service.upload(owner.id, media.id, file)).status, 'approved');
  assert.equal(writes, 1); assert.equal(decisions, 2);
  await service.deleteUpload(owner.id, media.id);
  await assert.rejects(() => service.upload(owner.id, media.id, file), code('media_upload_closed'));
});

test('finalize refuses provider replacement of the exact server-uploaded bytes or a dishonest provider digest', async () => {
  const owner = await createTestUser(users);
  for(const dishonestDigest of [false,true]) {
    let decisions = 0;
    const changed = Buffer.from(bytes); changed[0] ^= 1;
    const service = new MediaService(fixtureProvider({ verifyUpload: async intent => ({ ...verified(intent), buffer: changed,
      sha256: dishonestDigest ? createHash('sha256').update(bytes).digest('hex') : createHash('sha256').update(changed).digest('hex') }) }),
      { ...approve, moderate: async () => { decisions++; return { decision: 'approve', reasons: [] }; } });
    const media = await reservation(service, owner.id);
    await service.upload(owner.id, media.id, { buffer: bytes, mimetype: 'image/png' });
    await assert.rejects(() => service.finalizeUpload(owner.id, media.id), code('media_verification_failed'));
    assert.equal(decisions, 0);
    assert.equal((await row(media.id)).status, 'rejected');
    assert.equal((await row(media.id)).deletion_status, 'pending');
    await assert.rejects(() => service.upload(owner.id, media.id, { buffer: bytes, mimetype: 'image/png' }), code('media_upload_closed'));
  }
});

test('concurrent finalizers invoke the verifier/moderator once and return no URL to the losing request', async () => {
  const owner = await createTestUser(users), entered = latch(), resume = latch(); let reads = 0, decisions = 0;
  const service = new MediaService(fixtureProvider({ verifyUpload: async intent => { reads++; entered.release(); await resume.promise; return verified(intent); } }),
    { ...approve, moderate: async (...args) => { decisions++; return approve.moderate(...args); } });
  const media = await reservation(service, owner.id);
  const first = service.finalizeUpload(owner.id, media.id);
  await entered.promise;
  const second = await service.finalizeUpload(owner.id, media.id);
  assert.equal(second.status, 'pending'); assert.equal(second.url, undefined);
  resume.release(); assert.equal((await first).status, 'approved');
  assert.equal(reads, 1); assert.equal(decisions, 1);
});

test('moderation timeout, provider error, malformed and uncertain decisions never approve and remain retryable', async () => {
  const owner = await createTestUser(users);
  for (const moderate of [async () => { throw new MediaModerationUnavailableError(); }, async () => { throw new Error('provider failed'); },
    async () => undefined, async () => ({ decision: 'approve' }), async () => ({ decision: 'uncertain', reasons: ['cannot_assess'] })]) {
    const service = new MediaService(fixtureProvider(), { ...approve, moderate: moderate as unknown as MediaModerator['moderate'] });
    const media = await reservation(service, owner.id);
    await assert.rejects(() => service.finalizeUpload(owner.id, media.id), MediaLifecycleError);
    const failed = await row(media.id);
    assert.equal(failed.status, 'failed'); assert.equal(failed.moderation_json, null); assert.equal(failed.verification_token, null);
    assert.equal((await new MediaService(fixtureProvider(), approve).finalizeUpload(owner.id, media.id)).status, 'approved');
  }
});

test('missing provider object fails closed, while byte, size and immutable identity mismatches reject and schedule deletion', async () => {
  const owner = await createTestUser(users); let decisions = 0;
  const moderator: MediaModerator = { ...approve, moderate: async (...args) => { decisions++; return approve.moderate(...args); } };
  const missing = new MediaService(fixtureProvider({ verifyUpload: async () => { throw new MediaProviderUnavailableError(); } }), moderator);
  const absent = await reservation(missing, owner.id);
  await assert.rejects(() => missing.finalizeUpload(owner.id, absent.id), code('media_provider_unavailable'));
  assert.equal((await row(absent.id)).status, 'failed');
  for (const error of [new MediaVerificationError('wrong public ID/resource type/byte signature'), new MediaTooLargeError()]) {
    const service = new MediaService(fixtureProvider({ verifyUpload: async () => { throw error; } }), moderator);
    const media = await reservation(service, owner.id);
    await assert.rejects(() => service.finalizeUpload(owner.id, media.id), MediaLifecycleError);
    assert.equal((await row(media.id)).status, 'rejected'); assert.equal((await row(media.id)).deletion_status, 'pending');
    assert.equal((await service.finalizeUpload(owner.id, media.id)).url, undefined);
  }
  assert.equal(decisions, 0);
});

test('provider replay/tampering after moderation cannot commit approval', async () => {
  const owner = await createTestUser(users); let checks = 0;
  const service = new MediaService(fixtureProvider({ verifyIdentity: async () => { checks++; throw new MediaVerificationError('version replaced'); } }), approve);
  const media = await reservation(service, owner.id);
  await assert.rejects(() => service.finalizeUpload(owner.id, media.id), code('media_verification_failed'));
  assert.equal(checks, 1); assert.equal((await row(media.id)).status, 'rejected'); assert.equal((await row(media.id)).moderation_json, null);
});

test('rejection is idempotent, cannot be published, and deletes only the server reservation namespace', async () => {
  const owner = await createTestUser(users); const destroyed: string[] = [];
  const service = new MediaService(fixtureProvider({ deletePendingUpload: async intent => { destroyed.push(intent.publicId); } }),
    { ...approve, moderate: async () => ({ decision: 'reject', reasons: ['sexual_content'] }) });
  const media = await reservation(service, owner.id);
  const result = await service.finalizeUpload(owner.id, media.id);
  assert.equal(result.status, 'rejected'); assert.equal(result.url, undefined);
  assert.deepEqual(await service.finalizeUpload(owner.id, media.id), result);
  await assert.rejects(() => withApprovedMedia(owner.id, [{ mediaIds: [media.id], purpose: 'post', slot: 'images' }],
    { type: 'posts', id: randomUUID() }, async () => true), code('media_not_approved'));
  await pool.query("UPDATE media_assets SET cleanup_at='1800-01-01T00:00:00Z' WHERE id=$1", [media.id]);
  await service.cleanup(100);
  assert.ok(destroyed.includes(`yor-talks/${owner.id}/${media.id}`));
  assert.equal((await row(media.id)).deletion_status, 'deleted'); assert.equal((await row(media.id)).status, 'rejected');
});

test('expired reservations and provider cleanup failures are retried, including late signature replay tombstones', async () => {
  const owner = await createTestUser(users); let attempts = 0;
  const service = new MediaService(fixtureProvider({ deletePendingUpload: async () => { attempts++; throw new MediaProviderUnavailableError(); } }), approve);
  const media = await reservation(service, owner.id);
  await pool.query("UPDATE media_assets SET upload_expires_at=now()-interval '1 minute',cleanup_at='1801-01-01T00:00:00Z' WHERE id=$1", [media.id]);
  await assert.rejects(() => service.finalizeUpload(owner.id, media.id), code('media_upload_expired'));
  await service.cleanup(100);
  assert.ok(attempts > 0); assert.equal((await row(media.id)).deletion_status, 'pending'); assert.equal((await row(media.id)).status, 'deleted');
  await pool.query("UPDATE media_assets SET cleanup_at='1801-01-01T00:00:00Z' WHERE id=$1", [media.id]);
  const retried: string[] = [];
  const reliable = new MediaService(fixtureProvider({ deletePendingUpload: async intent => { retried.push(intent.id); } }), approve);
  await reliable.cleanup(100); assert.ok(retried.includes(media.id)); assert.equal((await row(media.id)).deletion_status, 'deleted');
  await pool.query("UPDATE media_assets SET cleanup_at='1801-01-01T00:00:00Z' WHERE id=$1", [media.id]);
  await reliable.cleanup(100); assert.equal(retried.filter(id => id === media.id).length, 2);
});

test('concurrent cleanup workers cannot claim the same provider deletion', async () => {
  const owner = await createTestUser(users), entered = latch(), resume = latch(); const calls = new Map<string, number>();
  const provider = fixtureProvider({ deletePendingUpload: async intent => { calls.set(intent.id, (calls.get(intent.id) ?? 0) + 1); if (intent.id === target) { entered.release(); await resume.promise; } } });
  const service = new MediaService(provider, approve), media = await reservation(service, owner.id), target = media.id;
  await service.deleteUpload(owner.id, media.id);
  await pool.query("UPDATE media_assets SET cleanup_at='1802-01-01T00:00:00Z' WHERE id=$1", [media.id]);
  const first = service.cleanup(100); await entered.promise;
  await service.cleanup(100); resume.release(); await first;
  assert.equal(calls.get(media.id), 1); assert.equal((await row(media.id)).deletion_status, 'deleted');
});

test('cleanup skips more than one batch of older live assets before limiting expired and rejected candidates', async t => {
  const owner = await createTestUser(users);
  t.after(() => users.deleteById(owner.id));
  const destroyed: string[] = [];
  const provider = fixtureProvider({ deletePendingUpload: async intent => { destroyed.push(intent.id); } });
  const service = new MediaService(provider, approve);
  const active: string[] = [];
  for (let index = 0; index < 26; index++) {
    const media = await reservation(service, owner.id);
    await service.finalizeUpload(owner.id, media.id);
    const id = randomUUID();
    await withApprovedMedia(owner.id, [{ mediaIds: [media.id], purpose: 'post', slot: 'images' }], { type: 'posts', id }, async assets => {
      await db.insert(postsTable).values({ id, authorId: owner.id, content: 'Referenced cleanup regression fixture', images: assets.images.map(asset => asset.url) });
      return true;
    });
    active.push(media.id);
  }
  // Fixed synthetic timestamps keep this fixture ahead of unrelated retained
  // test rows while preserving the real ordering: live uses precede garbage.
  await pool.query("UPDATE media_assets SET cleanup_at='1900-01-01T00:00:00Z' WHERE id=ANY($1::uuid[])", [active]);
  const expired = await reservation(service, owner.id);
  await pool.query("UPDATE media_assets SET cleanup_at='1901-01-01T00:00:00Z',upload_expires_at=now()-interval '2 hours' WHERE id=$1", [expired.id]);
  const rejecting = new MediaService(provider, { ...approve, moderate: async () => ({ decision: 'reject', reasons: ['synthetic regression'] }) });
  const rejected = await reservation(rejecting, owner.id);
  await rejecting.finalizeUpload(owner.id, rejected.id);
  await pool.query("UPDATE media_assets SET cleanup_at='1901-01-02T00:00:00Z' WHERE id=$1", [rejected.id]);

  await service.cleanup(25);
  assert.ok(destroyed.includes(expired.id), 'an expired later reservation must not starve behind live referenced media');
  assert.ok(destroyed.includes(rejected.id), 'a later rejected asset must also be reached in the same sweep');
  for (const id of active) {
    assert.equal((await row(id)).status, 'approved');
    assert.equal((await row(id)).deletion_status, 'none');
    assert.equal(destroyed.includes(id), false);
  }
  assert.equal((await row(expired.id)).deletion_status, 'deleted');
  assert.equal((await row(rejected.id)).deletion_status, 'deleted');
});

test('an expired verification lease or explicit deletion revokes a late moderation approval', async () => {
  const owner = await createTestUser(users);
  for (const revoke of ['lease', 'delete'] as const) {
    const entered = latch(), resume = latch();
    const service = new MediaService(fixtureProvider(), { ...approve, moderate: async () => { entered.release(); await resume.promise; return { decision: 'approve', reasons: [] }; } });
    const media = await reservation(service, owner.id);
    const finalizing = service.finalizeUpload(owner.id, media.id); await entered.promise;
    if (revoke === 'delete') await service.deleteUpload(owner.id, media.id);
    else await pool.query("UPDATE media_assets SET verification_until=now()-interval '1 second' WHERE id=$1", [media.id]);
    resume.release(); await assert.rejects(() => finalizing, MediaLifecycleError);
    assert.notEqual((await row(media.id)).status, 'approved');
  }
});

test('publication winning an asset lock prevents a waiting deletion from missing committed references', async () => {
  const owner = await createTestUser(users), service = new MediaService(fixtureProvider(), approve);
  const media = await reservation(service, owner.id); await service.finalizeUpload(owner.id, media.id);
  const entered = latch(), resume = latch(), postId = randomUUID();
  const publishing = withApprovedMedia(owner.id, [{ mediaIds: [media.id], purpose: 'post', slot: 'images' }], { type: 'posts', id: postId }, async assets => {
    entered.release(); await resume.promise;
    await db.insert(postsTable).values({ id: postId, authorId: owner.id, content: 'Concurrent publication', images: assets.images.map(asset => asset.url) }); return true;
  });
  await entered.promise;
  const deleting = service.deleteUpload(owner.id, media.id);
  resume.release(); await publishing;
  await assert.rejects(() => deleting, code('media_in_use'));
  assert.equal((await row(media.id)).status, 'approved');
  const urls = fixtureProvider();
  assert.equal((await hydrateMediaValue({ id: postId, images: [`media:${media.id}`] }, urls)).images[0], 'https://fixture.invalid/signed/' + 'a'.repeat(32));
  assert.equal((await hydrateMediaValue({ id: randomUUID(), images: [`media:${media.id}`] }, urls)).images[0], null);
  assert.deepEqual(await hydrateMediaValue({ content: `media:${media.id}`, metadata: { id: postId, url: `media:${media.id}` } }, urls),
    { content: `media:${media.id}`, metadata: { id: postId, url: `media:${media.id}` } });
  assert.equal((await hydrateMediaValue(await service.finalizeUpload(owner.id, media.id), urls, owner.id)).url, 'https://fixture.invalid/signed/' + 'a'.repeat(32));
  assert.equal((await hydrateMediaValue(await service.finalizeUpload(owner.id, media.id), urls, randomUUID())).url, null);
});
