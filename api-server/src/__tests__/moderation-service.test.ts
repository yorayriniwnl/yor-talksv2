import assert from "node:assert/strict";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { grievanceTicketsTable } from "@workspace/db/schema";
import { ModerationService } from "../services/moderation-service.js";

after(async () => {
  await pool.end();
});

test("grievance tickets survive service recreation", async () => {
  const service = new ModerationService();
  const created = await service.fileGrievance({
    category: "harassment",
    reportedUrl: "@campus-account",
    reporterName: "Test Reporter",
    reporterEmail: "reporter@example.com",
    description: "A persisted grievance test record.",
  });

  const reloaded = await new ModerationService().getGrievanceStatus(created.ticketId);
  assert.equal(reloaded?.ticketId, created.ticketId);
  assert.equal(reloaded?.status, "received");

  await db.delete(grievanceTicketsTable).where(eq(grievanceTicketsTable.ticketId, created.ticketId));
});
