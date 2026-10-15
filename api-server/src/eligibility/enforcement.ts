import { env } from "../config/env.js";

/** Deployed production always checks current eligibility, independent of beta mode. */
export function isEligibilityEnforcementEnabled(): boolean {
  return env.NODE_ENV !== "test" && (env.NODE_ENV === "production" || env.PUBLIC_BETA);
}
