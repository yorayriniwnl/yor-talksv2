import { BaseRepository } from "./base-repository.js";
import type { UserRecord } from "../types/index.js";

export class UserRepository extends BaseRepository<UserRecord> {
  constructor() {
    super();
  }

  create(user: UserRecord): UserRecord {
    return this.set(user.id, user);
  }

  findByEmail(email: string): UserRecord | undefined {
    return this.getAll().find((user) => user.email === email);
  }

  findByUsername(username: string): UserRecord | undefined {
    return this.getAll().find((user) => user.username === username);
  }

  findById(id: string): UserRecord | undefined {
    return this.get(id);
  }

  update(id: string, updates: Partial<UserRecord>): UserRecord | undefined {
    const existing = this.get(id);
    if (!existing) {
      return undefined;
    }
    const next: UserRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.set(id, next);
  }

  list(search = ""): UserRecord[] {
    const query = search.toLowerCase();
    return this.getAll().filter((user) => {
      if (!query) {
        return true;
      }
      return user.username.toLowerCase().includes(query) || user.fullName.toLowerCase().includes(query);
    });
  }
}
