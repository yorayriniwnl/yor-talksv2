import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { invitesTable, usersTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { and, isNull } from "drizzle-orm";
import { createResponse } from "../utils/response.js";
import { z } from "zod";
import { validateBody } from "../middlewares/validation.js";

const router = Router();

// Generate an invite code
router.post("/generate", authenticate, async (req, res) => {
  try {
    const code = randomUUID().replaceAll("-", "").substring(0, 16).toUpperCase();
    await db.insert(invitesTable).values({
      id: randomUUID(),
      inviterId: req.user!.id,
      code,
      status: "active",
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json(createResponse("Invite generated", { code }));
  } catch (err) {
    res.status(500).json(createResponse("Failed to generate invite code", null, {}, ["Internal server error"]));
  }
});

// Claim an invite code
router.post("/claim", authenticate, validateBody(z.object({ code: z.string().trim().min(8).max(32) })), async (req, res) => {
  try {
    const code = req.body.code.toUpperCase();
    const [invite] = await db.select({ id: invitesTable.id, inviterId: invitesTable.inviterId })
      .from(invitesTable)
      .where(and(eq(invitesTable.code, code), eq(invitesTable.status, "active"), isNull(invitesTable.inviteeId)))
      .limit(1);
    if (!invite || invite.inviterId === req.user!.id) {
      return res.status(400).json(createResponse("Invalid or expired invite code", null, {}, ["Invalid invite"]));
    }

    const claimed = await db.update(invitesTable)
      .set({ 
        status: "claimed",
        inviteeId: req.user!.id,
        claimedAt: new Date().toISOString()
      })
      .where(and(eq(invitesTable.id, invite.id), eq(invitesTable.status, "active"), isNull(invitesTable.inviteeId)))
      .returning({ id: invitesTable.id });
    if (claimed.length === 0) {
      return res.status(409).json(createResponse("Invite has already been claimed", null, {}, ["Invite unavailable"]));
    }
      
    // Credit inviter (example of referral reward logic)
    // Could add points to wallet here

    res.json(createResponse("Invite claimed successfully", null));
  } catch (err) {
    res.status(500).json(createResponse("Failed to claim invite code", null, {}, ["Internal server error"]));
  }
});

export const inviteRoutes = router;
