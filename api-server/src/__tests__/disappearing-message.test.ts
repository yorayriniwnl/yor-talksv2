import assert from "node:assert/strict";
import { test } from "node:test";
import { MessageService } from "../services/message-service.js";

test("vanish-mode messages receive a bounded expiry", async () => {
  const conversation = {
    id: "conversation-1",
    participantA: "sender",
    participantB: "recipient",
    participantIds: ["sender", "recipient"],
    isGroup: false,
    vanishMode: true,
  };
  let persisted: any;
  const service = new MessageService(
    {
      findById: async () => conversation,
      getMembers: async () => conversation.participantIds,
      setVanishMode: async (_id: string, enabled: boolean) => ({ ...conversation, vanishMode: enabled }),
    } as never,
    {
      create: async (message: any) => { persisted = message; return message; },
      findById: async () => undefined,
      update: async (_id: string, updates: Record<string, unknown>) => ({ ...persisted, ...updates }),
    } as never,
    undefined,
    { moderate: async () => ({ spam: false, toxicity: false, nsfw: false }) } as never,
  );

  const sent = await service.sendMessageToConversation("sender", "conversation-1", "hello");
  assert.equal(sent.content, "hello");
  assert.ok(sent.expiresAt);
  assert.ok(Date.parse(sent.expiresAt!) - Date.parse(sent.createdAt) === 24 * 60 * 60 * 1000);

  const updatedConversation = await service.setVanishMode("conversation-1", "recipient", false);
  assert.equal(updatedConversation?.vanishMode, false);
});
