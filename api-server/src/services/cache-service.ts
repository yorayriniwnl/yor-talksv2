import { RedisRepository } from "../repositories/redis-repository.js";

export class CacheService {
  constructor(private readonly redisRepository: RedisRepository) {}

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redisRepository.get(key);
    return value ? (JSON.parse(value) as T) : undefined;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<T> {
    await this.redisRepository.set(key, JSON.stringify(value), ttlSeconds);
    return value;
  }

  async delete(key: string): Promise<void> {
    await this.redisRepository.del(key);
  }
}
