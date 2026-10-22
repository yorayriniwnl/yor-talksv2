import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '@workspace/db';
import { AccountService } from '../services/account-service.js';
import { PaymentService } from '../services/payment-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { BackgroundJobRepository } from '../repositories/background-job-repository.js';
import { cleanAccountSessions } from '../workers/lifecycle-worker.js';
import { NotificationRepository } from '../repositories/notification-repository.js';
import { QueueService } from '../services/queue-service.js';
import { deliverNotificationJob } from '../workers/notification-job.js';
import type { NotificationRecord } from '../types/index.js';
import { PostService } from '../services/post-service.js';
import { PostRepository } from '../repositories/post-repository.js';

const users = new UserRepository(), redis = new RedisRepository();
const service = new AccountService(users, redis);
const userIds: string[] = [], refs: string[] = [], jobIds: string[] = [];
async function person() {
  const id = randomUUID(); userIds.push(id);
  await pool.query(`INSERT INTO users(id,username,email,password_hash,full_name) VALUES($1,$2,$3,$4,'Synthetic account')`,
    [id, `del-${id.slice(0, 8)}`, `${id}@example.test`, await bcrypt.hash('synthetic-password', 4)]);
  return id;
}
async function payment(payer: string, creator: string) {
  const order = randomUUID(), provider = `test_order_${order}`, payment = `test_pay_${order}`, reference = `razorpay:${provider}`;
  refs.push(provider);
  await pool.query(`INSERT INTO payment_orders(id,payer_id,creator_id,provider_order_id,provider_payment_id,amount_minor,status)
    VALUES($1,$2,$3,$4,$5,500,'paid')`, [order, payer, creator, provider, payment]);
  await pool.query(`INSERT INTO ledger_transactions(id,credit_account_id,debit_account_id,amount_minor,reference_id)
    VALUES($1,$2,$3,500,$4)`, [randomUUID(), creator, payer, reference]);
  return { order, provider, payment, reference };
}
after(async () => {
  for (const provider of refs) {
    await pool.query(`DELETE FROM ledger_transactions WHERE reference_id=$1 OR reference_id LIKE $2`, [`razorpay:${provider}`, `razorpay:refund:test_pay_${provider.slice(11)}:%`]);
    await pool.query('DELETE FROM payment_orders WHERE provider_order_id=$1', [provider]);
  }
  await pool.query('DELETE FROM background_jobs WHERE id=ANY($1::uuid[]) OR dedup_key=ANY($2::text[])', [jobIds, userIds.map(id => `account:${id}`)]);
  await pool.query('DELETE FROM media_cleanup_holds WHERE deletion_id=ANY($1::uuid[])', [userIds]);
  for (const id of userIds) { await redis.delStrict(`session:${id}:synthetic-device`); await users.deleteById(id); }
  await redis.disconnect(); await pool.end();
});

