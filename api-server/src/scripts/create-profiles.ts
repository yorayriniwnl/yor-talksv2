import { db, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

async function createProfiles() {
  const usersToCreate = [
    {
      username: "yorayriniwnl",
      email: "yorayriniwnl@example.com",
      password: "yorayriniwnl",
      fullName: "Ayush Roy",
      role: "founder"
    },
    {
      username: "aditisingh",
      email: "aditi@example.com",
      password: "aditisingh",
      fullName: "Aditi Singh",
      role: "co-founder"
    }
  ];

  for (const user of usersToCreate) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    
    try {
      await db.insert(usersTable).values({
        id: randomUUID(),
        username: user.username,
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        bio: user.role === "founder" ? "Founder" : "Co-founder",
        role: user.role,
        permissions: ["read:profile", "write:post"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          theme: "light",
          notificationsEnabled: true,
          privateAccount: false,
          allowMentions: true,
        },
        devices: [],
        blockedUsers: [],
        mutedUsers: [],
        privacy: {
          profileVisibility: "public",
          messageRequests: true,
          allowDmFromStrangers: true,
        },
      });
      console.log(`Created user: ${user.username}`);
    } catch (err: any) {
      if (err.code === '23505') { // Unique violation
        console.log(`User ${user.username} already exists.`);
      } else {
        console.error(`Failed to create user ${user.username}:`, err);
      }
    }
  }
  process.exit(0);
}

createProfiles().catch(console.error);
