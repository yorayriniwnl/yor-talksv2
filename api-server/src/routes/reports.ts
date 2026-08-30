import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { grievanceSchema, grievanceStatusSchema, grievanceTicketParamSchema } from "../validators/grievance.js";
import { reportSchema, reportStatusSchema } from "../validators/report.js";
import { reportIdParamSchema } from "../validators/params.js";
import { ModerationService } from "../services/moderation-service.js";
import { grievanceStatusRateLimiter, grievanceSubmitRateLimiter, reportRateLimiter } from "../middlewares/rate-limit.js";

const router = Router();
const moderationService = new ModerationService();

router.post("/grievance", grievanceSubmitRateLimiter, validateBody(grievanceSchema), async (req, res) => {
  try {
    const ticket = await moderationService.fileGrievance(req.body);
    return res.status(201).json({
      success: true,
      message: "Grievance received",
      data: ticket,
      errors: [],
      meta: {},
    });
  } catch {
    return res.status(500).json({ success: false, message: "Grievance could not be stored", data: null, errors: ["Storage failure"], meta: {} });
  }
});

router.get("/grievance/:ticketId", grievanceStatusRateLimiter, validateParams(grievanceTicketParamSchema), async (req, res) => {
  const ticketId = typeof req.params.ticketId === "string" ? req.params.ticketId : "";
  const ticket = await moderationService.getGrievanceStatus(ticketId);
  if (!ticket) {
    return res.status(404).json({ success: false, message: "Ticket not found", data: null, errors: ["Ticket not found"], meta: {} });
  }
  const { reporterEmail: _reporterEmail, description: _description, ...publicTicket } = ticket;
  return res.status(200).json({ success: true, message: "Grievance status loaded", data: publicTicket, errors: [], meta: {} });
});

router.get("/grievances", authenticate, requireRole("admin", "moderator"), async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    if (status && !["received", "under_review", "resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid grievance status", data: null, errors: ["Invalid status"], meta: {} });
    }
    const tickets = await moderationService.listGrievances(status as Parameters<ModerationService["listGrievances"]>[0]);
    return res.status(200).json({ success: true, message: "Grievance queue loaded", data: tickets, errors: [], meta: {} });
  } catch {
    return res.status(500).json({ success: false, message: "Grievance queue could not be loaded", data: null, errors: ["Queue failure"], meta: {} });
  }
});

router.patch("/grievance/:ticketId/status", authenticate, requireRole("admin", "moderator"), validateParams(grievanceTicketParamSchema), validateBody(grievanceStatusSchema), async (req, res) => {
  try {
    const ticket = await moderationService.updateGrievanceStatus(req.params.ticketId as string, req.body.status, req.body.officerNote);
    if (!ticket) return res.status(404).json({ success: false, message: "Grievance ticket not found", data: null, errors: ["Ticket not found"], meta: {} });
    return res.status(200).json({ success: true, message: "Grievance status updated", data: ticket, errors: [], meta: {} });
  } catch {
    return res.status(500).json({ success: false, message: "Grievance status could not be updated", data: null, errors: ["Update failure"], meta: {} });
  }
});

router.post("/", authenticate, reportRateLimiter, validateBody(reportSchema), async (req, res) => {
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
    
    res.status(201).json({ success: true, message: "Report submitted successfully", data: null, errors: [], meta: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to submit report", data: null, errors: ["Report storage failed"], meta: {} });
  }
});

router.get("/queue", authenticate, requireRole("admin", "moderator"), async (_req, res) => {
  try {
    const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt)).limit(200);
    return res.status(200).json({ success: true, message: "Moderation queue loaded", data: reports, errors: [], meta: {} });
  } catch {
    return res.status(500).json({ success: false, message: "Moderation queue could not be loaded", data: null, errors: ["Queue failure"], meta: {} });
  }
});

router.patch("/:reportId/status", authenticate, requireRole("admin", "moderator"), validateParams(reportIdParamSchema), validateBody(reportStatusSchema), async (req, res) => {
  try {
    const [report] = await db.update(reportsTable)
      .set({ status: req.body.status, resolvedAt: req.body.status === "resolved" || req.body.status === "dismissed" ? new Date().toISOString() : null })
      .where(eq(reportsTable.id, req.params.reportId as string))
      .returning();
    if (!report) return res.status(404).json({ success: false, message: "Report not found", data: null, errors: ["Report not found"], meta: {} });
    return res.status(200).json({ success: true, message: "Report status updated", data: report, errors: [], meta: {} });
  } catch {
    return res.status(500).json({ success: false, message: "Report status could not be updated", data: null, errors: ["Update failure"], meta: {} });
  }
});

export const reportRoutes = router;
