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

for (const scenario of ['approved', 'revoked', 'email_changed', 'wrong_totp'] as const) {
  test(`Google binding waits for the account second factor and current identity: ${scenario}`, async t => {
    const original = env.GOOGLE_CLIENT_ID;
    const originalDomains = [...allowedEmailDomains];
    env.GOOGLE_CLIENT_ID = 'synthetic-google-client';
    allowedEmailDomains.splice(0);
    t.after(() => { env.GOOGLE_CLIENT_ID = original; allowedEmailDomains.splice(0, allowedEmailDomains.length, ...originalDomains); });
    let user = { id: '10000000-0000-4000-8000-000000000001', email: 'synthetic@gmail.com',
      accountStatus: 'active', authVersion: 0, googleSubject: null, settings: {} } as UserRecord;
    let pending: any;
    let links = 0;
    const service = new AuthService({
      findByGoogleSubject: async () => undefined, findByEmail: async () => user, findById: async () => user,
      linkGoogleSubjectForLogin: async () => { links++; user = { ...user, googleSubject: 'synthetic-subject' }; return user; },
    } as never, {
      setStrict: async (_key: string, value: string) => { pending = JSON.parse(value); }, addToSetStrict: async () => {},
      consumeApprovedStrict: async () => {
        if (!pending) return null;
        const current = pending; pending = undefined; return JSON.stringify({ ...current, status: 'approved' });
      }, removeFromSetStrict: async () => {},
    } as never, undefined, undefined, undefined, () => ({
      verifyIdToken: async () => ({ getPayload: () => ({ sub: 'synthetic-subject', email: 'synthetic@gmail.com', email_verified: true }) }),
    }) as never);
    const secret = authenticator.generateSecret();
    t.mock.method(service as any, 'readTotpSecret', async () => secret);
    const sessions = t.mock.method(service as any, 'createSession', async () => ({ user }));
    if (scenario === 'wrong_totp') {
      const valid = authenticator.generate(secret);
      await assert.rejects(service.loginWithGoogle({ credential: 'synthetic', totpCode: valid === '000000' ? '111111' : '000000' }), /Invalid two-factor/);
      assert.equal(links, 0);
      assert.equal(sessions.mock.callCount(), 0);
      return;
    }
    let challengeId = '';
    await assert.rejects(service.loginWithGoogle({ credential: 'synthetic' }), error => {
      assert.ok(error instanceof TwoFactorRequiredError);
      challengeId = error.challenge!.challengeId;
      return true;
    });
    assert.equal(links, 0, 'an abandoned device challenge must not link a provider');
    assert.deepEqual(pending.googleIdentity, { subject: 'synthetic-subject', email: 'synthetic@gmail.com' });
    if (scenario === 'revoked') user = { ...user, authVersion: 1 };
    if (scenario === 'email_changed') user = { ...user, email: 'changed@gmail.com' };
    const result = await service.completeTwoFactorLogin(challengeId);
    assert.equal(result?.user.id, scenario === 'approved' ? user.id : undefined);
    assert.equal(links, scenario === 'approved' ? 1 : 0);
    assert.equal(sessions.mock.callCount(), scenario === 'approved' ? 1 : 0);
    assert.equal(await service.completeTwoFactorLogin(challengeId), undefined, 'approval remains single use');
  });
}
