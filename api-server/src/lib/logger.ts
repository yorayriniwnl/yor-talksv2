import pino from "pino";
import { logErrorMetadata } from './log-error.js';

const isProduction = process.env.NODE_ENV === "production";
const createPinoLogger = pino as unknown as (options?: Record<string, unknown>) => pino.Logger;

export const logger = createPinoLogger({
  level: process.env.LOG_LEVEL ?? "info",
  serializers: { err: logErrorMetadata, error: logErrorMetadata },
  hooks: {
    logMethod(this: pino.Logger, args: unknown[], method: (...values: unknown[]) => void) {
      // Pino infers msg from Error.message before applying serializers. Supply
      // a static message first, including for logger.error(error) callers.
      if (args[0] instanceof Error) args[0] = { err: args[0] };
      if (args.length === 1 && args[0] && typeof args[0] === 'object'
        && 'err' in args[0]) args.push('Operation failed');
      return method.apply(this, args);
    },
  },
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});

export const logHealth = (service: string, status: string) => {
  logger.info({ service, status }, "health check");
};
