import express, { type Express, type NextFunction, type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import pinoHttpFactory from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { env, corsOrigins } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { requestContext } from "./middlewares/request-context.js";

const app: Express = express();
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

// Initialize Redis Client for Rate Limiting
const redisClient = new Redis(env.REDIS_URL);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
  }),
});

app.disable("x-powered-by");
app.use(requestContext);
app.use(requestLogger);
app.use(createHelmetMiddleware());
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  }),
);

// Apply Redis-backed rate limiting to all requests
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);
app.use("/api/v1", router); // Phase 10: Versioned endpoints for multi-client ecosystem
app.use(router);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found", data: null, errors: ["Not found"] });
});

app.use(errorHandler);

export default app;
