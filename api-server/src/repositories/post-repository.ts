import { BaseRepository } from "./base-repository.js";
import type { PostRecord } from "../types/index.js";

export class PostRepository extends BaseRepository<PostRecord> {
  create(post: PostRecord): PostRecord {
    return this.set(post.id, post);
  }

  findById(id: string): PostRecord | undefined {
    return this.get(id);
  }

  listByUser(userId: string): PostRecord[] {
    return this.getAll().filter((post) => post.authorId === userId);
  }

  list(): PostRecord[] {
    return this.getAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  update(id: string, updates: Partial<PostRecord>): PostRecord | undefined {
    const existing = this.get(id);
    if (!existing) {
      return undefined;
    }
    const next: PostRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.set(id, next);
  }

  delete(id: string): boolean {
    return this.delete(id);
  }
}
