import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { invitesTable, usersTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

const router = Router();

// Generate an invite code
router.post("/generate", authenticate, async (req, res) => {
  try {
    const code = randomUUID().substring(0, 8).toUpperCase();
    await db.insert(invitesTable).values({
      id: randomUUID(),
      inviterId: req.user!.id,
      code,
      status: "active",
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json({ success: true, code });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate invite code" });
  }
});

// Claim an invite code
router.post("/claim", authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    
    const invite = await db.query.invitesTable.findFirst({
      where: eq(invitesTable.code, code)
    });
    
    if (!invite || invite.status !== "active") {
      return res.status(400).json({ error: "Invalid or expired invite code" });
    }
    
    // Mark claimed
    await db.update(invitesTable)
      .set({ 
        status: "claimed",
        inviteeId: req.user!.id,
        claimedAt: new Date().toISOString()
      })
      .where(eq(invitesTable.id, invite.id));
      
    // Credit inviter (example of referral reward logic)
    // Could add points to wallet here

    res.json({ success: true, message: "Invite claimed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to claim invite code" });
  }
});

export const inviteRoutes = router;
