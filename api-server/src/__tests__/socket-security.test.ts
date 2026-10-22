import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test, type TestContext } from "node:test";
import jwt from "jsonwebtoken";
import { io as connectClient, type Socket } from "socket.io-client";
import { env } from "../config/env.js";
import { attachSocketServer } from "../socket/index.js";
import { dispatchSocketToUsers, parseSocketPayload } from "../socket/policy.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { ConversationRepository } from "../repositories/message-repository.js";
import { MessageService, UnauthorizedError } from "../services/message-service.js";
import { EligibilityService } from "../services/eligibility-service.js";
import { ContactAuthorizationDeniedError, ContactAuthorizationService } from "../services/contact-authorization-service.js";
import { MessageRepository } from "../repositories/message-repository.js";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import { ContentSafetyService } from "../services/content-safety-service.js";
import { MessageController } from "../controllers/message-controller.js";

const userId = "10000000-0000-4000-8000-000000000001";
const recipientId = "10000000-0000-4000-8000-000000000002";
const conversationId = "20000000-0000-4000-8000-000000000001";

function event(socket: Socket, name: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off(name, listener); reject(new Error(`Timed out waiting for ${name}`)); }, 4000);
    const listener = (value: unknown) => { clearTimeout(timeout); resolve(value); };
    socket.once(name, listener);
  });
}

