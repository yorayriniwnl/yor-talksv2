import { RazorpayService } from "./razorpay-service.js";
import type { PaymentWebhookHandler, ProcessedRefundInput } from "./payment-webhook-types.js";

export class PaymentWebhookSignatureError extends Error {}
export class PaymentWebhookRequestError extends Error {}
export class PaymentWebhookNotFoundError extends Error {}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function providerId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,80}$/.test(value);
}

function refundFromPayload(payload: Record<string, unknown>): ProcessedRefundInput {
  const refund = asRecord(asRecord(payload.payload)?.refund);
  const entity = asRecord(refund?.entity);
  if (!entity || entity.status !== "processed" || !providerId(entity.id) || !providerId(entity.payment_id)
    || typeof entity.amount !== "number" || !Number.isSafeInteger(entity.amount) || entity.amount <= 0
    || (entity.currency !== undefined && entity.currency !== null && entity.currency !== "" && entity.currency !== "INR")) {
    throw new PaymentWebhookRequestError("Invalid processed refund event");
  }
  return {
    id: entity.id,
    paymentId: entity.payment_id,
    amountMinor: entity.amount as number,
    ...(typeof entity.currency === "string" && entity.currency ? { currency: entity.currency } : {}),
  };
}

export class PaymentWebhookService {
  constructor(
    private readonly razorpay: RazorpayService,
    private readonly handlers: PaymentWebhookHandler[],
  ) {}

  async handle(payload: unknown, rawBody: Buffer, signature: string): Promise<"processed" | "ignored"> {
    if (!rawBody.length || !this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new PaymentWebhookSignatureError("Invalid webhook signature");
    }
    const event = asRecord(payload);
    if (!event || typeof event.event !== "string") {
      throw new PaymentWebhookRequestError("Invalid payment webhook event");
    }

    if (event.event === "payment.captured") {
      const entity = asRecord(asRecord(asRecord(event.payload)?.payment)?.entity);
      if (!entity || !providerId(entity.id) || !providerId(entity.order_id)) {
        throw new PaymentWebhookRequestError("Invalid captured payment event");
      }
      const matches: PaymentWebhookHandler[] = [];
      for (const handler of this.handlers) {
        if (await handler.hasProviderOrder(entity.order_id)) matches.push(handler);
      }
      if (matches.length === 0) throw new PaymentWebhookNotFoundError("Payment order not found");
      if (matches.length > 1) throw new PaymentWebhookRequestError("Payment order reference is ambiguous");
      await matches[0]!.reconcileCapturedPayment({ orderId: entity.order_id, paymentId: entity.id });
      return "processed";
    }

    if (event.event === "refund.processed") {
      const refund = refundFromPayload(event);
      let matches: PaymentWebhookHandler[] = [];
      for (const handler of this.handlers) {
        if (await handler.hasProviderPayment(refund.paymentId)) matches.push(handler);
      }
      if (matches.length === 0) {
        // Refund delivery can overtake capture delivery. Resolve the provider
        // payment's order id and settle that capture before recording its refund.
        const payment = await this.razorpay.getPayment(refund.paymentId);
        if (!providerId(payment.order_id)) throw new PaymentWebhookRequestError("Refund payment has no valid provider order id");
        for (const handler of this.handlers) {
          if (await handler.hasProviderOrder(payment.order_id)) matches.push(handler);
        }
        if (matches.length === 0) throw new PaymentWebhookNotFoundError("Refund payment order was not found");
        if (matches.length > 1) throw new PaymentWebhookRequestError("Refund payment order reference is ambiguous");
        await matches[0]!.reconcileCapturedPayment({ orderId: payment.order_id, paymentId: refund.paymentId });
      }
      if (matches.length > 1) throw new PaymentWebhookRequestError("Refund payment reference is ambiguous");
      const processed = await matches[0]!.reconcileRefund(refund);
      if (!processed) throw new PaymentWebhookNotFoundError("Refund payment was not reconciled yet");
      return "processed";
    }

    // Other event types do not change the ledger. In particular, only the
    // terminal refund.processed event reverses creator earnings.
    return "ignored";
  }
}
