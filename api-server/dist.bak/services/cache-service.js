export class CacheService {
    redisRepository;
    constructor(redisRepository) {
        this.redisRepository = redisRepository;
    }
    async get(key) {
        const value = await this.redisRepository.get(key);
        return value ? JSON.parse(value) : undefined;
    }
    async set(key, value, ttlSeconds) {
        await this.redisRepository.set(key, JSON.stringify(value), ttlSeconds);
        return value;
    }
    async delete(key) {
        await this.redisRepository.del(key);
    }
}
//# sourceMappingURL=cache-service.js.map