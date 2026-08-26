import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { NotificationService } from "../services/notification-service.js";
import { NotificationController } from "../controllers/notification-controller.js";

import { validateParams } from "../middlewares/validation.js";
import { notificationIdParamSchema } from "../validators/params.js";
import { z } from "zod";
import { PushSubscriptionRepository } from "../repositories/push-subscription-repository.js";
import { env } from "../config/env.js";

const router = Router();
const notificationService = new NotificationService(new NotificationRepository());
const notificationController = new NotificationController(notificationService);
const pushSubscriptionRepository = new PushSubscriptionRepository();
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(16).max(512),
    auth: z.string().min(8).max(512),
  }),
  userAgent: z.string().max(512).optional(),
});

router.get("/notifications", authenticate, notificationController.listNotifications);
router.post("/notifications/:notificationId/read", authenticate, validateParams(notificationIdParamSchema), notificationController.markRead);
router.post("/notifications/read-all", authenticate, notificationController.markAllRead);
router.get("/notifications/push/public-key", authenticate, (_req, res) => {
  if (!env.WEB_PUSH_VAPID_PUBLIC_KEY) {
    return res.status(503).json({ success: false, message: "Push notifications are not configured", data: null, errors: ["push_not_configured"], meta: {} });
  }
  return res.status(200).json({ success: true, message: "Push configuration loaded", data: { publicKey: env.WEB_PUSH_VAPID_PUBLIC_KEY }, errors: [], meta: {} });
});
router.post("/notifications/push/subscribe", authenticate, async (req, res, next) => {
  try {
    const parsed = pushSubscriptionSchema.parse(req.body);
    const subscription = await pushSubscriptionRepository.upsert({
      userId: req.user!.id,
      endpoint: parsed.endpoint,
      p256dh: parsed.keys.p256dh,
      auth: parsed.keys.auth,
      userAgent: parsed.userAgent ?? null,
    });
    return res.status(201).json({ success: true, message: "Push subscription saved", data: { id: subscription.id }, errors: [], meta: {} });
  } catch (error) {
    return next(error);
  }
});
router.delete("/notifications/push/subscribe", authenticate, async (req, res, next) => {
  try {
    const parsed = z.object({ endpoint: z.string().url().max(2048) }).parse(req.body);
    await pushSubscriptionRepository.remove(req.user!.id, parsed.endpoint);
    return res.status(200).json({ success: true, message: "Push subscription removed", data: null, errors: [], meta: {} });
  } catch (error) {
    return next(error);
  }
});

export default router;
