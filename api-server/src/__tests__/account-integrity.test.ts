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

test('an injected database failure rolls back ledger anonymization and cleanup enqueue together', async () => {
  const payer = await person(), creator = await person();
  const p = await payment(payer, creator);
  // A restrictive reference deliberately makes the final delete fail.
  const invite = randomUUID();
  await pool.query(`CREATE TABLE IF NOT EXISTS deletion_test_guard (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE RESTRICT)`);
  await pool.query('INSERT INTO deletion_test_guard VALUES($1,$2)', [invite, payer]);
  try {
    await assert.rejects(service.deleteAccount(payer, 'synthetic-password'));
    assert.ok(await users.findById(payer));
    assert.equal((await pool.query('SELECT debit_account_id FROM ledger_transactions WHERE reference_id=$1', [p.reference])).rows[0].debit_account_id, payer);
    assert.equal((await pool.query('SELECT 1 FROM background_jobs WHERE dedup_key=$1', [`account:${payer}`])).rowCount, 0);
  } finally { await pool.query('DELETE FROM deletion_test_guard WHERE id=$1', [invite]); }
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
