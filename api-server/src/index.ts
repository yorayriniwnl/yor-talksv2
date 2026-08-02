import { createServer } from "node:http";
import { pool } from "@workspace/db";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { attachSocketServer } from "./socket/index.js";
import { startNotificationWorker } from "./workers/notification-worker.js";

import { env } from "./config/env.js";

const port = Number(env.PORT);

const httpServer = createServer(app);
const io = attachSocketServer(httpServer);
const notificationWorker = await startNotificationWorker();

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

  // Force-exit if graceful shutdown doesn't complete in time (e.g. a Redis
  // client that never got closed elsewhere would otherwise hold the process open).
  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    // io.close() also closes the underlying httpServer it was attached to,
    // so a separate httpServer.close() call afterward would throw
    // ERR_SERVER_NOT_RUNNING — don't call both.
    await new Promise<void>((resolve, reject) => {
      io.close((err) => (err ? reject(err) : resolve()));
    });
    await notificationWorker?.close();
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
