import { z } from "zod";

export const createSubscriptionOrderSchema = z.object({
  creatorId: z.string().uuid(),
  tier: z.enum(["chai", "elite", "vip"]),
});

export const verifySubscriptionPaymentSchema = z.object({
  orderId: z.string().min(1).max(80),
  paymentId: z.string().min(1).max(80),
  signature: z.string().min(1).max(128),
});

export const subscriptionIdParamSchema = z.object({
  id: z.string().uuid(),
});
