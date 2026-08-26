import { Router } from "express";
import { EventController } from "../controllers/event-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { EventRepository } from "../repositories/event-repository.js";
import { EventService } from "../services/event-service.js";
import { createEventSchema, rsvpSchema } from "../validators/event.js";
import { uuidParamSchema } from "../validators/params.js";

const router = Router();
const eventController = new EventController(new EventService(new EventRepository()));

router.post("/events", authenticate, validateBody(createEventSchema), eventController.create);
router.get("/events", optionalAuthenticate, eventController.list);
router.get("/events/:id", optionalAuthenticate, validateParams(uuidParamSchema), eventController.get);
router.delete("/events/:id", authenticate, validateParams(uuidParamSchema), eventController.remove);
router.post("/events/:id/rsvp", authenticate, validateParams(uuidParamSchema), validateBody(rsvpSchema), eventController.rsvp);

export default router;
