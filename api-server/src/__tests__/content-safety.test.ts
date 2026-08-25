import assert from "node:assert/strict";
import test from "node:test";
import { canViewContent, normalizeContentRating } from "../utils/content-safety.js";

test("content ratings default to regular", () => {
  assert.equal(normalizeContentRating(undefined), "regular");
  assert.equal(normalizeContentRating("unknown"), "regular");
});

test("viewer filters are cumulative by audience level", () => {
  assert.equal(canViewContent("child_safe", "child_safe"), true);
  assert.equal(canViewContent("regular", "child_safe"), false);
  assert.equal(canViewContent("regular", "regular"), true);
  assert.equal(canViewContent("mature", "regular"), false);
  assert.equal(canViewContent("mature", "mature"), true);
});
