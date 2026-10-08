import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { AccountService, InvalidAccountPasswordError } from "../services/account-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { MessageService } from "../services/message-service.js";
import { createTestUser } from "./test-helpers.js";

const redisRepository = new RedisRepository();
const userRepository = new UserRepository();
const fixtureUsers: string[] = [];

after(async () => {
  await pool.query("DROP TRIGGER IF EXISTS fail_account_delete ON users");
  await pool.query("DROP FUNCTION IF EXISTS fail_account_delete_fn()");
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [fixtureUsers]);
  await redisRepository.disconnect();
  await pool.end();
});

test("both account export directions exclude entire deleted and expired text or attachment rows", async () => {
  const sender = await createTestUser(userRepository);
  const recipient = await createTestUser(userRepository);
  fixtureUsers.push(sender.id, recipient.id);
  const conversations = new ConversationRepository();
  const messages = new MessageRepository();
  const conversation = await conversations.findOrCreateDirect(sender.id, recipient.id);
  const now = new Date();
  const visibleIds: string[] = [];
  const hiddenIds: string[] = [];
  for (const [index, visibility] of [
    {},
    { expiresAt: new Date(now.getTime() + 86_400_000).toISOString() },
    { expiresAt: now.toISOString() },
    { expiresAt: new Date(now.getTime() - 1).toISOString() },
    { deletedAt: now.toISOString() },
  ].entries()) {
    const id = randomUUID();
    await messages.create({ id, conversationId: conversation.id, senderId: sender.id, recipientId: recipient.id,
      content: index < 2 ? 'Retained visible message' : `Private vanished body ${id}`,
      mediaUrl: index < 2 ? null : `https://example.test/private-${id}.jpg`,
      createdAt: now.toISOString(), seenAt: null, ...visibility });
    (index < 2 ? visibleIds : hiddenIds).push(id);
  }
  const accounts = new AccountService(userRepository, redisRepository);
  for (const [userId, direction] of [[sender.id, 'sentMessages'], [recipient.id, 'receivedMessages']] as const) {
    const exported = await accounts.exportAccount(userId);
    const rows = (exported?.content as Record<string, Array<{ id: string }>>)[direction];
    assert.deepEqual(rows.map(row => row.id).sort(), visibleIds.sort());
    for (const id of hiddenIds) assert.doesNotMatch(JSON.stringify(exported), new RegExp(id));
    assert.doesNotMatch(JSON.stringify(exported), /Private vanished body|private-.*\.jpg/);
  }
});

