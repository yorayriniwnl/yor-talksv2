import { z } from "zod";

export const createTipOrderSchema = z.object({
  creatorId: z.string().uuid(),
  streamId: z.string().uuid().optional(),
  amountMinor: z.number().int().min(100).max(1_000_000),
  message: z.string().trim().max(200).optional(),
});

export const verifyTipPaymentSchema = z.object({
  orderId: z.string().min(1).max(80),
  paymentId: z.string().min(1).max(80),
  signature: z.string().min(1).max(128),
});
