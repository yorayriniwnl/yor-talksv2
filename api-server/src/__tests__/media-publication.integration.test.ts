import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { db, pool } from "@workspace/db";
import { postsTable } from "@workspace/db/schema";
import { createTestUser } from "./test-helpers.js";
import { createTestApprovedMedia } from "./media-fixtures.js";
import { UserRepository } from "../repositories/user-repository.js";
import { PostRepository } from "../repositories/post-repository.js";
import { StoryRepository } from "../repositories/story-repository.js";
import { ProductRepository } from "../repositories/product-repository.js";
import { ArticleRepository } from "../repositories/article-repository.js";
import { EventRepository } from "../repositories/event-repository.js";
import { VideoRepository } from "../repositories/video-repository.js";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import { MessageRepository, ConversationRepository } from "../repositories/message-repository.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { PostService } from "../services/post-service.js";
import { StoryService } from "../services/story-service.js";
import { VideoService, normalizeExternalVideoUrl } from "../services/video-service.js";
import { ArticleService } from "../services/article-service.js";
import { ProductService } from "../services/product-service.js";
import { EventService } from "../services/event-service.js";
import { LiveStreamService } from "../services/live-stream-service.js";
import type { LiveKitService } from "../services/livekit-service.js";
import { BroadcastChannelService } from "../services/broadcast-channel-service.js";
import { ProfileInteractionService } from "../services/profile-interaction-service.js";
import { UserService } from "../services/user-service.js";
import { MessageService, MessageUnavailableError } from "../services/message-service.js";
import { withApprovedMedia } from "../services/media-publication.js";
import { MediaLifecycleError } from "../services/media-service.js";
import { hydrateMediaValue } from "../services/media-response.js";
import { createPostSchema, commentSchema } from "../validators/post.js";
import { createStorySchema } from "../validators/story.js";
import { createVideoSchema } from "../validators/video.js";
import { createProductSchema } from "../validators/product.js";
import { createArticleSchema } from "../validators/article.js";
import { createEventSchema } from "../validators/event.js";
import { createStreamSchema } from "../validators/live-stream.js";
import { createBroadcastChannelSchema } from "../validators/broadcast-channel.js";
import { profileShowcaseSchema } from "../validators/profile.js";
import { updateProfileSchema } from "../validators/user.js";
import { messageSchema } from "../validators/message.js";
import { parseSocketPayload } from "../socket/policy.js";

after(() => pool.end());
const users = new UserRepository();
const marker = (id: string) => `media:${id}`;
async function references(entityId: string) {
  return (await pool.query("SELECT media_id, entity_type, slot FROM media_references WHERE entity_id=$1 ORDER BY media_id,slot", [entityId])).rows;
}

test("all publication validators reject raw URL fields; HTTP/socket accept structured attachment-only messages", () => {
  const raw = "https://example.test/unmoderated.png";
  const base = { contentCategory: "other", contentRating: "regular" };
  const cases: Array<[any, object, string]> = [
    [createPostSchema, { ...base, content: "A post" }, "images"],
    [commentSchema, { content: "A comment" }, "mediaUrl"],
    [createStorySchema, { ...base, type: "text", textContent: "A story" }, "mediaUrl"],
    [createVideoSchema, { ...base, title: "A video", type: "standard", mediaId: randomUUID() }, "videoUrl"],
    [createProductSchema, { title: "Product", description: "Description", price: 100, category: "art", condition: "new", contentRating: "regular" }, "images"],
    [createArticleSchema, { ...base, title: "Article", excerpt: "Excerpt", content: "Article body" }, "coverUrl"],
    [createEventSchema, { title: "Event", startsAt: new Date().toISOString(), category: "other", location: "Online", contentRating: "regular" }, "coverUrl"],
    [createStreamSchema, { contentRating: "regular", title: "Stream", kind: "video", startsAt: new Date().toISOString(), category: "other" }, "coverUrl"],
    [createBroadcastChannelSchema, { name: "Channel" }, "coverUrl"],
    [profileShowcaseSchema, { type: "custom", title: "Showcase" }, "customImageUrl"],
    [updateProfileSchema, { bio: "A biography" }, "avatarUrl"],
    [messageSchema, { conversationId: randomUUID(), content: "Message" }, "mediaUrl"],
  ];
  for (const [schema, input, field] of cases) {
    assert.equal(schema.safeParse(input).success, true, `${field} baseline`);
    assert.equal(schema.safeParse({ ...input, [field]: field === "images" ? [raw] : raw }).success, false, field);
  }
  const payload = { conversationId: randomUUID(), mediaId: randomUUID() };
  assert.equal(messageSchema.safeParse(payload).success, true);
  assert.equal(parseSocketPayload("message:send", payload).success, true);
  assert.equal(parseSocketPayload("message:send", { ...payload, mediaUrl: raw }).success, false);
  assert.equal(messageSchema.safeParse({ conversationId: randomUUID(), content: "" }).success, false);
});

