import { Router } from "express";
import { NoteController } from "../controllers/note-controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { NoteRepository } from "../repositories/note-repository.js";
import { NoteService } from "../services/note-service.js";
import { createNoteSchema } from "../validators/note.js";
import { uuidParamSchema } from "../validators/params.js";

const router = Router();
const noteController = new NoteController(new NoteService(new NoteRepository()));

router.get("/notes", authenticate, noteController.list);
router.post("/notes", authenticate, validateBody(createNoteSchema), noteController.create);
router.delete("/notes/:id", authenticate, validateParams(uuidParamSchema), noteController.remove);

export default router;
