import { Router } from "express";
import { EconomyService } from "../services/economy-service.js";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { creatorAnalyticsDailyTable, ledgerTransactionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getIo } from "../lib/realtime.js";

const router = Router();
const economyService = new EconomyService();

router.get("/wallet", authenticate, async (req, res) => {
  try {
    const wallet = await economyService.getCreatorWallet(req.user!.id);
    res.json(wallet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

router.get("/analytics", authenticate, async (req, res) => {
  try {
    const data = await db
      .select()
      .from(creatorAnalyticsDailyTable)
      .where(eq(creatorAnalyticsDailyTable.creatorId, req.user!.id))
      .orderBy(desc(creatorAnalyticsDailyTable.date))
      .limit(30);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.post("/superchat", authenticate, async (req, res) => {
  try {
    const { streamId, creatorId, amountMinor, message } = req.body;
    
    if (!streamId || !creatorId || !amountMinor || amountMinor <= 0) {
      return res.status(400).json({ error: "Invalid superchat payload" });
    }

    // Process double-entry ledger transaction
    const transactionId = randomUUID();
    await db.insert(ledgerTransactionsTable).values({
      id: transactionId,
      creditAccountId: creatorId, // Creator gets the money
      debitAccountId: req.user!.id, // Sender pays the money
      amountMinor: amountMinor,
      currency: "INR",
      type: "superchat",
      referenceId: streamId,
      metadata: { message },
      createdAt: new Date().toISOString()
    });

    // Broadcast to the stream room
    const io = getIo();
    if (io) {
      io.to(`stream:${streamId}`).emit("stream:superchat", {
        id: transactionId,
        senderId: req.user!.id,
        amountMinor,
        message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({ success: true, transactionId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process superchat" });
  }
});

export const economyRoutes = router;