test("approved ownership, purpose, lifecycle status, and verified type are enforced before a content write", async () => {
  const owner = await createTestUser(users);
  const other = await createTestUser(users);
  const fixtures = [
    await createTestApprovedMedia(other.id, "post"),
    await createTestApprovedMedia(owner.id, "avatar"),
    await createTestApprovedMedia(owner.id, "post", "image/png", { status: "pending" }),
    await createTestApprovedMedia(owner.id, "post", "image/png", { status: "rejected" }),
    await createTestApprovedMedia(owner.id, "post", "video/mp4"),
  ];
  for (const malformed of [{ deletionStatus: "pending" }, { verifiedMime: null }, { verifiedBytes: null }]) {
    await assert.rejects(() => createTestApprovedMedia(owner.id, "post", "image/png", malformed), (error: unknown) => (error as { cause?: { code?: string } }).cause?.code === "23514");
  }
  for (const asset of fixtures) {
    let wrote = false;
    await assert.rejects(() => withApprovedMedia(owner.id, [{ mediaIds: [asset.id], purpose: "post", slot: "images", kind: "image" }], { type: "posts", id: randomUUID() }, async () => { wrote = true; return true; }), MediaLifecycleError);
    assert.equal(wrote, false);
  }
  for (const id of ["https://example.test/a.png", "data:image/png;base64,eA==", `media:${randomUUID()}`, randomUUID()]) {
    await assert.rejects(() => withApprovedMedia(owner.id, [{ mediaIds: [id], purpose: "post", slot: "images" }], { type: "posts", id: randomUUID() }, async () => true), MediaLifecycleError);
  }
});

test("media reference and content writes roll back together when publication fails", async () => {
  const owner = await createTestUser(users);
  const asset = await createTestApprovedMedia(owner.id, "post");
  const id = randomUUID();
  await assert.rejects(() => withApprovedMedia(owner.id, [{ mediaIds: [asset.id], purpose: "post", slot: "images" }], { type: "posts", id }, async media => {
    await db.insert(postsTable).values({ id, authorId: owner.id, content: "Rollback fixture", images: media.images.map(item => item.url) });
    throw new Error("Synthetic publication failure");
  }), /Synthetic publication failure/);
  assert.equal((await pool.query("SELECT id FROM posts WHERE id=$1", [id])).rowCount, 0);
  assert.deepEqual(await references(id), []);
});

test("post, image/audio comments, story, and video publications persist only approved markers and matching uses", async () => {
  const owner = await createTestUser(users);
  const postService = new PostService(new PostRepository(), users, new NotificationRepository());
  const postAsset = await createTestApprovedMedia(owner.id, "post");
  const post = await postService.createPost(owner.id, "Approved post", [postAsset.id]);
  assert.deepEqual(post.images, [marker(postAsset.id)]);
  assert.deepEqual(await references(post.id), [{ media_id: postAsset.id, entity_type: "posts", slot: "images" }]);
  const commentAsset = await createTestApprovedMedia(owner.id, "comment", "audio/mpeg");
  const result = await postService.commentOnPost(post.id, owner.id, "", { mediaId: commentAsset.id, mediaType: "image", mediaDuration: 599 });
  assert.equal(result?.comment.mediaUrl, marker(commentAsset.id));
  assert.equal(result?.comment.mediaType, "audio");
  assert.equal(result?.comment.mediaDuration, 4);
  assert.equal((await references(result!.comment.id))[0].entity_type, "comments");
  const storyAsset = await createTestApprovedMedia(owner.id, "story", "audio/mpeg");
  const story = await new StoryService(new StoryRepository()).createStory({ authorId: owner.id, mediaId: storyAsset.id, type: "voice", isHighlight: false, audience: "public" });
  assert.equal(story.mediaUrl, marker(storyAsset.id));
  assert.equal((await references(story.id))[0].entity_type, "stories");
  const videoService = new VideoService(new VideoRepository());
  const videoAsset = await createTestApprovedMedia(owner.id, "video", "video/mp4");
  const video = await videoService.createVideo({ authorId: owner.id, title: "Approved video", mediaId: videoAsset.id, type: "standard" });
  assert.equal(video.videoUrl, marker(videoAsset.id));
  assert.equal(video.thumbnailUrl, `media-poster:${videoAsset.id}`);
  const videoCommentAsset = await createTestApprovedMedia(owner.id, "video_comment");
  const videoComment = await videoService.commentOnVideo(video.id, owner.id, "", { mediaId: videoCommentAsset.id, mediaType: "audio" });
  assert.equal(videoComment?.comment.mediaUrl, marker(videoCommentAsset.id));
  assert.equal(videoComment?.comment.mediaType, "image");
  assert.equal((await references(videoComment!.comment.id))[0].entity_type, "video_comments");
});