for (const first of ['payer', 'creator'] as const) {
  test(`deleting ${first} first preserves the counterparty and immutable financial references`, async () => {
    const payer = await person(), creator = await person();
    const p = await payment(payer, creator);
    const deleted = first === 'payer' ? payer : creator, survivor = first === 'payer' ? creator : payer;
    const before = await pool.query(`SELECT sum(CASE WHEN credit_account_id=$1 THEN amount_minor ELSE 0 END)
      -sum(CASE WHEN debit_account_id=$1 THEN amount_minor ELSE 0 END) AS balance FROM ledger_transactions`, [survivor]);
    await redis.setStrict(`session:${deleted}:synthetic-device`, 'synthetic-hash', 60);
    assert.equal(await service.deleteAccount(deleted, 'synthetic-password'), true);
    assert.equal(await service.deleteAccount(deleted, 'synthetic-password'), false);
    assert.equal(await users.findById(deleted), undefined);
    const ledger = (await pool.query('SELECT * FROM ledger_transactions WHERE reference_id=$1', [p.reference])).rows[0];
    assert.equal(ledger[first === 'payer' ? 'debit_account_id' : 'credit_account_id'], null);
    assert.equal(ledger[first === 'payer' ? 'credit_account_id' : 'debit_account_id'], survivor);
    const afterBalance = await pool.query(`SELECT sum(CASE WHEN credit_account_id=$1 THEN amount_minor ELSE 0 END)
      -sum(CASE WHEN debit_account_id=$1 THEN amount_minor ELSE 0 END) AS balance FROM ledger_transactions`, [survivor]);
    assert.equal(afterBalance.rows[0].balance, before.rows[0].balance);
    const order = (await pool.query('SELECT * FROM payment_orders WHERE id=$1', [p.order])).rows[0];
    assert.equal(order.provider_payment_id, p.payment);
    assert.equal(order[first === 'payer' ? 'payer_id' : 'creator_id'], null);
    const job = (await pool.query('SELECT * FROM background_jobs WHERE dedup_key=$1', [`account:${deleted}`])).rows[0];
    assert.ok(job);
    assert.match(job.payload.emailHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(Object.keys(job.payload).sort(), ['emailHash', 'userId']);
    await assert.rejects(cleanAccountSessions(job, { scanStrict: async () => { throw new Error('Redis unavailable'); } } as unknown as RedisRepository));
    await cleanAccountSessions(job, redis);
    assert.equal(await redis.getStrict(`session:${deleted}:synthetic-device`), null);
    assert.equal(await service.deleteAccount(survivor, 'synthetic-password'), true);
    const final = (await pool.query('SELECT * FROM ledger_transactions WHERE reference_id=$1', [p.reference])).rows[0];
    assert.equal(final.id, ledger.id); assert.equal(final.credit_account_id, null); assert.equal(final.debit_account_id, null);
    // Duplicate refunds and aggregate limits still work after both parties disappear.
    const payments = new PaymentService();
    const refund = { id: `test_refund_${randomUUID()}`, paymentId: p.payment, amountMinor: 250, currency: 'INR' };
    assert.equal(await payments.reconcileRefund(refund), true);
    assert.equal(await payments.reconcileRefund(refund), true);
    await assert.rejects(payments.reconcileRefund({ ...refund, id: `test_refund_${randomUUID()}`, amountMinor: 300 }), /exceed/);
  });
}

for (const scenario of [
  { name: 'group creator with two remaining members', survivorCount: 2, legacyPosition: 'both' },
  { name: 'legacy second participant with one remaining member', survivorCount: 1, legacyPosition: 'second' },
] as const) {
  test(`account deletion preserves ${scenario.name}'s shared group history`, async () => {
    const departing = await person(), survivors = await Promise.all(Array.from({ length: scenario.survivorCount }, () => person()));
    const legacyAnchor = scenario.legacyPosition === 'second' ? await person() : departing;
    const outsider = await person();
    const conversationId = randomUUID(), deletedMessageId = randomUUID(), survivingMessageId = randomUUID(), invitationId = randomUUID();
    const participantA = scenario.legacyPosition === 'both' ? departing : legacyAnchor;
    const participantB = departing;
    await pool.query(`INSERT INTO conversations(id,participant_a,participant_b,participant_ids,is_group,title,created_at,updated_at)
      VALUES($1,$2,$3,$4::jsonb,true,'Deletion retention test',now(),now())`,
    [conversationId, participantA, participantB, JSON.stringify([departing, ...survivors])]);
    for (const [index, userId] of [departing, ...survivors].entries()) {
      await pool.query(`INSERT INTO conversation_members(conversation_id,user_id,role) VALUES($1,$2,$3)`,
        [conversationId, userId, index === 0 ? 'admin' : 'member']);
    }
    await pool.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content,reactions)
      VALUES($1,$2,$3,$4,'Message to erase','{}'::jsonb)`,
    [deletedMessageId, conversationId, departing, survivors[0]]);
    await pool.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content,reply_to_id,forwarded_from_id,reactions)
      VALUES($1,$2,$3,$4,'Surviving group message',$5,$5,$6::jsonb)`,
    [survivingMessageId, conversationId, survivors[0], departing, deletedMessageId,
      JSON.stringify({ heart: [departing, ...survivors] })]);
    await pool.query('INSERT INTO message_reads(message_id,user_id) VALUES($1,$2),($1,$3)',
      [survivingMessageId, departing, survivors[survivors.length - 1]]);
    await pool.query(`INSERT INTO conversation_invitations(id,conversation_id,inviter_id,invitee_id,state,
      member_ids_at_invite,guardian_required_user_ids,policy_versions)
      VALUES($1,$2,$3,$4,'pending',$5::jsonb,$6::jsonb,'{}'::jsonb)`,
    [invitationId, conversationId, survivors[0], outsider,
      JSON.stringify([departing, ...survivors]), JSON.stringify([departing])]);

    assert.equal(await service.deleteAccount(departing, 'synthetic-password'), true);
    assert.equal(await users.findById(departing), undefined);

    const conversation = (await pool.query('SELECT * FROM conversations WHERE id=$1', [conversationId])).rows[0];
    assert.ok(conversation, 'conversation remains for surviving members');
    assert.deepEqual(conversation.participant_ids.sort(), [...survivors].sort());
    assert.equal(conversation.participant_a, [...survivors].sort()[0]);
    assert.equal(conversation.participant_b, [...survivors].sort()[scenario.survivorCount - 1]);
    const remainingMembers = (await pool.query('SELECT user_id FROM conversation_members WHERE conversation_id=$1 ORDER BY user_id', [conversationId])).rows;
    assert.deepEqual(remainingMembers.map(row => row.user_id), [...survivors].sort());

    const retained = (await pool.query('SELECT * FROM messages WHERE id=$1', [survivingMessageId])).rows[0];
    assert.ok(retained, 'other members\' messages remain');
    assert.equal((await pool.query('SELECT 1 FROM messages WHERE id=$1', [deletedMessageId])).rowCount, 0);
    const expectedRecipient = survivors.find(userId => userId !== survivors[0]) ?? survivors[0];
    assert.equal(retained.recipient_id, expectedRecipient);
    assert.equal(retained.reply_to_id, null);
    assert.equal(retained.forwarded_from_id, null);
    assert.deepEqual(retained.reactions.heart.sort(), [...survivors].sort());
    assert.deepEqual((await pool.query('SELECT user_id FROM message_reads WHERE message_id=$1 ORDER BY user_id', [survivingMessageId])).rows
      .map(row => row.user_id), [survivors[survivors.length - 1]]);

    const invitation = (await pool.query('SELECT * FROM conversation_invitations WHERE id=$1', [invitationId])).rows[0];
    assert.equal(invitation.state, 'revoked');
    assert.deepEqual(invitation.member_ids_at_invite.sort(), [...survivors].sort());
    assert.deepEqual(invitation.guardian_required_user_ids, []);
  });
}

