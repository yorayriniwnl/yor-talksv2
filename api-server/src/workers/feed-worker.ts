import { Worker, Queue } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export const feedQueue = new Queue("feed-ranking", { connection: { url: env.REDIS_URL } });

export async function startFeedWorker() {
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
            (COALESCE(like_count, 0) * 2.0) + 
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