test("every cover and marketplace/showcase publication registers its approved asset use", async () => {
  const owner = await createTestUser(users);
  const productAsset = await createTestApprovedMedia(owner.id, "product");
  const product = await new ProductService(new ProductRepository()).createProduct({ sellerId: owner.id, title: "Approved product", description: "A synthetic product", price: 100, mediaIds: [productAsset.id], category: "art", condition: "new" });
  assert.deepEqual(product.images, [marker(productAsset.id)]);
  const articleAsset = await createTestApprovedMedia(owner.id, "article");
  const article = await new ArticleService(new ArticleRepository()).createArticle({ authorId: owner.id, title: "Approved article", excerpt: "Synthetic excerpt", content: "Synthetic body", readTime: 1, coverMediaId: articleAsset.id });
  const eventAsset = await createTestApprovedMedia(owner.id, "event");
  const event = await new EventService(new EventRepository()).createEvent({ hostId: owner.id, title: "Approved event", description: "Synthetic event", startsAt: new Date().toISOString(), category: "other", location: "Online", isOnline: true, coverMediaId: eventAsset.id });
  const liveAsset = await createTestApprovedMedia(owner.id, "live_stream");
  const live = await new LiveStreamService(new LiveStreamRepository(), { isConfigured: () => true } as LiveKitService).createStream({ hostId: owner.id, title: "Approved stream", kind: "video", startsAt: new Date().toISOString(), category: "other", coverMediaId: liveAsset.id });
  const channelAsset = await createTestApprovedMedia(owner.id, "broadcast_channel");
  const channel = await new BroadcastChannelService().createChannel({ ownerId: owner.id, name: "Approved channel", coverMediaId: channelAsset.id });
  const highlightAsset = await createTestApprovedMedia(owner.id, "highlight");
  const highlight = await new StoryService(new StoryRepository()).createHighlight(owner.id, "Approved Highlight", highlightAsset.id);
  const showcaseAsset = await createTestApprovedMedia(owner.id, "showcase");
  const showcase = await new ProfileInteractionService().createShowcase(owner.id, { type: "custom", title: "Approved showcase", customImageMediaId: showcaseAsset.id });
  for (const [content, asset, type, slot] of [
    [product, productAsset, "products", "images"], [article, articleAsset, "articles", "coverUrl"],
    [event, eventAsset, "events", "coverUrl"], [live, liveAsset, "live_streams", "coverUrl"],
    [channel, channelAsset, "broadcast_channels", "coverUrl"], [highlight, highlightAsset, "highlights", "coverUrl"],
    [showcase, showcaseAsset, "profile_showcases", "customImageUrl"],
  ] as const) {
    assert.deepEqual(await references(content.id), [{ media_id: asset.id, entity_type: type, slot }]);
    if (slot !== "images") assert.equal((content as any)[slot], marker(asset.id));
  }
});

test("avatar replacement preserves legacy reads, keeps reused media, and releases only the replaced asset", async () => {
  const owner = await createTestUser(users, { avatarUrl: "https://example.test/legacy.png" });
  const service = new UserService(users);
  assert.equal((await service.updateProfile(owner.id, { bio: "Text change" }))?.avatarUrl, owner.avatarUrl);
  await assert.rejects(() => service.updateProfile(owner.id, { avatarUrl: "https://example.test/new.png" } as never), MediaLifecycleError);
  const first = await createTestApprovedMedia(owner.id, "avatar");
  const second = await createTestApprovedMedia(owner.id, "avatar");
  await service.uploadAvatar(owner.id, first.id);
  await service.uploadAvatar(owner.id, first.id);
  assert.equal((await pool.query("SELECT deletion_status FROM media_assets WHERE id=$1", [first.id])).rows[0].deletion_status, "none");
  assert.equal((await service.uploadAvatar(owner.id, second.id))?.avatarUrl, marker(second.id));
  assert.deepEqual(await references(owner.id), [{ media_id: second.id, entity_type: "users", slot: "avatarUrl" }]);
  assert.equal((await pool.query("SELECT deletion_status FROM media_assets WHERE id=$1", [first.id])).rows[0].deletion_status, "pending");
});

