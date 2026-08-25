import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { projectsTable, projectCollaboratorsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { title, description, visibility, lookingForCollaborators } = req.body;
    const projectId = randomUUID();
    
    await db.insert(projectsTable).values({
      id: projectId,
      ownerId: req.user!.id,
      title: title || "Untitled Project",
      description: description || "",
      visibility: visibility || "public",
      lookingForCollaborators: lookingForCollaborators || false,
    });
    
    // Owner is admin
    await db.insert(projectCollaboratorsTable).values({
      projectId,
      userId: req.user!.id,
      role: "admin",
      status: "accepted",
      joinedAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, projectId });
  } catch (err) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/", authenticate, async (req, res) => {
  try {
    // Return user's projects
    const projects = await db.select().from(projectsTable).where(eq(projectsTable.ownerId, req.user!.id));
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/:projectId/collaborators", authenticate, async (req, res) => {
  try {
    const projectId = typeof req.params.projectId === "string" ? req.params.projectId : "";
    if (!projectId) {
      return res.status(400).json({ success: false, error: "Project id is required" });
    }
    const { userId, role } = req.body;
    
    await db.insert(projectCollaboratorsTable).values({
      projectId,
      userId,
      role: role || "collaborator",
      status: "pending"
    });
    
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to invite collaborator" });
  }
});

export const projectRoutes = router;
