import express, { type Express, type NextFunction, type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttpFactory from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { env, corsOrigins } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { requestContext } from "./middlewares/request-context.js";
import { apiRateLimiter } from "./middlewares/rate-limit.js";

const app: Express = express();
// The API is normally behind Vercel/Nginx. Trust exactly one proxy hop so
// rate limiting and secure-cookie decisions use the real client address.
app.set("trust proxy", 1);
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
app.use(createHelmetMiddleware());
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || corsOrigins.includes(origin));
    },
    credentials: true,
  }),
);

// Apply Redis-backed rate limiting to all requests. Sensitive route groups add
// stricter limiters in their own routers.
app.use(apiRateLimiter);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb", parameterLimit: 1000 }));
app.use(cookieParser());

app.use("/api", router);
app.use("/api/v1", router); // Phase 10: Versioned endpoints for multi-client ecosystem
app.use(router);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found", data: null, errors: ["Not found"] });
});

app.use(errorHandler);

export default app;
