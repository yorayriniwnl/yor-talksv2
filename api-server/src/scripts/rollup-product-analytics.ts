import { ProductAnalyticsService } from "../services/product-analytics-service.js";
import { pool } from "@workspace/db";

const service = new ProductAnalyticsService();
const days = Array.from({ length: 7 }, (_, index) => {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() - (7 - index));
  return day;
});

try {
  for (const day of days) await service.runDailyRollup(day);
  const pruned = await service.pruneEvents(90);
  console.info(JSON.stringify({ job: "product-analytics-rollup", status: "completed", days: days.length, pruned }));
} catch (error) {
  console.error(JSON.stringify({ job: "product-analytics-rollup", status: "failed", errorCode: "analytics_rollup_failed" }));
  process.exitCode = 1;
} finally {
  await pool.end();
}