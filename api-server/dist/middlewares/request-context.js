import { randomUUID } from "node:crypto";
export const requestContext = (req, res, next) => {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
};
//# sourceMappingURL=request-context.js.map