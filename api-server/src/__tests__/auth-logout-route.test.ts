import assert from "node:assert/strict";
import { test } from "node:test";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import authRouter from "../routes/auth.js";
import { AuthService } from "../services/auth-service.js";

test("logout is refresh-cookie based and protected by trusted-origin validation", () => {
  const routerStack = (authRouter as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ name: string }> } }> }).stack;
  const logoutRoute = routerStack.find((layer) => layer.route?.path === "/auth/logout")?.route;

  assert.ok(logoutRoute, "the POST logout route is registered");
  const middlewareNames = logoutRoute.stack.map((layer) => layer.name);
  assert.ok(middlewareNames.includes("requireTrustedOrigin"));
  assert.equal(middlewareNames.includes("authenticate"), false);
});

for (const scenario of [
  { name: "successful revocation", cookie: "refresh-success", fails: false, status: 200 },
  { name: "failed revocation", cookie: "refresh-failure", fails: true, status: 500 },
  { name: "a missing refresh cookie", cookie: null, fails: false, status: 200 },
] as const) {
  test(`logout expires the browser cookie before responding after ${scenario.name}`, async (t) => {
    const revoked: string[] = [];
    t.mock.method(AuthService.prototype, "logoutByToken", async (token: string) => {
      revoked.push(token);
      if (scenario.fails) throw new Error("Revocation backing store unavailable");
    });
    const errors: unknown[] = [];
    const app = express();
    app.use(cookieParser());
    app.use("/api", authRouter);
    app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      errors.push(error);
      if (!res.headersSent) res.status(500).json({ success: false });
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    t.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const address = server.address();
    assert.ok(address && typeof address !== "string");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: "Bearer expired-access-token",
        ...(scenario.cookie ? { Cookie: `refreshToken=${scenario.cookie}` } : {}),
      },
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, scenario.status);
    const body = await response.json() as { success: boolean; message: string; errors: string[] };
    assert.equal(body.success, !scenario.fails);
    assert.equal(body.message, scenario.fails ? "Could not fully revoke the session" : "Logged out");
    if (scenario.fails) assert.deepEqual(body.errors, ["Session revocation is temporarily unavailable"]);
    assert.deepEqual(revoked, scenario.cookie ? [scenario.cookie] : []);

    const expiredCookie = response.headers.get("set-cookie") ?? "";
    assert.match(expiredCookie, /^refreshToken=;/);
    assert.match(expiredCookie, /(?:^|; )Path=\//);
    assert.match(expiredCookie, /(?:^|; )HttpOnly(?:;|$)/);
    assert.match(expiredCookie, /(?:^|; )SameSite=/);
    const expires = expiredCookie.match(/(?:^|; )Expires=([^;]+)/)?.[1];
    assert.ok(expires && Date.parse(expires) < Date.now(), "the refresh cookie must expire in the past");
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.deepEqual(errors, [], "logout must not attempt to change headers after sending the response");
  });
}
