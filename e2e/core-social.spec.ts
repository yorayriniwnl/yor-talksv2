import { expect, test, type Page, type Route } from "@playwright/test";
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const user = {
  id: "1cc96a14-2728-46fd-ae3c-cbf15fd9db1a",
  username: "ada",
  email: "ada@example.test",
  fullName: "Ada Lovelace",
  bio: "Building thoughtful systems.",
  avatarUrl: null,
  role: "user",
  permissions: [],
  createdAt: "2026-08-28T09:00:00.000Z",
  updatedAt: "2026-08-28T09:00:00.000Z",
  followerCount: 12,
  followingCount: 0,
  following: [] as string[],
  postCount: 1,
  verified: true,
  settings: { notificationsEnabled: true, privateAccount: false, contentFilter: "regular" },
  privacy: { profileVisibility: "public", messageRequests: true, allowDmFromStrangers: true },
  termsVersion: "test-public-beta-1",
  termsAcceptedAt: "2026-08-30T00:00:00.000Z",
  ageConfirmedAt: "2026-08-30T00:00:00.000Z",
};

function post(content: string, id: string) {
  return {
    id,
    authorId: user.id,
    content,
    images: [],
    createdAt: "2026-08-28T09:05:00.000Z",
    updatedAt: "2026-08-28T09:05:00.000Z",
    likesCount: 0,
    commentsCount: 0,
    bookmarksCount: 0,
    shareCount: 0,
    repostCount: 0,
    likedByMe: false,
    savedByMe: false,
    repostedByMe: false,
    audience: "public",
    contentCategory: "technology",
    contentRating: "regular",
  };
}

async function json(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, message: "OK", data, errors: [], meta }),
  });
}

async function installApiBoundary(page: Page, profile = user) {
  const unhandled: string[] = [];
  page.on('close', () => expect(unhandled, 'Every mocked API route must be explicit').toEqual([]));
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "") || "/";

    if (path === "/auth/refresh" && request.method() === "POST") {
      return json(route, { accessToken: "browser-smoke-access-token" });
    }
    if (path === "/users/me" && request.method() === "GET") return json(route, profile);
    if (path === "/users/me/premium-profile" && request.method() === "GET") return json(route, {
      selection: { bioStyleId: 'default', messageFontId: 'default', storyFontId: 'default', appIconId: 'yor-default' },
      options: { bioStyles: [{ id: 'default', label: 'Default' }], messageStyles: [{ id: 'default', label: 'Default' }], storyStyles: [{ id: 'default', label: 'Default' }], appIcons: [{ id: 'yor-default', label: 'Yor', platforms: ['web'] }] },
      enabledFeatures: {},
    });
    if (path === `/users/${user.id}`) return json(route, profile);
    if (path === "/users/search") return json(route, [user]);
    if (path === "/search") return json(route, { users: [], posts: [] });
    if (path === "/readyz") return json(route, { status: 'ready' });
    if (path === "/feed" && request.method() === "GET") {
      return json(route, [post("A real signal delivered through the feed boundary.", "18fac78e-65fa-4fd4-931e-8b79e086c48d")], {
        nextCursor: null,
        hasMore: false,
        limit: 20,
      });
    }
    if (path === "/posts" && request.method() === "POST") {
      const payload = request.postDataJSON() as { content: string };
      return json(route, post(payload.content, "292d72b6-6bd1-4693-91e8-b4dc32302c7c"));
    }

    const emptyLists = ['/notifications', '/users/me/follow-requests', '/users/me/close-friends', '/users/me/favorites/creators', '/users/me/contact-shields', '/conversations', '/stories', '/notes', '/videos', '/articles', '/events', '/products', '/communities', '/creator/workspace', '/achievements/me', `/users/${user.id}/following`, `/users/${user.id}/followers`, `/users/${user.id}/feed`, `/users/${user.id}/showcases`, `/users/${user.id}/profile-comments`, `/users/${user.id}/pinned-posts`];
    if (request.method() === 'GET' && emptyLists.includes(path)) return json(route, []);
    if (request.method() === 'GET' && ['/posts/liked', '/posts/saved'].includes(path)) return json(route, [], { hasMore: false, nextCursor: null });
    if (request.method() === 'GET' && path === `/users/${user.id}/posts`) return json(route, [], { hasMore: false, nextCursor: null });
    unhandled.push(`${request.method()} ${path}`);
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: `Unhandled test route: ${request.method()} ${path}` }) });
    throw new Error(`Unhandled test route: ${request.method()} ${path}`);
  });
}

async function syntheticPosterImage(page: Page): Promise<Buffer> {
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2; canvas.height = 2;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#2980b9'; context.fillRect(0, 0, 2, 2);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(encoded, 'base64');
}

