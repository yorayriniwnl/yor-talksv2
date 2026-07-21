import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttpFactory from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { requestContext } from "./middlewares/request-context.js";
const app = express();
const requestLogger = pinoHttpFactory({
    logger,
    serializers: {
        req(req) {
            return {
                id: req.id,
                requestId: req.requestId,
                method: req.method,
                url: req.url?.split("?")[0],
            };
        },
        res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
});
app.disable("x-powered-by");
app.use(requestContext);
app.use(requestLogger);
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", router);
app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Route not found", data: null, errors: ["Not found"] });
});
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map