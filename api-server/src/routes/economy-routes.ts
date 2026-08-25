import { Router } from "express";
import { EconomyService } from "../services/economy-service.js";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { creatorAnalyticsDailyTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

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
  res.status(501).json({
    success: false,
    message: "Payments are disabled for the college beta until a payment provider is configured.",
    errors: ["payments_not_configured"],
  });
});

export const economyRoutes = router;
