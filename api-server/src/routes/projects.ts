import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { projectsTable, projectCollaboratorsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createResponse } from "../utils/response.js";

const router = Router();

router.post("/", authenticate, async (req, res) => {
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
    await db.insert(projectCollaboratorsTable).values({
      projectId,
      userId: req.user!.id,
      role: "admin",
      status: "accepted",
      joinedAt: new Date().toISOString()
    });

    return res.status(201).json(createResponse("Project created", project));
  } catch (err) {
    return res.status(500).json(createResponse("Failed to create project", null, {}, [err instanceof Error ? err.message : "Unknown error"]));
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    // Return user's projects
    const projects = await db.select().from(projectsTable).where(eq(projectsTable.ownerId, req.user!.id));
    return res.status(200).json(createResponse("Projects retrieved", { projects }));
  } catch (err) {
    return res.status(500).json(createResponse("Failed to fetch projects", null, {}, [err instanceof Error ? err.message : "Unknown error"]));
  }
});

router.post("/:projectId/collaborators", authenticate, async (req, res) => {
  try {
    const projectId = typeof req.params.projectId === "string" ? req.params.projectId : "";
    if (!projectId) {
      return res.status(400).json(createResponse("Project id is required", null, {}, ["Project id is required"]));
    }
    const { userId, role } = req.body;
    if (typeof userId !== "string" || !userId) {
      return res.status(400).json(createResponse("A collaborator is required", null, {}, ["User id is required"]));
    }
    
    await db.insert(projectCollaboratorsTable).values({
      projectId,
      userId,
      role: role || "collaborator",
      status: "pending"
    });
    
    return res.status(201).json(createResponse("Collaborator invited", null));
  } catch (err) {
    return res.status(500).json(createResponse("Failed to invite collaborator", null, {}, [err instanceof Error ? err.message : "Unknown error"]));
  }
});

export const projectRoutes = router;
