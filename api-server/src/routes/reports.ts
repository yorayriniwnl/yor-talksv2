import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";

const router = Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { entityType, entityId, reason, details } = req.body;
    
    await db.insert(reportsTable).values({
      id: randomUUID(),
      reporterId: req.user!.id,
      entityType,
      entityId,
      reason,
      details,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json({ success: true, message: "Report submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export const reportRoutes = router;
