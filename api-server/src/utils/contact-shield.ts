import { createHmac } from "node:crypto";
import { env } from "../config/env.js";

export type ContactIdentifierType = "email" | "phone";

export function normalizeContactIdentifier(type: ContactIdentifierType, value: string): string {
  const trimmed = value.trim();
  if (type === "email") {
    return trimmed.toLowerCase();
  }

  const digits = trimmed.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return digits;
}

export function getContactIdentifierDigest(type: ContactIdentifierType, value: string): string {
  const normalized = normalizeContactIdentifier(type, value);
  return createHmac("sha256", env.CONTACT_SHIELD_SECRET)
    .update(`${type}:${normalized}`)
    .digest("hex");
}

export function isValidContactIdentifier(type: ContactIdentifierType, value: string): boolean {
  const normalized = normalizeContactIdentifier(type, value);
  if (type === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 320;
  }
  return /^\+[1-9]\d{9,14}$/.test(normalized);
}
