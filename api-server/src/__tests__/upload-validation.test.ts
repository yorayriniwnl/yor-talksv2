import assert from "node:assert/strict";
import { test } from "node:test";
import { detectMimeType, mimeMatches } from "../middlewares/upload.js";

test("detects common media signatures instead of trusting extensions", () => {
  assert.equal(detectMimeType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectMimeType(Buffer.from("RIFF0000WEBP")), "image/webp");
  assert.equal(detectMimeType(Buffer.from("not media")), undefined);
});

test("allows ambiguous WebM and Ogg containers only within media families", () => {
  assert.equal(mimeMatches("video/webm", "application/webm"), true);
  assert.equal(mimeMatches("audio/webm", "application/webm"), true);
  assert.equal(mimeMatches("image/webp", "application/webm"), false);
  assert.equal(mimeMatches("audio/ogg", "application/ogg"), true);
});
