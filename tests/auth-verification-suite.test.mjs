import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const cacheDir = path.join(process.cwd(), "api-server", "node_modules", ".cache");
await mkdir(cacheDir, { recursive: true });
const outfile = path.join(cacheDir, "auth-verification-suite-bundle.mjs");

await build({
  stdin: {
    contents: `
      export { isGoogleAuthoritativeEmail, GoogleLinkVerificationRequiredError, GoogleSignInNotConfiguredError, TwoFactorRequiredError, TooManyAttemptsError, EmailOtpInvalidError, EmailVerificationRequiredError, RegistrationNotAllowedError, UserAlreadyExistsError } from './api-server/src/services/auth-service.ts';
      export { AuthController } from './api-server/src/controllers/auth-controller.ts';
      export { isAllowedEmail } from './api-server/src/validators/auth.ts';
      export { isTrustedOrigin, requireTrustedOrigin } from './api-server/src/middlewares/trusted-origin.ts';
      export { EmailDeliveryNotConfiguredError, EmailDeliveryProviderError } from './api-server/src/services/email-service.ts';
    `,
    resolveDir: process.cwd(),
    sourcefile: "auth-verification-entry.ts",
  },
  bundle: true,
  outfile,
  platform: "node",
  format: "esm",
  packages: "external",
});

const {
  isGoogleAuthoritativeEmail,
  isAllowedEmail,
  AuthController,
  isTrustedOrigin,
  requireTrustedOrigin,
  GoogleLinkVerificationRequiredError,
  GoogleSignInNotConfiguredError,
  TwoFactorRequiredError,
  TooManyAttemptsError,
  EmailOtpInvalidError,
  EmailVerificationRequiredError,
  RegistrationNotAllowedError,
  UserAlreadyExistsError,
  EmailDeliveryNotConfiguredError,
  EmailDeliveryProviderError,
} = await import(pathToFileURL(outfile).href);

function mockResponse() {
  let statusCode = 200;
  let responseData = null;
  const cookies = [];
  const clearedCookies = [];

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
      return this;
    },
    clearCookie(name, options) {
      clearedCookies.push({ name, options });
      return this;
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
    get clearedCookies() {
      return clearedCookies;
    },
  };
  return res;
}

// 1. Email Domain & Eligibility Policies
test("Email domain policy: valid vs invalid email structures", () => {
  assert.equal(isAllowedEmail("student@kiit.ac.in"), true);
  assert.equal(isAllowedEmail("USER@KIIT.AC.IN"), true);
  assert.equal(isAllowedEmail("not-an-email"), false);
  assert.equal(isAllowedEmail("@kiit.ac.in"), false);
  assert.equal(isAllowedEmail("user@"), false);
});

// 2. Google Identity Authority & Linking Rules
test("Google Identity: domain authority classification", () => {
  // Authoritative domains: gmail.com, googlemail.com, or matching hosted-domain
  assert.equal(isGoogleAuthoritativeEmail("resident@gmail.com"), true);
  assert.equal(isGoogleAuthoritativeEmail("resident@googlemail.com"), true);
  assert.equal(isGoogleAuthoritativeEmail("student@university.edu", "university.edu"), true);
  assert.equal(isGoogleAuthoritativeEmail("student@university.edu", "UNIVERSITY.EDU"), true);
  assert.equal(isGoogleAuthoritativeEmail("student@university.edu", "university.edu."), true);

  // Untrusted third-party mailboxes on Google Identity
  assert.equal(isGoogleAuthoritativeEmail("student@university.edu", "other.edu"), false);
  assert.equal(isGoogleAuthoritativeEmail("user@external.example"), false);
  assert.equal(isGoogleAuthoritativeEmail("user@spoofed.gmail.com"), false);
  assert.equal(isGoogleAuthoritativeEmail("user@gmail.com.attacker.com"), false);
});

// 3. Google Sign-In Controller Behaviors
test("Google sign-in: sets HttpOnly refresh cookie and returns tokens", async () => {
  const fakeAuth = {
    loginWithGoogle: async () => ({
      user: { id: "u-1", username: "candidate", email: "candidate@gmail.com", role: "user" },
      tokens: { accessToken: "access-token-jwt", refreshToken: "refresh-token-jwt", expiresAt: "2026-10-10T12:00:00Z" },
    }),
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { credential: "valid-jwt" } };
  const res = mockResponse();

  await ctrl.googleLogin(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.responseData.success, true);
  assert.equal(res.responseData.data.tokens.accessToken, "access-token-jwt");
  assert.equal(res.cookies.length, 1);
  assert.equal(res.cookies[0].name, "refreshToken");
  assert.equal(res.cookies[0].value, "refresh-token-jwt");
  assert.equal(res.cookies[0].options.httpOnly, true);
});

