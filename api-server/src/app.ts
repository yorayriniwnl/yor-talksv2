import express, { type Express, type NextFunction, type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttpFactory from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { corsOrigins } from "./config/env.js";
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
const createRateLimitMiddleware = rateLimit as unknown as (options?: Record<string, unknown>) => (req: Request, res: Response, next: NextFunction) => void;

app.disable("x-powered-by");
app.use(requestContext);
app.use(requestLogger);
app.use(createHelmetMiddleware());
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests (curl, server-to-server, mobile apps) send no Origin header at all — allow those.
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      }
    },
    credentials: true,
  }),
);
app.use(
  createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found", data: null, errors: ["Not found"] });
});

app.use(errorHandler);

export default app;
