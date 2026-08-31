import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("Razorpay payments are not configured for this deployment");
    this.name = "PaymentsNotConfiguredError";
  }
}

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

export class PaymentVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}

function isConfigured(): boolean {
  return env.PAYMENTS_ENABLED && Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET);
}

function authorizationHeader(): string {
  return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

async function parseProviderResponse<T>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    // Provider descriptions are not stable client contracts and may contain
    // account-specific data. Log details at the provider boundary if needed,
    // but return only a safe status-based error to callers.
    throw new PaymentProviderError(`Razorpay rejected the request (${response.status})`);
  }
  return body as T;
}

export class RazorpayService {
  assertConfigured(): void {
    if (!isConfigured()) {
      throw new PaymentsNotConfiguredError();
    }
  }

  async createOrder(input: { amountMinor: number; receipt: string; notes: Record<string, string> }): Promise<RazorpayOrder> {
    this.assertConfigured();
    const response = await fetch(`${RAZORPAY_API}/orders`, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountMinor,
        currency: "INR",
        receipt: input.receipt.slice(0, 40),
        notes: input.notes,
      }),
    });
    return parseProviderResponse<RazorpayOrder>(response);
  }

  async getPayment(paymentId: string): Promise<RazorpayPayment> {
    this.assertConfigured();
    const response = await fetch(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: authorizationHeader() },
    });
    return parseProviderResponse<RazorpayPayment>(response);
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!env.PAYMENTS_ENABLED || !env.RAZORPAY_KEY_SECRET || !signature) {
      return false;
    }
    const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expected, "utf8");
    const providedBuffer = Buffer.from(signature, "utf8");
    return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
  }

  createReceipt(): string {
    return `yor_${randomUUID().replaceAll("-", "")}`;
  }
}
