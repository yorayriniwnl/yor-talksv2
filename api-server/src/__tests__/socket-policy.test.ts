import assert from "node:assert/strict";
import { test } from "node:test";
import {
  socketDeliveryEventNames,
  socketDeliveryPolicy,
  socketEventPolicy,
  socketInboundEventNames,
  socketPolicyEventNames,
} from "../socket/policy.js";

test("every inbound socket schema has one explicit capability policy", () => {
  const inbound = socketInboundEventNames();
  const classified = socketPolicyEventNames().filter((event) => event !== "socket:connect");
  assert.deepEqual(classified, inbound);
  for (const event of inbound) assert.ok(socketEventPolicy(event), `${event} must have a policy`);
  assert.equal(socketEventPolicy("socket:connect"), "social");
  assert.equal(socketEventPolicy("unlisted:event"), null);
  assert.equal(socketEventPolicy("conversation:leave"), "cleanup");
  assert.deepEqual(socketEventPolicy("webrtc:offer"), ["live", "rtc"]);
});

test("governed socket deliveries are explicitly mapped and unknown events are denied", () => {
  assert.deepEqual(socketDeliveryEventNames(), [
    "call:accepted", "call:answer", "call:ended", "call:ice", "call:invite", "call:rejected",
    "conversation:created", "conversation:vanish:update", "message:receive", "message:seen:update",
    "message:sent", "message:update", "notification:new", "presence:update", "story:reaction",
    "stream:peer-joined", "stream:peer-left", "typing:end", "typing:start", "webrtc:answer",
    "webrtc:ice-candidate", "webrtc:offer",
  ]);
  for (const event of socketDeliveryEventNames()) assert.ok(socketDeliveryPolicy(event)?.length, `${event} must have a delivery policy`);
  assert.deepEqual(socketDeliveryPolicy("message:receive"), ["messaging"]);
  assert.deepEqual(socketDeliveryPolicy("call:invite"), ["rtc"]);
  assert.equal(socketDeliveryPolicy("unlisted:event"), null);
});
