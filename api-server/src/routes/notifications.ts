import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { NotificationService } from "../services/notification-service.js";

const router = Router();
const notificationService = new NotificationService(new NotificationRepository());

router.get("/notifications", authenticate, (req, res) => {
  const notifications = notificationService.listForUser(req.user?.id ?? "");
  res.status(200).json({ success: true, message: "Notifications loaded", data: notifications, errors: [], meta: {} });
});

router.post("/notifications/:notificationId/read", authenticate, (req, res) => {
  const notification = notificationService.markRead(req.params.notificationId);
  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found", data: null, errors: ["Notification not found"], meta: {} });
  }
  return res.status(200).json({ success: true, message: "Notification marked as read", data: notification, errors: [], meta: {} });
});

export default router;
