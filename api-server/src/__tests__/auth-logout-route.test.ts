import assert from "node:assert/strict";
import { test } from "node:test";
import authRouter from "../routes/auth.js";

test("logout is refresh-cookie based and protected by trusted-origin validation", () => {
  const routerStack = (authRouter as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ name: string }> } }> }).stack;
  const logoutRoute = routerStack.find((layer) => layer.route?.path === "/auth/logout")?.route;

  assert.ok(logoutRoute, "the POST logout route is registered");
  const middlewareNames = logoutRoute.stack.map((layer) => layer.name);
  assert.ok(middlewareNames.includes("requireTrustedOrigin"));
  assert.equal(middlewareNames.includes("authenticate"), false);
});
