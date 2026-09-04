import assert from "node:assert/strict";
import { after, test } from "node:test";
import express from "express";
import diagnosticsRouter from "../routes/diagnostics.js";

const app = express();
app.use("/api", diagnosticsRouter);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const baseUrl = `http://127.0.0.1:${address.port}`;

after(() => server.close());

test("diagnostics rejects anonymous production-boundary requests", async () => {
  const response = await fetch(`${baseUrl}/api/diagnostics`);
  assert.equal(response.status, 401);
});