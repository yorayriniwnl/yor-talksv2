import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test, type TestContext } from "node:test";
import jwt from "jsonwebtoken";
import { io as connectClient, type Socket } from "socket.io-client";
import { env } from "../config/env.js";
import { attachSocketServer } from "../socket/index.js";
import { parseSocketPayload } from "../socket/policy.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { ConversationRepository } from "../repositories/message-repository.js";
import { MessageService } from "../services/message-service.js";

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
  const state = { consent: true, active: true, budget: true, joinsFail: false, sent: 0, lookups: 0 };
  t.mock.method(RedisRepository.prototype, "getStrict", async () => state.active ? "session" : null);
  t.mock.method(RedisRepository.prototype, "consumeBudgetStrict", async () => state.budget);
  t.mock.method(UserRepository.prototype, "findById", async (id: string) => {
    state.lookups++;
    return { id, accountStatus: "active", termsVersion: state.consent ? env.TERMS_VERSION : "outdated", termsAcceptedAt: "2026-08-31", ageConfirmedAt: "2026-08-31" };
  });
  t.mock.method(ConversationRepository.prototype, "listForUser", async () => []);
  t.mock.method(ConversationRepository.prototype, "getMembers", async () => {
    if (state.joinsFail) throw new Error("Database unavailable");
    return [userId, recipientId];
  });
  t.mock.method(MessageService.prototype, "sendMessage", async (senderId: string, _recipientId: string, content: string) => {
    state.sent++;
    return { id: "message", senderId, conversationId, content };
  });
  const server = createServer();
  const sockets = attachSocketServer(server);
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
  return { state, connect };
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
  await assert.rejects(connect(), /Current terms acceptance required/);
  state.consent = true;
  await assert.rejects(connect(userId, "https://attacker.example"), /websocket error/i);
  assert.equal(state.lookups, 1, "origin must be rejected before user lookup");
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
  sender.emit("message:send", { recipientId, content: "First message" });
  assert.equal((await received).content, "First message");
  assert.equal(state.sent, 1);
});

test("socket live and call gates stay disabled", async (t) => {
  const { connect } = await fixture(t);
  const client = await connect();
  const stream = event(client, "stream:error");
  client.emit("stream:join", { streamId: conversationId });
  assert.match((await stream).error, /disabled/);
  const call = event(client, "call:error");
  client.emit("call:invite", { callId: "test-call-123", targetUserId: recipientId, callType: "audio", offer: {} });
  assert.match((await call).error, /disabled/);
});