test("approved avatars hydrate typed follow, call and story viewer response DTOs", async t => {
  const owner = await createTestUser(users);
  const other = await createTestUser(users);
  t.after(async () => { await users.deleteById(owner.id); await users.deleteById(other.id); });
  const ownerAvatar = await createTestApprovedMedia(owner.id, "avatar");
  const otherAvatar = await createTestApprovedMedia(other.id, "avatar");
  const service = new UserService(users);
  await service.uploadAvatar(owner.id, ownerAvatar.id);
  await service.uploadAvatar(other.id, otherAvatar.id);
  const ownerDto = { id: owner.id, username: owner.username, fullName: owner.fullName, avatarUrl: marker(ownerAvatar.id) };
  const otherDto = { id: other.id, username: other.username, fullName: other.fullName, avatarUrl: marker(otherAvatar.id) };
  const cases: Array<{ name: string; value: object; avatars: (value: any) => Array<[string, string]> }> = [
    { name: "follow response", value: { data: { follower: ownerDto, target: otherDto, status: "accepted" } }, avatars: value => [[value.data.follower.avatarUrl, ownerAvatar.id], [value.data.target.avatarUrl, otherAvatar.id]] },
    { name: "follow request list", value: { data: [{ id: randomUUID(), requesterId: owner.id, targetId: other.id, status: "pending", requester: ownerDto }] }, avatars: value => [[value.data[0].requester.avatarUrl, ownerAvatar.id]] },
    { name: "accepted follow request", value: { data: { request: { id: randomUUID(), requesterId: owner.id, targetId: other.id, status: "accepted" }, follower: ownerDto, target: otherDto } }, avatars: value => [[value.data.follower.avatarUrl, ownerAvatar.id], [value.data.target.avatarUrl, otherAvatar.id]] },
    { name: "call invitation", value: { callId: randomUUID(), callType: "audio", offer: { type: "offer", sdp: "synthetic" }, caller: { id: owner.id, username: owner.username, displayName: owner.fullName, avatarUrl: ownerDto.avatarUrl } }, avatars: value => [[value.caller.avatarUrl, ownerAvatar.id]] },
    { name: "story viewer list", value: { data: { viewers: [{ viewerId: owner.id, username: owner.username, displayName: owner.fullName, avatarUrl: ownerDto.avatarUrl, viewedAt: new Date().toISOString() }], nextCursor: null } }, avatars: value => [[value.data.viewers[0].avatarUrl, ownerAvatar.id]] },
  ];
  for (const fixture of cases) await t.test(fixture.name, async () => {
    const result = await hydrateMediaValue(fixture.value);
    for (const [avatar, assetId] of fixture.avatars(result)) {
      const delivery = new URL(avatar);
      assert.equal(delivery.pathname, `/api/media/${assetId}/content`);
      assert.ok(delivery.searchParams.get("token"));
    }
  });
});

test("typed avatar DTOs cannot hydrate foreign or unreferenced assets or markers in arbitrary metadata", async t => {
  const owner = await createTestUser(users);
  const other = await createTestUser(users);
  t.after(async () => { await users.deleteById(owner.id); await users.deleteById(other.id); });
  const avatar = await createTestApprovedMedia(owner.id, "avatar");
  const unattached = await createTestApprovedMedia(owner.id, "avatar");
  await new UserService(users).uploadAvatar(owner.id, avatar.id);
  for (const container of ["follower", "target", "requester", "caller"]) {
    const foreign = { data: { [container]: { id: other.id, avatarUrl: marker(avatar.id) } } };
    const unreferenced = { data: { [container]: { id: owner.id, avatarUrl: marker(unattached.id) } } };
    assert.equal((await hydrateMediaValue(foreign)).data[container].avatarUrl, null, `${container}: foreign asset`);
    assert.equal((await hydrateMediaValue(unreferenced)).data[container].avatarUrl, null, `${container}: unreferenced asset`);
  }
  const foreignViewer = { data: { viewers: [{ viewerId: other.id, avatarUrl: marker(avatar.id) }] } };
  const unattachedViewer = { data: { viewers: [{ viewerId: owner.id, avatarUrl: marker(unattached.id) }] } };
  assert.equal((await hydrateMediaValue(foreignViewer)).data.viewers[0].avatarUrl, null);
  assert.equal((await hydrateMediaValue(unattachedViewer)).data.viewers[0].avatarUrl, null);
  const arbitrary = { data: { content: marker(avatar.id), metadata: { caller: { id: owner.id, avatarUrl: marker(avatar.id) }, viewers: [{ viewerId: owner.id, avatarUrl: marker(avatar.id) }] } } };
  assert.deepEqual(await hydrateMediaValue(arbitrary), arbitrary);
});

