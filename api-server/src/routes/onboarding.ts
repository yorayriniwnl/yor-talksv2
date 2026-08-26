import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { usersTable, userTopicsTable, topicsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { validateBody } from "../middlewares/validation.js";
import { createResponse } from "../utils/response.js";

const router = Router();
const onboardingSchema = z.object({
  interests: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  followedCreatorIds: z.array(z.string().uuid()).max(50).default([]),
});

router.post("/complete", authenticate, validateBody(onboardingSchema), async (req, res) => {
  try {
    const { interests, followedCreatorIds } = req.body;
    
    // Process Interests
    if (interests && Array.isArray(interests)) {
      // Create topics if they don't exist and link them
      for (const name of interests) {
        let topic = await db.query.topicsTable.findFirst({ where: eq(topicsTable.name, name) });
        if (!topic) {
          topic = {
            id: randomUUID(),
            name,
            category: 'general',
            description: null,
            createdAt: new Date().toISOString()
          };
          await db.insert(topicsTable).values(topic);
        }
        
        await db.insert(userTopicsTable).values({
          userId: req.user!.id,
          topicId: topic.id,
          affinityScore: 75,
          type: 'interest',
          createdAt: new Date().toISOString()
        }).onConflictDoNothing();
      }
    }
    
    // Follow relationships are stored by the same repository used by the users API.
    if (followedCreatorIds && Array.isArray(followedCreatorIds)) {
      const { UserRepository } = await import("../repositories/user-repository.js");
      const userRepository = new UserRepository();
      for (const targetId of followedCreatorIds) {
        if (typeof targetId === "string" && targetId !== req.user!.id && await userRepository.findById(targetId)) {
          await userRepository.followUser(req.user!.id, targetId);
        }
      }
    }
    
    // The current schema has no dedicated onboarding column. Persist the state
    // in the user's JSON settings so it survives without schema drift.
    const [user] = await db.select({ settings: usersTable.settings }).from(usersTable).where(eq(usersTable.id, req.user!.id));
    const settings = (user?.settings ?? {}) as Record<string, unknown>;
    await db.update(usersTable)
      .set({ settings: { ...settings, onboardingCompleted: true } })
      .where(eq(usersTable.id, req.user!.id));

    res.json(createResponse("Onboarding completed", null));
  } catch (err) {
    res.status(500).json(createResponse("Failed to complete onboarding", null, {}, ["Onboarding could not be saved"]));
  }
});

export const onboardingRoutes = router;
