import { z } from "zod";

export const createMarketplaceOrderSchema = z.object({
  shippingName: z.string().trim().min(2).max(100),
  shippingAddress: z.string().trim().min(5).max(1000),
  shippingPhone: z.string().trim().min(7).max(24).optional(),
});

export const verifyMarketplacePaymentSchema = z.object({
  paymentId: z.string().min(1).max(80),
  signature: z.string().min(1).max(128),
});

export const marketplaceProviderOrderIdParamSchema = z.object({
  orderId: z.string().min(1).max(100),
});

export const marketplaceOrderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});