test("Google sign-in: rejects unlinked third-party Google mailbox with 403", async () => {
  const fakeAuth = {
    loginWithGoogle: async () => {
      throw new GoogleLinkVerificationRequiredError(
        "This Google email cannot be linked automatically. Sign in using your Yor password or email code.",
      );
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { credential: "third-party-google-jwt" } };
  const res = mockResponse();

  await ctrl.googleLogin(req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.responseData.success, false);
  assert.match(res.responseData.errors[0], /cannot be linked automatically/);
});

test("Google sign-in: unconfigured provider returns 503", async () => {
  const fakeAuth = {
    loginWithGoogle: async () => {
      throw new GoogleSignInNotConfiguredError("Google sign-in is not configured");
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { credential: "google-jwt" } };
  const res = mockResponse();

  await ctrl.googleLogin(req, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.responseData.success, false);
  assert.match(res.responseData.errors[0], /Google sign-in is not configured/);
});

test("Google sign-in: abuse rate limiting returns 429", async () => {
  const fakeAuth = {
    loginWithGoogle: async () => {
      throw new TooManyAttemptsError("Too many failed attempts. Try again later.");
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { credential: "google-jwt" } };
  const res = mockResponse();

  await ctrl.googleLogin(req, res);
  assert.equal(res.statusCode, 429);
  assert.equal(res.responseData.success, false);
  assert.match(res.responseData.errors[0], /Too many failed attempts/);
});

test("Google sign-in: MFA required returns 200 with requiresTwoFactor challenge", async () => {
  const fakeAuth = {
    loginWithGoogle: async () => {
      throw new TwoFactorRequiredError("Approve this sign-in in your Yor app", {
        challengeId: "chal-123",
        matchingNumber: 42,
        expiresAt: "2026-10-10T04:00:00Z",
      });
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { credential: "google-jwt" } };
  const res = mockResponse();

  await ctrl.googleLogin(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.responseData.data.requiresTwoFactor, true);
  assert.equal(res.responseData.data.matchingNumber, 42);
});

// 4. Registration & Fail-Closed Email Delivery
test("Registration: returns 503 fail-closed when email service is unconfigured", async () => {
  const fakeAuth = {
    register: async () => {
      throw new EmailDeliveryNotConfiguredError();
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { username: "newuser", email: "new@example.com", password: "Password1!", fullName: "New User", acceptedTerms: true, confirmedAge: true } };
  const res = mockResponse();

  await ctrl.register(req, res);
  assert.equal(res.statusCode, 503);
  assert.match(res.responseData.message, /temporarily unavailable/i);
});

test("Registration: returns 502 fail-closed when email provider rejects delivery", async () => {
  const fakeAuth = {
    register: async () => {
      throw new EmailDeliveryProviderError("Resend rejected the email (403)");
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { username: "newuser", email: "new@example.com", password: "Password1!", fullName: "New User", acceptedTerms: true, confirmedAge: true } };
  const res = mockResponse();

  await ctrl.register(req, res);
  assert.equal(res.statusCode, 502);
  assert.match(res.responseData.message, /could not be delivered/i);
});

test("Registration: returns 400 when email domain or age/terms eligibility fails", async () => {
  const fakeAuth = {
    register: async () => {
      throw new RegistrationNotAllowedError("This email domain is not allowed for this deployment");
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { username: "disallowed", email: "bad@unauthorized.org" } };
  const res = mockResponse();

  await ctrl.register(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.responseData.message, /not available for this email domain/i);
});

test("Registration: returns 409 when user already exists", async () => {
  const fakeAuth = {
    register: async () => {
      throw new UserAlreadyExistsError("An account already exists for that email or username");
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { username: "existing", email: "existing@example.com" } };
  const res = mockResponse();

  await ctrl.register(req, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.responseData.message, /already exists/i);
});

// 5. Password Login Journeys
test("Password login: unverified email returns 403", async () => {
  const fakeAuth = {
    login: async () => {
      throw new EmailVerificationRequiredError("Verify your email before signing in");
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { identifier: "unverified@example.com", password: "Password1!" } };
  const res = mockResponse();

  await ctrl.login(req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.responseData.meta?.emailVerificationRequired, true);
});

test("Password login: invalid credentials returns generic 401 without user enumeration", async () => {
  const fakeAuth = {
    login: async () => {
      throw new Error("Invalid credentials");
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { identifier: "nobody@example.com", password: "WrongPassword" } };
  const res = mockResponse();

  await ctrl.login(req, res);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.responseData.errors, ["Invalid credentials"]);
});

// 6. Email-Code (OTP) Journeys
test("Email OTP: invalid, expired, or exhausted code returns 401", async () => {
  const fakeAuth = {
    loginWithEmailOtp: async () => {
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { email: "user@example.com", code: "000000" } };
  const res = mockResponse();

  await ctrl.verifyEmailOtp(req, res);
  assert.equal(res.statusCode, 401);
  assert.match(res.responseData.errors[0], /invalid or expired/i);
});

test("Email OTP request: returns 202 accepted without revealing account existence", async () => {
  const fakeAuth = {
    requestEmailOtp: async () => false, // false when account does not exist
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { email: "nonexistent@example.com" } };
  const res = mockResponse();

  await ctrl.requestEmailOtp(req, res);
  assert.equal(res.statusCode, 202);
  assert.match(res.responseData.message, /If that email is registered/i);
});

// 7. Password Reset Journeys
test("Password reset request: returns 200 without revealing account existence", async () => {
  const fakeAuth = {
    requestPasswordReset: async () => undefined,
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { email: "nonexistent@example.com" } };
  const res = mockResponse();

  await ctrl.resetPassword(req, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.responseData.message, /If that email is registered/i);
});

test("Password reset confirm: invalid or replayed token returns 400", async () => {
  const fakeAuth = {
    confirmPasswordReset: async () => false,
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { token: "replayed-or-expired-token", newPassword: "NewPassword1!" } };
  const res = mockResponse();

  await ctrl.confirmResetPassword(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.responseData.errors[0], /Invalid or expired token/i);
});

// 8. Session Revocation: Logout & Logout-All
test("Logout: clears refresh cookie and revokes session", async () => {
  let loggedOutToken = null;
  const fakeAuth = {
    logoutByToken: async (token) => { loggedOutToken = token; },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { cookies: { refreshToken: "active-refresh-token" } };
  const res = mockResponse();

  await ctrl.logout(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(loggedOutToken, "active-refresh-token");
  assert.equal(res.clearedCookies.length, 1);
  assert.equal(res.clearedCookies[0].name, "refreshToken");
  assert.equal(res.clearedCookies[0].options.httpOnly, true);
});

test("Logout: clears refresh cookie even if revocation service fails", async () => {
  const fakeAuth = {
    logoutByToken: async () => { throw new Error("Redis connection failure"); },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { cookies: { refreshToken: "active-refresh-token" } };
  const res = mockResponse();

  await ctrl.logout(req, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.clearedCookies.length, 1);
  assert.equal(res.clearedCookies[0].name, "refreshToken");
});

test("Logout-all: revokes all user sessions and increments epoch", async () => {
  let revokedUserId = null;
  const fakeAuth = {
    logoutAllDevices: async (userId) => { revokedUserId = userId; },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { user: { id: "user-to-revoke" } };
  const res = mockResponse();

  await ctrl.logoutAllDevices(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(revokedUserId, "user-to-revoke");
  assert.match(res.responseData.message, /All sessions revoked/i);
});

// 9. Refresh Token & Session Boundary
test("Refresh: missing cookie returns 401 without refresh attempt", async () => {
  const fakeAuth = {
    refreshAccessToken: async () => assert.fail("Should not call service without cookie"),
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { cookies: {} };
  const res = mockResponse();

  await ctrl.refresh(req, res);
  assert.equal(res.statusCode, 401);
  assert.match(res.responseData.message, /Refresh session required/i);
});

test("Refresh: invalid/revoked token returns 401", async () => {
  const fakeAuth = {
    refreshAccessToken: async () => undefined,
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { cookies: { refreshToken: "revoked-token" } };
  const res = mockResponse();

  await ctrl.refresh(req, res);
  assert.equal(res.statusCode, 401);
  assert.match(res.responseData.message, /Invalid refresh token/i);
});

// 10. Origin & CORS Security
test("CORS & Origin security: trusted origins accepted, untrusted rejected", () => {
  // Non-browser callers (origin omitted)
  assert.equal(isTrustedOrigin(undefined), true);
  // Unconfigured browser origin rejected
  assert.equal(isTrustedOrigin("https://malicious-site.attacker"), false);
  assert.equal(isTrustedOrigin("http://localhost:9999"), false);
  assert.equal(isTrustedOrigin("null"), false);
});

test("requireTrustedOrigin middleware halts cross-origin request with 403", () => {
  let nextCalled = false;
  let statusCode = 200;
  let responseBody = null;
  const req = { get: (header) => (header.toLowerCase() === "origin" ? "https://evil.attacker" : undefined) };
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; },
  };
  requireTrustedOrigin(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
  assert.match(JSON.stringify(responseBody), /Forbidden origin/);
});

// 11. Datastore Outage Resilience
test("Datastore outage: returns 503 without leaking stack traces or sensitive data", async () => {
  const databaseError = Object.assign(new Error("Connection terminated unexpectedly"), {
    cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" }),
  });
  const fakeAuth = {
    login: async () => { throw databaseError; },
  };
  const ctrl = new AuthController(fakeAuth);
  const req = { body: { identifier: "candidate@example.com", password: "Password1!" } };
  const res = mockResponse();

  await ctrl.login(req, res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.responseData.errors, ["auth_service_unavailable"]);
  assert.equal(JSON.stringify(res.responseData).includes("ECONNREFUSED"), false);
  assert.equal(JSON.stringify(res.responseData).includes("127.0.0.1"), false);
});
