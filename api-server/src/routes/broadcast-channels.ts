import { Router } from "express";
import { BroadcastChannelController } from "../controllers/broadcast-channel-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { BroadcastChannelRepository } from "../repositories/broadcast-channel-repository.js";
import { BroadcastChannelService } from "../services/broadcast-channel-service.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { QueueService } from "../services/queue-service.js";
import { createBroadcastChannelMessageSchema, createBroadcastChannelSchema, updateBroadcastChannelNotificationsSchema } from "../validators/broadcast-channel.js";
import { uuidParamSchema } from "../validators/params.js";

const router = Router();
const controller = new BroadcastChannelController(new BroadcastChannelService(new BroadcastChannelRepository(), undefined, undefined, new NotificationRepository(), new QueueService()));

router.get("/broadcast-channels", authenticate, controller.list);
router.post("/broadcast-channels", authenticate, validateBody(createBroadcastChannelSchema), controller.create);
router.post("/broadcast-channels/:id/join", authenticate, validateParams(uuidParamSchema), controller.join);
router.delete("/broadcast-channels/:id/join", authenticate, validateParams(uuidParamSchema), controller.leave);
router.patch("/broadcast-channels/:id/notifications", authenticate, validateParams(uuidParamSchema), validateBody(updateBroadcastChannelNotificationsSchema), controller.notifications);
router.get("/broadcast-channels/:id/messages", authenticate, validateParams(uuidParamSchema), controller.messages);
router.post("/broadcast-channels/:id/messages", authenticate, validateParams(uuidParamSchema), validateBody(createBroadcastChannelMessageSchema), controller.createMessage);

export default router;