test('migrated legacy history references are nullable and use SET NULL', async () => {
  const references = await pool.query(`SELECT c.conrelid::regclass::text AS table_name,a.attname,c.confdeltype,a.attnotnull
    FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
    WHERE c.contype='f' AND c.confrelid='public.users'::regclass AND (
      (c.conrelid='public.conversations'::regclass AND a.attname IN ('participant_a','participant_b'))
      OR (c.conrelid='public.messages'::regclass AND a.attname='recipient_id'))`);
  assert.deepEqual([...new Set(references.rows.map(row => `${row.table_name}.${row.attname}`))].sort(),
    ['conversations.participant_a', 'conversations.participant_b', 'messages.recipient_id']);
  for (const row of references.rows) {
    assert.equal(row.confdeltype, 'n', `${row.table_name}.${row.attname} must not cascade shared history`);
    assert.equal(row.attnotnull, false, `${row.table_name}.${row.attname} must permit deleted references`);
  }
});

test('nullable direct history retains the surviving author and scrubs the deleted participant snapshot', async () => {
  const departing = await person(), survivor = await person();
  const conversation = randomUUID(), erased = randomUUID(), retained = randomUUID();
  await pool.query(`INSERT INTO conversations(id,participant_a,participant_b,participant_ids,is_group)
    VALUES($1,$2,$3,$4::jsonb,false)`, [conversation, departing, survivor, JSON.stringify([departing, survivor])]);
  await pool.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content)
    VALUES($1,$2,$3,$4,'Departing content'),($5,$2,$4,$3,'Surviving content')`,
    [erased, conversation, departing, survivor, retained]);
  assert.equal(await service.deleteAccount(departing, 'synthetic-password'), true);
  const row = (await pool.query('SELECT * FROM conversations WHERE id=$1', [conversation])).rows[0];
  assert.ok(row);
  assert.equal(row.participant_a, null);
  assert.equal(row.participant_b, survivor);
  assert.deepEqual(row.participant_ids, [survivor]);
  assert.equal((await pool.query('SELECT 1 FROM messages WHERE id=$1', [erased])).rowCount, 0);
  const message = (await pool.query('SELECT * FROM messages WHERE id=$1', [retained])).rows[0];
  assert.equal(message.sender_id, survivor);
  assert.equal(message.recipient_id, null);
  const archive = await service.exportAccount(survivor);
  assert.equal(JSON.stringify(archive).includes(departing), false, 'the survivor archive must not restore the deleted identifier');
  assert.equal((archive?.content as { sentMessages: Array<{ id: string }> }).sentMessages[0]?.id, retained);
});

test('account deletion erases embedded actors and discussions while preserving unrelated content and queue delivery', async () => {
  const departing = await person(), survivor = await person(), other = await person();
  const post = randomUUID(), comment = randomUUID(), video = randomUUID(), videoComment = randomUUID();
  const channel = randomUUID(), ownedChannel = randomUUID(), channelMessage = randomUUID(), authoredMessage = randomUUID();
  const community = randomUUID(), stream = randomUUID();
  const reactions = { heart: [departing, survivor, departing, other], clap: [departing], legacy: 'unchanged' };
  const retainedReactions = { heart: [survivor, other], clap: [], legacy: 'unchanged' };
  const likes = JSON.stringify([departing, survivor, other]);
  await pool.query('INSERT INTO posts(id,author_id,content,reactions) VALUES($1,$2,$3,$4::jsonb)', [post, survivor, 'Retained post', JSON.stringify(reactions)]);
  await pool.query('INSERT INTO comments(id,post_id,author_id,content,reactions,liked_by) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)',
    [comment, post, survivor, 'Retained comment', JSON.stringify(reactions), likes]);
  await pool.query(`INSERT INTO videos(id,author_id,video_url,thumbnail_url,title,type,liked_by)
    VALUES($1,$2,'https://example.test/video','https://example.test/cover','Retained video','video',$3::jsonb)`, [video, survivor, likes]);
  await pool.query(`INSERT INTO video_comments(id,video_id,author_id,content,liked_by) VALUES($1,$2,$3,'Retained video comment',$4::jsonb)`,
    [videoComment, video, survivor, likes]);
  await pool.query(`INSERT INTO broadcast_channels(id,owner_id,name) VALUES($1,$2,'Retained channel'),($3,$4,'Departing channel')`,
    [channel, survivor, ownedChannel, departing]);
  await pool.query(`INSERT INTO broadcast_channel_messages(id,channel_id,author_id,content,reactions)
    VALUES($1,$2,$3,'Retained update',$4::jsonb),($5,$2,$6,'Departing update','{}'::jsonb)`,
    [channelMessage, channel, survivor, JSON.stringify(reactions), authoredMessage, departing]);
  const retainedDiscussion = { id: randomUUID(), authorId: survivor, title: 'Retained discussion', likedBy: [departing, survivor, other], likes: 3 };
  const untouchedDiscussion = { id: randomUUID(), authorId: other, title: 'Untouched discussion', likedBy: [other], likes: 1 };
  const legacy = { pinned: true, content: 'Legacy announcement without an author' };
  await pool.query(`INSERT INTO communities(id,owner_id,name,slug,moderators,pending_requests,announcements,posts_count)
    VALUES($1,$2,'Retention community',$3,$4::jsonb,$5::jsonb,$6::jsonb,3)`,
    [community, survivor, `retention-${community}`, JSON.stringify([departing, survivor]), JSON.stringify([departing, other]),
      JSON.stringify([{ id: randomUUID(), authorId: departing, title: 'Departing discussion', likedBy: [] }, retainedDiscussion, legacy, 'legacy string', untouchedDiscussion])]);
  await pool.query(`INSERT INTO live_streams(id,host_id,title,cover_url,kind,status,starts_at,category,guest_ids)
    VALUES($1,$2,'Retained room','https://example.test/cover','room','ended',now(),'other',$3::jsonb)`, [stream, survivor, likes]);
  await pool.query('UPDATE users SET blocked_users=$2::jsonb,muted_users=$2::jsonb WHERE id=$1', [survivor, likes]);

  const notifications = new NotificationRepository();
  const createNotice = (actorId: string, metadata = { actorId } as Record<string, unknown>, relatedId: string | null = null, type = 'follow') => notifications.create({
    id: randomUUID(), recipientId: survivor, type, title: `Actor ${actorId}`, message: 'Synthetic notice', relatedId,
    metadata, channel: 'in_app', readAt: null, createdAt: new Date().toISOString(),
  });
  const departedNotice = await createNotice(departing), unrelatedNotice = await createNotice(other);
  const authoredChannelNotice = await createNotice(departing, { messageId: authoredMessage }, channel, 'broadcast_channel');
  const ownedChannelNotice = await createNotice(departing, {}, ownedChannel, 'broadcast_channel');
  const retainedChannelNotice = await createNotice(survivor, { messageId: channelMessage }, channel, 'broadcast_channel');
  const queue = new QueueService(process.env.REDIS_URL);
  const jobs: Awaited<ReturnType<QueueService['enqueue']>>[] = [];
  try {
    const departedJob = await queue.enqueue('notification:deliver', departedNotice);
    const unrelatedJob = await queue.enqueue('notification:deliver', unrelatedNotice);
    jobs.push(departedJob, unrelatedJob);
    assert.ok(departedJob && unrelatedJob, 'the isolated Redis queue must be available');
    assert.deepEqual(departedJob.data, { notificationId: departedNotice.id });
    assert.equal(await service.deleteAccount(departing, 'synthetic-password'), true);
    await assert.rejects(createNotice(departing), /Notification actor is unavailable/);

    for (const [table, id] of [['posts', post], ['comments', comment], ['broadcast_channel_messages', channelMessage]]) {
      assert.deepEqual((await pool.query(`SELECT reactions FROM ${table} WHERE id=$1`, [id])).rows[0].reactions, retainedReactions);
    }
    for (const [table, id] of [['comments', comment], ['videos', video], ['video_comments', videoComment]]) {
      assert.deepEqual((await pool.query(`SELECT liked_by FROM ${table} WHERE id=$1`, [id])).rows[0].liked_by, [survivor, other]);
    }
    const retainedCommunity = (await pool.query('SELECT * FROM communities WHERE id=$1', [community])).rows[0];
    assert.deepEqual(retainedCommunity.moderators, [survivor]);
    assert.deepEqual(retainedCommunity.pending_requests, [other]);
    assert.deepEqual(retainedCommunity.announcements, [{ ...retainedDiscussion, likedBy: [survivor, other], likes: 2 }, legacy, 'legacy string', untouchedDiscussion]);
    assert.equal(retainedCommunity.posts_count, 2);
    assert.deepEqual((await pool.query('SELECT guest_ids FROM live_streams WHERE id=$1', [stream])).rows[0].guest_ids, [survivor, other]);
    const retainedUser = (await pool.query('SELECT blocked_users,muted_users FROM users WHERE id=$1', [survivor])).rows[0];
    assert.deepEqual(retainedUser.blocked_users, [survivor, other]);
    assert.deepEqual(retainedUser.muted_users, [survivor, other]);
    for (const notice of [departedNotice, authoredChannelNotice, ownedChannelNotice]) assert.equal(await notifications.findById(notice.id), undefined);
    assert.ok(await notifications.findById(retainedChannelNotice.id));
    assert.equal((await pool.query('SELECT 1 FROM broadcast_channel_messages WHERE id=$1', [authoredMessage])).rowCount, 0);
    const delivered: NotificationRecord[] = [];
    const delivery = { deliver: async (notice: NotificationRecord) => { delivered.push(notice); return notice; } };
    await deliverNotificationJob(departedJob.data, notifications, users, delivery);
    await deliverNotificationJob(departedNotice, notifications, users, delivery); // Payloads queued by an older release.
    assert.equal(delivered.length, 0);
    await deliverNotificationJob(unrelatedJob.data, notifications, users, delivery);
    assert.deepEqual(delivered.map(notice => notice.id), [unrelatedNotice.id]);
    assert.ok((await notifications.findById(unrelatedNotice.id))?.pushDeliveredAt);
  } finally {
    for (const job of jobs) await job?.remove();
    await queue.close();
  }
});

test('a queued JSON reaction cannot restore an actor after the deletion scrub commits', async () => {
  const departing = await person(), survivor = await person(), postId = randomUUID();
  await pool.query('INSERT INTO posts(id,author_id,content,reactions) VALUES($1,$2,$3,$4::jsonb)',
    [postId, survivor, 'Concurrent deletion reaction', JSON.stringify({ heart: [departing] })]);
  const postService = new PostService(new PostRepository(), users, new NotificationRepository());
  assert.ok(await postService.addReaction(postId, survivor, 'wave'));
  assert.deepEqual((await pool.query('SELECT reactions FROM posts WHERE id=$1', [postId])).rows[0].reactions,
    { heart: [departing], wave: [survivor] });
  const deletion = await pool.connect();
  let reactionFinished = false;
  try {
    await deletion.query('BEGIN');
    await deletion.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [departing]);
    const pendingReaction = postService.addReaction(postId, departing, 'heart').finally(() => { reactionFinished = true; });
    await new Promise(resolve => setTimeout(resolve, 75));
    assert.equal(reactionFinished, false, 'the JSON writer waits for the account deletion lock');
    await deletion.query("UPDATE posts SET reactions=jsonb_set(reactions,'{heart}','[]'::jsonb) WHERE id=$1", [postId]);
    await deletion.query('DELETE FROM users WHERE id=$1', [departing]);
    await deletion.query('COMMIT');
    assert.equal(await pendingReaction, undefined);
    assert.deepEqual((await pool.query('SELECT reactions FROM posts WHERE id=$1', [postId])).rows[0].reactions,
      { heart: [], wave: [survivor] });
  } catch (error) {
    await deletion.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    deletion.release();
  }
});

test('an injected database failure rolls back ledger anonymization and cleanup enqueue together', async () => {
  const payer = await person(), creator = await person();
  const p = await payment(payer, creator);
  // A restrictive reference deliberately makes the final delete fail.
  const invite = randomUUID();
  const guardTable = `deletion_guard_${randomUUID().replaceAll('-', '')}`;
  await pool.query(`CREATE TABLE "${guardTable}" (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE RESTRICT)`);
  try {
    await pool.query(`INSERT INTO "${guardTable}" VALUES($1,$2)`, [invite, payer]);
    await assert.rejects(service.deleteAccount(payer, 'synthetic-password'));
    assert.ok(await users.findById(payer));
    assert.equal((await pool.query('SELECT debit_account_id FROM ledger_transactions WHERE reference_id=$1', [p.reference])).rows[0].debit_account_id, payer);
    assert.equal((await pool.query('SELECT 1 FROM background_jobs WHERE dedup_key=$1', [`account:${payer}`])).rowCount, 0);
  } finally { await pool.query(`DROP TABLE "${guardTable}"`); }
});

test('account erasure affects unbound records only after the address was verified', async () => {
  for (const verified of [false,true]) {
    const id=await person(),email=`${id}@example.test`;
    await pool.query('UPDATE users SET email_verified=$2 WHERE id=$1',[id,verified]);
    await pool.query('INSERT INTO preregistrations(email,username) VALUES($1,$2)',[email,`pre-${id}`]);
    await pool.query('INSERT INTO waitlist(id,email) VALUES($1,$2)',[randomUUID(),email]);
    try {
      assert.equal(await service.deleteAccount(id,'synthetic-password'),true);
      assert.equal((await pool.query('SELECT 1 FROM preregistrations WHERE email=$1',[email])).rowCount,verified?0:1);
      assert.equal((await pool.query('SELECT 1 FROM waitlist WHERE email=$1',[email])).rowCount,verified?0:1);
      assert.equal((await pool.query("SELECT 1 FROM email_suppressions WHERE email_hash=encode(sha256($1::bytea),'hex')",[email])).rowCount,verified?2:0);
    } finally {
      await pool.query('DELETE FROM preregistrations WHERE email=$1',[email]);
      await pool.query('DELETE FROM waitlist WHERE email=$1',[email]);
    }
  }
});

test('durable jobs deduplicate, recover abandoned leases, fence stale workers and expose exhausted retries', async () => {
  const jobs = new BackgroundJobRepository(), key = `test:${randomUUID()}`, kind = `test_${randomUUID()}`;
  const id = await jobs.enqueue(kind, key, { synthetic: true }); jobIds.push(id);
  assert.equal(await jobs.enqueue(kind, key, { synthetic: false }), id);
  const candidates = await Promise.all([jobs.claim([kind]), jobs.claim([kind])]);
  assert.equal(candidates.filter(Boolean).length, 1);
  const first = candidates.find(Boolean)!;
  await pool.query(`UPDATE background_jobs SET lease_until=now()-interval '1 second' WHERE id=$1`, [id]);
  const retry = (await jobs.claim([kind]))!;
  assert.notEqual(retry.lease_token, first.lease_token);
  await jobs.finish(first);
  assert.equal((await pool.query('SELECT status FROM background_jobs WHERE id=$1', [id])).rows[0].status, 'running');
  await pool.query('UPDATE background_jobs SET attempts=8 WHERE id=$1', [id]);
  await jobs.fail(retry, 'provider_unavailable');
  assert.equal((await pool.query('SELECT status FROM background_jobs WHERE id=$1', [id])).rows[0].status, 'dead');
});
