import assert from "node:assert/strict";
import { test } from "node:test";
import { EmailService } from "../services/email-service.js";

test("development email fallback never writes credential-bearing payloads to stdout", async () => {
  const originalLog = console.log;
  const output: unknown[][] = [];
  console.log = (...args: unknown[]) => {
    output.push(args);
  };

  try {
    await new EmailService().sendEmail({
      to: "recipient@example.test",
      subject: "123456 is your Yor Talks sign-in code",
      html: '<a href="https://example.test/reset-password?token=super-secret-token">reset</a>',
      text: "super-secret-token",
    });
  } finally {
    console.log = originalLog;
  }

  assert.equal(output.length, 0);
});