async function fixture(t: TestContext) {
  const original = { PUBLIC_BETA: env.PUBLIC_BETA, LIVE_ROOMS_ENABLED: env.LIVE_ROOMS_ENABLED, RTC_CALLS_ENABLED: env.RTC_CALLS_ENABLED };
  Object.assign(env, { PUBLIC_BETA: true, LIVE_ROOMS_ENABLED: false, RTC_CALLS_ENABLED: false });
  t.after(() => Object.assign(env, original));
  const state = { consent: true, active: true, authVersion: 0, budget: true, joinsFail: false, sent: 0, lookups: 0,
    contactsAllowed: true, contactChecks: 0, restrictedUsers: new Set<string>(), minorUsers: new Set<string>(),
    receiptDisabledUsers: new Set<string>(), revokedSessionUsers: new Set<string>(), currentMembers: [userId, recipientId] };
  t.mock.method(RedisRepository.prototype, "getStrict", async (key: string) =>
    state.active && ![...state.revokedSessionUsers].some(id => key.startsWith(`session:${id}:`)) ? "session" : null);
  t.mock.method(RedisRepository.prototype, "consumeBudgetStrict", async () => state.budget);
  t.mock.method(UserRepository.prototype, "findById", async (id: string) => {
    state.lookups++;
    return { id, authVersion: state.authVersion, accountStatus: "active", role: "user", permissions: [],
      termsVersion: state.consent ? env.TERMS_VERSION : "outdated", termsAcceptedAt: "2026-08-31", ageConfirmedAt: "2026-08-31",
      settings: { readReceiptsEnabled: !state.receiptDisabledUsers.has(id) } };
  });
  t.mock.method(EligibilityService.prototype, "decisionFor", async (id: string) => {
    const activated = state.consent && !state.restrictedUsers.has(id);
    return { experience: activated ? state.minorUsers.has(id) ? "teen_13_17" : "adult_18_plus" : "unknown", activated,
      capabilities: Object.fromEntries(["social", "publish", "messaging", "payments", "seller", "memberships", "live", "rtc", "ai", "analytics", "profiling"]
        .map(capability => [capability, activated])), maximumContentRating: "child_safe", policyVersions: [], revision: "fixture",
      reason: activated ? null : "verification_required", publicBrowsingAllowed: false } as never;
  });
  t.mock.method(ConversationRepository.prototype, "listForUser", async () => []);
  t.mock.method(ConversationRepository.prototype, "getMembers", async () => {
    if (state.joinsFail) throw new Error("Database unavailable");
    return state.currentMembers;
  });
  t.mock.method(MessageService.prototype, "authorizeConversationDelivery", async (_conversationId: string, actorId: string) => {
    if (!state.contactsAllowed || state.restrictedUsers.has(actorId)) throw new UnauthorizedError("Messaging authority was revoked");
  });
  t.mock.method(ContactAuthorizationService.prototype, "requireContact", async () => {
    state.contactChecks++;
    if (!state.contactsAllowed) throw new ContactAuthorizationDeniedError("Contact was withdrawn or blocked");
  });
  t.mock.method(MessageService.prototype, "sendMessage", async (senderId: string, _recipientId: string, content: string) => {
    state.sent++;
    return { id: "message", senderId, conversationId, content };
  });
  const server = createServer();
  const sockets = await attachSocketServer(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const clients: Socket[] = [];
  t.after(async () => {
    clients.forEach((client) => client.disconnect());
    await new Promise<void>((resolve) => sockets.close(() => resolve()));
  });
  const connect = (id = userId, origin?: string) => {
    const client = connectClient(`http://127.0.0.1:${address.port}`, {
      transports: ["websocket"], reconnection: false, autoConnect: false,
      auth: { token: jwt.sign({ sub: id, deviceId: "test-device" }, env.JWT_SECRET, { expiresIn: "1h" }) },
      ...(origin ? { extraHeaders: { Origin: origin } } : {}),
    });
    clients.push(client);
    return new Promise<Socket>((resolve, reject) => {
      client.once("connect", () => resolve(client));
      client.once("connect_error", reject);
      client.connect();
    });
  };
  return { state, connect, server: sockets };
}

test("socket schemas reject null, malformed IDs, mass assignment and oversized messages", () => {
  for (const payload of [null, [], "text", {}, { recipientId: "not-an-id", content: "hello" },
    { recipientId, content: "x".repeat(4001) }, { recipientId, content: "hello", senderId: recipientId },
    { recipientId, conversationId, content: "ambiguous" }]) {
    assert.equal(parseSocketPayload("message:send", payload).success, false);
  }
  assert.equal(parseSocketPayload("constructor", {}).success, false);
  assert.equal(parseSocketPayload("message:send", { recipientId, content: " hello " }).success, true);
});

test("socket handshake rejects stale consent and hostile browser origins", async (t) => {
  const { state, connect } = await fixture(t);
  state.consent = false;
  await assert.rejects(connect(), /Authentication error/);
  state.consent = true;
  const lookupsBeforeOrigin = state.lookups;
  await assert.rejects(connect(userId, "https://attacker.example"), /websocket error/i);
  assert.equal(state.lookups, lookupsBeforeOrigin, "origin must be rejected before user lookup");
});

test("connected sockets recheck consent and revocation before an action", async (t) => {
  const { state, connect } = await fixture(t);
  const client = await connect();
  state.consent = false;
  const disconnected = event(client, "disconnect");
  client.emit("message:send", { recipientId, content: "hello" });
  await disconnected;
  assert.equal(state.sent, 0);
  state.consent = true;
  const second = await connect();
  state.active = false;
  const revoked = event(second, "disconnect");
  second.emit("message:send", { recipientId, content: "hello" });
  await revoked;
  assert.equal(state.sent, 0);
});

test("socket rejects malformed events, rate limits messages, and catches join failures", async (t) => {
  const { state, connect } = await fixture(t);
  const client = await connect();
  let response = event(client, "message:error");
  client.emit("message:send", null);
  assert.match((await response).error, /Invalid event payload/);
  state.budget = false;
  response = event(client, "message:error");
  client.emit("message:send", { recipientId, content: "hello" });
  assert.match((await response).error, /Too many requests/);
  assert.equal(state.sent, 0);
  state.budget = true;
  state.joinsFail = true;
  response = event(client, "realtime:error");
  client.emit("conversation:join", { conversationId });
  assert.match((await response).error, /temporarily unavailable/);
  assert.equal(client.connected, true);
});

test("new direct messages reach the recipient's connected devices on the first event", async (t) => {
  const { state, connect } = await fixture(t);
  const sender = await connect();
  const recipient = await connect(recipientId);
  const received = event(recipient, "message:receive");
  sender.emit("message:send", { recipientId, content: "First message", textStyleId: 'mono' });
  assert.equal((await received).content, "First message");
  assert.equal(state.sent, 1);
});

test("message delivery disconnects a recipient whose current messaging authority was revoked", async t => {
  const { state, connect, server } = await fixture(t);
  const sender = await connect();
  const recipient = await connect(recipientId);
  let receivedCount = 0;
  recipient.on("message:receive", () => { receivedCount++; });
  recipient.emit("conversation:join", { conversationId });
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal((await server.in(`conversation:${conversationId}`).fetchSockets()).length, 1);
  state.restrictedUsers.add(recipientId);
  const disconnected = event(recipient, "disconnect");
  const sent = event(sender, "message:sent");
  sender.emit("message:send", { recipientId, content: "Must not be delivered" });
  await sent;
  await disconnected;
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(recipient.connected, false);
  assert.equal(receivedCount, 0);
  assert.equal((await server.in(`conversation:${conversationId}`).fetchSockets()).length, 0, "revoked recipient leaves all social rooms");
  assert.equal(state.sent, 1);
});

test("socket live and call gates stay disabled", async (t) => {
  const { connect } = await fixture(t);
  const client = await connect();
  const stream = event(client, "stream:error");
  client.emit("stream:join", { streamId: conversationId });
  assert.match((await stream).error, /disabled/);
  const call = event(client, "call:error");
  client.emit("call:invite", { callId: "test-call-123", targetUserId: recipientId, callType: "audio", offer: { type: 'offer', sdp: 'synthetic-sdp' } });
  assert.match((await call).error, /disabled/);
});

test('connected sockets reject a revoked database epoch even if Redis still has the session', async t => {
  const { state, connect } = await fixture(t);
  const client = await connect();
  const disconnected = event(client, 'disconnect');
  state.authVersion = 1;
  client.emit('typing:start', { conversationId });
  await disconnected;
  assert.equal(state.active, true);
  assert.equal(client.connected, false);
});

async function waitFor(condition: () => boolean | Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!await condition()) {
    if (Date.now() >= deadline) assert.fail("Realtime operation did not settle");
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

function signalingOutcome(sender: Socket, target: Socket, errorEvent: string, deliveredEvent: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timeout); sender.off(errorEvent, denied); target.off(deliveredEvent, delivered); };
    const denied = () => { cleanup(); resolve("denied"); };
    const delivered = () => { cleanup(); resolve("delivered"); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error("Signaling operation did not settle")); }, 4_000);
    sender.once(errorEvent, denied);
    target.once(deliveredEvent, delivered);
  });
}

