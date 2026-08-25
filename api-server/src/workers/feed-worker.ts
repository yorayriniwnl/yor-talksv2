import { Worker, Queue } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export let feedQueue: Queue | null = null;

function isRedisCompatibleVersion(redisVersion: string): boolean {
  const [major = 0, minor = 0, patch = 0] = redisVersion.split(".").map((value) => Number(value));
  if (major !== 5) return major > 5;
  if (minor !== 0) return minor > 0;
  return patch >= 0;
}

async function canStartFeedWorker(): Promise<boolean> {
  const { Redis } = await import("ioredis");
  const client = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await client.connect();
    const info = await client.info("server");
    const versionLine = info.split("\n").find((line) => line.startsWith("redis_version:"));
    const version = versionLine?.split(":")[1]?.trim();
    return Boolean(version && isRedisCompatibleVersion(version));
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

export async function startFeedWorker(): Promise<Worker | null> {
  if (!(await canStartFeedWorker())) {
    logger.warn({ redisUrl: env.REDIS_URL }, "Feed worker disabled because Redis is older than BullMQ supports");
    return null;
  }

  feedQueue = new Queue("feed-ranking", { connection: { url: env.REDIS_URL } });
  const worker = new Worker(
    "feed-ranking",
    async (job) => {
      if (job.name === "recalculate-scores") {
        logger.info("Recalculating post trending scores...");
        
        // Advanced Ranking Algorithm Implementation
        // score = recencyScore + engagementScore
        // Engagement = (likes * 2) + (comments * 3) + (shares * 5)
        // Gravity = 1.8 (hacker news style decay)
        
        await db.execute(sql`
          UPDATE posts 
          SET score = (
            (COALESCE(likes_count, 0) * 2.0) +
            (COALESCE(comments_count, 0) * 3.0) +
            (COALESCE(share_count, 0) * 5.0)
          ) / POWER(EXTRACT(EPOCH FROM (NOW() - created_at))/3600 + 2, 1.8)
          WHERE created_at > NOW() - INTERVAL '7 days'
        `);
        
        logger.info("Feed scores successfully recalculated.");
      }
    },
    { connection: { url: env.REDIS_URL } }
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, "Feed ranking job failed");
  });

  // Schedule it to run every 5 minutes if it's not already scheduled
  const repeatJob = await feedQueue.getRepeatableJobs();
  if (repeatJob.length === 0) {
    await feedQueue.add(
      "recalculate-scores",
      {},
      { repeat: { pattern: "*/5 * * * *" } } // Every 5 minutes
    );
  }

  return worker;
}
