import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { MessageService } from "../services/message-service.js";
import { UserRepository } from "../repositories/user-repository.js";
import { allowTestContacts, createTestUser } from "./test-helpers.js";

after(() => pool.end());

test("concurrent reactions preserve every participant and remain idempotent", async () => {
  const users = new UserRepository();
  const first = await createTestUser(users);
  const second = await createTestUser(users);
  const repository = new MessageRepository();
  const service = new MessageService(new ConversationRepository(), repository, undefined, undefined, undefined, allowTestContacts);
  const sent = await service.sendMessage(first.id, second.id, "Concurrent reactions");

  const read = repository.findById.bind(repository);
  let arrivals = 0;
  let releaseReads!: () => void;
  const bothRead = new Promise<void>(resolve => { releaseReads = resolve; });
  repository.findById = async id => {
    const message = await read(id);
    if (id === sent.id) {
      arrivals++;
      if (arrivals === 2) releaseReads();
      await bothRead;
    }
    return message;
  };

  await Promise.all([
    service.addReaction(sent.id, first.id, "heart"),
    service.addReaction(sent.id, second.id, "heart"),
  ]);
  const updated = await read(sent.id);
  assert.deepEqual(updated?.reactions?.heart?.sort(), [first.id, second.id].sort());
  await service.addReaction(sent.id, first.id, "heart");
  assert.deepEqual((await read(sent.id))?.reactions?.heart?.sort(), [first.id, second.id].sort());
});
