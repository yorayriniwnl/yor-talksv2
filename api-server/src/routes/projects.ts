import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { projectsTable, projectCollaboratorsTable, usersTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { createResponse } from "../utils/response.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { createProjectSchema, inviteProjectCollaboratorSchema } from "../validators/project.js";
import { uuidParamSchema } from "../validators/params.js";
import { ContentPolicyViolationError, enforceTextContentPolicy } from "../services/content-policy-service.js";
import { AIService } from "../services/ai-service.js";

const router = Router();

router.post("/", authenticate, validateBody(createProjectSchema), async (req, res) => {
  try {
    const { title, description, visibility, lookingForCollaborators } = req.body;
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    if (!normalizedTitle) {
      return res.status(400).json(createResponse("A title is required", null, {}, ["Title is required"]));
    }
    const normalizedDescription = typeof description === "string" ? description.trim().slice(0, 2_000) : "";
    await enforceTextContentPolicy(`${normalizedTitle}\n${normalizedDescription}`, new AIService(), "project");

    const projectId = randomUUID();
    
    const [project] = await db.insert(projectsTable).values({
      id: projectId,
      ownerId: req.user!.id,
      title: normalizedTitle.slice(0, 120),
      description: normalizedDescription,
      visibility: visibility === "private" ? "private" : "public",
      lookingForCollaborators: Boolean(lookingForCollaborators),
    }).returning();
    
    // Owner is admin
    await db.insert(projectCollaboratorsTable).values({ projectId, userId: req.user!.id, role: "admin", status: "accepted", joinedAt: new Date().toISOString() });

    return res.status(201).json(createResponse("Project created", project));
  } catch (err) {
    if (err instanceof ContentPolicyViolationError) {
      return res.status(422).json(createResponse(err.message, null, {}, ["content_policy_violation"]));
    }
    return res.status(500).json(createResponse("Failed to create project", null, {}, ["Internal server error"]));
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    const memberships = await db.select({ projectId: projectCollaboratorsTable.projectId })
      .from(projectCollaboratorsTable)
      .where(and(eq(projectCollaboratorsTable.userId, req.user!.id), eq(projectCollaboratorsTable.status, "accepted")));
    const projectIds = memberships.map((membership) => membership.projectId);
    const projects = projectIds.length
      ? await db.select().from(projectsTable).where(inArray(projectsTable.id, projectIds))
      : await db.select().from(projectsTable).where(eq(projectsTable.ownerId, req.user!.id));
    return res.status(200).json(createResponse("Projects retrieved", { projects }));
  } catch (err) {
    return res.status(500).json(createResponse("Failed to fetch projects", null, {}, ["Internal server error"]));
  }
});

router.post("/:projectId/collaborators", authenticate, validateParams(z.object({ projectId: z.string().uuid() })), validateBody(inviteProjectCollaboratorSchema), async (req, res) => {
  try {
    const projectId = typeof req.params.projectId === "string" ? req.params.projectId : "";
    if (!projectId) {
      return res.status(400).json(createResponse("Project id is required", null, {}, ["Project id is required"]));
    }
    const { userId, role } = req.body;
    const [project] = await db.select({ ownerId: projectsTable.ownerId }).from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) return res.status(404).json(createResponse("Project not found", null, {}, ["Project not found"]));
    if (project.ownerId !== req.user!.id) return res.status(403).json(createResponse("Only the project owner can invite collaborators", null, {}, ["Forbidden"]));
    const [target] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
    if (!target) return res.status(404).json(createResponse("Collaborator not found", null, {}, ["User not found"]));
    
    if (userId === req.user!.id) {
      return res.status(400).json(createResponse("The project owner is already a collaborator", null, {}, ["Invalid collaborator"]));
    }
    const [existing] = await db.select().from(projectCollaboratorsTable).where(and(
      eq(projectCollaboratorsTable.projectId, projectId),
      eq(projectCollaboratorsTable.userId, userId),
    ));
    if (existing?.status === "accepted") {
      return res.status(409).json(createResponse("That user is already a collaborator", null, {}, ["Already a collaborator"]));
    }
    if (existing) {
      await db.update(projectCollaboratorsTable).set({ role, status: "pending", joinedAt: null }).where(and(
        eq(projectCollaboratorsTable.projectId, projectId),
        eq(projectCollaboratorsTable.userId, userId),
      ));
    } else {
      await db.insert(projectCollaboratorsTable).values({ projectId, userId, role, status: "pending" });
    }
    
    return res.status(201).json(createResponse("Collaborator invited", null));
  } catch (err) {
    return res.status(500).json(createResponse("Failed to invite collaborator", null, {}, ["Internal server error"]));
  }
});

router.get("/invitations", authenticate, async (req, res) => {
  try {
    const invitations = await db.select({ project: projectsTable, role: projectCollaboratorsTable.role, status: projectCollaboratorsTable.status })
      .from(projectCollaboratorsTable)
      .innerJoin(projectsTable, eq(projectsTable.id, projectCollaboratorsTable.projectId))
      .where(and(eq(projectCollaboratorsTable.userId, req.user!.id), eq(projectCollaboratorsTable.status, "pending")))
      .orderBy(projectsTable.updatedAt);
    return res.status(200).json(createResponse("Project invitations retrieved", { invitations }));
  } catch {
    return res.status(500).json(createResponse("Failed to fetch project invitations", null, {}, ["Internal server error"]));
  }
});

router.post("/:projectId/collaborators/respond", authenticate, validateParams(z.object({ projectId: z.string().uuid() })), validateBody(z.object({ decision: z.enum(["accepted", "rejected"]) })), async (req, res) => {
  const projectId = typeof req.params.projectId === "string" ? req.params.projectId : "";
  const [updated] = await db.update(projectCollaboratorsTable).set({
    status: req.body.decision,
    joinedAt: req.body.decision === "accepted" ? new Date().toISOString() : null,
  }).where(and(
    eq(projectCollaboratorsTable.projectId, projectId),
    eq(projectCollaboratorsTable.userId, req.user!.id),
    eq(projectCollaboratorsTable.status, "pending"),
  )).returning();
  if (!updated) return res.status(404).json(createResponse("Project invitation not found", null, {}, ["Invitation not found"]));
  return res.status(200).json(createResponse(`Project invitation ${req.body.decision}`, updated));
});

export const projectRoutes = router;
