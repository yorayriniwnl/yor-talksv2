// Driver and provider Error messages can contain SQL parameters, capability
// URLs, response bodies or credentials. Operational logs use a small metadata
// projection; never serialize the original message, stack, query or cause.
const errorTypes = new Set([
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'AggregateError', 'AbortError',
  'DrizzleError', 'DrizzleQueryError', 'DatabaseError', 'WebPushError',
  'JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError', 'MulterError',
]);
const errorCodes = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE',
  'ENOSPC', 'ENOMEM', 'EACCES', 'EPERM', 'ENOENT', 'ABORT_ERR',
  '08000', '08001', '08003', '08006', '08P01', '22001', '22P02', '23502',
  '23503', '23505', '23514', '25P02', '40001', '40P01', '42501', '42703',
  '42P01', '53300', '53400', '57014', '57P01', '57P02', '57P03',
]);

export function logErrorMetadata(value: unknown, depth = 0): Record<string, unknown> {
  if (!(value instanceof Error)) return { type: 'Error' };
  const error = value as Error & { code?: unknown; statusCode?: unknown; cause?: unknown };
  const type = error.constructor.name;
  return {
    type: errorTypes.has(type) ? type : 'Error',
    ...(typeof error.code === 'string' && errorCodes.has(error.code) ? { code: error.code } : {}),
    ...(Number.isInteger(error.statusCode) && Number(error.statusCode) >= 100 && Number(error.statusCode) <= 599
      ? { statusCode: error.statusCode } : {}),
    ...(depth < 2 && error.cause instanceof Error ? { cause: logErrorMetadata(error.cause, depth + 1) } : {}),
  };
}
