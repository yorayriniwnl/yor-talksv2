import assert from "node:assert/strict";
import { test } from "node:test";
import { EmailDeliveryNotConfiguredError, EmailDeliveryProviderError, EmailService } from "../services/email-service.js";
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { createHash } from 'node:crypto';

test("development email fallback never writes credential-bearing payloads to stdout", async () => {
  const originalLog = console.log;
  const output: unknown[][] = [];
  console.log = (...args: unknown[]) => {
    output.push(args);
  };

  try {
    await new EmailService().sendEmail({
      to: "recipient@example.test",
      subject: "123456 is your Yor Talks sign-in code",
      html: '<a href="https://example.test/reset-password?token=super-secret-token">reset</a>',
      text: "super-secret-token",
    });
  } finally {
    console.log = originalLog;
  }

  assert.equal(output.length, 0);
});

test('simulated email logging excludes addresses, reusable address hashes and credentials', async (t) => {
  const previous = env.RESEND_API_KEY;
  env.RESEND_API_KEY = '';
  t.after(() => { env.RESEND_API_KEY = previous; });
  const records: unknown[][] = [];
  t.mock.method(logger, 'info', (...args: unknown[]) => { records.push(args); });
  const email = 'synthetic-private-recipient@example.test';
  await new EmailService().sendEmail({ to: email, subject: 'private-otp', html: '<p>private-token</p>' });
  const output = JSON.stringify(records);
  assert.doesNotMatch(output, /synthetic-private-recipient|private-otp|private-token|recipientHash|htmlBytes/);
  assert.equal(output.includes(createHash('sha256').update(email).digest('hex').slice(0, 16)), false);
  assert.equal(records.length, 1);
});

test('all implemented email categories send only reviewed transactional payloads through the provider mock', async (t) => {
  const previous = { key: env.RESEND_API_KEY, from: env.EMAIL_FROM, origin: env.CLIENT_ORIGIN };
  Object.assign(env, { RESEND_API_KEY: 'synthetic-provider-key', EMAIL_FROM: 'Yor <security@example.test>', CLIENT_ORIGIN: 'https://client.example.test' });
  t.after(() => { Object.assign(env, { RESEND_API_KEY: previous.key, EMAIL_FROM: previous.from, CLIENT_ORIGIN: previous.origin }); });
  const calls: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const records: unknown[][] = [];
  t.mock.method(logger, 'info', (...args: unknown[]) => { records.push(args); });
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) });
    return new Response('{"id":"synthetic-message-id"}', { status: 200 });
  });
  const emails = new EmailService();
  const recipient = 'transactional-recipient@example.test';
  assert.equal(await emails.sendPasswordResetEmail(recipient, 'synthetic-reset-token'), true);
  assert.equal(await emails.sendVerificationEmail(recipient, 'synthetic-verify-token'), true);
  assert.equal(await emails.sendEmailLoginCode(recipient, '123456'), true);
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.equal(call.url, 'https://api.resend.com/emails');
    assert.equal(call.headers.Authorization, 'Bearer synthetic-provider-key');
    assert.deepEqual(call.body.to, [recipient]);
    assert.deepEqual(Object.keys(call.body).sort(), ['from', 'html', 'subject', 'text', 'to']);
  }
  assert.match(String(calls[0].body.text), /https:\/\/client.example.test\/reset-password\?token=synthetic-reset-token/);
  assert.match(String(calls[1].body.text), /https:\/\/client.example.test\/verify-email\/synthetic-verify-token/);
  assert.match(String(calls[2].body.text), /123456/);
  assert.doesNotMatch(JSON.stringify(records), /recipient@example|synthetic-provider-key|synthetic-reset-token|synthetic-verify-token|123456|recipientHash/);
});

test('provider rejection preserves status without exposing provider response bodies in errors or logs', async (t) => {
  const previous = { key: env.RESEND_API_KEY, from: env.EMAIL_FROM };
  Object.assign(env, { RESEND_API_KEY: 'synthetic-provider-key', EMAIL_FROM: 'security@example.test' });
  t.after(() => { Object.assign(env, { RESEND_API_KEY: previous.key, EMAIL_FROM: previous.from }); });
  const records: unknown[][] = [];
  t.mock.method(logger, 'error', (...args: unknown[]) => { records.push(args); });
  t.mock.method(globalThis, 'fetch', async () => new Response('private-provider-response recipient@example.test', { status: 429 }));
  await assert.rejects(new EmailService().sendEmail({ to: 'recipient@example.test', subject: 'private-code', html: 'private-token' }),
    (error: unknown) => error instanceof EmailDeliveryProviderError && error.message === 'Resend rejected the email (429)');
  assert.deepEqual(records, [[{ status: 429 }, 'Resend email delivery failed']]);
});

test('production email fails closed without configured credentials', async (t) => {
  const previous = { key: env.RESEND_API_KEY, mode: env.NODE_ENV };
  Object.assign(env, { RESEND_API_KEY: '', NODE_ENV: 'production' });
  t.after(() => { Object.assign(env, { RESEND_API_KEY: previous.key, NODE_ENV: previous.mode }); });
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; return new Response('{}'); });
  await assert.rejects(new EmailService().sendEmail({ to: 'recipient@example.test', subject: 'security', html: 'synthetic' }), EmailDeliveryNotConfiguredError);
  assert.equal(requests, 0);
});
