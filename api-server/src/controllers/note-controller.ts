import type { Request, Response } from "express";
import { ContentPolicyViolationError, ModerationUnavailableError } from "../services/content-policy-service.js";
import { NoteService } from "../services/note-service.js";
import { createResponse } from "../utils/response.js";

export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  list = async (req: Request, res: Response) => {
    const notes = await this.noteService.listVisibleNotes(req.user?.id ?? "");
    return res.status(200).json(createResponse("Notes loaded", notes));
  };

  create = async (req: Request, res: Response) => {
    try {
      const note = await this.noteService.createNote({ ...req.body, authorId: req.user?.id ?? "" });
      if (!note) return res.status(404).json(createResponse("User not found", null, {}, ["User not found"]));
      return res.status(201).json(createResponse("Note published", note));
    } catch (error) {
      if (error instanceof ContentPolicyViolationError) {
        const flags = Object.entries(error.flags).filter(([, value]) => value).map(([key]) => key);
        return res.status(422).json(createResponse(error.message, null, {}, flags));
      }
      if (error instanceof ModerationUnavailableError) {
        return res.status(503).json(createResponse("Notes are temporarily unavailable while safety checks recover", null, {}, ["moderation_unavailable"]));
      }
      throw error;
    }
  };

  remove = async (req: Request, res: Response) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const deleted = await this.noteService.deleteNote(id, req.user?.id ?? "");
    if (!deleted) return res.status(404).json(createResponse("Note not found", null, {}, ["Note not found"]));
    return res.status(200).json(createResponse("Note removed", null));
  };
}
