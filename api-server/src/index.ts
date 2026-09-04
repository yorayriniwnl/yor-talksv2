import { createServer } from "node:http";
import { pool } from "@workspace/db";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { inspectRedisCompatibility } from "./lib/redis-compat.js";
import { attachSocketServer } from "./socket/index.js";
import { startNotificationWorker } from "./workers/notification-worker.js";
import { startFeedWorker } from "./workers/feed-worker.js";
import { env } from "./config/env.js";

async function ensureProductionDependencies(): Promise<void> {
  if (env.NODE_ENV !== "production") return;

  try {
    await pool.query("SELECT 1");
  } catch (error) {
    logger.error({ error }, "Production dependency check failed: PostgreSQL unavailable");
    throw new Error("Production dependency check failed: PostgreSQL unavailable");
  }

  const redis = await inspectRedisCompatibility(env.REDIS_URL);
  if (!redis.compatible) {
    const message = `Production dependency check failed: Redis unavailable or unsupported (${redis.reason ?? "unknown"})`;
    logger.error({ redis }, message);
    throw new Error(message);
  }
}

async function main() {
  const port = Number(env.PORT);

  await ensureProductionDependencies();

  const httpServer = createServer(app);
  const io = attachSocketServer(httpServer);
  const feedWorker = await startFeedWorker().catch((err) => { logger.warn({ err }, "Feed worker failed to start"); return null; });
  const notificationWorker = await startNotificationWorker().catch((err) => {
    logger.warn({ err }, "Notification worker failed to start");
    return null;
  });

  if (env.NODE_ENV === "production" && (!notificationWorker || !notificationWorker.isHealthy())) {
    throw new Error("Production dependency check failed: notification worker unavailable");
  }

  httpServer.on("error", (err: Error) => {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  });

  httpServer.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down gracefully");

    const forceExitTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        io.close((err) => (err ? reject(err) : resolve()));
      });
      await notificationWorker?.close();
      await feedWorker?.close();
      await pool.end();
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});

