import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";

test("fetchWithTimeout aborts slow external requests instead of hanging the process", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return new Response("ok");
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => fetchWithTimeout("https://example.com", { method: "GET" }, 10),
      /timed out after 10ms/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
