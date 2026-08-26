import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { createResponse } from "../utils/response.js";
import {
  SubscriptionOrderForbiddenError,
  SubscriptionOrderNotFoundError,
  SubscriptionRequestError,
  SubscriptionService,
} from "../services/subscription-service.js";
import { PaymentsNotConfiguredError, PaymentProviderError } from "../services/razorpay-service.js";
import {
  createSubscriptionOrderSchema,
  subscriptionIdParamSchema,
  verifySubscriptionPaymentSchema,
} from "../validators/subscription.js";

const router = Router();
const subscriptionService = new SubscriptionService();
const paramId = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

router.get("/tiers/:creatorId", (_req, res) => {
  return res.status(200).json(createResponse("Membership tiers loaded", subscriptionService.getTiers()));
});

router.post("/subscribe", authenticate, validateBody(createSubscriptionOrderSchema), async (req, res) => {
  try {
    const order = await subscriptionService.createOrder({ subscriberId: req.user!.id, ...req.body });
    return res.status(201).json(createResponse("Membership payment order created", order));
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) {
      return res.status(503).json(createResponse("Membership payments are unavailable", null, {}, [error.message]));
    }
    if (error instanceof PaymentProviderError) {
      return res.status(502).json(createResponse("Payment provider rejected the membership order", null, {}, [error.message]));
    }
    if (error instanceof SubscriptionRequestError) {
      return res.status(400).json(createResponse("Membership order could not be created", null, {}, [error.message]));
    }
    console.error(error);
    return res.status(500).json(createResponse("Membership order could not be created", null, {}, ["Internal server error"]));
  }
});

router.post("/:id/verify", authenticate, validateParams(subscriptionIdParamSchema), validateBody(verifySubscriptionPaymentSchema), async (req, res) => {
  try {
    const result = await subscriptionService.verifyPayment({ subscriberId: req.user!.id, subscriptionId: paramId(req.params.id), ...req.body });
    return res.status(200).json(createResponse("Membership payment verified", result));
  } catch (error) {
    if (error instanceof PaymentsNotConfiguredError) {
      return res.status(503).json(createResponse("Membership payments are unavailable", null, {}, [error.message]));
    }
    if (error instanceof PaymentProviderError) {
      return res.status(502).json(createResponse("Membership payment verification could not be completed", null, {}, [error.message]));
    }
    if (error instanceof SubscriptionOrderNotFoundError) {
      return res.status(404).json(createResponse("Membership payment order not found", null, {}, [error.message]));
    }
    if (error instanceof SubscriptionOrderForbiddenError) {
      return res.status(403).json(createResponse("Membership payment is not yours", null, {}, [error.message]));
    }
    if (error instanceof SubscriptionRequestError) {
      return res.status(400).json(createResponse("Membership payment verification failed", null, {}, [error.message]));
    }
    console.error(error);
    return res.status(500).json(createResponse("Membership payment verification failed", null, {}, ["Internal server error"]));
  }
});

router.get("/my-subscriptions", authenticate, async (req, res) => {
  try {
    const subscriptions = await subscriptionService.listForSubscriber(req.user!.id);
    return res.status(200).json(createResponse("Subscriptions loaded", subscriptions));
  } catch (error) {
    console.error(error);
    return res.status(500).json(createResponse("Subscriptions could not be loaded", null, {}, ["Internal server error"]));
  }
});

router.delete("/:id", authenticate, validateParams(subscriptionIdParamSchema), async (req, res) => {
  try {
    const subscription = await subscriptionService.cancel(paramId(req.params.id), req.user!.id);
    return res.status(200).json(createResponse("Membership cancelled", subscription));
  } catch (error) {
    if (error instanceof SubscriptionRequestError) {
      return res.status(404).json(createResponse("Membership could not be cancelled", null, {}, [error.message]));
    }
    console.error(error);
    return res.status(500).json(createResponse("Membership could not be cancelled", null, {}, ["Internal server error"]));
  }
});

export const subscriptionRoutes = router;
