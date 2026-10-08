import express, { type Express, type NextFunction, type Request, type Response } from "express";
import compression from "compression";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttpFactory from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { env, corsOrigins, trustedProxyCidrs } from "./config/env.js";
import { configureProxyTrust } from './config/trusted-proxies.js';
import { credentialedCors } from './middlewares/browser-origin.js';
import { errorHandler } from "./middlewares/error-handler.js";
import { requestContext } from "./middlewares/request-context.js";
import { apiRateLimiter } from "./middlewares/rate-limit.js";
import { recordOperationalMetrics } from "./middlewares/operational-metrics.js";
import { mediaResponse } from "./services/media-response.js";

const app: Express = express();
// Only the approved infrastructure peers may supply canonical edge headers.
configureProxyTrust(app, trustedProxyCidrs);
const requestLogger = (pinoHttpFactory as unknown as (options: Record<string, unknown>) => (req: Request, res: Response, next: NextFunction) => void)({
  logger,
  serializers: {
    req(req: Request) {
      return {
        id: req.id,
        requestId: (req as any).requestId,
        method: req.method,
        url: req.url?.split("?")[0],
      };
    },
    res(res: Response) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});

const createHelmetMiddleware = helmet as unknown as (options?: Record<string, unknown>) => (req: Request, res: Response, next: NextFunction) => void;

app.disable("x-powered-by");
app.use(requestContext);
app.use(requestLogger);
app.use(recordOperationalMetrics);
app.use(mediaResponse);
app.use(createHelmetMiddleware());
app.use(compression());
app.use(credentialedCors);

// Apply Redis-backed rate limiting to all requests. Sensitive route groups add
// stricter limiters in their own routers.
app.use(apiRateLimiter);

app.use(express.json({
  limit: "1mb",
  verify(req, _res, buffer) {
    (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true, limit: "100kb", parameterLimit: 1000 }));
app.use(cookieParser());

app.use("/api", router);
app.use("/api/v1", router);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found", data: null, errors: ["Not found"] });
});

app.use(errorHandler);

export default app;