async function fulfillSeekableMedia(route: Route, bytes: Buffer, mime: string) {
  const range = route.request().headers().range?.match(/^bytes=(\d*)-(\d*)$/);
  const start = range ? (range[1] ? Number(range[1]) : Math.max(0, bytes.length - Number(range[2]))) : 0;
  const end = range?.[1] && range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
  return route.fulfill({
    status: range ? 206 : 200, contentType: mime,
    headers: { 'Cache-Control': 'private, no-store', 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` } : {}) },
    body: bytes.subarray(start, end + 1),
  });
}

test('grievance submission and tracking work with private public receipts', async ({ page }) => {
  await installApiBoundary(page);
  const receipt = { ticketId: 'YT-GRV-849201ABCD', status: 'received', createdAt: '2026-10-07T08:00:00.000Z', slaDeadline: '2026-10-22T08:00:00.000Z' };
  await page.route('**/api/reports/grievance', route => json(route, receipt));
  await page.route(`**/api/reports/grievance/${receipt.ticketId}`, route => json(route, { ...receipt, status: 'under_review' }));
  await page.goto('/grievance');
  await page.locator('#reporterName').fill('Private Reporter');
  await page.locator('#reporterEmail').fill('private@example.test');
  await page.locator('#reportedUrl').fill('https://example.test/reported-post');
  await page.locator('#description').fill('A private complaint with enough detail for a reviewer to investigate.');
  await page.getByRole('button', { name: /Submit Grievance to/ }).click();
  await expect(page.getByText(receipt.ticketId, { exact: true })).toBeVisible();
  await expect(page.getByText('Operational review target:', { exact: true })).toBeVisible();
  await expect(page.getByText(/Statutory SLA|acknowledgement email/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Track Existing Ticket' }).click();
  await page.locator('#trackTicketId').fill(receipt.ticketId);
  await page.getByRole('button', { name: 'Track ticket', exact: true }).click();
  await expect(page.getByText('under review', { exact: true })).toBeVisible();
  await expect(page.getByText(/A reviewer has not added a note/)).toHaveCount(0);
  await expect(page.getByText(/Operational review target:/)).toBeVisible();
  await expect(page.getByText(/Statutory Grievance Redressal Officer/)).toHaveCount(0);
});

test('older structured message image and audio grants renew without replacing history or drafts', async ({ page }) => {
  const poster = await syntheticPosterImage(page);
  const audioBytes = readFileSync(new URL('./fixtures/delivery.wav', import.meta.url));
  await installApiBoundary(page);
  const peer = { ...user, id: '10000000-0000-4000-8000-000000000181', username: 'expiry_peer', fullName: 'Expiry Peer' };
  const conversation = { id: '20000000-0000-4000-8000-000000000181', participantA: user.id, participantB: peer.id, participantIds: [user.id, peer.id], updatedAt: user.createdAt };
  const imageId = '40000000-0000-4000-8000-000000000181', audioId = '40000000-0000-4000-8000-000000000182';
  const attachments = [
    { id: '30000000-0000-4000-8000-000000000000', content: 'Earlier image caption', mediaType: 'image', mediaId: imageId, createdAt: '2026-08-28T08:00:00.123456Z' },
    { id: '30000000-0000-4000-8000-000000000181', content: 'Earlier voice caption', mediaType: 'audio', mediaId: audioId, createdAt: '2026-08-28T08:01:00.654321Z' },
  ].map(message => ({ ...message, conversationId: conversation.id, senderId: peer.id, recipientId: user.id, mediaLegacy: false,
    mediaUrl: `/api/media/${message.mediaId}/content?token=original`, deletedAt: null, expiresAt: null, seenAt: user.createdAt }));
  const recent = Array.from({ length: 200 }, (_, index) => ({
    id: `50000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, '0')}`, conversationId: conversation.id,
    senderId: user.id, recipientId: peer.id, content: `Recent history row ${index}`, createdAt: user.createdAt, seenAt: user.createdAt,
  }));
  let snapshotReads = 0, olderReads = 0, audioExpired = false;
  const attachmentReads = [0, 0];
  await page.route('**/api/conversations', route => json(route, [{ conversation }]));
  await page.route(`**/api/users/${peer.id}`, route => json(route, peer));
  await page.route('**/api/conversations/*/messages*', route => {
    const query = new URL(route.request().url()).searchParams;
    if (!query.size) { snapshotReads++; return json(route, recent); }
    if (query.get('limit') === '100') { olderReads++; return json(route, attachments); }
    expect(query.get('limit')).toBe('1');
    const index = query.get('cursorAt') === attachments[0].createdAt ? 0 : 1;
    expect(query.get('cursorAt')).toBe(attachments[index].createdAt);
    expect(query.get('direction')).toBe(index === 0 ? 'older' : 'newer');
    expect(query.get('cursorId')).toBe(index === 0 ? '30000000-0000-4000-8000-000000000001' : '30000000-0000-4000-8000-000000000180');
    expect(route.request().headers().authorization).toBe('Bearer browser-smoke-access-token');
    attachmentReads[index]++;
    return json(route, [{ ...attachments[index], mediaUrl: `/api/media/${attachments[index].mediaId}/content?token=renewed` }]);
  });
  await page.route('**/api/media/*/content?*', route => {
    const url = new URL(route.request().url());
    const original = url.searchParams.get('token') === 'original';
    if (original && (url.pathname.includes(imageId) || audioExpired)) {
      return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Media delivery grant is invalid or expired' }) });
    }
    return url.pathname.includes(imageId) ? fulfillSeekableMedia(route, poster, 'image/png') : fulfillSeekableMedia(route, audioBytes, 'audio/wav');
  });
  await page.goto(`/messages/${conversation.id}`);
  await expect(page.locator('article.operator-message')).toHaveCount(200);
  const composer = page.getByRole('textbox', { name: 'Message', exact: true });
  await composer.fill('This composer draft must survive media expiry.');
  const threadGeometry = await page.locator('.operator-thread__flow').evaluate(async element => {
    element.scroll({ top: 0, behavior: 'instant' });
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const messages = element.querySelector('.operator-thread__messages')!;
    const earlier = Array.from(element.querySelectorAll('button')).find(button => button.textContent?.includes('Load earlier messages'))!;
    return { scrollTop: element.scrollTop, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
      flow: element.getBoundingClientRect().toJSON(), messages: messages.getBoundingClientRect().toJSON(),
      messagesScrollHeight: messages.scrollHeight, messagesFlexShrink: getComputedStyle(messages).flexShrink,
      earlier: earlier.getBoundingClientRect().toJSON() };
  });
  expect(threadGeometry.earlier.top).toBeGreaterThanOrEqual(threadGeometry.flow.top);
  await page.getByRole('button', { name: 'Load earlier messages' }).click();
  await expect(page.locator('article.operator-message')).toHaveCount(202);
  const imageRow = page.locator('article.operator-message').filter({ hasText: 'Earlier image caption' });
  await imageRow.scrollIntoViewIfNeeded();
  const image = imageRow.getByRole('img', { name: 'Shared attachment' });
  await expect(image).toHaveAttribute('src', new URL(`/api/media/${imageId}/content?token=renewed`, page.url()).href);
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(2);
  const audioRow = page.locator('article.operator-message').filter({ hasText: 'Earlier voice caption' });
  const audio = audioRow.locator('audio');
  await audioRow.scrollIntoViewIfNeeded();
  await audio.evaluate(element => (element as HTMLAudioElement).play());
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0.3);
  await audio.evaluate(async element => {
    const player = element as HTMLAudioElement;
    const paused = new Promise<void>(resolve => player.addEventListener('pause', () => resolve(), { once: true }));
    player.pause(); await paused;
    const sought = new Promise<void>(resolve => player.addEventListener('seeked', () => resolve(), { once: true }));
    player.currentTime = 0.4; await sought;
    player.muted = true;
    const changed = new Promise<void>(resolve => player.addEventListener('ratechange', () => resolve(), { once: true }));
    player.playbackRate = 1.5; await changed;
  });
  await expect(audio).toHaveJSProperty('currentTime', 0.4);
  audioExpired = true;
  const expired = page.waitForResponse(response => response.url().includes(`${audioId}/content?token=original`) && response.status() === 403);
  await audio.evaluate(element => (element as HTMLAudioElement).load());
  await expired;
  await expect(audio).toHaveAttribute('src', new URL(`/api/media/${audioId}/content?token=renewed`, page.url()).href);
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeCloseTo(0.4, 1);
  await expect(audio).toHaveJSProperty('paused', true);
  await expect(audio).toHaveJSProperty('muted', true);
  await expect(audio).toHaveJSProperty('playbackRate', 1.5);
  await audio.evaluate(element => (element as HTMLAudioElement).play());
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0.55);
  await expect(imageRow.getByText('Earlier image caption', { exact: true })).toBeVisible();
  await expect(audioRow.getByText('Earlier voice caption', { exact: true })).toBeVisible();
  await expect(page.locator('article.operator-message')).toHaveCount(202);
  await expect(page.locator('article.operator-message').getByText('Recent history row 199', { exact: true })).toHaveCount(1);
  await expect(composer).toHaveValue('This composer draft must survive media expiry.');
  expect([snapshotReads, olderReads, ...attachmentReads]).toEqual([1, 1, 1, 1]);
});

test('message attachment renewal denies mismatches, bounds errors, and ignores a late conversation response', async ({ page }) => {
  await installApiBoundary(page);
  const peers = ['Attachment Alpha', 'Attachment Beta'].map((fullName, index) => ({ ...user, id: `10000000-0000-4000-8000-00000000019${index + 1}`, username: `attachment_${index}`, fullName }));
  const conversations = peers.map((peer, index) => ({ id: `20000000-0000-4000-8000-00000000019${index + 1}`, participantA: user.id, participantB: peer.id, participantIds: [user.id, peer.id], updatedAt: user.createdAt }));
  const attachments = ['image', 'audio'].map((mediaType, index) => ({
    id: `30000000-0000-4000-8000-00000000019${index + 1}`, conversationId: conversations[0].id, senderId: peers[0].id,
    recipientId: user.id, content: `Alpha ${mediaType} caption`, mediaId: `40000000-0000-4000-8000-00000000019${index + 1}`,
    mediaType, mediaLegacy: false, mediaUrl: `/api/media/40000000-0000-4000-8000-00000000019${index + 1}/content?token=expired`,
    createdAt: `2026-08-28T08:0${index}:00.123456Z`, seenAt: user.createdAt, deletedAt: null, expiresAt: null,
  }));
  const reads = [0, 0], providerRequests: string[] = [];
  let releaseLate!: () => void;
  const held = new Promise<void>(resolve => { releaseLate = resolve; });
  page.on('request', request => { if (new URL(request.url()).hostname === 'untrusted.invalid') providerRequests.push(request.url()); });
  await page.route('**/api/conversations', route => json(route, conversations.map(conversation => ({ conversation }))));
  for (const peer of peers) await page.route(`**/api/users/${peer.id}`, route => json(route, peer));
  await page.route('**/api/conversations/*/messages*', async route => {
    const url = new URL(route.request().url()), query = url.searchParams;
    if (url.pathname.includes(conversations[1].id)) return json(route, [{ id: 'beta-text', conversationId: conversations[1].id, senderId: peers[1].id, recipientId: user.id, content: 'Beta conversation only.', createdAt: user.createdAt, seenAt: user.createdAt }]);
    if (!query.size) return json(route, attachments);
    expect(query.get('limit')).toBe('1');
    const index = query.get('cursorAt') === attachments[0].createdAt ? 0 : 1;
    reads[index]++;
    if (index === 0 && reads[index] === 1) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Conversation access denied' }) });
    if (index === 0) {
      await held;
      return json(route, [{ ...attachments[0], mediaUrl: `/api/media/${attachments[0].mediaId}/content?token=late-renewed` }]);
    }
    if (reads[1] === 1) return json(route, [attachments[1]]); // Unchanged grant.
    if (reads[1] === 2) return json(route, [{ ...attachments[1], mediaId: attachments[0].mediaId, mediaUrl: `/api/media/${attachments[0].mediaId}/content?token=forged` }]);
    return json(route, [{ ...attachments[1], mediaUrl: 'https://untrusted.invalid/audio.wav' }]);
  });
  await page.route('**/api/media/*/content?*', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Expired delivery grant' }) }));
  await page.goto(`/messages/${conversations[0].id}`);
  const composer = page.getByRole('textbox', { name: 'Message', exact: true });
  await composer.fill('Alpha draft stays private.');
  const rows = page.locator('article.operator-message');
  const imageRow = rows.filter({ hasText: 'Alpha image caption' }), audioRow = rows.filter({ hasText: 'Alpha audio caption' });
  await imageRow.scrollIntoViewIfNeeded();
  await expect(imageRow.getByRole('alert')).toBeVisible();
  await expect(audioRow.getByRole('alert')).toBeVisible();
  expect(reads).toEqual([1, 1]);
  for (let attempt = 0; attempt < 2; attempt++) {
    const denied = page.waitForResponse(response => response.url().includes(`${attachments[1].mediaId}/content?token=expired`) && response.status() === 403);
    await audioRow.locator('audio').evaluate(element => (element as HTMLAudioElement).load());
    await denied;
  }
  expect(reads).toEqual([1, 1]);
  for (const count of [2, 3]) {
    await audioRow.getByRole('button', { name: 'Retry attachment' }).click();
    await expect(audioRow.getByRole('alert')).toBeVisible();
    expect(reads).toEqual([1, count]);
    await expect(audioRow.locator('audio')).toHaveAttribute('src', new URL(attachments[1].mediaUrl, page.url()).href);
  }
  await expect(composer).toHaveValue('Alpha draft stays private.');
  await expect(rows).toHaveCount(2);
  await imageRow.getByRole('button', { name: 'Retry attachment' }).click();
  await expect(imageRow.getByRole('status')).toHaveText('Refreshing attachment…');
  await page.getByRole('button', { name: /Attachment Beta.*No messages yet/ }).click();
  await expect(rows.getByText('Beta conversation only.', { exact: true })).toBeVisible();
  await expect(composer).toHaveValue('');
  await composer.fill('Beta draft stays with Beta.');
  const lateResponse = page.waitForResponse(response => response.url().includes(`${conversations[0].id}/messages?`) && response.status() === 200);
  releaseLate(); await lateResponse;
  await expect(composer).toHaveValue('Beta draft stays with Beta.');
  await expect(rows).toHaveCount(1);
  await expect(rows.getByText('Beta conversation only.', { exact: true })).toBeVisible();
  await expect(rows.locator('audio, img.operator-message-image')).toHaveCount(0);
  expect(reads).toEqual([2, 3]);
  expect(providerRequests).toEqual([]);
});

test('expired uploaded-video grants renew through the authorized video read and preserve playback', async ({ page }) => {
  const playable = readFileSync(new URL('./fixtures/delivery.webm', import.meta.url));
  const poster = await syntheticPosterImage(page);
  await installApiBoundary(page);
  const assetIds = ['40000000-0000-4000-8000-000000000151', '40000000-0000-4000-8000-000000000152'];
  const videos = assetIds.map((assetId, index) => ({
    id: `30000000-0000-4000-8000-00000000015${index + 1}`, authorId: user.id,
    videoUrl: `/api/media/${assetId}/content?token=original`, thumbnailUrl: `/api/media/${assetId}/content?token=poster`,
    title: `Delivery reel ${index + 1}`, views: 0, likes: 0, createdAt: user.createdAt, type: 'short',
  }));
  let expired = false, authorizedReads = 0;
  const renewedVideo = { ...videos[1], videoUrl: `/api/media/${assetIds[1]}/content?token=renewed`, thumbnailUrl: `/api/media/${assetIds[1]}/content?token=renewed-poster` };
  await page.route('**/api/videos', route => json(route, expired && authorizedReads > 0 ? [videos[0], renewedVideo] : videos));
  await page.route('**/api/videos/*/comments', route => json(route, []));
  await page.route(`**/api/videos/${videos[1].id}`, route => {
    authorizedReads++;
    expect(route.request().headers().authorization).toBe('Bearer browser-smoke-access-token');
    return json(route, renewedVideo);
  });
  await page.route('**/api/media/*/content?*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('token')?.includes('poster')) return route.fulfill({ status: 200, contentType: 'image/png', body: poster });
    if (expired && url.pathname.includes(assetIds[1]) && url.searchParams.get('token') === 'original') {
      return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Media delivery grant is invalid or expired' }) });
    }
    const range = route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), playable.length - 1) : playable.length - 1;
    return route.fulfill({
      status: range ? 206 : 200, contentType: 'video/webm',
      headers: { 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${playable.length}` } : {}) },
      body: playable.subarray(start, end + 1),
    });
  });
  await page.goto('/videos');
  await page.getByRole('button', { name: 'Watch Delivery reel 2' }).click();
  await page.getByRole('button', { name: 'Mute video', exact: true }).click();
  await page.getByRole('button', { name: 'Playback speed 1 times' }).click();
  const player = page.locator('.operator-reel-video').nth(1);
  await expect.poll(() => player.evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0.35);
  // Reload the same grant after its fixture expiry, producing a real media403.
  await player.evaluate(async element => {
    const video = element as HTMLVideoElement;
    const paused = new Promise<void>(resolve => video.addEventListener('pause', () => resolve(), { once: true }));
    video.pause(); await paused;
    const sought = new Promise<void>(resolve => video.addEventListener('seeked', () => resolve(), { once: true }));
    video.currentTime = 0.4; await sought;
  });
  await expect(player).toHaveJSProperty('currentTime', 0.4);
  expired = true;
  const denial = page.waitForResponse(response => response.url().includes(`${assetIds[1]}/content?token=original`) && response.status() === 403);
  await player.evaluate(video => (video as HTMLVideoElement).load());
  await denial;
  await expect(player).toHaveAttribute('src', `/api/media/${assetIds[1]}/content?token=renewed`);
  await expect.poll(() => player.evaluate(video => (video as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  await expect.poll(() => player.evaluate(video => (video as HTMLVideoElement).currentTime)).toBeCloseTo(0.4, 1);
  await expect(player).toHaveJSProperty('paused', true);
  await expect(player).toHaveJSProperty('muted', true);
  await expect(player).toHaveJSProperty('playbackRate', 1.5);
  await expect(page.locator('.operator-reels-progress strong')).toHaveText('02');
  expect(authorizedReads).toBe(1);
  // The renewed URL remains playable without resetting the selected reel.
  await player.evaluate(video => (video as HTMLVideoElement).play());
  await expect.poll(() => player.evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0.55);
  await page.getByRole('button', { name: 'Close video viewer' }).click();
  await page.getByRole('button', { name: 'Watch Delivery reel 2' }).click();
  await expect(page.locator('.operator-reel-video').nth(1)).toHaveAttribute('src', `/api/media/${assetIds[1]}/content?token=renewed`);
  expect(authorizedReads).toBe(1);
});

test('denied or unchanged delivery renewals stop automatically and allow a bounded explicit retry', async ({ page }) => {
  const poster = await syntheticPosterImage(page);
  await installApiBoundary(page);
  const assetIds = ['40000000-0000-4000-8000-000000000161', '40000000-0000-4000-8000-000000000162'];
  const videos = assetIds.map((assetId, index) => ({
    id: `30000000-0000-4000-8000-00000000016${index + 1}`, authorId: user.id,
    videoUrl: `/api/media/${assetId}/content?token=expired`, thumbnailUrl: `/api/media/${assetId}/content?token=poster`,
    title: `Unavailable reel ${index + 1}`, views: 0, likes: 0, createdAt: user.createdAt, type: 'short',
  }));
  const reads = [0, 0];
  let releaseLateRead!: () => void;
  const lateRead = new Promise<void>(resolve => { releaseLateRead = resolve; });
  await page.route('**/api/videos', route => json(route, videos));
  await page.route('**/api/videos/*/comments', route => json(route, []));
  for (const [index, video] of videos.entries()) await page.route(`**/api/videos/${video.id}`, async route => {
    reads[index]++;
    if (index === 1 && reads[index] === 2) {
      await lateRead;
      return json(route, { ...video, videoUrl: `/api/media/${assetIds[1]}/content?token=late-renewed` });
    }
    return index === 0
      ? route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Video is no longer visible' }) })
      : json(route, video);
  });
  await page.route('**/api/media/*/content?*', route => new URL(route.request().url()).searchParams.get('token') === 'poster'
    ? route.fulfill({ status: 200, contentType: 'image/png', body: poster })
    : route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Expired delivery grant' }) }));
  await page.goto('/videos');
  await page.getByRole('button', { name: 'Watch Unavailable reel 1' }).click();
  const failure = page.getByRole('alert').filter({ hasText: 'Video could not load' });
  await expect(failure).toBeVisible();
  expect(reads).toEqual([1, 0]);
  // Repeated actual media failures must not recursively call the read endpoint.
  for (let attempt = 0; attempt < 2; attempt++) {
    const denial = page.waitForResponse(response => response.url().includes(`${assetIds[0]}/content?token=expired`) && response.status() === 403);
    await page.locator('.operator-reel-video').nth(0).evaluate(video => (video as HTMLVideoElement).load());
    await denial;
  }
  expect(reads).toEqual([1, 0]);
  await page.getByRole('button', { name: 'Retry video', exact: true }).click();
  await expect(failure).toBeVisible();
  expect(reads).toEqual([2, 0]);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.operator-reels-progress strong')).toHaveText('02');
  await expect(failure).toBeVisible();
  expect(reads).toEqual([2, 1]);
  await page.getByRole('button', { name: 'Retry video', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Refreshing video playback' })).toBeVisible();
  await expect.poll(() => reads).toEqual([2, 2]);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.operator-reels-progress strong')).toHaveText('01');
  releaseLateRead();
  await expect(page.locator('.operator-reel-video').nth(1)).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.operator-reel-video').nth(1)).toHaveAttribute('src', `/api/media/${assetIds[1]}/content?token=expired`);
  expect(reads).toEqual([2, 2]);
});

test('historical message encodings render attachments only with the server legacy flag', async ({ page }) => {
  await installApiBoundary(page);
  const peer = { ...user, id: '10000000-0000-4000-8000-000000000171', username: 'legacy_peer', fullName: 'Legacy Peer' };
  const conversation = { id: '20000000-0000-4000-8000-000000000171', participantA: user.id, participantB: peer.id, participantIds: [user.id, peer.id], updatedAt: user.createdAt };
  const voice = '[Voice Note] https://legacy.example.test/voice.webm (3s)';
  const image = 'Historical image caption\n📷 https://legacy.example.test/photo.png';
  const messages = [voice, image, voice, image].map((content, index) => ({
    id: `legacy-fixture-${index}`, conversationId: conversation.id, senderId: peer.id, recipientId: user.id,
    content, mediaLegacy: index < 2, mediaId: null, mediaType: null, mediaUrl: null, seenAt: user.createdAt,
    createdAt: `2026-08-28T09:0${index}:00.000Z`,
  }));
  await page.route('**/api/conversations', route => json(route, [{ conversation }]));
  await page.route(`**/api/users/${peer.id}`, route => json(route, peer));
  await page.route('**/api/conversations/*/messages', route => json(route, messages));
  await page.route('https://legacy.example.test/**', route => route.fulfill({ status: 404, body: '' }));
  await page.goto(`/messages/${conversation.id}`);
  const rows = page.locator('article.operator-message');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0).locator('audio')).toHaveAttribute('src', 'https://legacy.example.test/voice.webm');
  await expect(rows.nth(1).getByRole('img', { name: 'Shared attachment' })).toHaveAttribute('src', 'https://legacy.example.test/photo.png');
  await expect(rows.nth(1).getByText('Historical image caption', { exact: true })).toBeVisible();
  await expect(rows.nth(2).locator('audio, img.operator-message-image')).toHaveCount(0);
  await expect(rows.nth(2).getByText(voice, { exact: true })).toBeVisible();
  await expect(rows.nth(3).locator('audio, img.operator-message-image')).toHaveCount(0);
  await expect(rows.nth(3).locator('.operator-message-text')).toHaveText(image);
});

for (const outcome of ['retry', 'rejected'] as const) test(`image publishing keeps its draft until media is approved: ${outcome}`, async ({ page }) => {
  await installApiBoundary(page);
  const mediaId = 'b66d5b3e-e258-4932-9b99-d15cf3f33615';
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  let prepares = 0, uploads = 0, finalizes = 0, publications = 0;
  await page.route('**/api/media/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/presign')) {
      prepares++; expect(route.request().postDataJSON().purpose).toBe('post');
      return json(route, { id: mediaId, mediaId, status: 'pending', purpose: 'post', mimeType: 'image/png', maxFileSize: 5 * 1024 * 1024, mode: 'server', uploadUrl: `/api/media/${mediaId}/upload` });
    }
    if (path.endsWith('/upload')) { uploads++; return json(route, { id: mediaId, mediaId, status: 'uploaded' }); }
    if (path.endsWith('/finalize')) {
      finalizes++;
      if (outcome === 'rejected') return json(route, { id: mediaId, mediaId, status: 'rejected' });
      if (finalizes === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Media moderation is temporarily unavailable', errors: ['media_moderation_unavailable'] }) });
      return json(route, { id: mediaId, mediaId, status: 'approved', mimeType: 'image/png', size: image.length, url: `/api/media/${mediaId}/content?token=synthetic.signed` });
    }
    return route.fulfill({ status: 200, contentType: 'image/png', body: image });
  });
  await page.route('**/api/posts', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    publications++; const payload = route.request().postDataJSON(); expect(payload.mediaIds).toEqual([mediaId]); expect(payload.images).toBeUndefined();
    return json(route, post(payload.content, '292d72b6-6bd1-4693-91e8-b4dc32302c7c'));
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Create a post' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Create post' });
  await dialog.getByRole('textbox', { name: 'Write a post' }).fill('Keep this media draft until approval.');
  await dialog.locator('#post-content-category').selectOption('technology');
  await dialog.locator('input[type=file]').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: image });
  await dialog.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Post', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('textbox', { name: 'Write a post' })).toHaveValue('Keep this media draft until approval.');
  expect(publications).toBe(0); expect(prepares).toBe(1); expect(uploads).toBe(1);
  if (outcome === 'retry') {
    await dialog.getByRole('button', { name: 'Post', exact: true }).click(); await expect(dialog).toBeHidden();
    expect(publications).toBe(1); expect(prepares).toBe(1); expect(uploads).toBe(1); expect(finalizes).toBe(2);
  }
});

