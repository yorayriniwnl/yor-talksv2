import { Redis } from "ioredis";

export type RedisCompatibility = {
  compatible: boolean;
  version?: string;
  reason?: "unavailable" | "version_unknown" | "version_unsupported";
};

/**
 * BullMQ 5 requires Redis 5 or newer. Keep this check in one place so the
 * API readiness probe, queue producers, and workers agree about support.
 */
export function isRedisCompatibleVersion(redisVersion: string | undefined): boolean {
  if (!redisVersion) return false;
  const major = Number(redisVersion.split(".")[0]);
  return Number.isInteger(major) && major >= 5;
}

export async function inspectRedisCompatibility(redisUrl: string): Promise<RedisCompatibility> {
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 1_500,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  client.on("error", () => {
    // Healthy production flows should not log noisy errors for expected connection
    // failures during readiness checks; each caller already labels this as
    // unavailable/unsupported and decides whether to fail closed.
  });

  try {
    await client.connect();
    await client.ping();
    const info = await client.info("server");
    const version = info
      .split("\n")
      .find((line) => line.startsWith("redis_version:"))
      ?.split(":")[1]
      ?.trim();

    if (!version) {
      return { compatible: false, reason: "version_unknown" };
    }
    if (!isRedisCompatibleVersion(version)) {
      return { compatible: false, version, reason: "version_unsupported" };
    }
    return { compatible: true, version };
  } catch {
    return { compatible: false, reason: "unavailable" };
  } finally {
    client.disconnect();
  }
}
