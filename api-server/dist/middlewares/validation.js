import { createResponse } from "../utils/response.js";
export const validateBody = (schema) => {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(createResponse("Validation failed", null, {}, parsed.error.issues.map((issue) => issue.message)));
        }
        req.body = parsed.data;
        return next();
    };
};
export const validateQuery = (schema) => {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json(createResponse("Validation failed", null, {}, parsed.error.issues.map((issue) => issue.message)));
        }
        req.query = parsed.data;
        return next();
    };
};
export const validateParams = (schema) => {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json(createResponse("Validation failed", null, {}, parsed.error.issues.map((issue) => issue.message)));
        }
        req.params = parsed.data;
        return next();
    };
};
//# sourceMappingURL=validation.js.map