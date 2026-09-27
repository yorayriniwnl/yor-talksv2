import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";
import { MAX_LEDGER_AMOUNT_MINOR } from "../lib/money.js";

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
  receipt?: string;
  notes?: Record<string, string>;
}

interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface RazorpayDispute {
  id: string; payment_id: string; amount: number; currency: string; amount_deducted: number;
  status: 'open' | 'under_review' | 'won' | 'lost' | 'closed'; respond_by?: number;
}
function validDispute(value: RazorpayDispute): boolean {
  return Boolean(value && /^disp_[A-Za-z0-9]+$/.test(value.id) && /^pay_[A-Za-z0-9]+$/.test(value.payment_id)
    && Number.isSafeInteger(value.amount) && value.amount>0 && value.amount<=MAX_LEDGER_AMOUNT_MINOR
    && Number.isSafeInteger(value.amount_deducted) && value.amount_deducted>=0 && value.amount_deducted<=value.amount
    && value.currency==='INR' && ['open','under_review','won','lost','closed'].includes(value.status)
    && (value.respond_by===undefined || Number.isSafeInteger(value.respond_by) && value.respond_by>=0));
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
  async getDispute(id: string): Promise<RazorpayDispute> {
    this.assertConfigured();
    if (!/^disp_[A-Za-z0-9]+$/.test(id)) throw new PaymentProviderError('Invalid dispute identifier');
    const response = await fetchWithTimeout(`${RAZORPAY_API}/disputes/${encodeURIComponent(id)}`, { headers: { Authorization: authorizationHeader() } },12_000);
    const dispute = await parseProviderResponse<RazorpayDispute>(response);
    if (!validDispute(dispute) || dispute.id!==id) throw new PaymentProviderError('Invalid provider dispute');
    return dispute;
  }
  async listDisputes(skip = 0): Promise<RazorpayDispute[]> {
    this.assertConfigured();
    if (!Number.isSafeInteger(skip) || skip<0) throw new PaymentProviderError('Invalid dispute cursor');
    const response = await fetchWithTimeout(`${RAZORPAY_API}/disputes?count=50&skip=${skip}`, { headers: { Authorization: authorizationHeader() } },12_000);
    const value = await parseProviderResponse<{ items: RazorpayDispute[] }>(response);
    if (!Array.isArray(value?.items) || value.items.length>50 || value.items.some(item=>!validDispute(item))) throw new PaymentProviderError('Invalid provider dispute list');
    return value.items;
  }
  assertConfigured(): void {
    if (!isConfigured()) {
      throw new PaymentsNotConfiguredError();
    }
  }

  async createOrder(input: { amountMinor: number; receipt: string; notes: Record<string, string> }): Promise<RazorpayOrder> {
    this.assertConfigured();
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 100 || input.amountMinor > MAX_LEDGER_AMOUNT_MINOR) {
      throw new PaymentProviderError("The requested payment amount is outside the supported range");
    }
    const response = await fetchWithTimeout(`${RAZORPAY_API}/orders`, {
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
    }, 12_000);
    const order = await parseProviderResponse<RazorpayOrder>(response);
    if (!order || typeof order.id !== "string" || !order.id || order.amount !== input.amountMinor
      || order.currency !== "INR" || order.status !== "created") {
      throw new PaymentProviderError("Razorpay returned an invalid order response");
    }
    return order;
  }

  async getPayment(paymentId: string): Promise<RazorpayPayment> {
    this.assertConfigured();
    const response = await fetchWithTimeout(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: authorizationHeader() },
    }, 12_000);
    const payment = await parseProviderResponse<RazorpayPayment>(response);
    if (!payment || payment.id !== paymentId || typeof payment.order_id !== 'string' || !Number.isSafeInteger(payment.amount)
      || payment.amount < 0 || typeof payment.currency !== 'string' || typeof payment.status !== 'string') {
      throw new PaymentProviderError('Razorpay returned an invalid payment response');
    }
    return payment;
  }

  async getOrder(orderId: string): Promise<RazorpayOrder> {
    this.assertConfigured();
    const response = await fetchWithTimeout(`${RAZORPAY_API}/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: authorizationHeader() } }, 12_000);
    const order = await parseProviderResponse<RazorpayOrder>(response);
    if (!order || order.id !== orderId || !Number.isSafeInteger(order.amount) || typeof order.currency !== 'string') throw new PaymentProviderError('Invalid provider order');
    return order;
  }

  async findOrderByReceipt(receipt: string): Promise<RazorpayOrder | undefined> {
    this.assertConfigured();
    const response = await fetchWithTimeout(`${RAZORPAY_API}/orders?receipt=${encodeURIComponent(receipt)}&count=100`, { headers: { Authorization: authorizationHeader() } }, 12_000);
    const result = await parseProviderResponse<{ items: RazorpayOrder[] }>(response);
    if (!Array.isArray(result?.items)) throw new PaymentProviderError('Invalid provider order list');
    const matches = result.items.filter(order => order.receipt === receipt);
    if (matches.length > 1) throw new PaymentProviderError('Ambiguous provider receipt');
    return matches[0];
  }

  async getOrderPayments(orderId: string): Promise<RazorpayPayment[]> {
    this.assertConfigured();
    const response = await fetchWithTimeout(`${RAZORPAY_API}/orders/${encodeURIComponent(orderId)}/payments`, { headers: { Authorization: authorizationHeader() } }, 12_000);
    const result = await parseProviderResponse<{ items: RazorpayPayment[] }>(response);
    if (!Array.isArray(result?.items) || result.items.some(payment => !payment || typeof payment.id !== 'string'
      || payment.order_id !== orderId || !Number.isSafeInteger(payment.amount) || payment.amount < 0
      || typeof payment.currency !== 'string' || typeof payment.status !== 'string')) throw new PaymentProviderError('Invalid provider payments list');
    return result.items.filter(payment => ['captured', 'refunded'].includes(payment.status));
  }

  async getPaymentRefunds(paymentId: string, skip = 0): Promise<Array<{ id: string; payment_id: string; amount: number; currency: string; status: string }>> {
    this.assertConfigured();
    if (!Number.isSafeInteger(skip) || skip < 0) throw new PaymentProviderError('Invalid refund cursor');
    const response = await fetchWithTimeout(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}/refunds?count=100&skip=${skip}`, { headers: { Authorization: authorizationHeader() } }, 12_000);
    const result = await parseProviderResponse<{ items: Array<{ id: string; payment_id: string; amount: number; currency: string; status: string }> }>(response);
    if (!Array.isArray(result?.items) || result.items.length > 100 || result.items.some(refund => !refund || typeof refund.id !== 'string' || refund.payment_id !== paymentId || !Number.isSafeInteger(refund.amount) || refund.amount <= 0 || refund.currency !== 'INR' || typeof refund.status !== 'string')) throw new PaymentProviderError('Invalid provider refund response');
    return result.items;
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

  verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    if (!env.PAYMENTS_ENABLED || !env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
    const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest("hex");
    const provided = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    return expectedBuffer.length === provided.length && timingSafeEqual(expectedBuffer, provided);
  }

  createReceipt(): string {
    return `yor_${randomUUID().replaceAll("-", "")}`;
  }
}
