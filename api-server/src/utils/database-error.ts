const DATABASE_UNAVAILABLE_CODES = new Set([
  "57P01", // admin_shutdown
  "57P03", // cannot_connect_now
  "53300", // too_many_connections
]);

/** Detect connection failures even when Drizzle/pg wraps them in causes or AggregateErrors. */
export function isDatabaseUnavailableError(error: unknown): boolean {
  const seen = new Set<object>();

  const visit = (candidate: unknown): boolean => {
    if (!candidate || typeof candidate !== "object") return false;
    if (seen.has(candidate)) return false;
    seen.add(candidate);

    const value = candidate as {
      code?: unknown;
      cause?: unknown;
      errors?: unknown;
      message?: unknown;
    };
    if (typeof value.code === "string" && (DATABASE_UNAVAILABLE_CODES.has(value.code) || value.code.startsWith("08"))) {
      return true;
    }
    if (typeof value.message === "string" && /\b(?:ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|ENOTFOUND)\b/i.test(value.message)) {
      return true;
    }
    if (visit(value.cause)) return true;
    return Array.isArray(value.errors) && value.errors.some(visit);
  };

  return visit(error);
}
