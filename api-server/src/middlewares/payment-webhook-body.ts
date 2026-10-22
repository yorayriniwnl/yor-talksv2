import type { IncomingMessage, ServerResponse } from "node:http";

/** Only the signed payment callback needs a second copy of the submitted JSON. */
export function capturePaymentWebhookBody(req: IncomingMessage, _res: ServerResponse, buffer: Buffer): void {
  const path = (req.url ?? "").split("?", 1)[0];
  if (/^\/api(?:\/v1)?\/economy\/webhooks\/razorpay\/?$/i.test(path)) {
    (req as IncomingMessage & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  }
}
