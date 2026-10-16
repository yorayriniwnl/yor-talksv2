import { pool } from "@workspace/db";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startNotificationWorker, type NotificationWorkerHandle } from "./workers/notification-worker.js";
import { startLifecycleWorker } from './workers/lifecycle-worker.js';
import { createPaymentRuntime } from './services/payment-runtime.js';

async function main(): Promise<void> {
  await pool.query("SELECT 1");
  const lifecycle = await startLifecycleWorker(createPaymentRuntime().handlers);
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
    const shutdownTimeout = setTimeout(() => {
      logger.error("Notification worker shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000);
    shutdownTimeout.unref();
    try {
      await worker?.close();
      worker = null;
      await lifecycle.close();
      await pool.end();
      clearTimeout(shutdownTimeout);
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimeout);
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
