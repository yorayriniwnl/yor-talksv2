import { createHash } from "node:crypto";

export class RedisRepository {
  private readonly store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, value);
    if (ttlSeconds) {
      setTimeout(() => this.store.delete(key), ttlSeconds * 1000);
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async addToSet(key: string, value: string): Promise<void> {
    const existing = this.store.get(key);
    const values = existing ? JSON.parse(existing) : [];
    if (!values.includes(value)) {
      values.push(value);
      this.store.set(key, JSON.stringify(values));
    }
  }

  async removeFromSet(key: string, value: string): Promise<void> {
    const existing = this.store.get(key);
    if (!existing) {
      return;
    }
    const values = JSON.parse(existing).filter((entry: string) => entry !== value);
    this.store.set(key, JSON.stringify(values));
  }

  async getSet(key: string): Promise<string[]> {
    const existing = this.store.get(key);
    return existing ? JSON.parse(existing) : [];
  }

  async hashToken(token: string): Promise<string> {
    return createHash("sha256").update(token).digest("hex");
  }
}
