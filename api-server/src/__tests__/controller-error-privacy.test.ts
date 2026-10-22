import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response } from 'express';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { UserController } from '../controllers/user-controller.js';
import { StoryController } from '../controllers/story-controller.js';
import { MediaLifecycleError } from '../services/media-service.js';

function response() {
  let statusCode = 200;
  let body: unknown;
  return {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
    result: () => ({ statusCode, body }),
  } as unknown as Response & { result: () => { statusCode: number; body: unknown } };
}

test('profile and highlight fallback responses do not expose database or provider error messages', async t => {
  const failure = new DrizzleQueryError('INSERT INTO users(secret) VALUES ($1)', ['private-provider-credential'], new Error('private-driver-detail'));
  const reject = async () => { throw failure; };
  const controller = new UserController({ updatePremiumProfile: reject, setCloseFriend: reject, setFavoriteCreator: reject,
    blockUser: reject, muteUser: reject } as never, {} as never, {} as never);
  t.mock.method((controller as any).contactShieldService, 'add', reject);
  const request = { user: { id: '10000000-0000-4000-8000-000000000001' }, params: { userId: '10000000-0000-4000-8000-000000000002' },
    body: { contacts: [], title: 'Synthetic highlight' } } as unknown as Request;
  let leaks = 0;
  for (const action of [controller.updatePremiumProfile, controller.addCloseFriend, controller.removeCloseFriend,
    controller.favoriteCreator, controller.unfavoriteCreator, controller.blockUser, controller.muteUser, controller.addContactShields,
    new StoryController({ createHighlight: reject } as never).createHighlight]) {
    const res = response();
    await action(request, res);
    assert.equal(res.result().statusCode, 400);
    if (/private-|INSERT INTO/.test(JSON.stringify(res.result().body))) leaks++;
  }
  assert.equal(leaks, 0, 'all nine unexpected-error fallbacks must use static public guidance');
});

test('reviewed media policy failures retain their intended public status and code', async () => {
  const reject = async () => { throw new MediaLifecycleError('Media is unavailable', 403, 'media_unavailable'); };
  const user = new UserController({ updatePremiumProfile: reject } as never, {} as never, {} as never);
  const story = new StoryController({ createHighlight: reject } as never);
  for (const action of [user.updatePremiumProfile, story.createHighlight]) {
    const res = response();
    await action({ user: { id: 'synthetic-owner' }, body: {} } as unknown as Request, res);
    assert.equal(res.result().statusCode, 403);
    assert.deepEqual((res.result().body as { errors: string[] }).errors, ['media_unavailable']);
  }
});
