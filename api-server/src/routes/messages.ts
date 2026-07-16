import { Router } from "express";
import { z } from "zod";
import { MessageController } from "../controllers/message-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { MessageService } from "../services/message-service.js";
import { messageSchema } from "../validators/message.js";

const router = Router();
const messageService = new MessageService(new ConversationRepository(), new MessageRepository());
const messageController = new MessageController(messageService);

router.post("/messages", authenticate, validateBody(messageSchema), messageController.sendMessage);
router.get("/conversations/:conversationId/messages", authenticate, validateParams(z.object({ conversationId: z.string().min(1) })), messageController.listConversation);
router.post("/messages/:messageId/seen", authenticate, validateParams(z.object({ messageId: z.string().min(1) })), messageController.markSeen);
router.put("/messages/:messageId", authenticate, validateParams(z.object({ messageId: z.string().min(1) })), validateBody(z.object({ content: z.string().min(1) })), messageController.editMessage);
router.delete("/messages/:messageId", authenticate, validateParams(z.object({ messageId: z.string().min(1) })), messageController.deleteMessage);
router.post("/messages/:messageId/reactions", authenticate, validateParams(z.object({ messageId: z.string().min(1) })), validateBody(z.object({ reaction: z.string().min(1) })), messageController.addReaction);
router.post("/messages/:messageId/pin", authenticate, validateParams(z.object({ messageId: z.string().min(1) })), messageController.pinMessage);

export default router;