test('a story retry reuses its created Highlight and approved voice/cover without losing the draft', async ({ page }) => {
  await installApiBoundary(page);
  const voice = readFileSync(new URL('./fixtures/delivery.wav', import.meta.url));
  const cover = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const voiceId = '40000000-0000-4000-8000-000000000191', coverId = '40000000-0000-4000-8000-000000000192';
  const highlightId = '50000000-0000-4000-8000-000000000191';
  let prepares = 0, uploads = 0, finalizes = 0, highlightCreates = 0;
  const publications: Array<Record<string, unknown>> = [];
  const highlights: Array<{ id: string; ownerId: string; title: string; coverUrl: string; storyIds: string[]; createdAt: string; updatedAt: string }> = [];
  await page.route('**/api/media/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/presign')) {
      prepares++;
      const payload = route.request().postDataJSON();
      expect(['story', 'highlight']).toContain(payload.purpose);
      const id = payload.purpose === 'story' ? voiceId : coverId;
      expect(payload).toMatchObject({ mimeType: id === voiceId ? 'audio/wav' : 'image/png', size: id === voiceId ? voice.length : cover.length });
      return json(route, { id, mediaId: id, status: 'pending', purpose: payload.purpose, mimeType: payload.mimeType, maxFileSize: payload.purpose === 'story' ? 10 * 1024 * 1024 : 2 * 1024 * 1024, mode: 'server', uploadUrl: `/api/media/${id}/upload` });
    }
    const id = path.includes(voiceId) ? voiceId : coverId;
    if (path.endsWith('/upload')) { uploads++; return json(route, { id, mediaId: id, status: 'uploaded' }); }
    if (path.endsWith('/finalize')) {
      finalizes++;
      return json(route, { id, mediaId: id, status: 'approved', mimeType: id === voiceId ? 'audio/wav' : 'image/png', size: id === voiceId ? voice.length : cover.length, ...(id === voiceId ? { duration: 1 } : {}), url: `/api/media/${id}/content?token=synthetic.signed` });
    }
    return fulfillSeekableMedia(route, id === voiceId ? voice : cover, id === voiceId ? 'audio/wav' : 'image/png');
  });
  await page.route('**/api/highlights', async route => {
    if (route.request().method() === 'GET') return json(route, highlights);
    highlightCreates++;
    const payload = route.request().postDataJSON();
    expect(payload).toEqual({ title: 'Field notes', coverMediaId: coverId });
    const created = { id: highlightCreates === 1 ? highlightId : '50000000-0000-4000-8000-000000000192', ownerId: user.id, title: payload.title, coverUrl: `/api/media/${coverId}/content?token=synthetic.signed`, storyIds: [], createdAt: user.createdAt, updatedAt: user.createdAt };
    highlights.push(created);
    return json(route, created);
  });
  await page.route('**/api/stories', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const payload = route.request().postDataJSON();
    publications.push(payload);
    if (publications.length === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Story publication is temporarily unavailable', errors: ['story_unavailable'] }) });
    return json(route, { ...payload, id: '60000000-0000-4000-8000-000000000191', authorId: user.id, mediaUrl: `/api/media/${voiceId}/content?token=synthetic.signed`, createdAt: user.createdAt, expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add a story', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Voice Story', exact: true }).click();
  await dialog.locator('#story-voice-file').setInputFiles({ name: 'draft-voice.wav', mimeType: 'audio/wav', buffer: voice });
  await dialog.getByPlaceholder('Add an optional caption…').fill('Keep this voice and caption for retry.');
  await dialog.locator('#story-content-category').selectOption('technology');
  await dialog.getByText('Highlight destination', { exact: true }).locator('..').locator('select').selectOption('new');
  await dialog.getByRole('textbox', { name: 'New Highlight name' }).fill('Field notes');
  await dialog.locator('#highlight-cover').setInputFiles({ name: 'draft-cover.png', mimeType: 'image/png', buffer: cover });
  const publish = dialog.getByRole('button', { name: 'Share Story Live', exact: true });
  await publish.click();
  await expect(publish).toBeEnabled();
  await expect(dialog.getByPlaceholder('Add an optional caption…')).toHaveValue('Keep this voice and caption for retry.');
  await expect(dialog.locator('label[for="story-voice-file"]')).toContainText('draft-voice.wav');
  expect(highlightCreates).toBe(1);
  await publish.click();
  await expect(dialog).toBeHidden();
  expect(highlightCreates).toBe(1);
  expect(prepares).toBe(2); expect(uploads).toBe(2); expect(finalizes).toBe(2);
  expect(publications).toHaveLength(2);
  for (const payload of publications) {
    expect(payload).toMatchObject({ mediaId: voiceId, textContent: 'Keep this voice and caption for retry.', highlightId, highlightTitle: 'Field notes' });
    expect(payload.mediaUrl).toBeUndefined();
  }
});

