import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "../config/env.js";
import { AIService, ModerationUnavailableError } from "../services/ai-service.js";
import { ai, OpenAIProvider } from "../services/ai/AIGateway.js";

const categories = {
  harassment: false, "harassment/threatening": false,
  hate: false, "hate/threatening": false,
  illicit: false, "illicit/violent": false,
  "self-harm": false, "self-harm/intent": false, "self-harm/instructions": false,
  sexual: false, "sexual/minors": false,
  violence: false, "violence/graphic": false,
};
const cleanResult = {
  flagged: false,
  categories,
  category_scores: Object.fromEntries(Object.keys(categories).map((key) => [key, 0.01])),
};

test("OpenAI moderation rejects empty, partial, coerced, and out-of-range results", async (t) => {
  const malformed = [
    {}, { results: [] }, { results: [{}] },
    { results: [{ ...cleanResult, flagged: "false" }] },
    { results: [{ ...cleanResult, categories: {} }] },
    { results: [{ ...cleanResult, categories: { ...categories, sexual: "false" } }] },
    { results: [{ ...cleanResult, category_scores: { ...cleanResult.category_scores, sexual: 2 } }] },
  ];
  let response: unknown;
  t.mock.method(globalThis, "fetch", async () => Response.json(response));
  const provider = new OpenAIProvider();
  for (response of malformed) {
    await assert.rejects(provider.analyzeToxicity("test content"), /moderation response/i);
  }
});

test("OpenAI moderation preserves clean results and cannot drop a flagged category", async (t) => {
  let result = cleanResult;
  t.mock.method(globalThis, "fetch", async () => Response.json({ results: [result] }));
  const provider = new OpenAIProvider();
  assert.deepEqual(await provider.analyzeToxicity("test content"), { isToxic: false, score: 0.01, flags: [] });
  result = { ...cleanResult, categories: { ...categories, "sexual/minors": true } };
  const flagged = await provider.analyzeToxicity("test content");
  assert.equal(flagged.isToxic, true);
  assert.deepEqual(flagged.flags, ["sexual/minors"]);
});

test("Gemini malformed moderation falls back and production fails closed if both providers fail", async (t) => {
  const original = { GEMINI_API_KEY: env.GEMINI_API_KEY, NODE_ENV: env.NODE_ENV };
  env.GEMINI_API_KEY = "unit-test-provider-placeholder";
  env.NODE_ENV = "production";
  t.after(() => Object.assign(env, original));
  let text = "{}";
  t.mock.method(globalThis, "fetch", async () => Response.json({
    candidates: [{ content: { parts: [{ text }] } }],
  }));
  const fallback = t.mock.method(ai, "moderateContent", async () => {
    throw new Error("Provider unavailable");
  });
  const service = new AIService();
  for (text of ["{}", '{"spam":false}', '{"spam":"false","toxicity":false,"nsfw":false}', "null"]) {
    await assert.rejects(service.moderate("test content"), ModerationUnavailableError);
  }
  assert.equal(fallback.mock.callCount(), 4);
  text = '```json\n{"spam":false,"toxicity":false,"nsfw":true}\n```';
  assert.deepEqual(await service.moderate("test content"), { spam: false, toxicity: false, nsfw: true });
  assert.equal(fallback.mock.callCount(), 4);
});
