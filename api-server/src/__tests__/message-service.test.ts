import assert from "node:assert/strict";
import { test } from "node:test";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { MessageService } from "../services/message-service.js";

test("messages support edit, delete, reaction, and pin workflows", async () => {
  const messageService = new MessageService(new ConversationRepository(), new MessageRepository());
  const sent = await messageService.sendMessage("u1", "u2", "hello");
  const edited = await messageService.editMessage(sent.id, "hello there");
  const reacted = await messageService.addReaction(sent.id, "u2", "thumbs-up");
  const pinned = await messageService.pinMessage(sent.id);
  const deleted = await messageService.deleteMessage(sent.id);

  assert.ok(edited);
  assert.equal(edited?.content, "hello there");
  assert.equal(reacted?.reactions?.["thumbs-up"]?.length, 1);
  assert.equal(pinned?.pinned, true);
  assert.equal(deleted?.deletedAt !== null, true);
});
