import { env } from "../config/env.js";

/** Current terms acknowledgement is separate from age assurance and never grants activation. */
export function hasCurrentConsent(user: {
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
  /** Retained for legacy callers, deliberately ignored as an age assertion. */
  ageConfirmedAt?: string | null;
}): boolean {
  if (user.termsVersion !== env.TERMS_VERSION || !user.termsAcceptedAt) return false;
  const acceptedAt = Date.parse(user.termsAcceptedAt);
  return Number.isFinite(acceptedAt) && acceptedAt <= Date.now();
}
