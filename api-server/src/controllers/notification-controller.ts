import { type Request, type Response } from "express";
import { NotificationService } from "../services/notification-service.js";
import { createResponse } from "../utils/response.js";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  listNotifications = async (req: Request, res: Response) => {
    const notifications = await this.notificationService.listForUser(req.user?.id ?? "");
    return res.status(200).json(createResponse("Notifications loaded", notifications));
  };

  markRead = async (req: Request, res: Response) => {
    const notificationId = typeof req.params.notificationId === "string" ? req.params.notificationId : "";
    const notification = await this.notificationService.markRead(notificationId, req.user?.id ?? "");
    if (!notification) {
      return res.status(404).json(createResponse("Notification not found", null, {}, ["Notification not found"]));
    }
    return res.status(200).json(createResponse("Notification marked as read", notification));
  };

  markAllRead = async (req: Request, res: Response) => {
    await this.notificationService.markAllRead(req.user?.id ?? "");
    return res.status(200).json(createResponse("Notifications marked as read", null));
  };
}