test('Studio Post captures camera pixels as a bounded approved JPEG and rejects video-mode carryover', async ({ page }) => {
  await installApiBoundary(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
      const camera = document.createElement('canvas');
      camera.width = 640; camera.height = 480;
      const context = camera.getContext('2d')!;
      const paint = () => { context.fillStyle = 'rgb(25,163,74)'; context.fillRect(0, 0, camera.width, camera.height); };
      paint();
      const timer = setInterval(paint, 100);
      const stream = camera.captureStream(10);
      for (const track of stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); stop(); };
      }
      return stream;
    } });
  });
  const reel = { id: '30000000-0000-4000-8000-000000000141', authorId: user.id, title: 'Synthetic camera entry', videoUrl: 'https://example.test/reel.mp4', thumbnailUrl: 'https://example.test/reel.jpg', type: 'short', views: 0, likes: 0, createdAt: user.createdAt };
  await page.route('**/api/videos', route => json(route, [reel]));
  await page.route(`**/api/videos/${reel.id}/comments`, route => json(route, []));
  const mediaId = '40000000-0000-4000-8000-000000000141';
  let prepares = 0, finalizes = 0, publications = 0, declaredSize = 0;
  let uploadedJpeg: Buffer | undefined;
  let release!: () => void;
  const moderation = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/media/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/presign')) {
      prepares++;
      const payload = route.request().postDataJSON();
      expect(payload.purpose).toBe('post'); expect(payload.mimeType).toBe('image/jpeg'); expect(payload.filename).toMatch(/\.jpg$/);
      declaredSize = payload.size;
      expect(declaredSize).toBeGreaterThan(0); expect(declaredSize).toBeLessThanOrEqual(5 * 1024 * 1024);
      return json(route, { id: mediaId, mediaId, status: 'pending', purpose: 'post', mimeType: 'image/jpeg', maxFileSize: 5 * 1024 * 1024, mode: 'server', uploadUrl: `/api/media/${mediaId}/upload` });
    }
    if (path.endsWith('/upload')) {
      const multipart = route.request().postDataBuffer()!;
      const start = multipart.indexOf(Buffer.from([255, 216, 255]));
      const end = multipart.lastIndexOf(Buffer.from([255, 217])) + 2;
      expect(start).toBeGreaterThanOrEqual(0); expect(end).toBeGreaterThan(start);
      uploadedJpeg = multipart.subarray(start, end);
      expect(uploadedJpeg.length).toBe(declaredSize);
      return json(route, { id: mediaId, mediaId, status: 'uploaded' });
    }
    if (path.endsWith('/finalize')) {
      finalizes++;
      await moderation;
      return json(route, { id: mediaId, mediaId, status: 'approved', mimeType: 'image/jpeg', size: declaredSize, url: `/api/media/${mediaId}/content?token=synthetic.signed` });
    }
    if (path.endsWith('/content')) return route.fulfill({ contentType: 'image/jpeg', body: uploadedJpeg! });
    throw new Error(`Unexpected Studio media request: ${path}`);
  });
  await page.route('**/api/posts', route => {
    const payload = route.request().postDataJSON();
    expect(payload.mediaIds).toEqual([mediaId]); expect(payload.images).toBeUndefined();
    publications++;
    return json(route, { ...post(payload.content, '50000000-0000-4000-8000-000000000141'), images: [`/api/media/${mediaId}/content?token=synthetic.signed`] });
  });
  await page.goto('/videos');
  await page.getByRole('button', { name: 'Watch Synthetic camera entry', exact: true }).click();
  await page.getByRole('button', { name: 'Use this sound', exact: true }).click();
  const studio = page.getByRole('dialog').filter({ hasText: 'Ultra Studio Camera' });
  await studio.locator('#studio-content-category').selectOption('technology');
  await expect(studio.getByRole('button', { name: /Publish REEL/ })).toBeDisabled();
  await expect(studio.getByRole('button', { name: 'Record video', exact: true })).toBeEnabled();
  await studio.getByRole('button', { name: 'Record video', exact: true }).click();
  await expect(studio.getByRole('button', { name: 'Photo Post mode', exact: true })).toBeDisabled();
  await expect(studio.getByRole('button', { name: 'Record video', exact: true })).toBeDisabled();
  await expect(studio.getByText('REC 1s / 30s', { exact: true })).toBeVisible();
  await studio.getByRole('button', { name: 'Stop recording', exact: true }).click();
  await expect(studio.getByRole('button', { name: /Publish REEL/ })).toBeEnabled();
  await studio.getByRole('button', { name: 'Photo Post mode', exact: true }).click();
  await expect(studio.getByRole('button', { name: /Publish POST/ })).toBeDisabled();
  await studio.getByRole('button', { name: 'Capture photo', exact: true }).click();
  await expect(studio.getByRole('img', { name: 'Captured Post photo', exact: true })).toBeVisible();
  await expect(studio.getByRole('button', { name: /Publish POST/ })).toBeEnabled();
  await studio.getByRole('button', { name: /Publish POST/ }).click();
  await expect.poll(() => finalizes).toBe(1);
  expect(publications).toBe(0); expect(prepares).toBe(1);
  await expect(studio.getByRole('button', { name: 'Photo Post mode', exact: true })).toBeDisabled();
  await expect(studio.getByRole('button', { name: 'Capture photo', exact: true })).toBeDisabled();
  const actualFrame = await page.evaluate(async encoded => {
    const bytes = Uint8Array.from(atob(encoded), value => value.charCodeAt(0));
    const image = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const pixel = Array.from(context.getImageData(50, 50, 1, 1).data);
    image.close();
    return { width: canvas.width, height: canvas.height, pixel };
  }, uploadedJpeg!.toString('base64'));
  expect([actualFrame.width, actualFrame.height]).toEqual([640, 480]);
  expect(actualFrame.width * actualFrame.height).toBeLessThanOrEqual(12_000_000);
  expect(Math.max(actualFrame.width, actualFrame.height)).toBeLessThanOrEqual(4096);
  for (const [index, value] of [25, 163, 74].entries()) expect(Math.abs(actualFrame.pixel[index] - value)).toBeLessThan(5);
  release();
  await expect(studio).toBeHidden();
  expect(publications).toBe(1);
});

async function openCancellationStudio(page: Page) {
  const reel = { id: '30000000-0000-4000-8000-000000000142', authorId: user.id, title: 'Camera lifecycle entry', videoUrl: 'https://example.test/lifecycle.mp4', thumbnailUrl: 'https://example.test/lifecycle.jpg', type: 'short', views: 0, likes: 0, createdAt: user.createdAt };
  await page.route('**/api/videos', route => json(route, [reel]));
  await page.route(`**/api/videos/${reel.id}/comments`, route => json(route, []));
  if (!page.url().endsWith('/videos')) await page.goto('/videos');
  await page.getByRole('button', { name: 'Watch Camera lifecycle entry', exact: true }).click();
  await page.getByRole('button', { name: 'Use this sound', exact: true }).click();
  return page.getByRole('dialog').filter({ hasText: 'Ultra Studio Camera' });
}

test('Studio cancels permission results after close, camera flip and route unmount', async ({ page }) => {
  await installApiBoundary(page);
  await page.addInitScript(() => {
    const harness = { pending: [] as Array<(stream: MediaStream) => void>, streams: [] as MediaStream[] };
    (window as any).__cameraHarness = harness;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: () => new Promise<MediaStream>(resolve => { harness.pending.push(resolve); }) });
    (window as any).__resolveCamera = (index: number) => {
      const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 40;
      canvas.getContext('2d')!.fillRect(0, 0, 40, 40);
      const stream = canvas.captureStream(10);
      harness.streams[index] = stream;
      harness.pending[index](stream);
    };
  });
  const studio = await openCancellationStudio(page);
  await expect.poll(() => page.evaluate(() => (window as any).__cameraHarness.pending.length)).toBe(1);
  await studio.getByRole('button', { name: 'Close Studio Camera', exact: true }).click();
  await page.evaluate(() => (window as any).__resolveCamera(0));
  await expect.poll(() => page.evaluate(() => (window as any).__cameraHarness.streams[0].getTracks().every((track: MediaStreamTrack) => track.readyState === 'ended'))).toBe(true);
  await page.getByRole('button', { name: 'Use this sound', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__cameraHarness.pending.length)).toBe(2);
  await studio.getByRole('button', { name: 'Flip Camera', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__cameraHarness.pending.length)).toBe(3);
  await page.evaluate(() => (window as any).__resolveCamera(1));
  await expect.poll(() => page.evaluate(() => (window as any).__cameraHarness.streams[1].getTracks().every((track: MediaStreamTrack) => track.readyState === 'ended'))).toBe(true);
  await page.evaluate(() => (window as any).__resolveCamera(2));
  await expect(studio.getByRole('button', { name: 'Record video', exact: true })).toBeEnabled();
  await studio.getByRole('button', { name: 'Flip Camera', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__cameraHarness.pending.length)).toBe(4);
  await expect.poll(() => page.evaluate(() => (window as any).__cameraHarness.streams[2].getTracks().every((track: MediaStreamTrack) => track.readyState === 'ended'))).toBe(true);
  await page.evaluate(() => { window.history.pushState(null, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(studio).toBeHidden();
  await page.evaluate(() => (window as any).__resolveCamera(3));
  await expect.poll(() => page.evaluate(() => (window as any).__cameraHarness.streams[3].getTracks().every((track: MediaStreamTrack) => track.readyState === 'ended'))).toBe(true);
});

test('Studio timer stop, recording close and obsolete preview cleanup preserve capture boundaries', async ({ page }) => {
  await installApiBoundary(page);
  await page.addInitScript(() => {
    const streams: MediaStream[] = [];
    (window as any).__cameraStreams = streams;
    (window as any).__studioUrls = { created: [] as string[], revoked: [] as string[] };
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); (window as any).__studioUrls.created.push(url); return url; };
    URL.revokeObjectURL = url => { (window as any).__studioUrls.revoked.push(url); revoke(url); };
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
      const paint = () => { const context = canvas.getContext('2d')!; context.fillStyle = 'green'; context.fillRect(0, 0, 320, 240); };
      paint(); const timer = setInterval(paint, 100);
      const stream = canvas.captureStream(10); streams.push(stream);
      for (const track of stream.getTracks()) { const stop = track.stop.bind(track); track.stop = () => { clearInterval(timer); stop(); }; }
      return stream;
    } });
  });
  const studio = await openCancellationStudio(page);
  await studio.locator('#studio-content-category').selectOption('technology');
  await studio.getByRole('button', { name: 'Record video', exact: true }).click();
  await expect(studio.getByText('REC 1s / 30s', { exact: true })).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(30_000);
  await expect(studio.getByRole('button', { name: 'Stop recording', exact: true })).toHaveCount(0);
  await expect(studio.getByRole('button', { name: /Publish REEL/ })).toBeEnabled();
  const videoUrl = await page.evaluate(() => (window as any).__studioUrls.created.at(-1));
  await studio.getByRole('button', { name: 'Photo Post mode', exact: true }).click();
  await expect(studio.getByRole('button', { name: /Publish POST/ })).toBeDisabled();
  await expect.poll(() => page.evaluate(url => (window as any).__studioUrls.revoked.includes(url), videoUrl)).toBe(true);
  await studio.getByRole('button', { name: 'Capture photo', exact: true }).click();
  await expect(studio.getByRole('img', { name: 'Captured Post photo', exact: true })).toBeVisible();
  const photoUrl = await page.evaluate(() => (window as any).__studioUrls.created.at(-1));
  await studio.getByRole('button', { name: 'Video Reel mode', exact: true }).click();
  await expect.poll(() => page.evaluate(url => (window as any).__studioUrls.revoked.includes(url), photoUrl)).toBe(true);
  await studio.getByRole('button', { name: 'Record video', exact: true }).click();
  await expect(studio.getByRole('button', { name: 'Stop recording', exact: true })).toBeVisible();
  await studio.getByRole('button', { name: 'Close Studio Camera', exact: true }).click();
  await expect(studio).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).__cameraStreams.every((stream: MediaStream) => stream.getTracks().every(track => track.readyState === 'ended')))).toBe(true);
});

test('Studio permission denial keeps recording and publication unavailable', async ({ page }) => {
  await installApiBoundary(page);
  await page.addInitScript(() => Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); } }));
  const studio = await openCancellationStudio(page);
  await expect(studio.getByRole('heading', { name: 'Camera unavailable', exact: true })).toBeVisible();
  await expect(studio.getByRole('button', { name: 'Record video', exact: true })).toBeDisabled();
  await studio.locator('#studio-content-category').selectOption('technology');
  await expect(studio.getByRole('button', { name: /Publish REEL/ })).toBeDisabled();
  await studio.getByRole('button', { name: 'Photo Post mode', exact: true }).click();
  await expect(studio.getByRole('button', { name: 'Capture photo', exact: true })).toBeDisabled();
  await expect(studio.getByRole('button', { name: /Publish POST/ })).toBeDisabled();
});