test("account export excludes authentication secrets and deletion removes the account", async () => {
  const id = randomUUID();
  const email = `${String(Date.now()).slice(-7)}@kiit.ac.in`;
  await userRepository.create({
    id,
    username: `account-${id.slice(0, 8)}`,
    email,
    passwordHash: await bcrypt.hash("Supersecret1!", 4),
    fullName: "Account Lifecycle Test",
    bio: "",
    avatarUrl: null,
    role: "user",
    permissions: ["read:profile"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: { theme: "light", notificationsEnabled: true, privateAccount: false },
    emailVerified: true,
  });

  const accountService = new AccountService(userRepository, redisRepository);
  const recipient = await createTestUser(userRepository);
  const messageService = new MessageService(new ConversationRepository(), new MessageRepository());
  await messageService.sendMessage(id, recipient.id, "Exported message content");
  await messageService.sendMessage(recipient.id, id, "Received message content");
  const providerOrderId = `account-export-${randomUUID()}`;
  await pool.query(`
    INSERT INTO payment_orders (id, payer_id, creator_id, provider_order_id, provider_signature, amount_minor, currency, status)
    VALUES ($1, $2, $3, $4, 'private-provider-signature', 500, 'INR', 'created')
  `, [randomUUID(), id, recipient.id, providerOrderId]);
  const storyId = randomUUID();
  await pool.query("INSERT INTO stories (id, author_id, media_url, type, expires_at) VALUES ($1, $2, 'https://example.test/export.jpg', 'image', $3)", [
    storyId,
    id,
    new Date(Date.now() + 86_400_000).toISOString(),
  ]);
  const exported = await accountService.exportAccount(id);
  const account = exported?.account as Record<string, unknown>;
  const content = exported?.content as {
    stories: Array<{ id: string }>;
    sentMessages: Array<{ content: string }>;
    receivedMessages: Array<{ content: string }>;
  };
  const paymentOrders = exported?.paymentOrders as Array<{ providerOrderId: string }>;
  assert.equal(account.email, email);
  assert.equal("passwordHash" in account, false);
  assert.equal("totpSecret" in account, false);
  assert.equal("contactIdentityDigest" in account, false);
  assert.equal(content.stories[0]?.id, storyId);
  assert.equal(content.sentMessages[0]?.content, "Exported message content");
  assert.equal(content.receivedMessages[0]?.content, "Received message content");
  assert.equal(paymentOrders[0]?.providerOrderId, providerOrderId);
  assert.doesNotMatch(JSON.stringify(exported), /private-provider-signature/);

  await assert.rejects(() => accountService.deleteAccount(id, "wrong-password"), InvalidAccountPasswordError);
  const sessionKey = `session:${id}:account-export-test-device`;
  await redisRepository.setStrict(sessionKey, "active", 300);
  assert.equal(await accountService.deleteAccount(id, "Supersecret1!"), true);
  assert.equal(await userRepository.findById(id), undefined);
  assert.equal(await redisRepository.getStrict(sessionKey), null);
});

test("account deletion rolls back ledger anonymization when user deletion fails", async () => {
  const owner = await createTestUser(userRepository, { passwordHash: await bcrypt.hash("Supersecret2!", 4) });
  const counterparty = await createTestUser(userRepository);
  const ledgerId = randomUUID();
  const referenceId = `account-delete-rollback:${ledgerId}`;
  await pool.query(`
    INSERT INTO ledger_transactions (id, credit_account_id, debit_account_id, amount_minor, currency, reference_id, status)
    VALUES ($1, $2, $3, 777, 'INR', $4, 'completed')
  `, [ledgerId, owner.id, counterparty.id, referenceId]);
  await pool.query(`
    CREATE OR REPLACE FUNCTION fail_account_delete_fn() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'forced_delete_failure';
    END;
    $$ LANGUAGE plpgsql
  `);
  await pool.query(`CREATE TRIGGER fail_account_delete BEFORE DELETE ON users FOR EACH ROW WHEN (OLD.id = '${owner.id}') EXECUTE FUNCTION fail_account_delete_fn()`);

  const accountService = new AccountService(userRepository, redisRepository);
  try {
    await assert.rejects(accountService.deleteAccount(owner.id, "Supersecret2!"), (error: Error & { cause?: unknown }) => {
      assert.match(String(error.cause), /forced_delete_failure/);
      return true;
    });
    const [ledger] = await pool.query<{ credit_account_id: string | null }>(
      "SELECT credit_account_id FROM ledger_transactions WHERE id = $1", [ledgerId],
    ).then((result) => result.rows);
    assert.equal(ledger.credit_account_id, owner.id);
    assert.ok(await userRepository.findById(owner.id));
  } finally {
    await pool.query("DROP TRIGGER fail_account_delete ON users");
    await pool.query("DROP FUNCTION fail_account_delete_fn()");
  }

  assert.equal(await accountService.deleteAccount(owner.id, "Supersecret2!"), true);
  const [anonymized] = (await pool.query<{ credit_account_id: string | null }>(
    "SELECT credit_account_id FROM ledger_transactions WHERE id = $1", [ledgerId],
  )).rows;
  assert.equal(anonymized.credit_account_id, null);
  await pool.query("DELETE FROM ledger_transactions WHERE id = $1", [ledgerId]);
  await pool.query("DELETE FROM users WHERE id = $1", [counterparty.id]);
});
