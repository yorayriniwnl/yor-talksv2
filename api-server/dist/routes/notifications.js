import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { NotificationService } from "../services/notification-service.js";
import { NotificationController } from "../controllers/notification-controller.js";
import { validateParams } from "../middlewares/validation.js";
import { notificationIdParamSchema } from "../validators/params.js";
const router = Router();
const notificationService = new NotificationService(new NotificationRepository());
const notificationController = new NotificationController(notificationService);
router.get("/notifications", authenticate, notificationController.listNotifications);
router.post("/notifications/:notificationId/read", authenticate, validateParams(notificationIdParamSchema), notificationController.markRead);
export default router;
//# sourceMappingURL=notifications.js.map