test("concurrent message retries attach exactly the winning image/audio asset; soft deletion and replay never restore references", async () => {
  const sender = await createTestUser(users);
  const recipient = await createTestUser(users);
  const service = new MessageService(new ConversationRepository(), new MessageRepository());
  const conversation = await service.createConversation(sender.id, recipient.id);
  const image = await createTestApprovedMedia(sender.id, "message");
  const audio = await createTestApprovedMedia(sender.id, "message", "audio/mpeg");
  const idempotencyKey = randomUUID();
  const messages = await Promise.all([image, audio].map(asset => service.sendMessageToConversation(sender.id, conversation.id, "", { idempotencyKey, mediaId: asset.id })));
  assert.equal(messages[0].mediaId, messages[1].mediaId);
  assert.equal(messages[0].mediaLegacy, false);
  assert.deepEqual(await references(idempotencyKey), [{ media_id: messages[0].mediaId, entity_type: "messages", slot: "mediaUrl" }]);
  await service.deleteMessage(idempotencyKey, sender.id);
  assert.deepEqual(await references(idempotencyKey), []);
  await assert.rejects(() => service.sendMessageToConversation(sender.id, conversation.id, "", { idempotencyKey, mediaId: audio.id }), MessageUnavailableError);
  assert.deepEqual(await references(idempotencyKey), []);
  const text = await service.sendMessageToConversation(sender.id, conversation.id, "📷 https://example.test/unapproved.png");
  assert.equal(text.mediaLegacy, false);
  assert.equal(text.mediaId, null);
  assert.equal(text.mediaUrl, null);
  const legacy = await new MessageRepository().create({ ...text, id: randomUUID(), content: "📷 https://example.test/old-image.png", mediaLegacy: true });
  assert.equal(legacy.mediaLegacy, true);
  const edited = await service.editMessage(legacy.id, sender.id, "📷 https://example.test/new-unapproved.png");
  assert.equal(edited?.mediaLegacy, false);
  assert.equal(edited?.mediaUrl, null);
});

test("external video mode rejects off-host, non-HTTPS, credentialed and disguised URLs and requires approved thumbnails", async () => {
  for (const value of ["http://youtube.com/watch?v=a", "https://youtube.com.evil.test/a", "https://user:pass@youtube.com/watch?v=a", "https://youtube.com:8443/a", "data:video/mp4;base64,eA==", "https://example.test/video.mp4", "https://youtube.com/"]) assert.throws(() => normalizeExternalVideoUrl(value), MediaLifecycleError);
  assert.equal(normalizeExternalVideoUrl("https://youtu.be/example"), "https://youtu.be/example");
  const owner = await createTestUser(users);
  const asset = await createTestApprovedMedia(owner.id, "video");
  const service = new VideoService(new VideoRepository());
  const external = await service.createVideo({ authorId: owner.id, title: "External video", externalVideoUrl: "https://youtu.be/example", thumbnailMediaId: asset.id, type: "standard" });
  assert.equal(external.thumbnailUrl, marker(asset.id));
  assert.equal(external.videoUrl, "https://youtu.be/example");
  await assert.rejects(() => service.createVideo({ authorId: owner.id, title: "External video", externalVideoUrl: "https://youtu.be/example", type: "standard" }), MediaLifecycleError);
});