for (const mode of ['reel', 'story'] as const) test(`Studio ${mode} publishes only its approved camera video`, async ({ page }) => {
  await installApiBoundary(page);
  await page.addInitScript(() => Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
    const paint = () => { canvas.getContext('2d')!.fillRect(0, 0, 320, 240); };
    paint(); const timer = setInterval(paint, 100); const stream = canvas.captureStream(10);
    for (const track of stream.getTracks()) { const stop = track.stop.bind(track); track.stop = () => { clearInterval(timer); stop(); }; }
    return stream;
  } }));
  const mediaId = '40000000-0000-4000-8000-000000000143';
  let finalizes = 0, declaredSize = 0, publications = 0;
  let mimeType = '';
  let release!: () => void;
  const moderation = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/media/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/presign')) {
      const payload = route.request().postDataJSON(); declaredSize = payload.size; mimeType = payload.mimeType;
      expect(payload.purpose).toBe(mode === 'reel' ? 'video' : 'story');
      expect(['video/webm', 'video/mp4']).toContain(payload.mimeType);
      expect(payload.filename).toMatch(/\.(webm|mp4)$/); expect(declaredSize).toBeGreaterThan(0);
      return json(route, { id: mediaId, mediaId, status: 'pending', purpose: payload.purpose, mimeType, maxFileSize: 10 * 1024 * 1024, mode: 'server', uploadUrl: `/api/media/${mediaId}/upload` });
    }
    if (path.endsWith('/upload')) { expect(route.request().postDataBuffer()!.length).toBeGreaterThan(declaredSize); return json(route, { id: mediaId, mediaId, status: 'uploaded' }); }
    if (path.endsWith('/finalize')) { finalizes++; await moderation; return json(route, { id: mediaId, mediaId, status: 'approved', mimeType, size: declaredSize, url: `/api/media/${mediaId}/content?token=synthetic.signed`, thumbnailUrl: `/api/media/${mediaId}/content?token=synthetic.poster&variant=poster` }); }
    if (path.endsWith('/content')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=', 'base64') });
    throw new Error(`Unexpected Studio video media request: ${path}`);
  });
  const studio = await openCancellationStudio(page);
  if (mode === 'story') await studio.getByRole('button', { name: 'Video Story mode', exact: true }).click();
  await studio.locator('#studio-content-category').selectOption('technology');
  await page.route('**/api/videos/50000000-0000-4000-8000-000000000143/comments', route => json(route, []));
  await page.route(`**/api/${mode === 'reel' ? 'videos' : 'stories'}`, route => {
    expect(route.request().method()).toBe('POST'); const payload = route.request().postDataJSON();
    expect(payload.mediaId).toBe(mediaId); expect(payload.mediaUrl).toBeUndefined(); expect(payload.videoUrl).toBeUndefined();
    expect(payload.contentCategory).toBe('technology'); expect(payload.type).toBe(mode === 'reel' ? 'short' : 'video'); publications++;
    return json(route, { id: '50000000-0000-4000-8000-000000000143', authorId: user.id, ...payload, mediaUrl: `/api/media/${mediaId}/content?token=synthetic.signed`, videoUrl: `/api/media/${mediaId}/content?token=synthetic.signed`, createdAt: user.createdAt, expiresAt: '2026-08-29T09:00:00.000Z', views: [], likes: 0 });
  });
  await studio.getByRole('button', { name: 'Record video', exact: true }).click();
  await expect(studio.getByText('REC 1s / 30s', { exact: true })).toBeVisible();
  const stop = studio.getByRole('button', { name: 'Stop recording', exact: true });
  await stop.focus(); await stop.press('Enter');
  const publish = studio.getByRole('button', { name: new RegExp(`Publish ${mode.toUpperCase()}`) });
  await expect(publish).toBeEnabled(); await publish.click();
  await expect.poll(() => finalizes).toBe(1); expect(publications).toBe(0);
  await expect(studio.getByRole('button', { name: 'Photo Post mode', exact: true })).toBeDisabled();
  release(); await expect(studio).toBeHidden(); expect(publications).toBe(1);
});

