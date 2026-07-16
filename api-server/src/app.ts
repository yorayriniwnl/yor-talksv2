import express, { type Express, type NextFunction, type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttpFactory from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { requestContext } from "./middlewares/request-context.js";

const app: Express = express();
const requestLogger = (pinoHttpFactory as unknown as (options: Record<string, unknown>) => (req: Request, res: Response, next: NextFunction) => void)({
  logger,
  serializers: {
    req(req: Request) {
      return {
        id: req.id,
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

app.disable("x-powered-by");
app.use(requestLogger);
app.use(requestContext);
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use(errorHandler);

export default app;
