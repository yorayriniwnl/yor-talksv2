import { Router } from "express";
import { openApiDocument } from "../docs/openapi.js";
const router = Router();
router.get("/docs", (_req, res) => {
    res.status(200).json(openApiDocument);
});
export default router;
//# sourceMappingURL=docs.js.map