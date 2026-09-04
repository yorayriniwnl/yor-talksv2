import assert from "node:assert/strict";
import { pool } from "@workspace/db";
import { Queue } from "bullmq";
import Redis from "ioredis";

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl || !redisUrl) throw new Error("DATABASE_URL and REDIS_URL are required");

const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
const queueName = `production-readiness-${process.pid}-${Date.now()}`;
const queue = new Queue(queueName, { connection: { url: redisUrl } });

try {
  const version = await pool.query<{ server_version: string }>("SHOW server_version");
  assert.match(version.rows[0]?.server_version ?? "", /^16\./, "PostgreSQL 16 is required");
  await pool.query("SELECT 1");

  const redisVersion = String((await redis.info("server")).match(/redis_version:([^\r\n]+)/)?.[1] ?? "");
  assert.match(redisVersion, /^7\./, "Redis 7 is required");
  assert.equal(await redis.ping(), "PONG");

  const job = await queue.add("production-readiness", { checkedAt: new Date().toISOString() });
  assert.equal(await queue.getWaitingCount(), 1, "BullMQ did not enqueue a waiting job");
  await job.remove();
  assert.equal(await queue.getWaitingCount(), 0, "BullMQ did not remove the verification job");
  console.log(`[infrastructure] PostgreSQL ${version.rows[0].server_version}, Redis ${redisVersion}, BullMQ enqueue/remove passed`);
} finally {
  await queue.close();
  redis.disconnect();
  await pool.end();
}
