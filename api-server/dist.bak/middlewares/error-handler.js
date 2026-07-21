import { logger } from "../lib/logger.js";
import { createResponse } from "../utils/response.js";
import { env } from "../config/env.js";
export const errorHandler = (err, _req, res, _next) => {
    logger.error({ err }, "Unhandled error");
    const isProd = env.NODE_ENV === "production";
    const message = err instanceof Error ? (isProd ? "Internal server error" : err.message) : "Internal server error";
    return res.status(500).json(createResponse("Internal server error", null, {}, [message]));
};
//# sourceMappingURL=error-handler.js.map