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
const allCapabilities = { social: true, publish: true, messaging: true, payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true, analytics: true, profiling: true };
const adultEligibility = { experience: 'adult_18_plus', activated: true, capabilities: allCapabilities, maximumContentRating: 'mature', policyVersions: ['test-policy-v1'], revision: 'a'.repeat(64), reason: null, publicBrowsingAllowed: true };

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

async function installApiBoundary(page: Page, profile = user, eligibility: unknown | (() => unknown) = adultEligibility, guardianAuthorizations: unknown | (() => unknown) = []) {
  const unhandled: string[] = [];
  const requestCounts = new Map<string,number>();
  page.on('close', () => expect(unhandled, 'Every mocked API route must be explicit').toEqual([]));
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "") || "/";
    requestCounts.set(path,(requestCounts.get(path) ?? 0)+1);

    if (path === "/auth/refresh" && request.method() === "POST") {
      return json(route, { accessToken: "browser-smoke-access-token" });
    }
    if (path === "/users/me" && request.method() === "GET") return json(route, profile);
    if (path === '/users/me/eligibility' && request.method() === 'GET') {
      const value = typeof eligibility === 'function' ? eligibility() : eligibility;
      if (value === null) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Verification is temporarily unavailable' }) });
      return json(route, value);
    }
    if (path === '/users/me/guardian-authorizations' && request.method() === 'GET') {
      const value = typeof guardianAuthorizations === 'function' ? guardianAuthorizations() : guardianAuthorizations;
      return json(route, value);
    }
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

    const ownerLists = ['/following', '/followers', '/feed', '/showcases', '/profile-comments', '/pinned-posts'].map((suffix) => '/users/' + user.id + suffix);
    const emptyLists = ['/notifications', '/users/me/follow-requests', '/users/me/close-friends', '/users/me/favorites/creators', '/users/me/contact-shields', '/conversations', '/stories', '/notes', '/videos', '/articles', '/events', '/products', '/products/orders', '/communities', '/creator/workspace', '/achievements/me', ...ownerLists];
    if (request.method() === 'GET' && emptyLists.includes(path)) return json(route, []);
    if (request.method() === 'GET' && ['/posts/liked', '/posts/saved'].includes(path)) return json(route, [], { hasMore: false, nextCursor: null });
    if (request.method() === 'GET' && path === '/users/' + user.id + '/posts') return json(route, [], { hasMore: false, nextCursor: null });
    unhandled.push(`${request.method()} ${path}`);
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: `Unhandled test route: ${request.method()} ${path}` }) });
    throw new Error(`Unhandled test route: ${request.method()} ${path}`);
  });
  return requestCounts;
}

test('restricted eligibility states keep social routes closed and leave owner controls reachable', async ({ page }) => {
  const noCapabilities = Object.fromEntries(Object.keys(allCapabilities).map((key) => [key, false]));
  const decision = (experience: string, reason: string) => ({ ...adultEligibility, experience, activated: false, capabilities: noCapabilities, reason });
  let currentEligibility: unknown = decision('unknown', 'verification_required');
  let currentGuardians: unknown = [];
  await installApiBoundary(page, user, () => currentEligibility, () => currentGuardians);

  const cases = [
    { title: 'Verification is needed', value: decision('unknown', 'verification_required'), guardians: [] },
    { title: 'A new check is needed', value: decision('adult_18_plus', 'reassessment_required'), guardians: [] },
    { title: 'Verification is not available here yet', value: decision('adult_18_plus', 'territory_unavailable'), guardians: [] },
    { title: 'Guardian permission is needed', value: decision('teen_13_17', 'guardian_required'), guardians: [], guardianStepPending: true },
    { title: 'A parent or guardian step is needed', value: decision('under_13', 'guardian_required'), guardians: [{ id: '30000000-0000-4000-8000-000000000002', purposes: ['account_collection'], status: 'withdrawn', expiresAt: '2027-01-01T00:00:00.000Z' }], profileUnavailable: true },
    { title: 'We could not check right now', value: null, guardians: [] },
    { title: 'We could not check right now', value: { ...adultEligibility, privateEvidence: 'must be rejected' }, guardians: [] },
  ];

  for (const item of cases) {
    currentEligibility = item.value;
    currentGuardians = item.guardians;
    await page.goto('/messages/20000000-0000-4000-8000-000000000001');
    await expect(page).toHaveURL(/\/eligibility$/);
    await expect(page.getByRole('heading', { name: item.title, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings and safety' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send message|Create post|Publish/ })).toHaveCount(0);
    if (item.guardians.length) await expect(page.getByText(item.guardians[0].status, { exact: false })).toBeVisible();
    if (item.guardianStepPending) await expect(page.getByText('A parent or guardian needs to complete the permission step before this feature can be enabled.', { exact: true })).toBeVisible();
    if (item.profileUnavailable) {
      await page.goto('/settings');
      await expect(page.getByText('Profile image', { exact: true })).toHaveCount(0);
      await page.goto('/eligibility');
    }
  }

  await page.getByRole('link', { name: 'Settings and safety' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('button', { name: /Export/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Delete$/ })).toBeVisible();
});

test('verified eligibility for adult and teen experience uses the server decision without a local age claim', async ({ page }) => {
  let currentEligibility: unknown = adultEligibility;
  await installApiBoundary(page, { ...user, ageConfirmedAt: null }, () => currentEligibility);
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  currentEligibility = { ...adultEligibility, experience: 'teen_13_17', maximumContentRating: 'regular' };
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
});

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
  const receipt = { ticketId: 'YT-GRV-849201ABCD', status: 'received', createdAt: '2026-10-07T08:00:00.000Z' };
  await page.route('**/api/reports/grievance', route => json(route, receipt));
  await page.route(`**/api/reports/grievance/${receipt.ticketId}`, route => json(route, { ...receipt, status: 'under_review' }));
  await page.goto('/grievance');
  await page.locator('#reporterName').fill('Private Reporter');
  await page.locator('#reporterEmail').fill('private@example.test');
  await page.locator('#reportedUrl').fill('https://example.test/reported-post');
  await page.locator('#description').fill('A private complaint with enough detail for a reviewer to investigate.');
  const submittedReceipt = page.waitForResponse(response => response.url().endsWith('/api/reports/grievance') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit report', exact: true }).click();
  const publicResponse = await submittedReceipt;
  const publicPayload = await publicResponse.json();
  expect(Object.keys(publicPayload.data).sort()).toEqual(['createdAt', 'status', 'ticketId']);
  await expect(page.getByText(receipt.ticketId, { exact: true })).toBeVisible();
  await expect(page.getByText(/email updates are not sent automatically/i)).toBeVisible();
  await expect(page.getByText(/Operational review target|Statutory SLA|acknowledgement email/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Track Existing Ticket' }).click();
  await page.locator('#trackTicketId').fill(receipt.ticketId);
  await page.getByRole('button', { name: 'Track ticket', exact: true }).click();
  await expect(page.getByText('under review', { exact: true })).toBeVisible();
  await expect(page.getByText(/A reviewer has not added a note|Operational review target|Statutory SLA|acknowledgement email/i)).toHaveCount(0);
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
  const rows = page.getByRole('main').getByRole('article');
  await expect(rows).toHaveCount(200, { timeout: 15_000 });
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
  await expect(rows).toHaveCount(202, { timeout: 15_000 });
  const imageRow = rows.filter({ hasText: 'Earlier image caption' });
  await imageRow.scrollIntoViewIfNeeded();
  const image = imageRow.getByRole('img', { name: 'Shared attachment' });
  await expect(image).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(2);
  const audioRow = rows.filter({ hasText: 'Earlier voice caption' });
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
  const renewedAudio = page.waitForRequest(request => request.url().includes(`${audioId}/content?token=renewed`));
  await audio.evaluate(element => element.dispatchEvent(new Event('error')));
  await renewedAudio;
  await expect(audio).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeCloseTo(0.4, 1);
  await expect(audio).toHaveJSProperty('paused', true);
  await expect(audio).toHaveJSProperty('muted', true);
  await expect(audio).toHaveJSProperty('playbackRate', 1.5);
  await audio.evaluate(element => (element as HTMLAudioElement).play());
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0.55);
  await expect(imageRow.getByText('Earlier image caption', { exact: true })).toBeVisible();
  await expect(audioRow.getByText('Earlier voice caption', { exact: true })).toBeVisible();
  await expect(rows).toHaveCount(202, { timeout: 15_000 });
  await expect(rows.getByText('Recent history row 199', { exact: true })).toHaveCount(1);
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
    await audioRow.locator('audio').evaluate(element => (element as HTMLAudioElement).load());
  }
  expect(reads).toEqual([1, 1]);
  for (const count of [2, 3]) {
    await audioRow.getByRole('button', { name: 'Retry attachment' }).click();
    await expect(audioRow.getByRole('alert')).toBeVisible();
    expect(reads).toEqual([1, count]);
    await expect(audioRow.locator('audio')).not.toHaveAttribute('src');
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
  const renewedRequest = page.waitForRequest(request => request.url().includes(`${assetIds[1]}/content?token=renewed`));
  await player.evaluate(video => video.dispatchEvent(new Event('error')));
  await renewedRequest;
  await expect(player).toHaveAttribute('src', /^blob:/);
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
  await expect(page.locator('.operator-reel-video').nth(1)).toHaveAttribute('src', /^blob:/);
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
  // Repeated playback resets without an authorized source must not call the read endpoint.
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.locator('.operator-reel-video').nth(0).evaluate(video => (video as HTMLVideoElement).load());
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
  await expect(page.locator('.operator-reel-video').nth(1)).not.toHaveAttribute('src');
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
  const rows = page.getByRole('main').getByRole('article');
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
  const studio = page.getByRole('dialog', { name: 'Studio Camera', exact: true });
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
  await installApiBoundary(page); let retryRequested = false;
  await page.route('**/api/billing/checkouts**', route => json(route, retryRequested ? [] : [{ product: 'wrong' }]));
  await page.goto('/billing');
  await expect(page.getByRole('alert').filter({ hasText: 'could not load' })).toBeVisible();
  retryRequested = true;
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
  let retryRequested = false;
  await page.route('**/api/premium/me', route => json(route, retryRequested ? premiumState('free') : { catalog: [] }));
  await page.goto('/premium');
  await expect(page.getByRole('alert')).toContainText('Billing details could not be verified');
  retryRequested = true;
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
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(second.getByRole('heading', { name: 'Home', exact: true })).toBeVisible({ timeout: 15_000 });
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
  await expect(page.getByRole('alert').filter({ hasText: 'Feed temporarily unavailable' })).toBeVisible({ timeout: 15_000 });
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
  await expect(page.getByRole('article')).toBeVisible({ timeout: 15_000 });
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
    if (path === '/users/me/eligibility') return json(route, adultEligibility);
    if (path === '/users/me/guardian-authorizations') return json(route, []);
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
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/auth/);
  await expect.poll(() => logoutAttempts).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to your corner.' })).toBeVisible();
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toHaveCount(0);
});

test('queued logout blocks cookie restoration on immediate reload while another tab holds the session lock', async ({ page, context, baseURL }) => {
  let refreshAllowed = true;
  let refreshAttempts = 0;
  let logoutAttempts = 0;
  await context.addCookies([{ name: 'refreshToken', value: 'still-valid-refresh', url: baseURL!, httpOnly: true, sameSite: 'Lax' }]);
  await page.route('**/socket.io/**', route => route.abort());
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/refresh') {
      refreshAttempts++;
      expect(route.request().headers().cookie).toContain('refreshToken=still-valid-refresh');
      return refreshAllowed
        ? json(route, { accessToken: 'access-before-queued-logout' })
        : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Invalid refresh token' }) });
    }
    if (path === '/auth/logout') {
      logoutAttempts++;
      refreshAllowed = false;
      return json(route, null);
    }
    if (path === '/users/me') return json(route, user);
    if (path === '/users/me/eligibility') return json(route, adultEligibility);
    if (path === '/users/me/guardian-authorizations') return json(route, []);
    if (path === '/readyz') return json(route, { status: 'ready' });
    return json(route, []);
  });
  await page.goto('/settings');
  await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 15_000 });
  expect(refreshAttempts).toBe(1);

  const lockOwner = await context.newPage();
  try {
    // A static same-origin document holds the real browser lock across reload;
    // it runs no app initialization or refresh requests of its own.
    await lockOwner.route('**/__logout_lock_owner', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Session lock fixture</title>' }));
    await lockOwner.goto('/__logout_lock_owner');
    await lockOwner.evaluate(() => new Promise<void>(ready => {
      void navigator.locks.request('yor-session-refresh', async () => {
        await new Promise<void>(release => {
          (globalThis as typeof globalThis & { releaseLogoutLock?: () => void }).releaseLogoutLock = release;
          ready();
        });
      });
    }));

    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await expect(page).toHaveURL(/\/auth/);
    expect(logoutAttempts).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('yortalks-logged-out'))).toBe('1');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Welcome to your corner.' })).toBeVisible();
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Settings', exact: true })).toHaveCount(0);
    expect(logoutAttempts).toBe(0);
    expect(refreshAllowed).toBe(true);
    expect(refreshAttempts).toBe(1);
    expect((await context.cookies()).find(cookie => cookie.name === 'refreshToken')?.value).toBe('still-valid-refresh');
  } finally {
    await lockOwner.evaluate(() => (globalThis as typeof globalThis & { releaseLogoutLock?: () => void }).releaseLogoutLock?.()).catch(() => {});
    await lockOwner.close();
  }
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

