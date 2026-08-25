import { Router, type Request, type Response } from "express";
import { EconomyService } from "../services/economy-service.js";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { creatorAnalyticsDailyTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { validateBody } from "../middlewares/validation.js";
import { createTipOrderSchema, verifyTipPaymentSchema } from "../validators/economy.js";
import {
  PaymentOrderForbiddenError,
  PaymentOrderNotFoundError,
  PaymentRequestError,
  PaymentService,
} from "../services/payment-service.js";
import { PaymentsNotConfiguredError, PaymentProviderError } from "../services/razorpay-service.js";
import { createResponse } from "../utils/response.js";

const router = Router();
const economyService = new EconomyService();
const paymentService = new PaymentService();

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

async function createTipOrder(req: Request, res: Response) {
  try {
    const data = await paymentService.createTipOrder({ payerId: req.user!.id, ...req.body });
    return res.status(201).json(createResponse("Payment order created", data));
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) {
      return res.status(503).json(createResponse("Payments are unavailable", null, {}, [error.message]));
    }
    if (error instanceof PaymentProviderError) {
      return res.status(502).json(createResponse("Payment provider rejected the order", null, {}, [error.message]));
    }
    if (error instanceof PaymentRequestError) {
      return res.status(400).json(createResponse("Payment order could not be created", null, {}, [error.message]));
    }
    console.error(error);
    return res.status(500).json(createResponse("Payment order could not be created", null, {}, ["Internal server error"]));
  }
}

router.post("/orders", authenticate, validateBody(createTipOrderSchema), createTipOrder);
// Kept as a compatibility alias for existing clients that used the original
// superchat endpoint. It now creates a real Razorpay order and does not settle
// anything until /orders/:orderId/verify succeeds.
router.post("/superchat", authenticate, validateBody(createTipOrderSchema), createTipOrder);

router.post("/orders/:orderId/verify", authenticate, validateBody(verifyTipPaymentSchema.omit({ orderId: true })), async (req, res) => {
  try {
    const result = await paymentService.verifyTipPayment({
      payerId: req.user!.id,
      orderId: Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId,
      ...req.body,
    });
    return res.status(200).json(createResponse("Payment verified", result));
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) {
      return res.status(503).json(createResponse("Payments are unavailable", null, {}, [error.message]));
    }
    if (error instanceof PaymentProviderError) {
      return res.status(502).json(createResponse("Payment verification could not be completed", null, {}, [error.message]));
    }
    if (error instanceof PaymentOrderNotFoundError) {
      return res.status(404).json(createResponse("Payment order not found", null, {}, [error.message]));
    }
    if (error instanceof PaymentOrderForbiddenError) {
      return res.status(403).json(createResponse("Payment order is not yours", null, {}, [error.message]));
    }
    if (error instanceof PaymentRequestError) {
      return res.status(400).json(createResponse("Payment verification failed", null, {}, [error.message]));
    }
    console.error(error);
    return res.status(500).json(createResponse("Payment verification failed", null, {}, ["Internal server error"]));
  }
});

export const economyRoutes = router;
