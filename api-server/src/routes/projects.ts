import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { projectsTable, projectCollaboratorsTable, usersTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { createResponse } from "../utils/response.js";
import { validateBody, validateParams } from "../middlewares/validation.js";
import { createProjectSchema, inviteProjectCollaboratorSchema } from "../validators/project.js";
import { uuidParamSchema } from "../validators/params.js";

const router = Router();

router.post("/", authenticate, validateBody(createProjectSchema), async (req, res) => {
  try {
    const { title, description, visibility, lookingForCollaborators } = req.body;
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    if (!normalizedTitle) {
      return res.status(400).json(createResponse("A title is required", null, {}, ["Title is required"]));
    }

    const projectId = randomUUID();
    
    const [project] = await db.insert(projectsTable).values({
      id: projectId,
      ownerId: req.user!.id,
      title: normalizedTitle.slice(0, 120),
      description: typeof description === "string" ? description.trim().slice(0, 2_000) : "",
      visibility: visibility === "private" ? "private" : "public",
      lookingForCollaborators: Boolean(lookingForCollaborators),
    }).returning();
    
    // Owner is admin
    await db.insert(projectCollaboratorsTable).values({ projectId, userId: req.user!.id, role: "admin", status: "accepted", joinedAt: new Date().toISOString() });

    return res.status(201).json(createResponse("Project created", project));
  } catch (err) {
    return res.status(500).json(createResponse("Failed to create project", null, {}, [err instanceof Error ? err.message : "Unknown error"]));
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    const memberships = await db.select({ projectId: projectCollaboratorsTable.projectId })
      .from(projectCollaboratorsTable)
      .where(eq(projectCollaboratorsTable.userId, req.user!.id));
    const projectIds = memberships.map((membership) => membership.projectId);
    const projects = projectIds.length
      ? await db.select().from(projectsTable).where(inArray(projectsTable.id, projectIds))
      : await db.select().from(projectsTable).where(eq(projectsTable.ownerId, req.user!.id));
    return res.status(200).json(createResponse("Projects retrieved", { projects }));
  } catch (err) {
    return res.status(500).json(createResponse("Failed to fetch projects", null, {}, [err instanceof Error ? err.message : "Unknown error"]));
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
    
    await db.insert(projectCollaboratorsTable).values({
      projectId,
      userId,
      role,
      status: "pending"
    });
    
    return res.status(201).json(createResponse("Collaborator invited", null));
  } catch (err) {
    return res.status(500).json(createResponse("Failed to invite collaborator", null, {}, [err instanceof Error ? err.message : "Unknown error"]));
  }
});

export const projectRoutes = router;
