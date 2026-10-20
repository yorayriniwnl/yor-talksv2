function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error("Invalid boolean value in the public beta build configuration");
}

function readNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 13 ? parsed : fallback;
}

export const publicBetaConfig = {
  publicBeta: readBoolean(import.meta.env.VITE_PUBLIC_BETA),
  termsVersion: import.meta.env.VITE_TERMS_VERSION?.trim() || "development",
  legalContentReviewed: readBoolean(import.meta.env.VITE_LEGAL_CONTENT_REVIEWED),
  minimumAge: readNumber(import.meta.env.VITE_MINIMUM_AGE, 18),
  operatorName: import.meta.env.VITE_LEGAL_OPERATOR_NAME?.trim() || "",
  operatorAddress: import.meta.env.VITE_LEGAL_OPERATOR_ADDRESS?.trim() || "",
  effectiveDate: import.meta.env.VITE_LEGAL_EFFECTIVE_DATE?.trim() || "",
  governingLaw: import.meta.env.VITE_LEGAL_GOVERNING_LAW?.trim() || "",
  privacyContactEmail: import.meta.env.VITE_PRIVACY_CONTACT_EMAIL?.trim() || "",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL?.trim() || "",
  grievanceOfficerName: import.meta.env.VITE_GRIEVANCE_OFFICER_NAME?.trim() || "",
  grievanceContactEmail: import.meta.env.VITE_GRIEVANCE_CONTACT_EMAIL?.trim() || "",
  paymentsEnabled: readBoolean(import.meta.env.VITE_PAYMENTS_ENABLED),
  liveRoomsEnabled: readBoolean(import.meta.env.VITE_LIVE_ROOMS_ENABLED),
  webPushEnabled: readBoolean(import.meta.env.VITE_WEB_PUSH_ENABLED),
  rtcCallsEnabled: readBoolean(import.meta.env.VITE_RTC_CALLS_ENABLED),
} as const;

const placeholderPattern = /change_me|change-me|replace-with|your-domain\.example|^development$/i;
const isNonPlaceholder = (value: string) => Boolean(value) && !placeholderPattern.test(value);
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isRealDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;

// Operator review is a separate approval gate from presence of build-time values.
export const legalConfigReady = Boolean(
  publicBetaConfig.legalContentReviewed &&
  isNonPlaceholder(publicBetaConfig.termsVersion) &&
  isNonPlaceholder(publicBetaConfig.operatorName) &&
  isNonPlaceholder(publicBetaConfig.operatorAddress) &&
  isNonPlaceholder(publicBetaConfig.effectiveDate) &&
  isNonPlaceholder(publicBetaConfig.governingLaw) &&
  isNonPlaceholder(publicBetaConfig.privacyContactEmail) &&
  isNonPlaceholder(publicBetaConfig.supportEmail) &&
  isNonPlaceholder(publicBetaConfig.grievanceOfficerName) &&
  isNonPlaceholder(publicBetaConfig.grievanceContactEmail) &&
  isValidEmail(publicBetaConfig.privacyContactEmail) &&
  isValidEmail(publicBetaConfig.supportEmail) &&
  isValidEmail(publicBetaConfig.grievanceContactEmail) &&
  isRealDate(publicBetaConfig.effectiveDate),
);
