import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { createResponse } from "../utils/response.js";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/subscribe", authenticate, async (req, res) => {
  res.status(501).json(createResponse("Subscriptions are not enabled until a billing provider and refund policy are configured", null, {}, ["payments_not_configured"]));
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
