import { Router } from "express";
import { z } from "zod";
import { MessageController } from "../controllers/message-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { MessageService } from "../services/message-service.js";
import { messageSchema } from "../validators/message.js";
import { conversationIdParamSchema, messageIdParamSchema } from "../validators/params.js";

const router = Router();
const messageService = new MessageService(new ConversationRepository(), new MessageRepository(), new UserRepository());
const messageController = new MessageController(messageService);

router.post("/messages", authenticate, validateBody(messageSchema), messageController.sendMessage);
router.get("/conversations", authenticate, messageController.listConversations);
router.get("/conversations/:conversationId/messages", authenticate, validateParams(conversationIdParamSchema), messageController.listConversation);
router.post("/messages/:messageId/seen", authenticate, validateParams(messageIdParamSchema), messageController.markSeen);
router.put("/messages/:messageId", authenticate, validateParams(messageIdParamSchema), validateBody(z.object({ content: z.string().min(1) })), messageController.editMessage);
router.delete("/messages/:messageId", authenticate, validateParams(messageIdParamSchema), messageController.deleteMessage);
router.post("/messages/:messageId/reactions", authenticate, validateParams(messageIdParamSchema), validateBody(z.object({ reaction: z.string().min(1) })), messageController.addReaction);
router.post("/messages/:messageId/pin", authenticate, validateParams(messageIdParamSchema), messageController.pinMessage);

export default router;
