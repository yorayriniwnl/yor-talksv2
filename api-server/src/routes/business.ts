import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { businessProfilesTable, businessMembersTable, usersTable, ledgerTransactionsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { createResponse } from "../utils/response.js";
import { validateBody } from "../middlewares/validation.js";
import { createBusinessSchema } from "../validators/business.js";

const router = Router();

// Create a Business Profile
router.post("/", authenticate, validateBody(createBusinessSchema), async (req, res) => {
  try {
    const { name, industry, website, contactEmail } = req.body;
    const businessId = randomUUID();
    
    await db.transaction(async (tx) => {
      await tx.insert(businessProfilesTable).values({
        id: businessId,
        ownerId: req.user!.id,
        name,
        industry: industry || "General",
        website,
        contactEmail,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await tx.insert(businessMembersTable).values({
        businessId,
        userId: req.user!.id,
        role: "admin",
        joinedAt: new Date().toISOString(),
      });
      const [user] = await tx.select({ accountTypes: usersTable.accountTypes }).from(usersTable).where(eq(usersTable.id, req.user!.id));
      const accountTypes = Array.isArray(user?.accountTypes) ? user.accountTypes : ["user"];
      await tx.update(usersTable)
        .set({ accountTypes: [...new Set([...accountTypes.map(String), "business"])] })
        .where(eq(usersTable.id, req.user!.id));
    });

    res.status(201).json(createResponse("Business profile created", { businessId }));
  } catch (err) {
    res.status(500).json(createResponse("Failed to create business profile", null, {}, ["Internal server error"]));
  }
});

// List User's Businesses
router.get("/", authenticate, async (req, res) => {
  try {
    const businesses = await db
      .select({
        id: businessProfilesTable.id,
        name: businessProfilesTable.name,
        industry: businessProfilesTable.industry,
        role: businessMembersTable.role,
        isVerified: businessProfilesTable.isVerified
      })
      .from(businessMembersTable)
      .innerJoin(businessProfilesTable, eq(businessMembersTable.businessId, businessProfilesTable.id))
      .where(eq(businessMembersTable.userId, req.user!.id));
      
    res.json(createResponse("Businesses loaded", { businesses }));
  } catch (err) {
    res.status(500).json(createResponse("Failed to fetch businesses", null, {}, ["Internal server error"]));
  }
});

export const businessRoutes = router;
export default router;
