import assert from "node:assert/strict";
import { test } from "node:test";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { MessageService } from "../services/message-service.js";

test("messages support edit, delete, reaction, and pin workflows", () => {
  const messageService = new MessageService(new ConversationRepository(), new MessageRepository());

  const sent = messageService.sendMessage("u1", "u2", "hello");
  const edited = messageService.editMessage(sent.id, "hello there");
  const reacted = messageService.addReaction(sent.id, "u2", "👍");
  const pinned = messageService.pinMessage(sent.id);
  const deleted = messageService.deleteMessage(sent.id);

  assert.ok(edited);
  assert.equal(edited?.content, "hello there");
  assert.equal(reacted?.reactions?.["👍"]?.length, 1);
  assert.equal(pinned?.pinned, true);
  assert.equal(deleted?.deletedAt !== null, true);
});
