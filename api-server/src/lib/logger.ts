import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const createPinoLogger = pino as unknown as (options?: Record<string, unknown>) => pino.Logger;

export const logger = createPinoLogger({
  level: process.env.LOG_LEVEL ?? "info",
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
