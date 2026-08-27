import assert from "node:assert/strict";
import { test } from "node:test";
import { NoteService } from "../services/note-service.js";
import type { NoteRecord } from "../types/index.js";

test("note service trims content, applies a 24-hour expiry, and replaces the author status", async () => {
  let persisted: NoteRecord | undefined;
  const service = new NoteService(
    {
      replaceForAuthor: async (note: NoteRecord) => {
        persisted = note;
        return note;
      },
      listActive: async () => [],
      deleteOwned: async () => true,
    } as never,
    {
      findById: async () => ({ id: "author-1" }),
    } as never,
    {} as never,
    { moderate: async () => ({ spam: false, toxicity: false, nsfw: false }) } as never,
  );

  const note = await service.createNote({
    authorId: "author-1",
    content: "  Building something kind  ",
    audience: "followers",
    contentCategory: "technology",
    contentRating: "child_safe",
  });

  assert.equal(note?.content, "Building something kind");
  assert.equal(note?.audience, "followers");
  assert.equal(note?.contentRating, "child_safe");
  assert.equal(persisted?.id, note?.id);
  assert.ok(note && Date.parse(note.expiresAt) - Date.parse(note.createdAt) === 24 * 60 * 60 * 1000);
});

test("note service only exposes notes allowed by audience and content visibility", async () => {
  const notes: NoteRecord[] = [
    { id: "mine", authorId: "viewer", content: "mine", audience: "followers", createdAt: "2026-08-27T00:00:00.000Z", expiresAt: "2099-08-27T00:00:00.000Z" },
    { id: "follower", authorId: "follower", content: "close", audience: "followers", createdAt: "2026-08-27T00:00:00.000Z", expiresAt: "2099-08-27T00:00:00.000Z" },
    { id: "public", authorId: "public", content: "open", audience: "public", createdAt: "2026-08-27T00:00:00.000Z", expiresAt: "2099-08-27T00:00:00.000Z" },
    { id: "blocked", authorId: "blocked", content: "hidden", audience: "public", createdAt: "2026-08-27T00:00:00.000Z", expiresAt: "2099-08-27T00:00:00.000Z" },
  ];
  const service = new NoteService(
    { listActive: async () => notes } as never,
    { isFollowing: async (viewerId: string, authorId: string) => viewerId === "viewer" && authorId === "follower" } as never,
    { isVisible: async (_note: NoteRecord, _viewerId: string, authorId: string) => authorId !== "blocked" } as never,
  );

  const visible = await service.listVisibleNotes("viewer");
  assert.deepEqual(visible.map((note) => note.id), ["mine", "follower", "public"]);
});