test("parallel avatar replacements serialize before locking old/new assets and keep the final reference consistent", async () => {
  const owner = await createTestUser(users);
  const first = await createTestApprovedMedia(owner.id, "avatar");
  const second = await createTestApprovedMedia(owner.id, "avatar");
  const service = new UserService(users);
  await service.uploadAvatar(owner.id, first.id);
  // The second request reuses the currently displayed asset. It may complete
  // before replacement or fail once that asset becomes deletion-pending.
  const outcomes = await Promise.allSettled([service.uploadAvatar(owner.id, second.id), service.uploadAvatar(owner.id, first.id)]);
  assert.equal(outcomes[0].status, "fulfilled");
  if (outcomes[1].status === "rejected") assert.ok(outcomes[1].reason instanceof MediaLifecycleError);
  const persisted = await users.findById(owner.id);
  const refs = await references(owner.id);
  assert.equal(refs.length, 1);
  assert.equal(persisted?.avatarUrl, marker(refs[0].media_id));
  assert.equal((await pool.query("SELECT deletion_status FROM media_assets WHERE id=$1", [refs[0].media_id])).rows[0].deletion_status, "none");
});

test("account deletion wins against blocked media publication without leaving an orphan use", async () => {
  const owner = await createTestUser(users);
  const asset = await createTestApprovedMedia(owner.id, "avatar");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [owner.id]);
    const publishing = new UserService(users).uploadAvatar(owner.id, asset.id);
    // Queue the publication behind the account lock, then perform the actual
    // cascade in this transaction. No timers or production data are involved.
    await client.query("DELETE FROM users WHERE id=$1", [owner.id]);
    await client.query("COMMIT");
    await assert.rejects(() => publishing, MediaLifecycleError);
    assert.deepEqual(await references(owner.id), []);
    const stored = (await pool.query("SELECT owner_id,deletion_status FROM media_assets WHERE id=$1", [asset.id])).rows[0];
    assert.equal(stored.owner_id, null);
    assert.equal(stored.deletion_status, "pending");
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

test("shared media survives deletion of one post and queues cleanup only after its final use", async () => {
  const owner = await createTestUser(users);
  const asset = await createTestApprovedMedia(owner.id, "post");
  const service = new PostService(new PostRepository(), users, new NotificationRepository());
  const first = await service.createPost(owner.id, "First approved use", [asset.id]);
  const second = await service.createPost(owner.id, "Second approved use", [asset.id]);
  assert.equal(await service.deletePost(first.id, owner.id), true);
  assert.deepEqual(await references(first.id), []);
  assert.equal((await references(second.id)).length, 1);
  assert.equal((await pool.query("SELECT deletion_status FROM media_assets WHERE id=$1", [asset.id])).rows[0].deletion_status, "none");
  assert.equal(await service.deletePost(second.id, owner.id), true);
  assert.equal((await pool.query("SELECT deletion_status FROM media_assets WHERE id=$1", [asset.id])).rows[0].deletion_status, "pending");
});

test("a last-reference deletion waiting for publication sees the newly committed reference", async () => {
  const owner = await createTestUser(users);
  const asset = await createTestApprovedMedia(owner.id, "post");
  const service = new PostService(new PostRepository(), users, new NotificationRepository());
  const first = await service.createPost(owner.id, "Original use", [asset.id]);
  const nextId = randomUUID();
  let entered!: () => void, resume!: () => void;
  const held = new Promise<void>(resolve => { entered = resolve; });
  const release = new Promise<void>(resolve => { resume = resolve; });
  const publishing = withApprovedMedia(owner.id, [{ mediaIds: [asset.id], purpose: "post", slot: "images" }],
    { type: "posts", id: nextId }, async assets => {
      entered(); await release;
      await db.insert(postsTable).values({ id: nextId, authorId: owner.id, content: "New use", images: assets.images.map(media => media.url) });
      return true;
    });
  await held;
  const deletingClient = await pool.connect();
  let deleting: Promise<unknown> | undefined;
  try {
    const pid = (await deletingClient.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    deleting = deletingClient.query("DELETE FROM posts WHERE id=$1", [first.id]);
    const deadline = Date.now() + 5_000;
    let blocked = false;
    while (Date.now() < deadline) {
      blocked = (await pool.query("SELECT wait_event_type='Lock' AS blocked FROM pg_stat_activity WHERE pid=$1", [pid])).rows[0]?.blocked === true;
      if (blocked) break;
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    assert.equal(blocked, true, "Deletion must reach the held asset lock before publication commits");
    resume(); await publishing; await deleting;
    assert.equal((await references(nextId)).length, 1);
    assert.deepEqual((await pool.query("SELECT status,deletion_status FROM media_assets WHERE id=$1", [asset.id])).rows[0],
      { status: "approved", deletion_status: "none" });
  } finally {
    resume(); await Promise.allSettled([publishing, ...(deleting ? [deleting] : [])]);
    deletingClient.release();
  }
});
