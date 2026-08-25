import type { Worker } from "bullmq";
import { logger } from "../lib/logger.js";

export async function startFeedWorker(): Promise<Worker | null> {
  // Engagement mutations update the affected post's score atomically. A
  // previous worker rewrote every recent post every five minutes; on a seeded
  // beta database that meant millions of unnecessary row updates, sustained
  // WAL churn, and login requests waiting behind the write load. Keep this
  // entry point for startup compatibility, but never schedule a table-wide
  // ranking rewrite.
  logger.info("Feed ranking worker disabled; scores update with engagement");
  return null;
}
