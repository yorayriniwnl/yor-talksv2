import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { createResponse } from "../utils/response.js";
import { db } from "@workspace/db";
import { subscriptionsTable, entitlementsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/subscribe", authenticate, async (req, res) => {
  try {
    const creatorId = typeof req.body.creatorId === "string" ? req.body.creatorId : "";
    const tier = typeof req.body.tier === "string" ? req.body.tier : "standard";

    const subId = randomUUID();
    await db.insert(subscriptionsTable).values({
      id: subId,
      subscriberId: req.user!.id,
      creatorId,
      tier,
      status: "active",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await db.insert(entitlementsTable).values({
      id: randomUUID(),
      userId: req.user!.id,
      entityType: "subscription",
      entityId: subId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    res.json(createResponse("Subscribed successfully", { subId }));
  } catch (error) {
    res.status(500).json(createResponse("Failed to subscribe", null, {}, ["Unknown error"]));
  }
});

router.get("/my-subscriptions", authenticate, async (req, res) => {
  try {
    const subs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.subscriberId, req.user!.id));
    res.json(createResponse("Subscriptions loaded", subs));
  } catch (error) {
    res.status(500).json(createResponse("Failed to load", null, {}, ["Unknown error"]));
  }
});

export const subscriptionRoutes = router;
