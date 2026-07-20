import { createResponse } from "../utils/response.js";
export class HealthController {
    health = (_req, res) => {
        return res.status(200).json(createResponse("Service healthy", { status: "ok" }));
    };
}
//# sourceMappingURL=health-controller.js.map