test("a false delivery admission suppresses an event without disconnecting an authorized recipient", async t => {
  const { connect, server } = await fixture(t);
  const recipient = await connect(recipientId);
  let received = 0;
  recipient.on("message:seen:update", () => { received++; });
  const delivered = await dispatchSocketToUsers(server, [recipientId], "message:seen:update", { seenAt: null }, "message:deliver",
    undefined, () => false);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(delivered, 0);
  assert.equal(received, 0);
  assert.equal(recipient.connected, true);
});

test("recipient device revocation during an awaited delivery guard prevents the event", async t => {
  const { state, connect, server } = await fixture(t);
  const recipient = await connect(recipientId);
  let delivered = 0;
  recipient.on("message:receive", () => { delivered++; });
  let enterGuard!: () => void;
  let releaseGuard!: () => void;
  const entered = new Promise<void>(resolve => { enterGuard = resolve; });
  const held = new Promise<void>(resolve => { releaseGuard = resolve; });
  const dispatch = dispatchSocketToUsers(server, [recipientId], "message:receive", { content: "Must remain private" }, "message:deliver",
    undefined, async () => { enterGuard(); await held; });
  await entered;
  state.revokedSessionUsers.add(recipientId);
  const disconnected = event(recipient, "disconnect");
  releaseGuard();
  assert.equal(await dispatch, 0);
  await disconnected;
  assert.equal(delivered, 0);
});

