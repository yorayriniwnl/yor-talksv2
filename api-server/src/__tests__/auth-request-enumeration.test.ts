import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuthController } from '../controllers/auth-controller.js';
import { TooManyAttemptsError } from '../services/auth-service.js';

for (const [handler, method, expectedStatus] of [
  ['requestEmailOtp', 'requestEmailOtp', 202],
  ['resendVerificationEmailPublic', 'requestEmailVerificationByEmail', 202],
  ['resetPassword', 'requestPasswordReset', 200],
] as const) {
  test(`public ${handler} does not reveal existing accounts through per-account throttles`, async () => {
    let throttled = false;
    const controller = new AuthController({ [method]: async () => {
      if (throttled) throw new TooManyAttemptsError('Private per-account throttle state');
      return undefined;
    } } as never);
    const request = { body: { email: 'synthetic@example.test' } } as never;
    const response = () => ({ statusCode: 0, body: undefined as unknown,
      status(value: number) { this.statusCode = value; return this; },
      json(value: unknown) { this.body = value; return this; } });
    const unknown = response();
    await controller[handler](request, unknown as never);
    throttled = true;
    const existing = response();
    await controller[handler](request, existing as never);
    assert.equal(existing.statusCode, expectedStatus);
    assert.equal(existing.statusCode, unknown.statusCode);
    assert.deepEqual(existing.body, unknown.body);
    assert.doesNotMatch(JSON.stringify(existing.body), /throttle|Private/);
  });
}
