import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const cacheDir = path.join(process.cwd(), "api-server", "node_modules", ".cache");
await mkdir(cacheDir, { recursive: true });
const outfile = path.join(cacheDir, "google-auth-test.mjs");

await build({
  stdin: {
    contents: `
      export { isGoogleAuthoritativeEmail, GoogleLinkVerificationRequiredError, GoogleSignInNotConfiguredError, TwoFactorRequiredError, TooManyAttemptsError } from './api-server/src/services/auth-service.ts';
      export { AuthController } from './api-server/src/controllers/auth-controller.ts';
    `,
    resolveDir: process.cwd(),
    sourcefile: "google-auth-test-entry.ts",
  },
  bundle: true,
  outfile,
  platform: "node",
  format: "esm",
  packages: "external",
});

const {
  isGoogleAuthoritativeEmail,
  AuthController,
  GoogleLinkVerificationRequiredError,
  TooManyAttemptsError,
} = await import(pathToFileURL(outfile).href);

test("isGoogleAuthoritativeEmail accurately validates Google authority", () => {
  assert.equal(isGoogleAuthoritativeEmail("user@gmail.com"), true);
  assert.equal(isGoogleAuthoritativeEmail("user@googlemail.com"), true);
  assert.equal(isGoogleAuthoritativeEmail("USER@GMAIL.COM"), true);
  assert.equal(isGoogleAuthoritativeEmail("user@company.example", "company.example"), true);
  assert.equal(isGoogleAuthoritativeEmail("user@company.example", "COMPANY.EXAMPLE"), true);
  assert.equal(isGoogleAuthoritativeEmail("user@company.example", "company.example."), true);
  assert.equal(isGoogleAuthoritativeEmail("user@company.example", "wrong.example"), false);
  assert.equal(isGoogleAuthoritativeEmail("user@company.example"), false);
  assert.equal(isGoogleAuthoritativeEmail("user@evil.gmail.com"), false);
  assert.equal(isGoogleAuthoritativeEmail("user@gmail.com.evil.com"), false);
  assert.equal(isGoogleAuthoritativeEmail("not-an-email"), false);
  assert.equal(isGoogleAuthoritativeEmail("@gmail.com"), false);
  assert.equal(isGoogleAuthoritativeEmail("user@"), false);
});

function mockResponse() {
  let statusCode = 200;
  let responseData = null;
  const cookies = [];

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    cookie(name, value, options) {
      cookies.push({ name, value, options });
    },
    clearCookie(name, options) {
      cookies.push({ name, value: null, options, cleared: true });
    },
    get statusCode() {
      return statusCode;
    },
    get responseData() {
      return responseData;
    },
    get cookies() {
      return cookies;
    },
  };
  return res;
}

test("AuthController.googleLogin sets HttpOnly refresh cookie on successful sign-in", async () => {
  const fakeAuthService = {
    loginWithGoogle: async () => ({
      user: { id: "user-123", username: "testuser", email: "test@gmail.com", role: "user" },
      tokens: { accessToken: "access-token-123", refreshToken: "refresh-token-123", expiresAt: "2026-10-09T12:00:00Z" },
    }),
  };

  const controller = new AuthController(fakeAuthService);
  const req = { body: { credential: "valid-google-jwt" } };
  const res = mockResponse();

  await controller.googleLogin(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.responseData.success, true);
  assert.equal(res.responseData.data.tokens.accessToken, "access-token-123");
  assert.equal(res.cookies.length, 1);
  assert.equal(res.cookies[0].name, "refreshToken");
  assert.equal(res.cookies[0].value, "refresh-token-123");
  assert.equal(res.cookies[0].options.httpOnly, true);
});

test("AuthController.googleLogin returns 403 on untrusted third-party email auto-link", async () => {
  const fakeAuthService = {
    loginWithGoogle: async () => {
      throw new GoogleLinkVerificationRequiredError(
        "This Google email cannot be linked automatically. Sign in using your Yor password or email code.",
      );
    },
  };

  const controller = new AuthController(fakeAuthService);
  const req = { body: { credential: "valid-google-jwt" } };
  const res = mockResponse();

  await controller.googleLogin(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.responseData.success, false);
  assert.match(res.responseData.errors[0], /cannot be linked automatically/);
});

test("AuthController.googleLogin returns 429 when abuse detection triggers rate limit", async () => {
  const fakeAuthService = {
    loginWithGoogle: async () => {
      throw new TooManyAttemptsError("Too many failed attempts. Try again later.");
    },
  };

  const controller = new AuthController(fakeAuthService);
  const req = { body: { credential: "abusive-google-jwt" } };
  const res = mockResponse();

  await controller.googleLogin(req, res);

  assert.equal(res.statusCode, 429);
  assert.equal(res.responseData.success, false);
  assert.match(res.responseData.errors[0], /Too many failed attempts/);
});

test("AuthController.googleLogin returns 503 when Redis or DB is unavailable", async () => {
  const fakeAuthService = {
    loginWithGoogle: async () => {
      throw new Error("Redis repository is disconnected");
    },
  };

  const controller = new AuthController(fakeAuthService);
  const req = { body: { credential: "valid-google-jwt" } };
  const res = mockResponse();

  await controller.googleLogin(req, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.responseData.success, false);
  assert.deepEqual(res.responseData.errors, ["auth_service_unavailable"]);
});

test("AuthController.googleLogin returns 401 generic failure without account enumeration", async () => {
  const fakeAuthService = {
    loginWithGoogle: async () => {
      throw new Error("No Yor account exists for this Google email. Create an account first.");
    },
  };

  const controller = new AuthController(fakeAuthService);
  const req = { body: { credential: "unregistered-google-jwt" } };
  const res = mockResponse();

  await controller.googleLogin(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.responseData.success, false);
  assert.deepEqual(res.responseData.errors, ["Google sign-in failed"]);
});

test("AuthController.completeTwoFactorLogin returns 503 when Redis is unavailable", async () => {
  const fakeAuthService = {
    completeTwoFactorLogin: async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:6379");
    },
  };

  const controller = new AuthController(fakeAuthService);
  const req = { params: { challengeId: "challenge-123" } };
  const res = mockResponse();

  await controller.completeTwoFactorLogin(req, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.responseData.success, false);
  assert.deepEqual(res.responseData.errors, ["auth_service_unavailable"]);
});
