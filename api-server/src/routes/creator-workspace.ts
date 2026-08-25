import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { creatorWorkspaceItemsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { authenticate } from "../middlewares/auth.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validation.js";
import { createResponse } from "../utils/response.js";
import { workspaceItemParamSchema, workspaceItemSchema, workspaceQuerySchema } from "../validators/workspace.js";

const router = Router();

router.get("/workspace", authenticate, validateQuery(workspaceQuerySchema), async (req, res) => {
  try {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const conditions = [eq(creatorWorkspaceItemsTable.ownerId, req.user!.id)];
    if (kind) conditions.push(eq(creatorWorkspaceItemsTable.kind, kind));
    const items = await db.select().from(creatorWorkspaceItemsTable)
      .where(and(...conditions))
      .orderBy(asc(creatorWorkspaceItemsTable.createdAt));
    return res.status(200).json(createResponse("Creator workspace loaded", items));
  } catch (error) {
    return res.status(500).json(createResponse("Creator workspace could not be loaded", null, {}, [error instanceof Error ? error.message : "Storage failure"]));
  }
});

router.put("/workspace", authenticate, validateBody(workspaceItemSchema), async (req, res) => {
  try {
    const now = new Date().toISOString();
    const [item] = await db.insert(creatorWorkspaceItemsTable).values({
      id: randomUUID(),
      ownerId: req.user!.id,
      kind: req.body.kind,
      itemKey: req.body.itemKey,
      payload: req.body.payload,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [creatorWorkspaceItemsTable.ownerId, creatorWorkspaceItemsTable.kind, creatorWorkspaceItemsTable.itemKey],
      set: { payload: req.body.payload, updatedAt: now },
    }).returning();
    return res.status(200).json(createResponse("Creator workspace item saved", item));
  } catch (error) {
    return res.status(500).json(createResponse("Creator workspace item could not be saved", null, {}, [error instanceof Error ? error.message : "Storage failure"]));
  }
});

router.delete("/workspace/:kind/:itemKey", authenticate, validateParams(workspaceItemParamSchema), async (req, res) => {
  try {
    const kind = typeof req.params.kind === "string" ? req.params.kind : "";
    const itemKey = typeof req.params.itemKey === "string" ? req.params.itemKey : "";
    await db.delete(creatorWorkspaceItemsTable).where(and(
      eq(creatorWorkspaceItemsTable.ownerId, req.user!.id),
      eq(creatorWorkspaceItemsTable.kind, kind),
      eq(creatorWorkspaceItemsTable.itemKey, itemKey),
    ));
    return res.status(200).json(createResponse("Creator workspace item removed", null));
  } catch (error) {
    return res.status(500).json(createResponse("Creator workspace item could not be removed", null, {}, [error instanceof Error ? error.message : "Storage failure"]));
  }
});

export const creatorWorkspaceRoutes = router;
