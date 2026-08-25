import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { grievanceSchema, grievanceTicketParamSchema } from "../validators/grievance.js";
import { ModerationService } from "../services/moderation-service.js";

const router = Router();
const moderationService = new ModerationService();

router.post("/grievance", validateBody(grievanceSchema), async (req, res) => {
  try {
    const ticket = await moderationService.fileGrievance(req.body);
    return res.status(201).json({
      success: true,
      message: "Grievance received",
      data: ticket,
      errors: [],
      meta: {},
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Grievance could not be stored", data: null, errors: [error instanceof Error ? error.message : "Storage failure"], meta: {} });
  }
});

router.get("/grievance/:ticketId", validateParams(grievanceTicketParamSchema), async (req, res) => {
  const ticketId = typeof req.params.ticketId === "string" ? req.params.ticketId : "";
  const ticket = await moderationService.getGrievanceStatus(ticketId);
  if (!ticket) {
    return res.status(404).json({ success: false, message: "Ticket not found", data: null, errors: ["Ticket not found"], meta: {} });
  }
  const { reporterEmail: _reporterEmail, description: _description, ...publicTicket } = ticket;
  return res.status(200).json({ success: true, message: "Grievance status loaded", data: publicTicket, errors: [], meta: {} });
});

router.post("/", authenticate, async (req, res) => {
  try {
    const { entityType, entityId, reason, details } = req.body;
    
    await db.insert(reportsTable).values({
      id: randomUUID(),
      reporterId: req.user!.id,
      entityType,
      entityId,
      reason,
      details,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json({ success: true, message: "Report submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export const reportRoutes = router;
