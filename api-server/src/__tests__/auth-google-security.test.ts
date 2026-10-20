import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuthService, TwoFactorRequiredError } from '../services/auth-service.js';
import { authenticator } from 'otplib';
import { allowedEmailDomains, env } from '../config/env.js';
import type { UserRecord } from '../types/index.js';

for (const scenario of ['external_unlinked', 'external_linked', 'gmail', 'workspace', 'wrong_workspace', 'deleted', 'link_conflict'] as const) {
  test(`Google sign-in uses provider subject or current mailbox authority: ${scenario}`, async t => {
    const original = env.GOOGLE_CLIENT_ID;
    const originalDomains = [...allowedEmailDomains];
    env.GOOGLE_CLIENT_ID = 'synthetic-google-client';
    allowedEmailDomains.splice(0);
    t.after(() => { env.GOOGLE_CLIENT_ID = original; allowedEmailDomains.splice(0, allowedEmailDomains.length, ...originalDomains); });
    const email = scenario === 'gmail' ? 'synthetic@gmail.com' : 'synthetic@example.test';
    const subject = 'synthetic-google-subject';
    const user = { id: '10000000-0000-4000-8000-000000000001', email, emailVerified: true,
      googleSubject: scenario === 'external_linked' ? subject : null,
      accountStatus: scenario === 'deleted' ? 'deleted' : 'active', settings: {} } as UserRecord;
    let updates = 0;
    const service = new AuthService({
      findByGoogleSubject: async () => scenario === 'external_linked' ? user : undefined,
      findByEmail: async () => user,
      linkGoogleSubjectForLogin: async (_user: UserRecord, googleSubject: string) => {
        updates++; return scenario === 'link_conflict' ? undefined : { ...user, googleSubject };
      },
    } as never, {} as never, undefined, undefined, undefined, () => ({
      verifyIdToken: async (request: { idToken: string; audience: string }) => {
        assert.deepEqual(request, { idToken: 'synthetic-id-token', audience: env.GOOGLE_CLIENT_ID });
        return { getPayload: () => ({ sub: subject, email, email_verified: true,
          ...(['workspace', 'deleted', 'link_conflict'].includes(scenario) ? { hd: 'example.test' }
            : scenario === 'wrong_workspace' ? { hd: 'other.example' } : {}) }) };
      },
    }) as never);
    const sessions = t.mock.method(service as any, 'createSession', async () => ({ user }));
    if (['external_unlinked', 'wrong_workspace', 'deleted', 'link_conflict'].includes(scenario)) {
      await assert.rejects(service.loginWithGoogle({ credential: 'synthetic-id-token' }),
        ['external_unlinked', 'wrong_workspace'].includes(scenario) ? /password or email code/ : /unavailable|could not be linked/i);
      assert.equal(updates, scenario === 'link_conflict' ? 1 : 0, 'failed identity or account authority must not create a provider link');
      assert.equal(sessions.mock.callCount(), 0);
    } else {
      assert.equal((await service.loginWithGoogle({ credential: 'synthetic-id-token' })).user.id, user.id);
      assert.equal(updates, scenario === 'external_linked' ? 0 : 1);
      assert.equal(sessions.mock.callCount(), 1);
    }
  });
}

test('unbound Google identity is not persisted before second-factor approval', async t => {
  const previousClient = env.GOOGLE_CLIENT_ID;
  const previousDomains = [...allowedEmailDomains];
  env.GOOGLE_CLIENT_ID = 'synthetic-google-client';
  allowedEmailDomains.splice(0);
  t.after(() => { env.GOOGLE_CLIENT_ID = previousClient; allowedEmailDomains.splice(0, allowedEmailDomains.length, ...previousDomains); });
  const user = { id: '10000000-0000-4000-8000-000000000001', email: 'synthetic@gmail.com',
    accountStatus: 'active', googleSubject: null, settings: {} } as UserRecord;
  let links = 0;
  const service = new AuthService({
    findByGoogleSubject: async () => undefined,
    findByEmail: async () => user,
    linkGoogleSubjectForLogin: async () => { links++; return { ...user, googleSubject: 'synthetic-subject' }; },
  } as never, {} as never, undefined, undefined, undefined, () => ({
    verifyIdToken: async () => ({ getPayload: () => ({ sub: 'synthetic-subject', email: user.email, email_verified: true }) }),
  }) as never);
  const secret = authenticator.generateSecret();
  t.mock.method(service as any, 'readTotpSecret', async () => secret);
  t.mock.method(service as any, 'createLoginApprovalChallenge', async () => ({ challengeId: 'synthetic-challenge' }));
  const sessions = t.mock.method(service as any, 'createSession', async () => ({ user }));
  await assert.rejects(service.loginWithGoogle({ credential: 'synthetic' }), TwoFactorRequiredError);
  assert.equal(links, 0);
  assert.equal(sessions.mock.callCount(), 0);
  const valid = authenticator.generate(secret);
  await assert.rejects(service.loginWithGoogle({ credential: 'synthetic', totpCode: valid === '000000' ? '111111' : '000000' }), /Invalid two-factor/);
  assert.equal(links, 0);
  assert.equal(sessions.mock.callCount(), 0);
  await service.loginWithGoogle({ credential: 'synthetic', totpCode: valid });
  assert.equal(links, 1);
  assert.equal(sessions.mock.callCount(), 1);
});