test("public beta legal pages render synthetic reviewed policy data and territory-based eligibility", async ({ page }) => {
  await installApiBoundary(page);
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Notice" })).toBeVisible();
  await expect(page.getByText("test-public-beta-1", { exact: false })).toBeVisible();
  await expect(page.getByText(/draft|not configured/i)).toHaveCount(0);
  await expect(page.locator('a button, button a')).toHaveCount(0);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);

  await page.goto('/terms');
  await expect(page.getByText(/Eligibility and feature access follow the approved policy for your territory/)).toBeVisible();
  await expect(page.getByText(/Complete the territory, age-assurance and guardian-authorization steps/)).toBeVisible();
  await expect(page.getByText(/must be at least 18/i)).toHaveCount(0);
});

test("public beta requires consent before opening protected social routes", async ({ page }) => {
  await installApiBoundary(page, { ...user, termsVersion: null, termsAcceptedAt: null, ageConfirmedAt: null });
  await page.goto("/explore");
  await expect(page).toHaveURL(/\/consent$/);
  await expect(page.getByRole("heading", { name: "Review the rules before you enter" })).toBeVisible();
});

test('eligibility refresh does not remount the activated eligibility page in a request loop', async ({page}) => {
  const requests=await installApiBoundary(page);
  await page.goto('/eligibility');
  await expect(page.getByRole('heading',{name:'Check what is available'})).toBeVisible();
  await page.waitForTimeout(1_000);
  expect(requests.get('/users/me/eligibility') ?? 0).toBeLessThanOrEqual(3);
  expect(requests.get('/users/me/guardian-authorizations') ?? 0).toBeLessThanOrEqual(3);
});

test('under-13 registration prescreens before rendering identity fields', async ({page}) => {
  let prescreens=0;
  await page.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname.replace(/^\/api/,'') || '/';
    if(path==='/auth/refresh' && request.method()==='POST')return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({success:false})});
    if(path==='/readyz')return json(route,{status:'ready'});
    if(path==='/eligibility/enrollments/prescreen' && request.method()==='POST'){
      prescreens++;
      return json(route,{status:'unavailable',nextStep:null});
    }
    return json(route,[]);
  });
  await page.goto('/auth');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.locator('#requestedExperience').selectOption('under_13');
  await page.locator('#territory').fill('IN');
  await page.locator('#acceptedTerms').check();
  await expect(page.locator('#fullName')).toHaveCount(0);
  await expect(page.locator('#accountIdentifier')).toHaveCount(0);
  await expect(page.locator('#password')).toHaveCount(0);
  await page.locator('#auth-form-panel button[type=submit]').click();
  await expect.poll(()=>prescreens).toBe(1);
  await expect(page.getByText('Verification is not available for this country and age group yet.',{exact:false})).toBeVisible();
  expect(prescreens).toBe(1);
});

