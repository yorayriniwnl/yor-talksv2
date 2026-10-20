import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { reportModerationEventsTable, reportsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { validateBody, validateParams, validateQuery } from "../middlewares/validation.js";
import { grievanceSchema, grievanceStatusSchema, grievanceTicketParamSchema, grievanceQueueQuerySchema } from "../validators/grievance.js";
import { reportSchema, reportStatusSchema, reportQueueQuerySchema } from "../validators/report.js";
import { reportIdParamSchema } from "../validators/params.js";
import { ModerationService } from "../services/moderation-service.js";
import { grievanceStatusRateLimiter, grievanceSubmitRateLimiter, reportRateLimiter } from "../middlewares/rate-limit.js";
import { InvalidStaffQueueCursorError, readStaffQueueCursor, staffQueueAfter, staffQueuePage } from '../utils/staff-queue-page.js';

const router = Router();
const moderationService = new ModerationService();

router.post("/grievance", grievanceSubmitRateLimiter, validateBody(grievanceSchema), async (req, res) => {
  try {
    const ticket = await moderationService.fileGrievance(req.body);
    return res.status(201).json({
      success: true,
      message: "Grievance received",
      data: toPublicGrievance(ticket),
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
  return res.status(200).json({ success: true, message: "Grievance status loaded", data: toPublicGrievance(ticket), errors: [], meta: {} });
});

router.get("/grievances", authenticate, requireRole("admin", "moderator"), validateQuery(grievanceQueueQuerySchema), async (req, res) => {
  try {
    const query = grievanceQueueQuerySchema.parse(req.query);
    const page = await moderationService.listGrievances(query.status, query.cursor, Number(query.limit ?? 50));
    return res.status(200).json({ success: true, message: "Grievance queue loaded", ...page, errors: [] });
  } catch (error) {
    if (error instanceof InvalidStaffQueueCursorError) return res.status(400).json({ success: false, message: error.message, data: null, errors: ['Invalid cursor'], meta: {} });
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

router.get("/queue", authenticate, requireRole("admin", "moderator"), validateQuery(reportQueueQuerySchema), async (req, res) => {
  try {
    const query = reportQueueQuerySchema.parse(req.query);
    const limit = Number(query.limit ?? 50);
    const cursor = readStaffQueueCursor(query.cursor, 'reports', query.status);
    const reports = await db.select().from(reportsTable)
      .where(and(query.status ? eq(reportsTable.status, query.status) : undefined,
        staffQueueAfter(reportsTable.createdAt, reportsTable.id, cursor)))
      .orderBy(desc(reportsTable.createdAt), desc(reportsTable.id)).limit(limit + 1);
    return res.status(200).json({ success: true, message: "Moderation queue loaded", ...staffQueuePage(reports, limit, 'reports', query.status), errors: [] });
  } catch (error) {
    if (error instanceof InvalidStaffQueueCursorError) return res.status(400).json({ success: false, message: error.message, data: null, errors: ['Invalid cursor'], meta: {} });
    return res.status(500).json({ success: false, message: "Moderation queue could not be loaded", data: null, errors: ["Queue failure"], meta: {} });
  }
});

router.get("/:reportId/history", authenticate, requireRole("admin", "moderator"), validateParams(reportIdParamSchema), async (req, res) => {
  try {
    const reportId = req.params.reportId as string;
    const [report] = await db.select({ id: reportsTable.id }).from(reportsTable)
      .where(eq(reportsTable.id, reportId)).limit(1);
    if (!report) return res.status(404).json({ success: false, message: "Report not found", data: null, errors: ["Report not found"], meta: {} });
    const history = await db.select().from(reportModerationEventsTable)
      .where(eq(reportModerationEventsTable.reportId, reportId))
      .orderBy(desc(reportModerationEventsTable.createdAt), desc(reportModerationEventsTable.id));
    return res.status(200).json({ success: true, message: "Moderation decision history loaded", data: history, errors: [], meta: {} });
  } catch {
    return res.status(500).json({ success: false, message: "Moderation decision history could not be loaded", data: null, errors: ["History failure"], meta: {} });
  }
});

router.patch("/:reportId/status", authenticate, requireRole("admin", "moderator"), validateParams(reportIdParamSchema), validateBody(reportStatusSchema), async (req, res) => {
  try {
    const report = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(reportsTable)
        .where(eq(reportsTable.id, req.params.reportId as string))
        .for('update');
      if (!current) return null;

      const finalDecision = req.body.status === 'resolved' || req.body.status === 'dismissed';
      const decisionReason = finalDecision ? req.body.decisionReason : null;
      if (current.status === req.body.status && current.decisionReason === decisionReason) return current;

      const now = new Date().toISOString();
      const [updated] = await tx.update(reportsTable)
        .set({ status: req.body.status, resolvedAt: finalDecision ? now : null, decisionReason })
        .where(eq(reportsTable.id, req.params.reportId as string))
        .returning();
      if (!updated) return null;

      await tx.insert(reportModerationEventsTable).values({
        id: randomUUID(),
        reportId: current.id,
        moderatorId: req.user!.id,
        fromStatus: current.status,
        toStatus: req.body.status,
        decisionReason,
        createdAt: now,
      });
      return updated;
    });
    if (!report) return res.status(404).json({ success: false, message: "Report not found", data: null, errors: ["Report not found"], meta: {} });
    return res.status(200).json({ success: true, message: "Report status updated", data: report, errors: [], meta: {} });
  } catch {
    return res.status(500).json({ success: false, message: "Report status could not be updated", data: null, errors: ["Update failure"], meta: {} });
  }
});

export const reportRoutes = router;