for (const boundary of ['payload', 'guard'] as const) {
  test(`recipient JWT expiry during an awaited ${boundary} prevents dispatch before the expiry timer runs`, async t => {
    const { connect, server } = await fixture(t);
    const recipient = await connect(recipientId);
    const serverSocket = server.sockets.sockets.get(recipient.id!);
    assert.ok(serverSocket);
    assert.equal(typeof serverSocket.data.expiresAt, 'number');
    let received = 0;
    recipient.on('message:receive', () => { received++; });
    let currentTime = Date.now();
    t.mock.method(Date, 'now', () => currentTime);
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { enter = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    t.after(() => release());
    const payload = { content: 'Must remain private after token expiry' };
    const dispatch = dispatchSocketToUsers(server, [recipientId], 'message:receive',
      boundary === 'payload' ? async () => { enter(); await held; return payload; } : payload,
      'message:deliver', undefined,
      boundary === 'guard' ? async () => { enter(); await held; } : undefined);
    await entered;
    // Advance the authority clock to the signed JWT's exact expiry. Its real
    // timer is still scheduled in the future, modelling delayed timer delivery.
    currentTime = serverSocket.data.expiresAt;
    assert.equal(recipient.connected, true);
    const disconnected = event(recipient, 'disconnect');
    release();
    assert.equal(await dispatch, 0);
    await disconnected;
    assert.equal(received, 0);
  });
}

test('recipient JWT expiry during final session authorization prevents dispatch', async t => {
  const { connect, server } = await fixture(t);
  const recipient = await connect(recipientId);
  const serverSocket = server.sockets.sockets.get(recipient.id!);
  assert.ok(serverSocket);
  let currentTime = Date.now();
  t.mock.method(Date, 'now', () => currentTime);
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>(resolve => { enter = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  t.after(() => release());
  const decisionFor = EligibilityService.prototype.decisionFor;
  let recipientChecks = 0, received = 0;
  recipient.on('message:receive', () => { received++; });
  t.mock.method(EligibilityService.prototype, 'decisionFor', async function(this: EligibilityService, id: string) {
    const decision = await decisionFor.call(this, id);
    if (id === recipientId && ++recipientChecks === 3) { enter(); await held; }
    return decision;
  });
  const dispatch = dispatchSocketToUsers(server, [recipientId], 'message:receive', { content: 'Private payload' }, 'message:deliver');
  await entered;
  currentTime = serverSocket.data.expiresAt;
  const disconnected = event(recipient, 'disconnect');
  release();
  assert.equal(await dispatch, 0);
  await disconnected;
  assert.equal(recipientChecks, 3);
  assert.equal(received, 0);
});

for (const [label, expiry] of [
  ['missing', undefined], ['null', null], ['text', '9999999999999'], ['NaN', Number.NaN],
  ['infinite', Number.POSITIVE_INFINITY], ['fractional', Date.now() + 60_000.5], ['expired', 0],
] as const) {
  test(`dispatcher rejects a recipient with ${label} token expiry before payload hydration`, async t => {
    const { connect, server } = await fixture(t);
    const recipient = await connect(recipientId);
    const serverSocket = server.sockets.sockets.get(recipient.id!);
    assert.ok(serverSocket);
    serverSocket.data.expiresAt = expiry;
    let hydrated = false;
    const disconnected = event(recipient, 'disconnect');
    const dispatched = await dispatchSocketToUsers(server, [recipientId], 'message:receive', () => {
      hydrated = true;
      return { content: 'Unavailable without a current token' };
    }, 'message:deliver');
    assert.equal(dispatched, 0);
    await disconnected;
    assert.equal(hydrated, false);
  });
}

test("conversation join cannot disclose presence after contact is withdrawn during room hydration", async t => {
  const { state, connect, server } = await fixture(t);
  const joining = await connect();
  const otherDevice = await connect();
  const peer = await connect(recipientId);
  peer.emit("conversation:join", { conversationId });
  await waitFor(async () => (await server.in(`conversation:${conversationId}`).fetchSockets()).length === 1);
  let received = 0;
  otherDevice.on("presence:update", () => { received++; });
  const originalIn = server.in.bind(server);
  let hydrated = false;
  t.mock.method(server, "in", (room: string | string[]) => {
    const operator = originalIn(room);
    if (room === `conversation:${conversationId}`) {
      const fetchSockets = operator.fetchSockets.bind(operator);
      operator.fetchSockets = async () => {
        const peers = await fetchSockets();
        state.contactsAllowed = false;
        hydrated = true;
        return peers;
      };
    }
    return operator;
  });
  joining.emit("conversation:join", { conversationId });
  await waitFor(() => hydrated && (received > 0 || !otherDevice.connected));
  assert.equal(received, 0, "presence must use current conversation contact authority at dispatch");
});

test("conversation join skips removed or revoked room peers while current peers remain visible", async t => {
  const { state, connect, server } = await fixture(t);
  const joining = await connect();
  const otherDevice = await connect();
  await connect(recipientId);
  const room = `conversation:${conversationId}`;
  server.in(recipientId).socketsJoin(room);
  await waitFor(async () => (await server.in(room).fetchSockets()).length === 1);
  const received: string[] = [];
  otherDevice.on("presence:update", value => { received.push(value.userId); });
  let memberChecks = 0;
  t.mock.method(ConversationRepository.prototype, "getMembers", async () => { memberChecks++; return state.currentMembers; });
  state.currentMembers = [userId];
  joining.emit("conversation:join", { conversationId });
  await waitFor(() => memberChecks >= 2);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(received, [], "a removed participant's stale room cannot establish presence");
  state.currentMembers = [userId, recipientId];
  state.revokedSessionUsers.add(recipientId);
  memberChecks = 0;
  joining.emit("conversation:join", { conversationId });
  await waitFor(() => memberChecks >= 2);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(received, [], "a revoked peer device cannot establish presence");
  assert.equal(otherDevice.connected, true, "invalid source presence does not revoke a valid receiving device");
  state.revokedSessionUsers.clear();
  const currentPresence = event(otherDevice, "presence:update");
  joining.emit("conversation:join", { conversationId });
  assert.equal((await currentPresence).userId, recipientId);
  assert.deepEqual(received, [recipientId], "the joining user's own devices do not create self presence");
});

test("disabled read receipts produce no socket event, including retained timestamps", async t => {
  const { state, connect } = await fixture(t);
  const sender = await connect();
  const reader = await connect(recipientId);
  let received = 0;
  sender.on("message:seen:update", () => { received++; });
  const message = { id: conversationId, conversationId, senderId: userId, recipientId,
    content: "Private reading", seenAt: null as string | null, deletedAt: null };
  let processed = 0;
  t.mock.method(MessageService.prototype, "markSeen", async () => { processed++; return message as never; });
  state.minorUsers.add(recipientId);
  reader.emit("message:seen", { messageId: message.id });
  await waitFor(() => processed === 1);
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(received, 0, "a null timestamp still exposes the moment a minor opened a message");
  state.minorUsers.clear();
  state.receiptDisabledUsers.add(recipientId);
  message.seenAt = new Date().toISOString();
  reader.emit("message:seen", { messageId: message.id });
  await waitFor(() => processed === 2);
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(received, 0, "a previous timestamp cannot bypass a current disabled setting");
  assert.equal(sender.connected, true);
  assert.equal(reader.connected, true);
  state.receiptDisabledUsers.clear();
  const enabledReceipt = event(sender, "message:seen:update");
  reader.emit("message:seen", { messageId: message.id });
  assert.equal((await enabledReceipt).seenAt, message.seenAt);
});

test("HTTP read acknowledgements do not publish disabled receipts", async t => {
  const { state, connect } = await fixture(t);
  const sender = await connect();
  let received = 0;
  sender.on("message:seen:update", () => { received++; });
  const message = { id: conversationId, conversationId, senderId: userId, recipientId,
    content: "Private reading", seenAt: null as string | null, deletedAt: null };
  t.mock.method(MessageService.prototype, "markSeen", async () => message as never);
  t.mock.method(MessageService.prototype, "getConversationMemberIds", async () => [userId, recipientId]);
  const controller = new MessageController(new MessageService(new ConversationRepository(), new MessageRepository(), new UserRepository()));
  const response = { statusCode: 0, body: undefined as unknown,
    status(value: number) { this.statusCode = value; return this; }, json(value: unknown) { this.body = value; return this; } };
  state.minorUsers.add(recipientId);
  await controller.markSeen({ params: { messageId: message.id }, user: { id: recipientId } } as never, response as never);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(response.statusCode, 200, "the reader retains a successful acknowledgement");
  assert.equal(received, 0);
  state.minorUsers.clear();
  state.receiptDisabledUsers.add(recipientId);
  message.seenAt = new Date().toISOString();
  await controller.markSeen({ params: { messageId: message.id }, user: { id: recipientId } } as never, response as never);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(received, 0);
  assert.equal(sender.connected, true);
  state.receiptDisabledUsers.clear();
  t.mock.method(MessageService.prototype, "getConversationMemberIds", async () => {
    state.receiptDisabledUsers.add(recipientId);
    return [userId, recipientId];
  });
  await controller.markSeen({ params: { messageId: message.id }, user: { id: recipientId } } as never, response as never);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(received, 0, "disabling receipts while recipients are hydrated must win at the final dispatch boundary");
  assert.equal(sender.connected, true, "receipt withdrawal does not revoke the sender's session");
});

test("RTC acceptance and signaling stop after contact withdrawal or a safety block", async t => {
  const { state, connect } = await fixture(t);
  env.RTC_CALLS_ENABLED = true;
  const caller = await connect();
  const recipient = await connect(recipientId);
  const callId = "audit-call-123";
  const call = { id: callId, callerId: userId, recipientId, createdAt: Date.now(), status: "ringing" };
  let released = 0;
  t.mock.method(RedisRepository.prototype, "getSocketCallStrict", async () => JSON.stringify(call));
  t.mock.method(RedisRepository.prototype, "acceptSocketCallStrict", async () => true);
  t.mock.method(RedisRepository.prototype, "releaseSocketCallStrict", async () => { released++; return JSON.stringify(call); });
  const events = [
    ["call:accept", { callId }, "call:accepted"],
    ["call:answer", { callId, answer: { type: "answer", sdp: "synthetic-answer" } }, "call:answer"],
    ["call:ice", { callId, candidate: { candidate: "synthetic-candidate" } }, "call:ice"],
  ] as const;
  for (const [requestEvent, payload, responseEvent] of events) {
    state.contactsAllowed = true;
    const accepted = event(caller, responseEvent);
    recipient.emit(requestEvent, payload);
    await accepted;
    state.contactsAllowed = false;
    let received = 0;
    const listener = () => { received++; };
    caller.on(responseEvent, listener);
    const outcome = signalingOutcome(recipient, caller, "call:error", responseEvent);
    recipient.emit(requestEvent, payload);
    assert.equal(await outcome, "denied", `${requestEvent} must recheck the current contact and block decision`);
    assert.equal(received, 0);
    caller.off(responseEvent, listener);
  }
  assert.ok(released > 0, "denied calls must release their reservation");
  const ended = event(caller, "call:ended");
  recipient.emit("call:end", { callId });
  await ended;
  assert.equal(caller.connected, true, "cleanup remains available after contact is withdrawn");
});

test("stream WebRTC signaling cannot deliver to a revoked target device", async t => {
  const { state, connect, server } = await fixture(t);
  env.LIVE_ROOMS_ENABLED = true;
  env.RTC_CALLS_ENABLED = true;
  t.mock.method(LiveStreamRepository.prototype, "findById", async () => ({ id: conversationId, hostId: userId, status: "live" }) as never);
  t.mock.method(ContentSafetyService.prototype, "isVisible", async () => true);
  const sender = await connect();
  const target = await connect(recipientId);
  sender.emit("stream:join", { streamId: conversationId });
  target.emit("stream:join", { streamId: conversationId });
  await waitFor(async () => (await server.in(`stream:${conversationId}`).fetchSockets()).length === 2);
  state.revokedSessionUsers.add(recipientId);
  for (const [requestEvent, body] of [
    ["webrtc:offer", { offer: { type: "offer", sdp: "synthetic-offer" } }],
    ["webrtc:answer", { answer: { type: "answer", sdp: "synthetic-answer" } }],
    ["webrtc:ice-candidate", { candidate: { candidate: "synthetic-candidate" } }],
  ] as const) {
    state.revokedSessionUsers.clear();
    const permitted = event(target, requestEvent);
    sender.emit(requestEvent, { targetSocketId: target.id, streamId: conversationId, ...body });
    assert.equal((await permitted).streamId, conversationId, "eligible devices in the public stream can exchange signaling");
    state.revokedSessionUsers.add(recipientId);
    const outcome = signalingOutcome(sender, target, "stream:error", requestEvent);
    sender.emit(requestEvent, { targetSocketId: target.id, streamId: conversationId, ...body });
    assert.equal(await outcome, "denied", `${requestEvent} must verify the target device session immediately before emitting`);
  }
});

test("contact withdrawal while an RTC acceptance is awaited prevents its delivery and releases the call", async t => {
  const { state, connect } = await fixture(t);
  env.RTC_CALLS_ENABLED = true;
  const caller = await connect();
  const recipient = await connect(recipientId);
  const call = { id: "audit-call-race", callerId: userId, recipientId, createdAt: Date.now(), status: "ringing" };
  let released = 0;
  let delivered = 0;
  caller.on("call:accepted", () => { delivered++; });
  t.mock.method(RedisRepository.prototype, "getSocketCallStrict", async () => JSON.stringify(call));
  t.mock.method(RedisRepository.prototype, "acceptSocketCallStrict", async () => { state.contactsAllowed = false; return true; });
  t.mock.method(RedisRepository.prototype, "releaseSocketCallStrict", async () => { released++; return JSON.stringify(call); });
  const disconnected = event(caller, "disconnect");
  recipient.emit("call:accept", { callId: call.id });
  await disconnected;
  assert.equal(delivered, 0);
  assert.ok(released > 0, "a contact change cannot leave an active call reservation behind");
});