for (const width of [390, 1280]) test(`grievance receipts and keyboard tracking expose public status only at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installApiBoundary(page);
  const receipt = { ticketId: 'YT-GRV-ABCDEF1234', status: 'received', createdAt: user.createdAt };
  await page.route('**/api/reports/grievance', route => json(route, receipt));
  await page.route(`**/api/reports/grievance/${receipt.ticketId}`, route => json(route, { ...receipt, status: 'under_review' }));
  await page.goto('/grievance');
  await page.getByRole('button', { name: 'Submit Grievance to Redressal Officer' }).click();
  await expect(page.getByLabel('Your Full Name *', { exact: true })).toBeFocused();
  await expect(page.getByRole('alert').filter({ hasText: 'A few details need attention.' })).toBeVisible();
  await page.getByLabel('Your Full Name *', { exact: true }).fill('Private Reporter');
  await page.getByLabel('Email Address *', { exact: true }).fill('private@example.test');
  await page.getByLabel('Reported Post / Reel / Profile URL *', { exact: true }).fill('@private-test');
  await page.getByLabel('Detailed Description & Evidence *', { exact: true }).fill('Private report explanation for the staff review queue.');
  const submit = page.getByRole('button', { name: 'Submit Grievance to Redressal Officer' });
  await submit.focus(); await submit.press('Enter');
  await expect(page.getByRole('heading', { name: 'Grievance Ticket Acknowledged', exact: true })).toBeVisible();
  await expect(page.getByText(receipt.ticketId, { exact: true })).toBeVisible();
  await expect(page.getByText(/Statutory SLA|Resolution SLA/)).toHaveCount(0);
  const trackTab = page.getByRole('button', { name: 'Track Existing Ticket', exact: true });
  await trackTab.focus(); await trackTab.press('Enter');
  await page.getByLabel('Ticket ID', { exact: true }).fill(receipt.ticketId);
  await page.getByLabel('Ticket ID', { exact: true }).press('Enter');
  await expect(page.getByText('under review', { exact: true })).toBeVisible();
  await expect(page.getByText('This page shows your ticket status. Reporter details and internal review notes remain private.', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

const premiumPlan = { key: 'yor-premium:synthetic-browser-1', name: 'Yor Premium', priceMinor: 19900, currency: 'INR', durationDays: 30,
  features: ['MESSAGE_FONT', 'STORY_FONT'], termsVersion: 'synthetic-browser-1', refundPolicy: 'Synthetic browser-test policy only. Contact test support for a refund request.' };

for (const width of [390, 1280]) test(`Creator billing recovery and cancellation at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await installApiBoundary(page);
  let items = [{ checkoutId: '1eb84e0d-9bdb-4fca-8fe4-12f5ea0d727b', product: 'membership', providerOrderId: null,
    status: 'provider_pending', providerState: 'creation_unknown', lastPaymentStatus: null, amountMinor: 4900, currency: 'INR',
    createdAt: '2026-09-26T12:00:00.000Z', subscriptionId: '8a8c7e60-9af3-40e5-ac25-1988b7980da2', keyId: 'rzp_test_browser' }];
  let cancellations = 0;
  await page.route('**/api/billing/checkouts**', async route => {
    const path = new URL(route.request().url()).pathname, method = route.request().method();
    if (path === '/api/billing/checkouts' && method === 'GET') return json(route, items);
    if (path.endsWith('/recover') && method === 'POST') { items = items.map(item => ({ ...item, status: 'paid', providerState: 'created' })); return json(route, items); }
    if (path.endsWith('/cancel') && method === 'POST') { cancellations++; return json(route, items); }
    throw new Error(`Unexpected checkout fixture request: ${method} ${path}`);
  });
  await page.goto('/billing');
  await expect(page.getByRole('heading', { name: 'Payment history', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue payment' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Recover payment status' }).click();
  await expect(page.getByText('paid', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'End membership at expiry' }).click();
  await expect.poll(() => cancellations).toBe(1);
  await expect(page.getByRole('link', { name: 'Yor Premium plans and billing' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});

test('Creator billing contains malformed history and retries', async ({ page }) => {
  await installApiBoundary(page); let calls = 0;
  await page.route('**/api/billing/checkouts', route => json(route, ++calls === 1 ? [{ product: 'wrong' }] : []));
  await page.goto('/billing');
  await expect(page.getByRole('alert').filter({ hasText: 'could not load' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry history' }).click();
  await expect(page.getByText('No creator payments yet.')).toBeVisible();
});

test('Payment operations requires an administrator in the UI', async ({ page }) => {
  await installApiBoundary(page); await page.goto('/payment-operations');
  await expect(page.getByText('Administrator access is required.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry failed job' })).toHaveCount(0);
});

test('Payment operations records a reason before retry and retains failures for review', async ({ page }) => {
  await installApiBoundary(page, {...user,role:'admin'});
  await page.setViewportSize({width:390,height:900});
  const data={jobs:[{id:'c3519578-4b5a-4893-8ef6-0283c291981e',kind:'dispute_reconcile',status:'dead',attempts:8,last_error:'operation_failed'}],
    disputes:[{id:'disp_testBrowser',product:'premium',status:'open',amount_minor:19900,amount_deducted:0,currency:'INR',respond_by:'2099-10-01T00:00:00.000Z',checked_at:'2026-09-26T12:00:00.000Z'}],
    checkouts:[],events:[],exposure:[]};
  let tries=0;
  await page.route('**/api/operations/payments**',async route=>{
    if(route.request().method()==='GET')return json(route,data);
    expect(route.request().postDataJSON().reason).toBe('Provider connection restored');
    tries++;
    if(tries===1)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Payment operations are temporarily unavailable'})});
    data.jobs[0].status='pending';return json(route,data);
  });
  await page.goto('/payment-operations');
  const retry=page.getByRole('button',{name:'Retry failed job'});
  await expect(retry).toBeDisabled();
  await page.getByLabel('Reason for reconciliation or retry').fill('Provider connection restored');
  await retry.click();await expect(page.getByRole('alert').filter({hasText:'temporarily unavailable'})).toBeVisible();
  await retry.click();await expect(retry).toHaveCount(0);expect(tries).toBe(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});
const premiumOrder = { id: '962a9d20-cbe9-45ef-873b-772eaa991670', providerOrderId: 'order_browserSynthetic', amountMinor: 19900, currency: 'INR',
  status: 'created', lastPaymentStatus: null as string | null, createdAt: '2026-09-26T00:00:00.000Z', paidAt: null as string | null, plan: premiumPlan, keyId: 'rzp_test_browser' };
function premiumState(status: string) {
  const purchased = ['active', 'cancelled', 'expired', 'refunded', 'disputed', 'chargeback'].includes(status);
  return { catalog: { available: true, plan: premiumPlan, operationalFeatures: { MESSAGE_FONT: true, STORY_FONT: true }, automaticRenewal: false,
    billingModel: 'prepaid_fixed_term', testMode: true, supportEmail: 'support@example.test' },
    subscription: purchased ? { order_id: premiumOrder.id, starts_at: '2026-09-01T00:00:00.000Z', ends_at: status === 'expired' ? '2026-09-02T00:00:00.000Z' : '2099-10-01T00:00:00.000Z', cancel_at_period_end: status === 'cancelled', status } : null,
    orders: status === 'free' || status === 'overridden' ? [] : [{ ...premiumOrder, status: purchased ? ['refunded','disputed','chargeback'].includes(status) ? status : 'paid' : 'created', lastPaymentStatus: status === 'failed' ? 'failed' : purchased ? 'captured' : null, paidAt: purchased ? '2026-09-26T00:00:00.000Z' : null }],
    enabledFeatures: { MESSAGE_FONT: ['active','cancelled','overridden'].includes(status) } };
}

for (const status of ['free', 'active', 'pending', 'failed', 'expired', 'cancelled', 'refunded', 'disputed', 'chargeback', 'overridden']) {
  test(`Premium billing presents ${status} state with free safety controls`, async ({ page }) => {
    await installApiBoundary(page);
    if (['expired','cancelled','overridden'].includes(status)) await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/premium/me', route => json(route, premiumState(status)));
    await page.goto('/premium');
    await expect(page.getByRole('heading', { name: 'Yor Premium', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your plan', exact: true })).toBeVisible();
    await expect(page.getByText('Posting, standard Stories and messages, basic privacy, blocking, reporting, export and account deletion are free.')).toBeVisible();
    if (status === 'overridden') await expect(page.getByText(/authorized feature override/)).toBeVisible();
    if (status === 'pending') await expect(page.getByRole('button', { name: 'Recover payment', exact: true })).toBeVisible();
    if (status === 'failed') await expect(page.getByText(/last payment attempt failed/)).toBeVisible();
    if (status === 'cancelled') await expect(page.getByText(/Cancellation recorded/)).toBeVisible();
    if (status === 'expired' || status === 'refunded') await expect(page.getByText(`Free account · ${status}`, { exact: true })).toBeVisible();
    if (['disputed','chargeback'].includes(status)) { await expect(page.getByText(/Premium access is paused/)).toBeVisible(); await expect(page.getByRole('button', { name: 'Upgrade to Yor Premium' })).toHaveCount(0); }
    if (status === 'active') await expect(page.getByText('Yor Premium · active', { exact: true })).toBeVisible();
    if (status === 'free') {
      await expect(page.getByRole('button', { name: 'Upgrade to Yor Premium' })).toBeDisabled();
      await page.getByRole('checkbox').check();
      await expect(page.getByRole('button', { name: 'Upgrade to Yor Premium' })).toBeEnabled();
      const violations = await new AxeBuilder({ page }).include('main').withTags(['wcag2a','wcag2aa']).analyze();
      expect(violations.violations).toEqual([]);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('Premium checkout accepts configured terms, handles failure, recovers payment and cancels the paid term', async ({ page }) => {
  await installApiBoundary(page);
  let state = premiumState('free'), created = 0;
  await page.route('**/api/premium/**', async route => {
    const path = new URL(route.request().url()).pathname, method = route.request().method();
    if (path === '/api/premium/me' && method === 'GET') return json(route, state);
    if (path === '/api/premium/orders' && method === 'POST') {
      const body = route.request().postDataJSON();
      expect(body.acceptedPriceMinor).toBe(19900); expect(body.acceptedTermsVersion).toBe(premiumPlan.termsVersion);
      expect(body.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
      created++; state = premiumState('pending'); return json(route, premiumOrder);
    }
    if (path === `/api/premium/orders/${premiumOrder.id}/recover` && method === 'POST') { state = premiumState('active'); return json(route, state); }
    if (path === `/api/premium/orders/${premiumOrder.id}/cancel` && method === 'POST') { state = premiumState('cancelled'); return json(route, state); }
    throw new Error(`Unexpected Premium fixture request: ${method} ${path}`);
  });
  await page.addInitScript(() => {
    (window as any).Razorpay = class {
      failed?: () => void;
      on(_event: string, callback: () => void) { this.failed = callback; }
      open() { this.failed?.(); }
    };
  });
  await page.goto('/premium');
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Upgrade to Yor Premium' }).click();
  await expect(page.getByRole('alert')).toContainText('Payment did not complete');
  await page.getByRole('button', { name: 'Recover payment', exact: true }).click();
  await expect(page.getByText('Yor Premium · active', { exact: true })).toBeVisible();
  expect(created).toBe(1);
  await page.getByRole('button', { name: 'Cancel at end of term' }).click();
  await expect(page.getByText('Yor Premium · cancelled', { exact: true })).toBeVisible();
  await expect(page.getByText('Cancellation recorded. Your paid access remains until the date above.')).toBeVisible();
});

test('Premium billing rejects malformed responses and recovers with a retry', async ({ page }) => {
  await installApiBoundary(page);
  let calls = 0;
  await page.route('**/api/premium/me', route => json(route, ++calls === 1 ? { catalog: [] } : premiumState('free')));
  await page.goto('/premium');
  await expect(page.getByRole('alert')).toContainText('Billing details could not be verified');
  await page.getByRole('button', { name: 'Retry billing' }).click();
  await expect(page.getByRole('button', { name: 'Upgrade to Yor Premium' })).toBeVisible();
});

test('two tabs serialize HttpOnly cookie rotation without dropping either restored session', async ({ page, context, baseURL }) => {
  const second = await context.newPage();
  await installApiBoundary(page);
  await installApiBoundary(second);
  await context.addCookies([{ name: 'testRefreshVersion', value: '0', url: baseURL!, httpOnly: true, sameSite: 'Lax' }]);
  let version = 0, active = 0, maximum = 0, rotations = 0;
  const rotate = async (route: Route) => {
    active++; maximum = Math.max(maximum, active);
    try {
      expect(route.request().headers().cookie).toContain(`testRefreshVersion=${version}`);
      // Keep one real browser request pending while the other tab starts.
      await new Promise(resolve => setTimeout(resolve, 150));
      rotations++; version++;
      await route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'Set-Cookie': `testRefreshVersion=${version}; HttpOnly; SameSite=Lax; Path=/` },
        body: JSON.stringify({ success: true, data: { accessToken: `synthetic-access-${version}` } }) });
    } finally { active--; }
  };
  await page.route('**/api/auth/refresh', rotate);
  await second.route('**/api/auth/refresh', rotate);
  await Promise.all([page.goto('/'), second.goto('/')]);
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
  await expect(second.getByRole('heading', { name: 'Home' })).toBeVisible();
  expect(rotations).toBe(2);
  expect(maximum).toBe(1);
  await second.close();
});

test('malformed optional Premium catalog leaves privacy controls usable and supports retry', async ({ page }) => {
  await installApiBoundary(page);
  let malformed = true;
  await page.route('**/api/users/me/premium-profile', route => malformed ? json(route, []) : route.fallback());
  await page.goto('/settings');
  await expect(page.getByText('Your privacy settings remain available.', { exact: false })).toBeVisible();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  malformed = false;
  await page.getByRole('button', { name: 'Retry Premium options' }).click();
  await expect(page.getByRole('combobox', { name: 'Bio style' })).toBeVisible();
});

test("restores the social shell, publishes a post, and navigates discovery", async ({ page }) => {
  await installApiBoundary(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("article").getByText("A real signal delivered through the feed boundary.")).toBeVisible();

  await page.getByRole("button", { name: "Create a post" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Create post" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Write a post" }).fill("Browser-tested publishing works end to end.");
  await dialog.locator("#post-content-category").selectOption("technology");
  await dialog.getByRole("button", { name: "Post", exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("article").getByText("Browser-tested publishing works end to end.")).toBeVisible();

  await page.getByRole("button", { name: "Explore", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
});

test('feed failures show a retry, never a false empty-success state', async ({ page }) => {
  await installApiBoundary(page);
  let unavailable = true;
  await page.route('**/api/feed?*', async (route) => {
    if (unavailable) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Feed temporarily unavailable', errors: [] }) });
    return json(route, [post('The recovered feed is here.', 'recover-post')]);
  });
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'Feed temporarily unavailable' })).toBeVisible();
  await expect(page.getByText('You are all caught up.')).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry feed' }).click();
  await expect(page.getByRole('article').getByText('The recovered feed is here.')).toBeVisible();
});

test('feed loading is announced while the first response is pending', async ({ page }) => {
  await installApiBoundary(page);
  let releaseFeed!: () => void;
  const feedPending = new Promise<void>((resolve) => { releaseFeed = resolve; });
  await page.route('**/api/feed?*', async (route) => {
    await feedPending;
    return json(route, [post('The delayed feed arrived.', 'delayed-feed-post')]);
  });

  await page.goto('/');
  try {
    await expect(page.getByRole('status', { name: 'Loading feed' })).toBeVisible();
  } finally {
    releaseFeed();
  }
  await expect(page.getByRole('article').getByText('The delayed feed arrived.')).toBeVisible();
});

test('posts survive unavailable author profiles and recover without hook errors', async ({ page }) => {
  await installApiBoundary(page);
  const authorId = '10000000-0000-4000-8000-000000000007';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let unavailable = true;
  await page.route('**/api/feed?*', (route) => json(route, [{ ...post('A post from a new creator.', 'author-post'), authorId }]));
  await page.route(`**/api/users/${authorId}`, (route) => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Temporarily unavailable' }) })
    : json(route, { ...user, id: authorId, username: 'maya', fullName: 'Maya Chen' }));
  await page.goto('/');
  await expect(page.getByRole('article').getByText('A post from a new creator.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry creator details' })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Retry creator details' }).click();
  await expect(page.getByRole('article').getByRole('link', { name: 'Maya Chen', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('outgoing messages never increase the unread conversation badge', async ({ page }) => {
  await installApiBoundary(page);
  const other = '10000000-0000-4000-8000-000000000009';
  await page.route('**/api/conversations', (route) => json(route, ['incoming', 'outgoing'].map((id) => ({
    conversation: { id, participantA: user.id, participantB: other, participantIds: [user.id, other], updatedAt: user.createdAt },
    lastMessage: { id: `${id}-message`, conversationId: id, senderId: id === 'incoming' ? other : user.id, recipientId: user.id, content: id, createdAt: user.createdAt, seenAt: null },
  }))));
  await page.goto('/');
  await expect(page.getByRole('link', { name: '1 unread conversations', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '2 unread conversations', exact: true })).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark'] as const) {
test(`mobile home is readable and keyboard-operable in ${colorScheme} mode`, async ({ page }) => {
  await page.emulateMedia({ colorScheme });
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiBoundary(page);
  await page.goto('/');
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Following' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Following' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'For you' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'For you' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});
}

test('sign-in preserves password and email-code paths with accessible controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiBoundary(page);
  // Core auth accessibility must not depend on the live Google CDN completing.
  await page.route('https://accounts.google.com/gsi/client', (route) => route.abort());
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: 'Welcome to your corner.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Password', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Email code', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});

test('Google script failure has an accessible retry without disabling other sign-in methods', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
  let attempts = 0;
  await page.route('https://accounts.google.com/gsi/client', (route) => {
    attempts++;
    if (attempts === 1) return route.abort();
    // SDK-shaped rendering fixture only; this is not a live OAuth acceptance test.
    return route.fulfill({ contentType: 'application/javascript', body: "window.google={accounts:{id:{initialize(){},renderButton(parent){const button=document.createElement('button');button.type='button';button.textContent='Sign in with Google';parent.appendChild(button)}}}};" });
  });
  await page.goto('/auth');
  await expect(page.getByRole('status').filter({ hasText: 'Google sign-in couldn’t load' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Password', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Email code', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Retry Google sign-in' }).click();
  await expect(page.getByRole('group', { name: 'Google sign-in', exact: true }).getByRole('button', { name: 'Sign in with Google', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry Google sign-in' })).toHaveCount(0);
  expect(attempts).toBe(2);
});

test('sign-in validation focuses and describes the first invalid field', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
  await page.goto('/auth');
  await page.locator('#auth-form-panel').getByRole('button', { name: /^Sign in/ }).click();
  const identifier = page.getByLabel('Username or email');
  await expect(identifier).toBeFocused();
  await expect(identifier).toHaveAttribute('aria-invalid', 'true');
  const describedBy = await identifier.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${describedBy}`)).toContainText('Enter your username or email.');
  const password = page.getByLabel('Password', { exact: true });
  await expect(password).toHaveAttribute('aria-describedby', /password-error/);
});

test('expired bearer logout revokes refresh session before a reload can restore it', async ({ page }) => {
  let refreshAllowed = true;
  let logoutAttempts = 0;
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/refresh') {
      return refreshAllowed
        ? json(route, { accessToken: 'access-before-expiry' })
        : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Invalid refresh token' }) });
    }
    if (path === '/users/me') return json(route, user);
    if (path === '/auth/logout') {
      logoutAttempts++;
      if (request.headers().authorization) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Expired access token' }) });
      }
      refreshAllowed = false;
      return json(route, null);
    }
    if (path === '/readyz') return json(route, { status: 'ready' });
    return json(route, []);
  });

  await page.goto('/settings');
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/auth/);
  expect(logoutAttempts).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to your corner.' })).toBeVisible();
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toHaveCount(0);
});

test('narrow Google sign-in stays within its panel as the viewport changes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await installApiBoundary(page);
  await page.route('https://accounts.google.com/gsi/client', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.google={accounts:{id:{initialize(){},renderButton(parent,options){const button=document.createElement('button');button.dataset.renderedWidth=String(options.width);button.style.width=options.width+'px';button.textContent='Sign in with Google';parent.append(button)}}}};`,
  }));
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
  await page.goto('/auth');
  const button = page.locator('.operator-google-access__button button');
  await expect(button).toBeVisible();
  const widthAt320 = Number(await button.getAttribute('data-rendered-width'));
  const panelWidthAt320 = await page.locator('.operator-google-access__button').evaluate((element) => element.clientWidth);
  expect(widthAt320).toBeLessThanOrEqual(panelWidthAt320);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => Number(await button.getAttribute('data-rendered-width'))).toBeLessThanOrEqual(await page.locator('.operator-google-access__button').evaluate((element) => element.clientWidth));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('video load failures show a retry instead of a false empty queue', async ({ page }) => {
  await installApiBoundary(page);
  let unavailable = true;
  await page.route('**/api/videos', (route) => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) })
    : json(route, []));
  await page.goto('/videos');
  await expect(page.getByRole('alert').filter({ hasText: 'Videos could not load' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your queue is empty' })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry videos' }).click();
  await expect(page.getByRole('heading', { name: 'Your queue is empty' })).toBeVisible();
});

test('direct-message and group-member search failures can retry without claiming no matches', async ({ page }) => {
  await installApiBoundary(page);
  const candidate = { ...user, id: '10000000-0000-4000-8000-000000000091', username: 'grace', fullName: 'Grace Hopper' };
  let attempts = 0;
  await page.route('**/api/users/search*', (route) => {
    attempts++;
    return attempts === 1 || attempts === 3
      ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) })
      : json(route, [candidate]);
  });
  await page.goto('/messages');

  await page.getByRole('button', { name: 'Start a new conversation' }).click();
  const directDialog = page.getByRole('dialog', { name: 'Start a conversation' });
  await directDialog.getByRole('textbox', { name: 'Search people to message' }).fill('grace');
  await expect(directDialog.getByRole('alert').filter({ hasText: 'People could not load' })).toBeVisible();
  await expect(directDialog.getByText('No users found.')).toHaveCount(0);
  await directDialog.getByRole('button', { name: 'Retry people search' }).click();
  await expect(directDialog.getByRole('button', { name: /Grace Hopper/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Create a group chat' }).click();
  const groupDialog = page.getByRole('dialog', { name: 'Create a group conversation' });
  await groupDialog.getByRole('textbox', { name: 'Search people to add' }).fill('grace');
  await expect(groupDialog.getByRole('alert').filter({ hasText: 'Group members could not load' })).toBeVisible();
  await expect(groupDialog.getByText('No people found.')).toHaveCount(0);
  await groupDialog.getByRole('button', { name: 'Retry member search' }).click();
  await expect(groupDialog.getByRole('button', { name: /Grace Hopper/ })).toBeVisible();
  expect(attempts).toBe(4);
});

test('reel comments expose a retry and arrow keys in the comment field do not change reels', async ({ page }) => {
  await installApiBoundary(page);
  const videos = ['First reel', 'Second reel'].map((title, index) => ({
    id: `30000000-0000-4000-8000-00000000000${index + 1}`,
    authorId: user.id,
    videoUrl: 'https://example.test/reel.mp4',
    thumbnailUrl: 'https://example.test/reel.jpg',
    title,
    views: 0,
    likes: 0,
    createdAt: user.createdAt,
    type: 'short',
  }));
  await page.route('**/api/videos', (route) => json(route, videos));
  let commentsUnavailable = true;
  await page.route(`**/api/videos/${videos[0].id}/comments`, (route) => commentsUnavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) })
    : json(route, []));
  await page.route(`**/api/videos/${videos[1].id}/comments`, (route) => json(route, []));
  await page.goto('/videos');
  await page.getByRole('button', { name: 'Watch First reel' }).click();
  await page.getByRole('button', { name: 'Open comments' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Comments could not load' })).toBeVisible();
  commentsUnavailable = false;
  await page.getByRole('button', { name: 'Retry comments' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Comments could not load' })).toHaveCount(0);

  const comment = page.getByRole('textbox', { name: 'Write a comment' });
  await comment.fill('A comment draft');
  await comment.press('ArrowDown');
  await expect(page.locator('.operator-reels-progress strong')).toHaveText('01');
  await comment.press('ArrowUp');
  await expect(page.locator('.operator-reels-progress strong')).toHaveText('01');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Close comments' })).toBeHidden();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.operator-reels-progress strong')).toHaveText('02');
});

test('discovery loads beyond an empty following feed without changing the selected home feed', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('**/api/feed?*', (route) => {
    const mode = new URL(route.request().url()).searchParams.get('mode');
    return json(route, mode === 'for_you' ? [post('An idea beyond your following list.', 'discovery-post')] : []);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your people are out there.' })).toBeVisible();
  await page.getByRole('button', { name: 'Explore', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Open post: An idea beyond your following list.' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).first().click();
  await expect(page.getByRole('tab', { name: 'Following' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Your people are out there.' })).toBeVisible();
});

test("public beta legal pages show configured, dated policy content", async ({ page }) => {
  await installApiBoundary(page);
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Notice" })).toBeVisible();
  await expect(page.getByText("test-public-beta-1", { exact: false })).toBeVisible();
  await expect(page.getByText(/draft|not configured/i)).toHaveCount(0);
  await expect(page.locator('a button, button a')).toHaveCount(0);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});

test("public beta requires consent before opening protected social routes", async ({ page }) => {
  await installApiBoundary(page, { ...user, termsVersion: null, termsAcceptedAt: null, ageConfirmedAt: null });
  await page.goto("/explore");
  await expect(page).toHaveURL(/\/consent$/);
  await expect(page.getByRole("heading", { name: "Review the rules before you enter" })).toBeVisible();
});

test('comments retain failed drafts, prevent duplicate sends, and hide disabled payments', async ({ page }) => {
  await installApiBoundary(page);
  let requests = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/posts/*/comments', async (route) => {
    requests++;
    if (requests === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Comment service unavailable' }) });
    await pending;
    return json(route, { post: { ...post('A real signal delivered through the feed boundary.', '18fac78e-65fa-4fd4-931e-8b79e086c48d'), commentsCount: 1 } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Reply to post' }).click();
  const composer = page.getByRole('textbox', { name: 'Write a comment' });
  await composer.fill('Keep this draft until the server accepts it.');
  await expect(page.getByRole('button', { name: /UPI Tip/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.getByText('Comment service unavailable')).toBeVisible();
  await expect(composer).toHaveValue('Keep this draft until the server accepts it.');
  await composer.press('Enter');
  await expect(composer).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect.poll(() => requests).toBe(2);
  release();
  await expect(composer).toBeHidden();
  expect(requests).toBe(2);
  await expect(page.getByRole('button', { name: 'View all 1 comments' })).toBeVisible();
});

test('profile achievements use earned server progress and never invent mutual followers', async ({ page }) => {
  const friend = { ...user, id: '10000000-0000-4000-8000-000000000015', username: 'friend', fullName: 'A Known Friend' };
  const target = { ...user, id: '10000000-0000-4000-8000-000000000016', username: 'newcreator', fullName: 'Another Creator' };
  await installApiBoundary(page, { ...user, following: [friend.id] });
  await page.route('**/api/achievements/me', (route) => json(route, [{ id: 'first-post', title: 'First Post', description: 'Publish your first post', icon: 'Sparkles', goal: 1, progress: 1, xp: 50, unlocked: true }]));
  await page.route('**/api/feed?*', (route) => json(route, [{ ...post('A known friend is not automatically a mutual follower.', 'friend-post'), authorId: friend.id }]));
  await page.route(`**/api/users/${friend.id}`, (route) => json(route, friend));
  await page.route(`**/api/users/${target.id}`, (route) => json(route, target));
  for (const id of [target.id, friend.id]) {
    for (const surface of ['followers', 'following', 'feed', 'showcases', 'pinned-posts']) {
      await page.route(`**/api/users/${id}/${surface}*`, route => json(route, []));
    }
  }
  await page.route('**/api/users/*/profile-comments', (route) => json(route, [{ id: 'wall-note', targetUserId: target.id, authorId: friend.id, author: friend, content: 'A note from a known friend.', createdAt: user.createdAt }]));
  await page.goto(`/profile/${user.id}`);
  await page.getByRole('button', { name: 'View level 2 achievements' }).click();
  const dialog = page.getByRole('dialog', { name: 'Your Yor achievements' });
  await expect(dialog.getByText('50 XP earned', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'First Post' })).toBeVisible();
  await expect(dialog.getByText(/1,850|Yor Pioneer|100 Social Waves/)).toHaveCount(0);
  await page.goto(`/profile/${target.id}`);
  await expect(page.getByRole('heading', { name: target.fullName, exact: true }).first()).toBeVisible();
  await expect(page.getByText('A Known Friend', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Followed by/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /View level .* achievements/ })).toHaveCount(0);
  await expect(page.getByText('Profile Soundtrack', { exact: false })).toHaveCount(0);
});

test('wall comments preserve failed drafts and unknown profiles offer a retry', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('**/api/users/*/profile-comments', (route) => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Wall temporarily unavailable' }) })
    : json(route, []));
  await page.goto(`/profile/${user.id}`);
  const composer = page.getByRole('textbox', { name: 'Write a wall comment' });
  await composer.fill('This wall draft must survive a failed request.');
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByText('Wall temporarily unavailable')).toBeVisible();
  await expect(composer).toHaveValue('This wall draft must survive a failed request.');
  const missing = '10000000-0000-4000-8000-000000000017';
  await page.route(`**/api/users/${missing}`, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Profile service unavailable' }) }));
  await page.goto(`/profile/${missing}`);
  await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry profile' })).toBeVisible();
});

test('shared post links fetch uncached posts and recover failed replies', async ({ page }) => {
  await installApiBoundary(page);
  const id = '10000000-0000-4000-8000-000000000021';
  let unavailable = true;
  await page.route(`**/api/posts/${id}`, (route) => json(route, post('A shared post outside the loaded home feed.', id)));
  await page.route(`**/api/posts/${id}/comments`, (route) => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Replies unavailable' }) })
    : json(route, [{ id: 'reply', authorId: user.id, author: user, content: 'Recovered reply', createdAt: user.createdAt }]));
  await page.goto(`/post/${id}`);
  await expect(page.getByRole('article').getByText('A shared post outside the loaded home feed.')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Replies could not load.' })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Retry replies' }).click();
  await expect(page.getByText('Recovered reply', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article').getByText('A shared post outside the loaded home feed.')).toBeVisible();
});

test('pending follows preserve existing relationships and favorites across reloads', async ({ page }) => {
  const target = { ...user, id: '10000000-0000-4000-8000-000000000022', username: 'private_creator', fullName: 'Private Creator' };
  const followed = { ...user, id: '10000000-0000-4000-8000-000000000023', username: 'known_creator', fullName: 'Known Creator' };
  const profile = { ...user, following: [followed.id], followingCount: 1, favoriteCreatorIds: [target.id], pendingFollowIds: [] as string[] };
  await installApiBoundary(page, profile);
  await page.route(`**/api/users/${target.id}`, (route) => json(route, target));
  await page.route(`**/api/users/${followed.id}`, (route) => json(route, followed));
  for (const id of [target.id, followed.id]) {
    for (const surface of ['followers', 'following', 'feed', 'showcases', 'profile-comments', 'pinned-posts']) {
      await page.route(`**/api/users/${id}/${surface}*`, route => json(route, []));
    }
  }
  await page.route('**/api/users/me/favorites/creators', (route) => json(route, [target.id]));
  await page.route(`**/api/users/${user.id}/following`, (route) => json(route, [followed]));
  await page.route(`**/api/users/${target.id}/follow`, (route) => {
    profile.pendingFollowIds = [target.id];
    return json(route, { status: 'pending', follower: { ...user, following: undefined, followingCount: 1 }, target });
  });
  await page.route(`**/api/users/${target.id}/unfollow`, (route) => {
    profile.pendingFollowIds = [];
    return json(route, { follower: { ...user, following: undefined, followingCount: 1 }, target });
  });
  await page.goto(`/profile/${target.id}`);
  await expect(page.getByRole('button', { name: 'Remove Private Creator from Favorites' })).toBeVisible();
  await page.getByRole('button', { name: 'Follow', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Requested', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Private Creator from Favorites' })).toBeVisible();
  await page.getByRole('link', { name: /Ada Lovelace.*@ada/ }).first().click();
  await page.getByRole('button', { name: '1 Following', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /^following$/i }).getByRole('button', { name: 'Following', exact: true })).toBeVisible();
  await page.goto(`/profile/${target.id}`);
  await expect(page.getByRole('button', { name: 'Requested', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Requested', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Follow', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Private Creator from Favorites' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Follow', exact: true }).first()).toBeVisible();
});

test('inbox failures offer a retry without claiming an empty or live-connected inbox', async ({ page }) => {
  await installApiBoundary(page);
  let unavailable = true;
  await page.route('**/api/conversations', (route) => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) })
    : json(route, []));
  await page.goto('/messages');
  await expect(page.getByRole('alert').filter({ hasText: 'Your inbox could not refresh.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your inbox is clear' })).toHaveCount(0);
  await expect(page.getByText('Periodic updates', { exact: true })).toBeVisible();
  await expect(page.getByText('Connected', { exact: true })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry inbox' }).click();
  await expect(page.getByRole('heading', { name: 'Your inbox is clear' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});

for (const width of [390, 1280]) for (const isGroup of [false, true]) test(`message image approval and send retries preserve the draft: ${isGroup ? 'group' : 'direct'} at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  await installApiBoundary(page);
  const peer = { ...user, id: '10000000-0000-4000-8000-000000000131', username: 'media_peer', fullName: 'Media Peer' };
  const conversation = { id: '20000000-0000-4000-8000-000000000131', participantA: user.id, participantB: peer.id, participantIds: [user.id, peer.id], updatedAt: user.createdAt, isGroup, title: isGroup ? 'Media group' : null };
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=', 'base64');
  const mediaIds = ['30000000-0000-4000-8000-000000000131', '30000000-0000-4000-8000-000000000132'];
  let prepares = 0, uploads = 0, finalizes = 0, approvals = 0;
  const publications: Array<Record<string, any>> = [];
  await page.route('**/api/conversations', route => json(route, [{ conversation }]));
  await page.route('**/api/conversations/*/messages', route => json(route, []));
  await page.route(`**/api/users/${peer.id}`, route => json(route, peer));
  await page.route('**/api/media/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/presign')) {
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({ purpose: 'message', mimeType: 'image/png', size: image.length });
      const mediaId = mediaIds[prepares++];
      return json(route, { id: mediaId, mediaId, status: 'pending', purpose: 'message', mimeType: 'image/png', maxFileSize: 5 * 1024 * 1024, mode: 'server', uploadUrl: `/api/media/${mediaId}/upload` });
    }
    const mediaId = path.split('/')[3];
    if (path.endsWith('/upload')) { uploads++; return json(route, { id: mediaId, mediaId, status: 'uploaded' }); }
    if (path.endsWith('/content')) return route.fulfill({ contentType: 'image/png', body: image });
    if (path.endsWith('/finalize')) {
      finalizes++;
      if (finalizes === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Media moderation is temporarily unavailable', errors: ['media_moderation_unavailable'] }) });
      approvals++;
      return json(route, { id: mediaId, mediaId, status: 'approved', mimeType: 'image/png', size: image.length, url: `/api/media/${mediaId}/content?token=synthetic.signed` });
    }
    throw new Error(`Unexpected media fixture request: ${path}`);
  });
  await page.route('**/api/messages', async route => {
    expect(approvals, 'Messages may only publish after media approval').toBeGreaterThan(0);
    const payload = route.request().postDataJSON();
    expect(payload.mediaId).toBe(mediaIds[publications.length < 3 ? 0 : 1]);
    expect(payload.mediaUrl).toBeUndefined();
    expect(payload.content).not.toContain('📷');
    if (isGroup) { expect(payload.conversationId).toBe(conversation.id); expect(payload.recipientId).toBeUndefined(); }
    else { expect(payload.recipientId).toBe(peer.id); expect(payload.conversationId).toBeUndefined(); }
    publications.push(payload);
    if (publications.length <= 2) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Message publication is temporarily unavailable' }) });
    return json(route, { id: `sent-media-${publications.length}`, conversationId: conversation.id, senderId: user.id, recipientId: peer.id, content: payload.content, mediaId: payload.mediaId, mediaUrl: `/api/media/${payload.mediaId}/content?token=synthetic.signed`, mediaType: 'image', mediaLegacy: false, createdAt: user.createdAt, seenAt: null });
  });
  await page.goto(`/messages/${conversation.id}`);
  const composer = page.getByRole('textbox', { name: 'Message', exact: true });
  await composer.fill('Keep this caption and image until publication succeeds.');
  await page.getByRole('button', { name: 'Add image attachment', exact: true }).click();
  const fileInput = page.getByLabel('Message image', { exact: true });
  await fileInput.setInputFiles({ name: 'retained-message.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const failure = page.getByRole('alert').filter({ hasText: 'Could not send this message.' });
  await expect(failure).toBeVisible();
  await expect(page.getByText('Message not sent. Your draft is still here.', { exact: true })).toHaveCount(0);
  await expect(composer).toHaveValue('Keep this caption and image until publication succeeds.');
  await expect(page.getByText('retained-message.png', { exact: true })).toBeVisible();
  expect(publications).toHaveLength(0);
  expect([prepares, uploads, finalizes]).toEqual([1, 1, 1]);
  await failure.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(() => publications.length).toBe(1);
  await expect(failure).toBeVisible();
  await expect(composer).toHaveValue('Keep this caption and image until publication succeeds.');
  await expect(page.getByText('retained-message.png', { exact: true })).toBeVisible();
  expect([prepares, uploads, finalizes]).toEqual([1, 1, 2]);
  await failure.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(() => publications.length).toBe(2);
  await expect(failure).toBeVisible();
  await expect(composer).toHaveValue('Keep this caption and image until publication succeeds.');
  await expect(page.getByText('retained-message.png', { exact: true })).toBeVisible();
  await expect(failure).toHaveCount(1);
  const retry = failure.getByRole('button', { name: 'Retry', exact: true });
  await retry.focus();
  await retry.press('Enter');
  await expect(composer).toHaveValue('');
  expect(publications).toHaveLength(3);
  expect(publications[0]).toEqual(publications[1]);
  expect(publications[1]).toEqual(publications[2]);
  expect([prepares, uploads, finalizes]).toEqual([1, 1, 2]);
  await expect(page.getByRole('img', { name: 'Shared attachment', exact: true })).toHaveCount(1);
  await expect(page.getByText('retained-message.png', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add image attachment', exact: true }).click();
  await fileInput.setInputFiles({ name: 'image-only.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => publications.length).toBe(4);
  expect(publications[3].content).toBe('');
  expect(publications[3].mediaId).toBe(mediaIds[1]);
  await expect(page.getByRole('img', { name: 'Shared attachment', exact: true })).toHaveCount(2);
  expect([prepares, uploads, finalizes]).toEqual([2, 2, 3]);
});

test('message drafts stay with their conversation and survive failed duplicate sends', async ({ page }) => {
  await installApiBoundary(page);
  const peers = ['Alpha Tester', 'Beta Tester'].map((fullName, index) => ({ ...user, id: `10000000-0000-4000-8000-00000000003${index}`, username: `tester_${index}`, fullName }));
  const conversations = peers.map((peer, index) => ({ id: `20000000-0000-4000-8000-00000000003${index}`, participantA: user.id, participantB: peer.id, participantIds: [user.id, peer.id], updatedAt: user.createdAt }));
  await page.route('**/api/conversations', (route) => json(route, conversations.map((conversation) => ({ conversation }))));
  await page.route('**/api/conversations/*/messages', (route) => json(route, []));
  for (const peer of peers) await page.route(`**/api/users/${peer.id}`, (route) => json(route, peer));
  let requests = 0;
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/messages', async (route) => {
    requests++;
    if (requests === 1) {
      await delayed;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) });
    }
    return json(route, { id: 'sent-fixture', conversationId: conversations[0].id, senderId: user.id, recipientId: peers[0].id, content: route.request().postDataJSON().content, createdAt: user.createdAt, seenAt: null });
  });
  await page.goto(`/messages/${conversations[0].id}`);
  const composer = page.getByRole('textbox', { name: 'Message', exact: true });
  await composer.fill('A draft for Alpha only.');
  await page.getByRole('textbox', { name: 'Search conversations' }).fill('Beta');
  await expect(composer).toHaveValue('A draft for Alpha only.');
  await page.getByRole('textbox', { name: 'Search conversations' }).fill('');
  await page.getByRole('button', { name: /Beta Tester.*No messages yet/ }).click();
  await expect(composer).toHaveValue('');
  await composer.fill('A separate draft for Beta.');
  await page.getByRole('button', { name: /Alpha Tester.*No messages yet/ }).click();
  await expect(composer).toHaveValue('A draft for Alpha only.');
  await composer.press('Enter');
  await expect(composer).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not send this message.' })).toBeVisible();
  await expect(composer).toHaveValue('A draft for Alpha only.');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(composer).toHaveValue('');
  await expect(page.getByRole('article').getByText('A draft for Alpha only.', { exact: true })).toBeVisible();
  expect(requests).toBe(2);
  await page.getByRole('button', { name: /Beta Tester.*No messages yet/ }).click();
  await expect(composer).toHaveValue('A separate draft for Beta.');
  await expect(page.getByRole('button', { name: /Tip creator/ })).toHaveCount(0);
});

test('settings expose only available notifications with accessible mobile controls', async ({ page }, testInfo) => {
  await installApiBoundary(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByText('Push notifications are off for this beta', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Push notifications' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Profile visibility' })).toBeEnabled();
  await expect(page.getByRole('switch', { name: 'Message requests', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Account deletion confirmation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('settings-mobile.png'), fullPage: true });
});

test('privacy preferences show confirmed state, prevent duplicate saves, and recover after a failure', async ({ page }) => {
  const profile = { ...user, privacy: { ...user.privacy } };
  await installApiBoundary(page, profile);
  let attempts = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/users/me/privacy', async (route) => {
    attempts++;
    if (attempts === 1) {
      await pending;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Privacy preferences could not be saved' }) });
    }
    profile.privacy = { ...profile.privacy, ...route.request().postDataJSON() };
    return json(route, profile.privacy);
  });
  await page.goto('/settings');
  const strangers = page.getByRole('switch', { name: 'Direct Messages from strangers', exact: true });
  const requests = page.getByRole('switch', { name: 'Message requests', exact: true });
  await strangers.click();
  await expect(strangers).toBeDisabled();
  await expect(requests).toBeDisabled();
  await expect(strangers).toBeChecked();
  await expect(page.getByRole('status').filter({ hasText: 'Saving privacy preferences' })).toBeVisible();
  expect(attempts).toBe(1);
  release();
  await expect(page.getByRole('alert').filter({ hasText: 'Privacy preferences could not be saved' })).toBeVisible();
  await expect(strangers).toBeEnabled();
  await expect(strangers).toBeChecked();
  await strangers.click();
  await expect(strangers).not.toBeChecked();
  await expect(requests).toBeChecked();
  await expect(page.getByRole('alert').filter({ hasText: 'Privacy preferences could not be saved' })).toHaveCount(0);
  expect(attempts).toBe(2);
  await page.reload();
  await expect(strangers).not.toBeChecked();
  await expect(requests).toBeChecked();
});

test('activity failures are retryable and never look caught up', async ({ page }) => {
  await installApiBoundary(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let unavailable = true;
  const failure = (route: Route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) });
  await page.route('**/api/notifications', (route) => unavailable ? failure(route) : json(route, []));
  await page.route('**/api/users/me/follow-requests', (route) => unavailable ? failure(route) : json(route, []));
  await page.goto('/notifications');
  await expect(page.getByRole('alert').filter({ hasText: 'Your activity could not refresh.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'You’re all caught up' })).toHaveCount(0);
  await expect(page.getByText('Clear', { exact: true })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry activity' }).click();
  await expect(page.getByRole('heading', { name: 'You’re all caught up' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry activity' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});

test('follow decisions prevent duplicate actions and activity read-all handles failure and retry', async ({ page }) => {
  await installApiBoundary(page);
  const requester = { ...user, id: '10000000-0000-4000-8000-000000000080', username: 'river', fullName: 'River Stone' };
  let requests = [{ id: 'follow-fixture', requesterId: requester.id, targetId: user.id, status: 'pending', createdAt: new Date().toISOString(), requester }];
  await page.route('**/api/users/me/follow-requests', (route) => json(route, requests));
  const notification = { id: 'notification-fixture', type: 'like', title: 'New like', message: 'River liked your post', relatedId: 'post-fixture', metadata: { actorId: requester.id }, readAt: null, createdAt: new Date().toISOString() };
  await page.route('**/api/notifications', (route) => json(route, [notification]));
  await page.route(`**/api/users/${requester.id}`, (route) => json(route, requester));
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let decisions = 0;
  await page.route('**/api/users/me/follow-requests/*/accept', async (route) => {
    decisions++;
    await pending;
    requests = [];
    return json(route, { follower: requester, target: { ...user, followerCount: 13 } });
  });
  let readAttempts = 0;
  await page.route('**/api/notifications/read-all', async (route) => {
    readAttempts++;
    if (readAttempts === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Read status could not be saved' }) });
    return json(route, null);
  });
  await page.goto('/notifications');
  await expect(page.getByRole('link').filter({ hasText: 'River Stone liked your post' })).toBeVisible();
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Decline', exact: true })).toBeDisabled();
  expect(decisions).toBe(1);
  release();
  await expect(page.getByRole('heading', { name: 'Follow requests' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByText('Read status could not be saved')).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: 'River Stone liked your post' })).toHaveAttribute('data-unread', 'true');
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByRole('link').filter({ hasText: 'River Stone liked your post' })).not.toHaveAttribute('data-unread', 'true');
  expect(readAttempts).toBe(2);
});

test('failed blocking never announces success or hides the post, and retry persists', async ({ page }) => {
  const profile = { ...user, blockedUsers: [] as string[] };
  await installApiBoundary(page, profile);
  const creator = { ...user, id: '10000000-0000-4000-8000-000000000090', username: 'block_fixture', fullName: 'Safety Test Creator' };
  const item = { ...post('Keep this visible until blocking is confirmed.', 'block-post'), authorId: creator.id };
  await page.route(`**/api/users/${creator.id}`, (route) => json(route, creator));
  await page.route('**/api/feed?*', (route) => json(route, profile.blockedUsers.length ? [] : [item]));
  let attempts = 0;
  await page.route(`**/api/users/${creator.id}/block`, (route) => {
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Blocking could not be saved' }) });
    profile.blockedUsers.push(creator.id);
    return json(route, { blockedUsers: profile.blockedUsers });
  });
  await page.goto('/');
  const itemCard = page.getByRole('article').filter({ hasText: item.content });
  await expect(itemCard.getByRole('link', { name: creator.fullName, exact: true })).toBeVisible();
  await itemCard.getByRole('button', { name: 'More post options' }).click();
  await page.getByRole('menuitem', { name: 'Block user', exact: true }).click();
  await expect(page.getByText('Blocking could not be saved', { exact: true })).toBeVisible();
  await expect(page.getByText('User blocked', { exact: true })).toHaveCount(0);
  await expect(itemCard).toBeVisible();
  await itemCard.getByRole('button', { name: 'More post options' }).click();
  await page.getByRole('menuitem', { name: 'Block user', exact: true }).click();
  await expect(itemCard).toHaveCount(0);
  expect(attempts).toBe(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await expect(itemCard).toHaveCount(0);
});
