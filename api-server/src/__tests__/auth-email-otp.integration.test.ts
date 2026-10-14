import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { AuthService, EmailOtpInvalidError } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import type { UserRepository } from "../repositories/user-repository.js";
import type { EmailService } from "../services/email-service.js";
import type { UserRecord } from "../types/index.js";

const redis = new RedisRepository();
const pendingKeys: string[] = [];
after(async () => {
  await Promise.all(pendingKeys.map((key) => redis.delStrict(key)));
  await redis.disconnect();
});

function fixture() {
  const email = `otp-${randomUUID()}@kiit.ac.in`;
  const deliveredCodes: string[] = [];
  const user = {
    id: randomUUID(), email, username: `otp-${randomUUID()}`, passwordHash: "unused",
    authVersion: 0, emailVerified: false, accountStatus: "active", role: "user", permissions: [],
  } as UserRecord;
  const users = {
    findByEmail: async () => user,
    findById: async () => user,
    recordLogin: async (_current: UserRecord, updates: Partial<UserRecord>) => Object.assign(user, updates),
    getOwnRelationships: async () => ({ following: [], pendingFollowIds: [], favoriteCreatorIds: [] }),
    revokeAllCredentials: async () => { user.authVersion = (user.authVersion ?? 0) + 1; },
  } as unknown as UserRepository;
  const emailService = {
    sendEmailLoginCode: async (_address: string, code: string) => { deliveredCodes.push(code); },
  } as unknown as EmailService;
  const auth = new AuthService(users, redis, undefined, emailService);
  return { auth, email, user, deliveredCodes };
}

async function otpKey(email: string): Promise<string> {
  const hash = await redis.hashToken(email);
  const key = `email-login-otp:${hash}`;
  pendingKeys.push(key);
  return key;
}

test("concurrent valid email OTP submissions create at most one session", async () => {
  const { auth, email, user, deliveredCodes } = fixture();
  const key = await otpKey(email);
  await auth.requestEmailOtp(email);
  const results = await Promise.allSettled(Array.from({ length: 8 }, () =>
    auth.loginWithEmailOtp({ email, code: deliveredCodes[0]! }),
  ));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await redis.scanStrict(`session:${user.id}:*`)).length, 1);
});

test("failed OTP attempts are atomically counted and the fifth locks the code", async () => {
  const { auth, email, deliveredCodes } = fixture();
  const key = await otpKey(email);
  await auth.requestEmailOtp(email);
  for (let attempt = 0; attempt < 5; attempt++) {
    await assert.rejects(auth.loginWithEmailOtp({ email, code: "000000" }), EmailOtpInvalidError);
  }
  const state = JSON.parse((await redis.getStrict(key))!) as { attempts: number };
  assert.equal(state.attempts, 5);
  await assert.rejects(auth.loginWithEmailOtp({ email, code: deliveredCodes[0]! }), EmailOtpInvalidError);
});

test("logout-all revokes an already issued email OTP", async () => {
  const { auth, email, user, deliveredCodes } = fixture();
  await otpKey(email);
  await auth.requestEmailOtp(email);
  await auth.logoutAllDevices(user.id);
  await assert.rejects(auth.loginWithEmailOtp({ email, code: deliveredCodes[0]! }), EmailOtpInvalidError);
  assert.equal((await redis.scanStrict(`session:${user.id}:*`)).length, 0);
});