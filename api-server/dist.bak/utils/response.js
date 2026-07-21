export const createResponse = (message, data = null, meta = {}, errors = []) => ({
    success: errors.length === 0,
    message,
    data,
    errors,
    meta,
});
export const sendSuccess = (res, message, data = null, meta = {}) => res.status(200).json(createResponse(message, data, meta));
//# sourceMappingURL=response.js.map