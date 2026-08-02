import { type Request, type Response } from "express";
import { AchievementService } from "../services/achievement-service.js";
import { createResponse } from "../utils/response.js";

export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  getMine = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const achievements = await this.achievementService.getProgressForUser(userId);
    return res.status(200).json(createResponse("Achievements retrieved", achievements));
  };
}
