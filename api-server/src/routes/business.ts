import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { businessProfilesTable, businessMembersTable, usersTable, ledgerTransactionsTable } from "@workspace/db/schema";
import { randomUUID } from "node:crypto";
import { eq, or } from "drizzle-orm";

const router = Router();

// Create a Business Profile
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, industry, website, contactEmail } = req.body;
    const businessId = randomUUID();
    
    await db.insert(businessProfilesTable).values({
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
    
    // Auto-add owner as admin
    await db.insert(businessMembersTable).values({
      businessId,
      userId: req.user!.id,
      role: "admin",
      joinedAt: new Date().toISOString(),
    });
    
    // Ensure user has 'business' in accountTypes
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user!.id) });
    if (user) {
      const accountTypes = Array.isArray(user.accountTypes) ? user.accountTypes : ["user"];
      const types = new Set<string>(accountTypes);
      types.add("business");
      await db.update(usersTable)
        .set({ accountTypes: Array.from(types) })
        .where(eq(usersTable.id, req.user!.id));
    }

    res.status(201).json({ success: true, businessId });
  } catch (err) {
    res.status(500).json({ error: "Failed to create business profile" });
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
      
    res.json({ success: true, businesses });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch businesses" });
  }
});

export const businessRoutes = router;
export default router;
