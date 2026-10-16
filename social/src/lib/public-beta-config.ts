function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error("Invalid boolean value in the public beta build configuration");
}

export const publicBetaConfig = {
  publicBeta: readBoolean(import.meta.env.VITE_PUBLIC_BETA),
  termsVersion: import.meta.env.VITE_TERMS_VERSION || "development",
  legalContentReviewed: readBoolean(import.meta.env.VITE_LEGAL_CONTENT_REVIEWED),
  operatorName: import.meta.env.VITE_LEGAL_OPERATOR_NAME || "",
  operatorAddress: import.meta.env.VITE_LEGAL_OPERATOR_ADDRESS || "",
  effectiveDate: import.meta.env.VITE_LEGAL_EFFECTIVE_DATE || "",
  governingLaw: import.meta.env.VITE_LEGAL_GOVERNING_LAW || "",
  privacyContactEmail: import.meta.env.VITE_PRIVACY_CONTACT_EMAIL || "",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "",
  grievanceOfficerName: import.meta.env.VITE_GRIEVANCE_OFFICER_NAME || "",
  grievanceContactEmail: import.meta.env.VITE_GRIEVANCE_CONTACT_EMAIL || "",
  paymentsEnabled: readBoolean(import.meta.env.VITE_PAYMENTS_ENABLED),
  liveRoomsEnabled: readBoolean(import.meta.env.VITE_LIVE_ROOMS_ENABLED),
  webPushEnabled: readBoolean(import.meta.env.VITE_WEB_PUSH_ENABLED),
  rtcCallsEnabled: readBoolean(import.meta.env.VITE_RTC_CALLS_ENABLED),
} as const;

export const legalConfigReady = Boolean(
  publicBetaConfig.legalContentReviewed &&
  publicBetaConfig.operatorName &&
  publicBetaConfig.operatorAddress &&
  publicBetaConfig.effectiveDate &&
  publicBetaConfig.governingLaw &&
  publicBetaConfig.privacyContactEmail &&
  publicBetaConfig.supportEmail &&
  publicBetaConfig.grievanceOfficerName &&
  publicBetaConfig.grievanceContactEmail,
);