test('accounts with outdated terms can still reach export and deletion controls',async ({page})=>{
  await page.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname.replace(/^\/api/,'') || '/';
    if(path==='/auth/refresh' && request.method()==='POST')return json(route,{accessToken:'rights-fixture'});
    if(path==='/users/me' && request.method()==='GET')return json(route,{...user,termsVersion:null,termsAcceptedAt:null});
    if(path==='/readyz')return json(route,{status:'ready'});
    return json(route,[]);
  });
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('button',{name:'Export',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Delete',exact:true})).toBeVisible();
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

for (const isGroup of [false, true]) test(`message image approval and send retries preserve the draft: ${isGroup ? 'group' : 'direct'}`, async ({ page }) => {
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
    expect(payload.mediaId).toBe(mediaIds[publications.length < 2 ? 0 : 1]);
    expect(payload.mediaUrl).toBeUndefined();
    expect(payload.content).not.toContain('📷');
    if (isGroup) { expect(payload.conversationId).toBe(conversation.id); expect(payload.recipientId).toBeUndefined(); }
    else { expect(payload.recipientId).toBe(peer.id); expect(payload.conversationId).toBeUndefined(); }
    publications.push(payload);
    if (publications.length === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Message publication is temporarily unavailable' }) });
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
  await expect(composer).toHaveValue('');
  expect(publications).toHaveLength(2);
  expect(publications[0]).toEqual(publications[1]);
  expect([prepares, uploads, finalizes]).toEqual([1, 1, 2]);
  await expect(page.getByRole('img', { name: 'Shared attachment', exact: true })).toHaveCount(1);
  await expect(page.getByText('retained-message.png', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add image attachment', exact: true }).click();
  await fileInput.setInputFiles({ name: 'image-only.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => publications.length).toBe(3);
  expect(publications[2].content).toBe('');
  expect(publications[2].mediaId).toBe(mediaIds[1]);
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

test('Clip Studio discloses source-only output and downloads the original file', async ({ page }) => {
  await installApiBoundary(page);
  await page.goto('/clips');

  await expect(page.locator('#main-content').getByRole('heading', { name: 'Clip Studio', exact: true })).toBeVisible();
  await expect(page.getByText(/The vertical crop and title overlay are previews/)).toBeVisible();
  await expect(page.getByText(/Cropping, caption burn-in, and audio mixing are not available here/)).toBeVisible();
  await expect(page.getByText(/BGMI CLUTCH|60 FPS|CLUTCH GOD|Viral 9:16/i)).toHaveCount(0);

  await page.locator('#clip-source-video').setInputFiles({
    name: 'creator-source.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('synthetic source video'),
  });
  await page.waitForFunction(() => document.querySelector('video[aria-label="Selected clip preview"]')?.getAttribute('src')?.startsWith('blob:'));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original source', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^yor-clip-original-\d+\.mp4$/);
});

test('Creator Studio identifies local previews and creates topic-based drafts', async ({ page }) => {
  await installApiBoundary(page);
  await page.goto('/studio');

  await expect(page.locator('#main-content').getByRole('heading', { name: 'Creator Studio Preview', exact: true })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('live stream');

  await page.getByRole('button', { name: 'Visual filter preview' }).click();
  await expect(page.getByText(/These CSS filters preview on a local abstract sample/)).toBeVisible();
  const neonFilter = page.getByRole('button', { name: /Neon tint/ });
  await neonFilter.click();
  await expect(neonFilter).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Local hook drafts' }).click();
  await expect(page.getByText(/No AI provider is contacted/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Topic or idea' }).fill('accessible design');
  await page.getByRole('button', { name: 'Create sample drafts' }).click();
  await expect(page.getByText('A quick guide to accessible design', { exact: true })).toBeVisible();
  await expect(page.getByText('What I learned while exploring accessible design', { exact: true })).toBeVisible();
});

test('creator media kit uses the latest real snapshot and exports a usable JSON file', async ({ page }) => {
  await installApiBoundary(page);
  const snapshots = [
    { id: 'daily-latest', creatorId: user.id, date: '2026-10-15T00:00:00.000Z', profileViews: 7, newFollowers: 2,
      totalPostViews: 480, totalReelViews: 120, totalEngagement: 33, estimatedEarnings: 1250 },
    { id: 'daily-older', creatorId: user.id, date: '2026-10-14T00:00:00.000Z', profileViews: 12, newFollowers: 4,
      totalPostViews: 450, totalReelViews: 115, totalEngagement: 30, estimatedEarnings: 900 },
  ];
  await page.route('**/api/economy/analytics', (route) => json(route, snapshots));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/media-kit');

  await expect(page.getByRole('heading', { name: 'Creator media kit', exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('7', { exact: true })).toBeVisible();
  await expect(page.getByText('480', { exact: true })).toBeVisible();
  await expect(page.getByText(/3\.8M\+|Tier-1 Creator|9\.4% ER|45,000/)).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^yor-creator-media-kit-ada\.json$/);
  const exported = JSON.parse(readFileSync((await download.path())!, 'utf8')) as { creator: { profileUrl: string }; latestAnalyticsSnapshot: { profileViews: number } };
  expect(exported.creator.profileUrl).toMatch(/\/profile\/1cc96a14-2728-46fd-ae3c-cbf15fd9db1a$/);
  expect(exported.latestAnalyticsSnapshot.profileViews).toBe(7);

  await page.getByRole('button', { name: 'Copy profile link', exact: true }).click();
  await expect(page.getByText('Profile link copied', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/profile\/1cc96a14-2728-46fd-ae3c-cbf15fd9db1a$/);
});

test('trophy room renders achievements returned for the current account', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('**/api/achievements/me', (route) => json(route, [
    { id: 'first-post', title: 'First Post', description: 'Publish your first post', icon: 'Sparkles', goal: 1, progress: 1, xp: 50, unlocked: true },
    { id: 'rising-voice', title: 'Rising Voice', description: 'Reach 1,000 followers', icon: 'TrendingUp', goal: 1000, progress: 12, xp: 200, unlocked: false },
  ]));
  await page.goto('/trophies');

  await expect(page.getByRole('heading', { name: 'Achievements', exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'First Post', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Rising Voice/ })).toBeVisible();
  await expect(page.getByText(/BGIS National Championship|Valorant South Asia Masters|official clan/i)).toHaveCount(0);
});

test('projects list filters persisted records and lets members answer real invitations', async ({ page }) => {
  await installApiBoundary(page);
  const ownedProject = { id: '30000000-0000-4000-8000-000000000001', ownerId: user.id, title: 'Compiler Notes',
    description: 'A reading group for compiler design.', status: 'active', visibility: 'public', lookingForCollaborators: false,
    createdAt: user.createdAt, updatedAt: user.updatedAt };
  const invitedProject = { id: '30000000-0000-4000-8000-000000000002', ownerId: '10000000-0000-4000-8000-000000000099',
    title: 'Community Archive', description: 'Organize local history.', status: 'planning', visibility: 'private', lookingForCollaborators: false,
    createdAt: user.createdAt, updatedAt: user.updatedAt };
  let invitationDecision = '';
  await page.route('**/api/projects/invitations', (route) => json(route, { invitations: [{ project: invitedProject, role: 'advisor', status: 'pending' }] }));
  await page.route('**/api/projects', (route) => json(route, { projects: [ownedProject] }));
  await page.route('**/api/projects/*/collaborators/respond', async (route) => {
    invitationDecision = route.request().postDataJSON().decision;
    return json(route, { projectId: invitedProject.id, status: invitationDecision });
  });
  await page.goto('/projects');

  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /Compiler Notes/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Community Archive', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(page.getByText('Project invitation accepted', { exact: true })).toBeVisible();
  expect(invitationDecision).toBe('accepted');
  await expect(page.getByRole('heading', { name: 'Invitations for you', exact: true })).toHaveCount(0);

  await page.getByRole('textbox', { name: 'Search your projects' }).fill('compiler');
  await expect(page.getByRole('button', { name: /Compiler Notes/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Community Archive/ })).toHaveCount(0);
  await expect(page.getByText(/Creator DNA Match|Sarah J\.|DevMaster|98%|92%/)).toHaveCount(0);
});

test('project invitations and collaborator search distinguish outages from empty results and retry independently', async ({ page }) => {
  await installApiBoundary(page);
  const project = { id: '30000000-0000-4000-8000-000000000111', ownerId: user.id, title: 'Reliable Workspace',
    description: 'A persisted project.', status: 'planning', visibility: 'private', lookingForCollaborators: false,
    createdAt: user.createdAt, updatedAt: user.updatedAt };
  const collaborator = { ...user, id: '10000000-0000-4000-8000-000000000111', username: 'grace', fullName: 'Grace Hopper' };
  let invitationReads = 0, projectReads = 0, searchReads = 0;
  const unavailable = (route: Route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Temporarily unavailable' }) });
  await page.route('**/api/projects', route => { projectReads++; return json(route, { projects: [project] }); });
  await page.route('**/api/projects/invitations', route => ++invitationReads === 1 ? unavailable(route) : json(route, { invitations: [] }));
  await page.route('**/api/users/search?*', route => ++searchReads === 1 ? unavailable(route) : json(route, [collaborator]));
  await page.goto('/projects');
  await expect(page.getByRole('button', { name: /Reliable Workspace/ })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Project invitations could not be loaded.' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry project invitations', exact: true }).click();
  await expect(page.getByText('Project invitations could not be loaded.', { exact: true })).toHaveCount(0);
  expect(invitationReads).toBe(2);
  expect(projectReads).toBe(1);

  await page.getByRole('button', { name: /Reliable Workspace/ }).click();
  await page.getByRole('textbox', { name: 'Search people to invite' }).fill('grace');
  await expect(page.getByText('People could not be searched.', { exact: true })).toBeVisible();
  await expect(page.getByText('No matching accounts found.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry people search', exact: true }).click();
  await expect(page.getByText('Grace Hopper', { exact: true })).toBeVisible();
  expect(searchReads).toBe(2);
});

test('project invitation decisions stay locked independently until each server write finishes', async ({ page }) => {
  await installApiBoundary(page);
  const projects = ['First invitation', 'Second invitation'].map((title, index) => ({
    id: `30000000-0000-4000-8000-00000000012${index}`, ownerId: '10000000-0000-4000-8000-000000000099', title,
    description: 'Shared work.', status: 'planning', visibility: 'private', lookingForCollaborators: false,
    createdAt: user.createdAt, updatedAt: user.updatedAt,
  }));
  const releases: (() => void)[] = [];
  const writes = [0, 0];
  await page.route('**/api/projects', route => json(route, { projects: [] }));
  await page.route('**/api/projects/invitations', route => json(route, { invitations: projects.map(project => ({ project, role: 'collaborator', status: 'pending' })) }));
  await page.route('**/api/projects/*/collaborators/respond', async route => {
    const index = projects.findIndex(project => route.request().url().includes(project.id));
    writes[index]++;
    await new Promise<void>(resolve => { releases[index] = resolve; });
    return json(route, { projectId: projects[index].id, status: 'accepted' });
  });
  try {
    await page.goto('/projects');
    const first = page.getByRole('article').filter({ hasText: 'First invitation' });
    const second = page.getByRole('article').filter({ hasText: 'Second invitation' });
    await first.getByRole('button', { name: 'Accept', exact: true }).click();
    await second.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(first.getByRole('button', { name: 'Accept', exact: true })).toBeDisabled();
    await expect(second.getByRole('button', { name: 'Accept', exact: true })).toBeDisabled();
    await expect.poll(() => writes).toEqual([1, 1]);
    releases[1]();
    await expect(second).toHaveCount(0);
    await expect(first.getByRole('button', { name: 'Accept', exact: true })).toBeDisabled();
    releases[0]();
    await expect(first).toHaveCount(0);
    await expect(page.getByRole('button', { name: /First invitation/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Second invitation/ })).toBeVisible();
    expect(writes).toEqual([1, 1]);
  } finally {
    releases.forEach(release => release());
  }
});

test('public marketplace hides unconnected sample game inventory and trades', async ({ page }) => {
  await installApiBoundary(page);
  await page.goto('/marketplace');

  await expect(page.locator('#main-content').getByRole('heading', { name: 'Marketplace', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Steam inventory|Trade Skin|Gear trade|Trade Offer/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sell Item', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Orders', exact: true })).toHaveCount(0);
  await expect(page.getByText(/Development demo|Sample game inventory|Valkyrie_Zero|Verified Skins/i)).toHaveCount(0);
  await expect(page.getByText(/Prices are shown in INR; checkout and selling are disabled/i)).toBeVisible();

  await page.goto('/store');
  await expect(page.getByRole('heading', { name: 'Creator commerce is paused', exact: true })).toBeVisible();
  await expect(page.getByText('Verified commerce', { exact: true })).toHaveCount(0);
});

test('Bazaar distinguishes illustrative game offers and removes fabricated reviews and verification', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('https://images.unsplash.com/**', route => route.fulfill({ contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64') }));
  await page.goto('/bazaar');
  await expect(page.getByRole('heading', { name: 'Indie Game Hub', exact: true })).toBeVisible();
  await expect(page.getByText('Illustrative games, studios and prices. No customer reviews or digital purchases are connected.', { exact: true })).toBeVisible();
  await expect(page.getByText('Illustrative price', { exact: true })).toBeVisible();
  await expect(page.getByText(/Verified Creator Studios|4\.9|4\.8|4\.7|1420|890|3200/)).toHaveCount(0);
});

test('profile hover card uses stored profile data instead of fabricated game presence or badges', async ({ page }) => {
  await installApiBoundary(page);
  await page.goto('/');

  const usernames = page.getByText('@ada', { exact: true });
  const usernameCountBeforeHover = await usernames.count();
  await page.getByRole('link', { name: "View Ada Lovelace's profile" }).first().hover();
  await expect.poll(() => usernames.count()).toBeGreaterThan(usernameCountBeforeHover);
  await expect(page.getByText('Cyberpunk 2077: Phantom Liberty', { exact: true })).toHaveCount(0);
  await expect(page.getByText('In-Game', { exact: true })).toHaveCount(0);
  await expect(page.getByText('42 Badges', { exact: true })).toHaveCount(0);
});

test('ambient player starts generated audio, changes gain, pauses, and closes on shell exit', async ({ page }) => {
  await page.addInitScript(() => {
    const stats = { started: 0, stopped: 0, closed: 0, filteredVoices: 0, gainValues: [] as number[] };
    Object.defineProperty(window, '__ambientAudioStats', { value: stats, configurable: true });
    class FakeParam {
      value = 0;
      setTargetAtTime(value: number) { this.value = value; stats.gainValues.push(value); }
    }
    class FakeNode {
      connect(target: unknown) {
        if (this instanceof FakeGain && target instanceof FakeFilter) stats.filteredVoices++;
        return this;
      }
      disconnect() {}
    }
    class FakeOscillator extends FakeNode {
      frequency = new FakeParam();
      type = 'sine';
      start() { stats.started++; }
      stop() { stats.stopped++; }
    }
    class FakeGain extends FakeNode { gain = new FakeParam(); }
    class FakeFilter extends FakeNode {
      type = 'lowpass';
      frequency = new FakeParam();
      Q = new FakeParam();
    }
    class FakeAudioContext {
      state = 'suspended';
      currentTime = 0;
      destination = new FakeNode();
      createGain() { return new FakeGain(); }
      createBiquadFilter() { return new FakeFilter(); }
      createOscillator() { return new FakeOscillator(); }
      async resume() { this.state = 'running'; }
      async suspend() { this.state = 'suspended'; }
      async close() { this.state = 'closed'; stats.closed++; }
    }
    Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext, writable: true, configurable: true });
  });
  await installApiBoundary(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Play ambient audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause ambient audio', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__ambientAudioStats.started)).toBeGreaterThanOrEqual(5);
  await expect.poll(() => page.evaluate(() => (window as any).__ambientAudioStats.filteredVoices)).toBe(1);

  await page.getByRole('button', { name: 'Mute ambient audio', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__ambientAudioStats.gainValues.at(-1))).toBe(0);
  await page.getByRole('button', { name: 'Choose ambience', exact: true }).click();
  await page.getByRole('button', { name: /Night Signal/ }).click();
  await expect(page.getByText('Night Signal', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__ambientAudioStats.started)).toBeGreaterThanOrEqual(10);

  await page.getByRole('button', { name: 'Pause ambient audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play ambient audio', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__ambientAudioStats.stopped)).toBeGreaterThanOrEqual(5);
  await page.evaluate(() => {
    window.history.pushState({}, '', '/terms');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect.poll(() => page.evaluate(() => (window as any).__ambientAudioStats.closed)).toBeGreaterThanOrEqual(1);
});

test('community slug deep links resolve uncached records and use canonical IDs for every action', async ({ page }) => {
  await installApiBoundary(page);
  const community = { id: '60000000-0000-4000-8000-000000000001', slug: 'compiler-circle', name: 'Compiler Circle',
    description: 'Compiler design discussions.', ownerId: '10000000-0000-4000-8000-000000000099', moderators: [], memberIds: [],
    memberCount: 12, isMember: false, createdAt: user.createdAt, visibility: 'public', contentRating: 'regular' };
  const discussion = { id: '60000000-0000-4000-8000-000000000002', title: 'A new compiler discussion',
    content: 'Discussing compiler implementation.', tag: 'General', repliesCount: 0, likes: 0, createdAt: user.createdAt, author: user };
  const actions: string[] = [];
  await page.route('**/api/communities', route => json(route, [{ ...community, id: 'unrelated-circle', name: 'Unrelated Circle', slug: 'unrelated' }]));
  await page.route('**/api/communities/compiler-circle', route => json(route, community));
  await page.route(`**/api/communities/${community.id}/discussions`, route => {
    actions.push(`${route.request().method()} discussions`);
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON().title).toBe(discussion.title);
      return json(route, discussion);
    }
    return json(route, []);
  });
  await page.route(`**/api/communities/${community.id}/join`, route => {
    actions.push('join');
    return json(route, { ...community, memberCount: 13, isMember: true });
  });
  await page.route(`**/api/communities/${community.id}/leave`, route => {
    actions.push('leave');
    return json(route, community);
  });
  await page.route(`**/api/communities/${community.id}/discussions/${discussion.id}/like`, route => {
    actions.push('like');
    return json(route, { ...discussion, likes: 1, likedByMe: true });
  });
  await page.goto('/communities/compiler-circle');
  await expect(page.getByRole('heading', { name: community.name, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unrelated Circle', exact: true })).toHaveCount(0);
  await expect(page.getByText('No discussions yet. Start the first conversation for this world.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Discussion', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Join Circle', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Joined Circle', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start Discussion', exact: true }).click();
  await page.getByRole('textbox', { name: 'Discussion title', exact: true }).fill(discussion.title);
  await page.getByRole('textbox', { name: 'Discussion details', exact: true }).fill(discussion.content);
  await page.getByRole('button', { name: 'Publish Thread', exact: true }).click();
  await expect(page.getByRole('heading', { name: discussion.title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Like', exact: true }).click();
  await expect(page.getByText('Discussion liked', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Joined Circle', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join Circle', exact: true })).toBeVisible();
  expect(actions).toEqual(['GET discussions', 'join', 'POST discussions', 'like', 'leave']);
});

test('community deep links distinguish missing records from retryable failures and retry discussions', async ({ page }) => {
  await installApiBoundary(page);
  const community = { id: '60000000-0000-4000-8000-000000000011', slug: 'retry-circle', name: 'Retry Circle',
    description: 'A community beyond the initial list.', ownerId: user.id, moderators: [], memberIds: [], createdAt: user.createdAt };
  await page.route('**/api/communities/missing-circle', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Community not found' }) }));
  let detailReads = 0, discussionReads = 0;
  await page.route('**/api/communities/retry-circle', route => {
    if (++detailReads === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Temporarily unavailable' }) });
    return json(route, community);
  });
  await page.route(`**/api/communities/${community.id}/discussions`, route => {
    if (++discussionReads === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Temporarily unavailable' }) });
    return json(route, []);
  });
  await page.goto('/communities/missing-circle');
  await expect(page.getByRole('heading', { name: 'Circle not found', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join Circle', exact: true })).toHaveCount(0);
  await page.goto('/communities/retry-circle');
  await expect(page.getByRole('heading', { name: 'Could not load this circle', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retry circle', exact: true }).click();
  await expect(page.getByRole('heading', { name: community.name, exact: true })).toBeVisible();
  await expect(page.getByText('Discussions could not be loaded.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Announcements', exact: true }).click();
  await expect(page.getByText('Discussions could not be loaded.', { exact: true })).toBeVisible();
  await expect(page.getByText('No official announcements have been posted in this world.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry discussions', exact: true }).click();
  await expect(page.getByText('No official announcements have been posted in this world.', { exact: true })).toBeVisible();
  expect(detailReads).toBe(2);
  expect(discussionReads).toBe(2);
});

test('accessibility preferences load before opening Control Room, persist across navigation, and reset on logout', async ({ page }) => {
  await installApiBoundary(page);
  const preference = { id: 'accessibility-preferences', kind: 'preference', itemKey: 'accessibility',
    payload: { largeText: true, highContrast: true, reducedMotion: true, captions: false }, createdAt: user.createdAt, updatedAt: user.updatedAt };
  let preferenceReads = 0;
  await page.route('**/api/creator/workspace*', route => {
    if (new URL(route.request().url()).searchParams.get('kind') === 'preference') preferenceReads++;
    return json(route, [preference]);
  });
  await page.route('**/api/auth/logout', route => json(route, null));
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).toHaveClass(/yor-accessibility-large-text/);
  await expect(root).toHaveClass(/yor-accessibility-high-contrast/);
  await expect(root).toHaveClass(/yor-accessibility-reduced-motion/);
  expect(await root.evaluate(element => getComputedStyle(element).fontSize)).toBe('18px');
  await page.evaluate(() => { history.pushState({}, '', '/control-room'); dispatchEvent(new PopStateEvent('popstate')); });
  await page.getByRole('button', { name: 'Access for everyone', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /^Large text/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /^Captions & transcripts/ })).not.toBeChecked();
  await page.evaluate(() => { history.pushState({}, '', '/settings'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible();
  await expect(root).toHaveClass(/yor-accessibility-large-text/);
  await expect(root).toHaveClass(/yor-accessibility-high-contrast/);
  await expect(root).toHaveClass(/yor-accessibility-reduced-motion/);
  expect(preferenceReads).toBe(1);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
  await expect(root).not.toHaveClass(/yor-accessibility-/);
});

test('accessibility load failures require retry and failed saves restore the previous preference', async ({ page }) => {
  await installApiBoundary(page);
  let failLoading = true, saves = 0;
  let preference = { id: 'accessibility-preferences', kind: 'preference', itemKey: 'accessibility',
    payload: { largeText: false, highContrast: false, reducedMotion: false, captions: true }, createdAt: user.createdAt, updatedAt: user.updatedAt };
  await page.route('**/api/creator/workspace*', route => {
    if (route.request().method() === 'PUT') {
      if (++saves === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Preferences could not be saved' }) });
      preference = { ...preference, payload: route.request().postDataJSON().payload };
      return json(route, preference);
    }
    if (new URL(route.request().url()).searchParams.get('kind') === 'preference' && failLoading) {
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Preferences unavailable' }) });
    }
    return json(route, [preference]);
  });
  await page.goto('/control-room');
  await page.getByRole('button', { name: 'Access for everyone', exact: true }).click();
  const largeText = page.getByRole('checkbox', { name: /^Large text/ });
  await expect(page.getByText('Your accessibility settings could not be loaded. Retry before changing them.', { exact: true })).toBeVisible();
  await expect(largeText).toBeDisabled();
  failLoading = false;
  await page.getByRole('button', { name: 'Retry accessibility settings', exact: true }).click();
  await expect(largeText).toBeEnabled();
  // The rejected save rolls back immediately, so Playwright's check helper
  // would fail because the controlled checkbox is already unchecked again.
  await largeText.click();
  await expect(page.getByText('Preferences could not be saved', { exact: true })).toBeVisible();
  await expect(largeText).not.toBeChecked();
  await expect(page.locator('html')).not.toHaveClass(/yor-accessibility-large-text/);
  await largeText.check();
  await expect(largeText).toBeEnabled();
  await expect(largeText).toBeChecked();
  await expect(page.locator('html')).toHaveClass(/yor-accessibility-large-text/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/yor-accessibility-large-text/);
  expect(saves).toBe(2);
});

test('language control describes the English interface without applying unavailable translations', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('yortalks-lang', 'fr'));
  await installApiBoundary(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://yor-talks.test/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://yor-talks.test/og-card.png');
  const previewImage = await page.evaluate(async () => {
    const response = await fetch('/og-card.png', { method: 'HEAD' });
    return { status: response.status, contentType: response.headers.get('content-type') };
  });
  expect(previewImage).toEqual({ status: 200, contentType: 'image/png' });
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Interface language: English', exact: true }).click();
  await expect(page.getByText('Yor Talks is currently available in English.', { exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem')).toHaveCount(1);
  await expect(page.getByRole('menuitem', { name: 'English', exact: true })).toBeDisabled();
  await expect(page.getByRole('menuitem', { name: /French|Hindi|Arabic/ })).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('moderator can page and filter reports and handle a grievance with a private officer note', async ({ page }) => {
  await installApiBoundary(page, { ...user, role: 'moderator' });
  const firstReport = { id: '70000000-0000-4000-8000-000000000001', reporterId: user.id,
    entityType: 'post', entityId: 'reported-item-1', reason: 'spam', details: 'First report', status: 'pending',
    decisionReason: null, createdAt: user.createdAt, resolvedAt: null };
  const olderReport = { ...firstReport, id: '70000000-0000-4000-8000-000000000002', entityId: 'reported-item-2', details: 'Older report' };
  const decisionReason = 'Reviewed the content and confirmed the report meets our spam policy.';
  const grievance = { id: '70000000-0000-4000-8000-000000000003', ticketId: 'YT-GRV-123456ABCD',
    category: 'privacy_violation', reportedUrl: 'https://example.test/private', reporterName: 'Private Reporter',
    reporterEmail: 'reporter@example.test', description: 'Please review this privacy complaint carefully.',
    status: 'received', slaDeadline: null, createdAt: user.createdAt, officerNote: null };
  const requests: string[] = [];
  await page.route('**/api/reports/queue*', async route => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status') ?? 'all';
    const cursor = url.searchParams.get('cursor');
    requests.push(`reports:${status}:${cursor ?? 'first'}`);
    if (route.request().method() === 'PATCH') return json(route, { ...firstReport, status: route.request().postDataJSON().status });
    if (status === 'reviewed') return json(route, [{ ...firstReport, status: 'reviewed' }], { hasMore: false, nextCursor: null, limit: 50 });
    if (status === 'resolved') return json(route, [{ ...firstReport, status: 'resolved', decisionReason }], { hasMore: false, nextCursor: null, limit: 50 });
    if (status === 'all') return json(route, [firstReport, olderReport], { hasMore: false, nextCursor: null, limit: 50 });
    return json(route, cursor ? [olderReport] : [firstReport], { hasMore: !cursor, nextCursor: cursor ? null : 'signed-cursor-fixture', limit: 50 });
  });
  await page.route(`**/api/reports/${firstReport.id}/status`, route => {
    expect(route.request().postDataJSON()).toEqual({ status: 'resolved', decisionReason });
    return json(route, { ...firstReport, status: 'resolved', decisionReason, resolvedAt: user.createdAt });
  });
  await page.route(`**/api/reports/${firstReport.id}/history`, route => json(route, [{
    id: '70000000-0000-4000-8000-000000000004', reportId: firstReport.id, moderatorId: user.id,
    fromStatus: 'reviewed', toStatus: 'resolved', decisionReason, createdAt: user.createdAt,
  }]));
  await page.route('**/api/reports/grievance/**', async route => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const body = route.request().postDataJSON();
    expect(body.officerNote).toBe('Visible only to the review team');
    return json(route, { ...grievance, status: body.status, officerNote: body.officerNote });
  });
  await page.route('**/api/reports/grievances*', route => {
    const url = new URL(route.request().url());
    requests.push(`grievances:${url.searchParams.get('status') ?? 'all'}:${url.searchParams.get('cursor') ?? 'first'}`);
    return json(route, [grievance], { hasMore: false, nextCursor: null, limit: 50 });
  });

  await page.goto('/moderation');
  await expect(page.getByText('First report', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load older reports', exact: true }).click();
  await expect(page.getByText('Older report', { exact: true })).toBeVisible();
  await page.getByRole('group', { name: 'Queue status' }).getByRole('button', { name: 'reviewed', exact: true }).click();
  await expect(page.getByText('First report', { exact: true })).toBeVisible();
  await expect(page.getByText('Older report', { exact: true })).toHaveCount(0);
  const reportCard = page.locator('article').filter({ hasText: 'First report' });
  const resolveReport = reportCard.getByRole('button', { name: 'resolved', exact: true });
  await expect(resolveReport).toBeDisabled();
  await reportCard.getByLabel('Decision reason (required to resolve or dismiss)').fill(decisionReason);
  await expect(resolveReport).toBeEnabled();
  await resolveReport.click();
  await page.getByRole('group', { name: 'Queue status' }).getByRole('button', { name: 'resolved', exact: true }).click();
  const resolvedReportCard = page.locator('article').filter({ hasText: 'First report' });
  await resolvedReportCard.getByRole('button', { name: 'View decision history', exact: true }).click();
  await expect(resolvedReportCard.getByLabel('Report decision history').getByText(decisionReason, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'grievances', exact: true }).click();
  await expect(page.getByText('Reporter: Private Reporter · reporter@example.test', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'all', exact: true }).click();
  await page.getByLabel('Internal case note').fill('Visible only to the review team');
  await page.locator('article').getByRole('button', { name: 'under review', exact: true }).click();
  await expect(page.getByText('Internal note: Visible only to the review team', { exact: true })).toBeVisible();
  expect(requests).toContain('reports:pending:first');
  expect(requests).toContain('reports:pending:signed-cursor-fixture');
  expect(requests).toContain('reports:reviewed:first');
  expect(requests).toContain('grievances:received:first');
});

test('moderation discards history reads started before a new decision', async ({ page }) => {
  await installApiBoundary(page, { ...user, role: 'moderator' });
  const reportId = '71000000-0000-4000-8000-000000000001';
  const report = { id: reportId, reporterId: user.id, entityType: 'post', entityId: 'history-race-fixture', reason: 'spam',
    details: 'History race report', status: 'pending', decisionReason: null, createdAt: user.createdAt, resolvedAt: null };
  const decisionReason = 'Reviewed the reported content and recorded the current decision.';
  let decided = false;
  let historyReads = 0;
  let releaseHistory!: () => void;
  const priorHistory = new Promise<void>(resolve => { releaseHistory = resolve; });
  await page.route('**/api/reports/queue*', route => json(route, [{ ...report, ...(decided ? { status: 'resolved', decisionReason } : {}) }], { hasMore: false, nextCursor: null, limit: 50 }));
  await page.route(`**/api/reports/${reportId}/status`, route => {
    expect(route.request().postDataJSON()).toEqual({ status: 'resolved', decisionReason });
    decided = true;
    return json(route, { ...report, status: 'resolved', decisionReason, resolvedAt: user.createdAt });
  });
  await page.route(`**/api/reports/${reportId}/history`, async route => {
    historyReads++;
    const obsolete = historyReads === 1;
    if (obsolete) await priorHistory;
    return json(route, [{ id: '71000000-0000-4000-8000-000000000002', reportId, moderatorId: user.id,
      fromStatus: 'pending', toStatus: obsolete ? 'dismissed' : 'resolved',
      decisionReason: obsolete ? 'An obsolete history response must be discarded.' : decisionReason, createdAt: user.createdAt }]);
  });

  await page.goto('/moderation');
  await page.getByRole('group', { name: 'Queue status' }).getByRole('button', { name: 'all', exact: true }).click();
  const card = page.locator('article').filter({ hasText: 'History race report' });
  const historyStarted = page.waitForRequest(request => request.url().endsWith(`/reports/${reportId}/history`));
  await card.getByRole('button', { name: 'View decision history', exact: true }).click();
  await historyStarted;
  await card.getByLabel('Decision reason (required to resolve or dismiss)').fill(decisionReason);
  await card.getByRole('button', { name: 'resolved', exact: true }).click();
  await expect(card.getByText('post · resolved', { exact: true })).toBeVisible();
  const obsoleteResponse = page.waitForResponse(response => response.url().endsWith(`/reports/${reportId}/history`));
  releaseHistory();
  await (await obsoleteResponse).finished();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(card.getByText('An obsolete history response must be discarded.', { exact: true })).toHaveCount(0);
  await card.getByRole('button', { name: 'View decision history', exact: true }).click();
  await expect(card.getByLabel('Report decision history').getByText(decisionReason, { exact: true })).toBeVisible();
});

test('saved collection distinguishes outages from empty results and preserves confirmed videos on refresh failure', async ({ page }) => {
  await installApiBoundary(page);
  let mode: 'unavailable' | 'empty' | 'video' | 'outage' = 'unavailable';
  const mediaId = '72000000-0000-4000-8000-000000000001';
  const video = { id: '72000000-0000-4000-8000-000000000002', authorId: user.id, title: 'Confirmed saved video',
    description: 'Saved collection fixture', type: 'short', likes: 1, createdAt: user.createdAt,
    videoUrl: `/api/media/${mediaId}/content?token=saved-collection-fixture`, thumbnailUrl: null };
  const olderVideo = { ...video, id: '72000000-0000-4000-8000-000000000003', title: 'Older saved video' };
  const unavailable = (route: Route) => route.fulfill({ status: 503, contentType: 'application/json',
    body: JSON.stringify({ success: false, message: 'Saved collection is temporarily unavailable', data: null, errors: [] }) });
  await page.route('**/api/posts/saved*', route => {
    if (mode === 'unavailable' || mode === 'outage') return unavailable(route);
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    const hasMore = mode === 'video' && !cursor;
    return json(route, mode === 'video' && cursor ? [{ ...post('Older saved bookmark', '72000000-0000-4000-8000-000000000004'), savedByMe: true }] : [],
      { limit: 50, hasMore, nextCursor: hasMore ? 'saved-post-cursor-fixture' : null });
  });
  await page.route('**/api/videos/saved*', route => {
    if (mode === 'unavailable' || mode === 'outage') return unavailable(route);
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    const hasMore = mode === 'video' && !cursor;
    return json(route, mode === 'video' ? cursor ? [olderVideo] : [video] : [],
      { limit: 50, hasMore, nextCursor: hasMore ? 'saved-video-cursor-fixture' : null });
  });
  await page.route(`**/api/media/${mediaId}/content?*`, route => route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.from([0]) }));

  await page.goto('/saved');
  await expect(page.getByRole('button', { name: 'Retry saved posts', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry saved videos', exact: true })).toBeVisible();
  await expect(page.getByText('Nothing saved yet.', { exact: true })).toHaveCount(0);
  mode = 'empty';
  await page.getByRole('button', { name: 'Retry saved posts', exact: true }).click();
  await page.getByRole('button', { name: 'Retry saved videos', exact: true }).click();
  await expect(page.getByText('Nothing saved yet.', { exact: true })).toBeVisible();
  mode = 'video';
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confirmed saved video', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load older saved posts', exact: true }).click();
  await expect(page.getByText('Older saved bookmark', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load older saved videos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Older saved video', exact: true })).toBeVisible();
  mode = 'outage';
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('Your last loaded saved videos are still shown.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Confirmed saved video', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Older saved video', exact: true })).toBeVisible();
  await expect(page.getByText('Nothing saved yet.', { exact: true })).toHaveCount(0);
});

test('moderation keeps pending case mutations locked across filter and queue changes', async ({ page }) => {
  await installApiBoundary(page, { ...user, role: 'moderator' });
  const reportId = '73000000-0000-4000-8000-000000000001';
  const report = { id: reportId, reporterId: user.id, entityType: 'post', entityId: 'mutation-lock-fixture', reason: 'spam',
    details: 'Mutation lock report', status: 'pending', decisionReason: null, createdAt: user.createdAt, resolvedAt: null };
  const grievance = { id: '73000000-0000-4000-8000-000000000002', ticketId: 'YT-GRV-LOCK123456',
    category: 'privacy_violation', reportedUrl: 'https://example.test/lock-case', reporterName: 'Lock Fixture Reporter',
    reporterEmail: 'lock-reporter@example.test', description: 'Mutation lock grievance', status: 'received',
    slaDeadline: null, createdAt: user.createdAt, officerNote: null as string | null };
  const mutations = { reports: 0, grievances: 0 };
  let releaseReport!: () => void;
  let releaseGrievance!: () => void;
  const reportBarrier = new Promise<void>(resolve => { releaseReport = resolve; });
  const grievanceBarrier = new Promise<void>(resolve => { releaseGrievance = resolve; });
  await page.route('**/api/reports/queue*', route => {
    const status = new URL(route.request().url()).searchParams.get('status');
    return json(route, !status || status === report.status ? [report] : [], { hasMore: false, nextCursor: null, limit: 50 });
  });
  await page.route(`**/api/reports/${reportId}/status`, async route => {
    mutations.reports++;
    expect(route.request().postDataJSON()).toEqual({ status: 'reviewed' });
    await reportBarrier;
    report.status = 'reviewed';
    return json(route, report);
  });
  await page.route('**/api/reports/grievances*', route => {
    const status = new URL(route.request().url()).searchParams.get('status');
    return json(route, !status || status === grievance.status ? [grievance] : [], { hasMore: false, nextCursor: null, limit: 50 });
  });
  await page.route(`**/api/reports/grievance/${grievance.ticketId}/status`, async route => {
    mutations.grievances++;
    const body = route.request().postDataJSON();
    expect(body).toEqual({ status: 'under_review', officerNote: 'The reviewer is investigating this case.' });
    await grievanceBarrier;
    grievance.status = body.status;
    grievance.officerNote = body.officerNote;
    return json(route, grievance);
  });

  try {
    await page.goto('/moderation');
    const reportCard = page.locator('article').filter({ hasText: 'Mutation lock report' });
    const reportStarted = page.waitForRequest(request => request.url().endsWith(`/reports/${reportId}/status`));
    await reportCard.getByRole('button', { name: 'reviewed', exact: true }).click();
    await reportStarted;
    await page.getByRole('group', { name: 'Queue status' }).getByRole('button', { name: 'all', exact: true }).click();
    await expect(reportCard.getByRole('button', { name: 'reviewed', exact: true })).toBeDisabled();
    await page.getByRole('group', { name: 'Staff queue' }).getByRole('button', { name: 'grievances', exact: true }).click();
    await page.getByRole('group', { name: 'Staff queue' }).getByRole('button', { name: 'reports', exact: true }).click();
    await expect(reportCard.getByRole('button', { name: 'reviewed', exact: true })).toBeDisabled();
    await expect(reportCard.getByLabel('Decision reason (required to resolve or dismiss)')).toBeDisabled();
    await page.getByRole('button', { name: 'Home', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
    await page.goBack();
    await expect(reportCard.getByRole('button', { name: 'reviewed', exact: true })).toBeDisabled();
    await page.getByRole('group', { name: 'Queue status' }).getByRole('button', { name: 'all', exact: true }).click();
    await expect(reportCard.getByRole('button', { name: 'reviewed', exact: true })).toBeDisabled();
    expect(mutations.reports).toBe(1);
    const reportFinished = page.waitForResponse(response => response.url().endsWith(`/reports/${reportId}/status`));
    releaseReport();
    await (await reportFinished).finished();
    await expect(reportCard.getByText('post · reviewed', { exact: true })).toBeVisible();
    await expect(reportCard.getByRole('button', { name: 'pending', exact: true })).toBeEnabled();

    await page.getByRole('group', { name: 'Staff queue' }).getByRole('button', { name: 'grievances', exact: true }).click();
    const grievanceCard = page.locator('article').filter({ hasText: 'Mutation lock grievance' });
    await grievanceCard.getByLabel('Internal case note').fill('The reviewer is investigating this case.');
    const grievanceStarted = page.waitForRequest(request => request.url().endsWith(`/grievance/${grievance.ticketId}/status`));
    await grievanceCard.getByRole('button', { name: 'under review', exact: true }).click();
    await grievanceStarted;
    await page.getByRole('group', { name: 'Queue status' }).getByRole('button', { name: 'all', exact: true }).click();
    await expect(grievanceCard.getByRole('button', { name: 'under review', exact: true })).toBeDisabled();
    await page.getByRole('group', { name: 'Staff queue' }).getByRole('button', { name: 'reports', exact: true }).click();
    await page.getByRole('group', { name: 'Staff queue' }).getByRole('button', { name: 'grievances', exact: true }).click();
    await expect(grievanceCard.getByRole('button', { name: 'under review', exact: true })).toBeDisabled();
    await expect(grievanceCard.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
    await page.getByRole('group', { name: 'Queue status' }).getByRole('button', { name: 'all', exact: true }).click();
    await expect(grievanceCard.getByRole('button', { name: 'under review', exact: true })).toBeDisabled();
    expect(mutations.grievances).toBe(1);
    const grievanceFinished = page.waitForResponse(response => response.url().endsWith(`/grievance/${grievance.ticketId}/status`));
    releaseGrievance();
    await (await grievanceFinished).finished();
    await expect(grievanceCard.getByText('Internal note: The reviewer is investigating this case.', { exact: true })).toBeVisible();
    await expect(grievanceCard.getByRole('button', { name: 'received', exact: true })).toBeEnabled();
  } finally {
    releaseReport();
    releaseGrievance();
  }
});

test('saved collection retries a failed video append with the same cursor', async ({ page }) => {
  await installApiBoundary(page);
  const mediaId = '74000000-0000-4000-8000-000000000001';
  const firstVideo = { id: '74000000-0000-4000-8000-000000000002', authorId: user.id, title: 'Saved video before append',
    type: 'short', likes: 1, createdAt: user.createdAt, videoUrl: `/api/media/${mediaId}/content?token=append-retry-fixture`, thumbnailUrl: null };
  const olderVideo = { ...firstVideo, id: '74000000-0000-4000-8000-000000000003', title: 'Saved video after retry' };
  const cursor = 'same-video-page-fixture';
  const requestedCursors: Array<string | null> = [];
  let failAppend = true;
  await page.route('**/api/posts/saved*', route => json(route, [], { hasMore: false, nextCursor: null, limit: 50 }));
  await page.route('**/api/videos/saved*', route => {
    const requestedCursor = new URL(route.request().url()).searchParams.get('cursor');
    requestedCursors.push(requestedCursor);
    if (requestedCursor && failAppend) {
      failAppend = false;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Older videos are temporarily unavailable' }) });
    }
    return json(route, requestedCursor ? [firstVideo, olderVideo] : [firstVideo],
      { hasMore: !requestedCursor, nextCursor: requestedCursor ? null : cursor, limit: 50 });
  });
  await page.route(`**/api/media/${mediaId}/content?*`, route => route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.from([0]) }));

  await page.goto('/saved');
  await expect(page.getByRole('heading', { name: 'Saved video before append', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load older saved videos', exact: true }).click();
  await expect(page.getByText('Older saved videos could not load. Check your connection and retry.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saved video before append', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saved video after retry', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry saved videos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved video after retry', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saved video before append', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Retry saved videos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Load older saved videos', exact: true })).toHaveCount(0);
  expect(requestedCursors).toEqual([null, cursor, cursor]);
});

test('moderation refresh preserves a later external decision after an older mutation response arrives', async ({ page }) => {
  await installApiBoundary(page, { ...user, role: 'moderator' });
  const reportId = '75000000-0000-4000-8000-000000000001';
  let currentReport = { id: reportId, reporterId: user.id, entityType: 'post', entityId: 'generation-guard-fixture', reason: 'spam',
    details: 'Generation guard report', status: 'pending', decisionReason: null as string | null, createdAt: user.createdAt, resolvedAt: null as string | null };
  const currentRationale = 'Another moderator completed the investigation and recorded the current resolution.';
  let queueReads = 0;
  let releaseReviewedResponse!: () => void;
  let markReviewedCommitted!: () => void;
  const reviewedResponse = new Promise<void>(resolve => { releaseReviewedResponse = resolve; });
  const reviewedCommitted = new Promise<void>(resolve => { markReviewedCommitted = resolve; });
  await page.route('**/api/reports/queue*', route => {
    queueReads++;
    const status = new URL(route.request().url()).searchParams.get('status');
    return json(route, !status || status === currentReport.status ? [currentReport] : [], { hasMore: false, nextCursor: null, limit: 50 });
  });
  await page.route(`**/api/reports/${reportId}/status`, async route => {
    expect(route.request().postDataJSON()).toEqual({ status: 'reviewed' });
    currentReport = { ...currentReport, status: 'reviewed' };
    const committedSnapshot = { ...currentReport };
    markReviewedCommitted();
    await reviewedResponse;
    return json(route, committedSnapshot);
  });

  try {
    await page.goto('/moderation');
    await page.getByRole('group', { name: 'Queue status' }).getByRole('button', { name: 'all', exact: true }).click();
    const card = page.locator('article').filter({ hasText: 'Generation guard report' });
    await card.getByRole('button', { name: 'reviewed', exact: true }).click();
    await reviewedCommitted;
    currentReport = { ...currentReport, status: 'resolved', decisionReason: currentRationale, resolvedAt: user.createdAt };
    const beforeRefresh = queueReads;
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect.poll(() => queueReads).toBe(beforeRefresh + 1);
    await expect(card.getByText('post · resolved', { exact: true })).toBeVisible();
    await expect(card.getByLabel('Decision reason (required to resolve or dismiss)')).toHaveValue(currentRationale);

    const beforeCompletion = queueReads;
    const oldResponseFinished = page.waitForResponse(response => response.url().endsWith(`/reports/${reportId}/status`));
    const freshQueueResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/reports/queue');
    releaseReviewedResponse();
    await (await oldResponseFinished).finished();
    await expect.poll(() => queueReads).toBe(beforeCompletion + 1);
    await (await freshQueueResponse).finished();
    await expect(card.getByText('post · resolved', { exact: true })).toBeVisible();
    await expect(card.getByText('post · reviewed', { exact: true })).toHaveCount(0);
    await expect(card.getByLabel('Decision reason (required to resolve or dismiss)')).toHaveValue(currentRationale);
    await expect(card.getByLabel('Decision reason (required to resolve or dismiss)')).toBeEnabled();
  } finally {
    releaseReviewedResponse();
  }
});

test('storage notice is public, linked from sign-in and Settings, and optional analytics remain an explicit choice', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: `window.google={accounts:{id:{initialize(){},renderButton(parent){const button=document.createElement('button');button.textContent='Sign in with Google';parent.append(button)}}}};` }));
  await page.route('**/api/auth/refresh', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
  await page.goto('/cookies');
  await expect(page.getByRole('heading', { name: 'Cookies and Browser Storage', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Optional analytics', exact: true })).toBeVisible();
  await expect(page.getByText(/this release does not currently collect optional navigation or profiling events/i)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Legal information' }).getByRole('link', { name: 'Privacy', exact: true })).toBeVisible();
  await page.goto('/auth');
  await expect(page.getByRole('link', { name: 'Cookies and storage notice', exact: true })).toBeVisible();
  await page.unroute('**/api/auth/refresh');
  await page.goto('/settings');
  const optionalAnalytics = page.getByRole('switch', { name: 'Allow optional analytics', exact: true });
  await expect(optionalAnalytics).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('yor:telemetry:consent:v1'))).toBeNull();
  await optionalAnalytics.click();
  await expect(optionalAnalytics).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('yor:telemetry:consent:v1'))).toBe(user.id);
  await optionalAnalytics.click();
  await expect(optionalAnalytics).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('yor:telemetry:consent:v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('yor:telemetry:queue:v1'))).toBeNull();
  await expect(page.getByRole('link', { name: 'Cookies and storage notice', exact: true })).toBeVisible();
});

test('Studio camera blocks duplicate recording starts, stops access on close, and releases late permission streams', async ({ page }) => {
  await installApiBoundary(page);
  await page.addInitScript(() => {
    const stats = { starts: 0, stops: 0, tracksStopped: 0, cameraRequests: 0, hold: false, releases: [] as Array<() => void> };
    Object.defineProperty(window, '__studioCameraAudit', { value: stats, configurable: true });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => {
        stats.cameraRequests++;
        const stream = new MediaStream();
        stream.getTracks = () => [{ stop: () => { stats.tracksStopped++; } }] as unknown as MediaStreamTrack[];
        if (stats.hold) await new Promise<void>(resolve => { stats.releases.push(resolve); });
        return stream;
      },
    } });
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: class {
      static isTypeSupported() { return true; }
      state = 'inactive';
      mimeType = 'video/webm';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() { stats.starts++; this.state = 'recording'; }
      stop() {
        stats.stops++; this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['synthetic recording'], { type: this.mimeType }) });
        this.onstop?.();
      }
    } });
  });
  await page.route('**/api/videos', route => json(route, [{ id: 'synthetic-camera-audit', authorId: user.id, title: 'Camera lifecycle audit',
    videoUrl: 'data:video/mp4;base64,', thumbnailUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', type: 'short', views: 0, likes: 0, createdAt: user.createdAt }]));
  await page.route('**/api/videos/synthetic-camera-audit/comments', route => json(route, []));
  await page.goto('/videos');
  await page.getByRole('button', { name: 'Watch Camera lifecycle audit', exact: true }).click();
  const useSound = page.getByRole('button', { name: 'Use this sound', exact: true });
  await useSound.click();
  const record = page.getByRole('button', { name: 'Record video', exact: true });
  const studio = page.getByRole('dialog', { name: 'Studio Camera', exact: true });
  await expect(studio.getByRole('textbox', { name: 'Caption & #Tags', exact: true })).toBeVisible();
  await expect(studio.getByText('Filters and stickers are local previews and are not included in published media. Videos record microphone audio only; reference audio is not mixed into the recording.', { exact: true })).toBeVisible();
  await expect(studio.getByText(/PRO 4K|WebGL shaders|128 BPM|Cyberpunk Anthem/)).toHaveCount(0);
  const stickerTrigger = studio.getByRole('button', { name: 'Preview stickers', exact: true });
  await stickerTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(studio.getByRole('button', { name: 'Close sticker previews', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(stickerTrigger).toBeFocused();
  await expect(studio).toBeVisible();
  await stickerTrigger.click();
  await studio.getByRole('button', { name: /Interactive Poll/ }).click();
  const sticker = studio.getByRole('group', { name: 'poll preview sticker', exact: true });
  await expect(sticker).toBeVisible();
  const initialStickerPosition = await sticker.boundingBox();
  await sticker.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await sticker.boundingBox())!.x).toBeGreaterThan(initialStickerPosition!.x);
  await sticker.getByRole('button', { name: 'Move sticker left', exact: true }).click();
  await expect.poll(async () => (await sticker.boundingBox())!.x).toBeLessThan(initialStickerPosition!.x);
  await sticker.focus();
  await page.keyboard.press('Delete');
  await expect(sticker).toHaveCount(0);
  await expect(stickerTrigger).toBeFocused();
  await stickerTrigger.click();
  await studio.getByRole('button', { name: /Live Countdown/ }).click();
  await expect(studio.getByText('Static sample · no timer is running')).toBeVisible();
  await studio.getByRole('group', { name: 'countdown preview sticker', exact: true }).getByRole('button', { name: 'Remove sticker' }).click();
  await expect(record).toBeEnabled();
  await record.evaluate(button => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await expect(page.getByRole('button', { name: 'Stop recording', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__studioCameraAudit.starts)).toBe(1);
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
  await expect(record).toBeEnabled();
  expect(await page.evaluate(() => (window as any).__studioCameraAudit.stops)).toBe(1);
  await page.getByRole('button', { name: 'Close Studio Camera', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__studioCameraAudit.tracksStopped)).toBe(1);
  await page.evaluate(() => { (window as any).__studioCameraAudit.hold = true; });
  await useSound.click();
  await expect.poll(() => page.evaluate(() => (window as any).__studioCameraAudit.releases.length)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close Studio Camera', exact: true }).click();
  await page.evaluate(() => { (window as any).__studioCameraAudit.releases.forEach((release: () => void) => release()); });
  await expect.poll(() => page.evaluate(() => {
    const stats = (window as any).__studioCameraAudit;
    return stats.tracksStopped === stats.cameraRequests;
  })).toBe(true);
  expect(await page.evaluate(() => (window as any).__studioCameraAudit.stops)).toBe(1);
});

test('account deletion supports keyboard cancellation, field feedback, and a retained failed draft before one synthetic retry', async ({ page }) => {
  await installApiBoundary(page);
  let deletions = 0;
  let releaseDeletion!: () => void;
  const heldDeletion = new Promise<void>(resolve => { releaseDeletion = resolve; });
  await page.route('**/api/users/me', async route => {
    if (route.request().method() === 'GET') return json(route, user);
    expect(route.request().method()).toBe('DELETE');
    expect(route.request().postDataJSON()).toEqual({ confirmation: 'DELETE', password: 'Synthetic-password-123!' });
    deletions++;
    if (deletions === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Deletion is temporarily unavailable.' }) });
    await heldDeletion;
    return json(route, null);
  });
  await page.route('**/api/auth/logout', route => json(route, null));
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: `window.google={accounts:{id:{initialize(){},renderButton(){}}}};` }));
  await page.goto('/settings');
  const trigger = page.getByRole('button', { name: 'Delete', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Permanently delete this account?', exact: true });
  const confirmation = dialog.getByRole('textbox', { name: 'Account deletion confirmation', exact: true });
  const password = dialog.getByLabel('Current password for account deletion', { exact: true });
  await expect(confirmation).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.getByRole('alert')).toHaveText('Type DELETE to confirm account removal.');
  await confirmation.fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(password).toBeFocused();
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  expect(deletions).toBe(0);
  await password.fill('Synthetic-password-123!');
  await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Deletion is temporarily unavailable.');
  await expect(confirmation).toHaveValue('DELETE');
  await expect(password).toHaveValue('Synthetic-password-123!');
  try {
    await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).evaluate(button => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(dialog.getByRole('button', { name: 'Deleting…', exact: true })).toBeDisabled();
    await expect.poll(() => deletions).toBe(2);
    releaseDeletion();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText('Your account has been deleted. External cleanup and retained records follow the Privacy Notice.', { exact: true })).toBeVisible();
    expect(deletions).toBe(2);
  } finally { releaseDeletion(); }
});

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`compliance surfaces preserve contrast, accessible names, and layout at ${width}px in ${colorScheme} mode`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const browserErrors: string[] = [];
      const consoleErrors: string[] = [];
      const externalFontRequests: string[] = [];
      page.on('request', request => {
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(request.url()).hostname)) externalFontRequests.push(request.url());
      });
      page.on('pageerror', error => browserErrors.push(error.message));
      page.on('console', entry => { if (entry.type() === 'error') consoleErrors.push(entry.text()); });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(scheme => localStorage.setItem('theme', scheme), colorScheme);
      await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
      await installApiBoundary(page, { ...user, avatarUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=' });
      await page.route('**/api/projects', route => json(route, { projects: [] }));
      await page.route('**/api/projects/invitations', route => json(route, { invitations: [] }));
      for (const [path, heading] of [
        ['/', 'Home'], ['/settings', 'Settings'], ['/cookies', 'Cookies and Browser Storage'],
        ['/grievance', 'Trust & Safety Report Portal'], ['/projects', 'Projects'],
      ]) {
        await page.goto(path);
        const headingScope = path === '/settings' ? page.locator('#main-content') : page;
        await expect(headingScope.getByRole('heading', { name: heading, exact: true })).toBeVisible();
        if (path === '/') {
          await expect(page.getByRole('article')).toBeVisible();
          await page.keyboard.press('Tab');
          await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused();
          await page.keyboard.press('Enter');
          await expect(page.locator('#main-content')).toBeFocused();
          const animationDuration = await page.getByRole('article').evaluate(element => getComputedStyle(element).animationDuration);
          expect(animationDuration.split(',').every(value => parseFloat(value) <= 0.01)).toBe(true);
        }
        if (path === '/projects') await expect(page.getByText('No projects yet', { exact: true })).toBeVisible();
        const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
        expect(dimensions.document, `Horizontal overflow at ${path}`).toBeLessThanOrEqual(dimensions.viewport + 1);
        const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        await testInfo.attach(`${path.replace(/\//g, '') || 'home'}-accessibility.json`, { contentType: 'application/json', body: JSON.stringify({ path, width, colorScheme, violations: accessibility.violations, incomplete: accessibility.incomplete }, null, 2) });
        expect(accessibility.violations, `Accessibility failures at ${path}`).toEqual([]);
      }
      expect(browserErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(externalFontRequests).toEqual([]);
    });
  }
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`public registration and legal pages expose accessible forms in ${colorScheme} mode`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', entry => {
      // The explicit signed-out refresh fixture is expected to return 401.
      if (entry.type() === 'error' && !new URL(entry.location().url || 'http://fixture.test').pathname.endsWith('/api/auth/refresh')) errors.push(entry.text());
    });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(scheme => localStorage.setItem('theme', scheme), colorScheme);
    await installApiBoundary(page);
    await page.route('**/api/auth/refresh', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
    await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: `window.google={accounts:{id:{initialize(){},renderButton(parent){const button=document.createElement('button');button.textContent='Sign in with Google';parent.append(button)}}}};` }));
    for (const path of ['/auth', '/privacy', '/terms', '/cookies']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      await testInfo.attach(`${path.slice(1)}-public-accessibility.json`, { contentType: 'application/json', body: JSON.stringify({ path, colorScheme, violations: result.violations, incomplete: result.incomplete }, null, 2) });
      expect(result.violations, `Accessibility failures at ${path}`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}
