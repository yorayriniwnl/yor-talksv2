import { pool } from "@workspace/db";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startNotificationWorker, type NotificationWorkerHandle } from "./workers/notification-worker.js";

async function main(): Promise<void> {
  await pool.query("SELECT 1");
  let worker: NotificationWorkerHandle | null = await startNotificationWorker();
  if (env.NODE_ENV === "production" && !worker.isHealthy()) {
    await worker.close();
    throw new Error("Notification worker could not connect to its queue");
  }
  logger.info("Notification worker process is running");

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Stopping notification worker");
    try {
      await worker?.close();
      worker = null;
      await pool.end();
      process.exit(0);
    } catch (error) {
      logger.error({ error }, "Notification worker shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error({ error }, "Notification worker process failed to start");
  process.exit(1);
});
