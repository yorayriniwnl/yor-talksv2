import { Router } from "express";
import { EventController } from "../controllers/event-controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validation.js";
import { EventRepository } from "../repositories/event-repository.js";
import { EventService } from "../services/event-service.js";
import { createEventSchema, rsvpSchema } from "../validators/event.js";

const router = Router();
const eventController = new EventController(new EventService(new EventRepository()));

router.post("/events", authenticate, validateBody(createEventSchema), eventController.create);
router.get("/events", optionalAuthenticate, eventController.list);
router.get("/events/:id", optionalAuthenticate, eventController.get);
router.delete("/events/:id", authenticate, eventController.remove);
router.post("/events/:id/rsvp", authenticate, validateBody(rsvpSchema), eventController.rsvp);

export default router;
