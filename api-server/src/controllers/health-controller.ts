import { type Request, type Response } from "express";
import { createResponse } from "../utils/response.js";

export class HealthController {
  health = (_req: Request, res: Response) => {
    return res.status(200).json(createResponse("Service healthy", { status: "ok" }));
  };
}
