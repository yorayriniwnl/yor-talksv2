import { env } from "../config/env.js";

/** The same current-consent rule applies to HTTP and long-lived socket sessions. */
export function hasCurrentConsent(user: {
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
  ageConfirmedAt?: string | null;
}): boolean {
  const consentRequired = env.NODE_ENV === "production" || env.PUBLIC_BETA;
  return !consentRequired || Boolean(
    user.termsVersion === env.TERMS_VERSION && user.termsAcceptedAt && user.ageConfirmedAt,
  );
}
