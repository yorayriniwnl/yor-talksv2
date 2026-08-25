import {
  db,
  usersTable,
  postsTable,
  communitiesTable,
  eventsTable,
  productsTable,
  articlesTable,
  videosTable,
  liveStreamsTable,
  storiesTable,
  notificationsTable,
  conversationsTable,
  messagesTable
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

async function seedDatabase() {
  console.log("🌱 Starting full database seed...");

  const defaultPasswordHash = await bcrypt.hash("password123", 10);
  const adminPasswordHash = await bcrypt.hash("yorayriniwnl", 10);

  const users = [
    {
      id: randomUUID(),
      username: "yorayriniwnl",
      email: "2329001@kiit.ac.in",
      passwordHash: adminPasswordHash,
      fullName: "Ayush Roy",
      bio: "Founder & Full-Stack Architect @ Yor Talks. Building ambient systems, spatial computing tools, and high-performance product surfaces. 🚀⚡",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop",
      role: "founder"
    },
    {
      id: randomUUID(),
      username: "anyaa_yaps",
      email: "2329002@kiit.ac.in",
      passwordHash: defaultPasswordHash,
      fullName: "Anya",
      bio: "3D World Builder & Unreal Engine 5.4 Enthusiast 🎮✨ Exploring procedural environments, volumetric lighting & shader graphs.",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop",
      role: "creator"
    },
    {
      id: randomUUID(),
      username: "aditi_cofounder",
      email: "2329003@kiit.ac.in",
      passwordHash: defaultPasswordHash,
      fullName: "Aditi Singh",
      bio: "Co-Founder @ Yor Talks & Yor Zenith 🌌 Multimodal AI, community ecosystems & modern aesthetics. Organizing Global Hackathon 2026!",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop",
      role: "co-founder"
    },
    {
      id: randomUUID(),
      username: "marcus_ai",
      email: "2329004@kiit.ac.in",
      passwordHash: defaultPasswordHash,
      fullName: "Marcus Vance",
      bio: "AI Researcher & Spatial Computing Lead 🤖 Neuromorphic architecture, world models & real-time perception.",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop",
      role: "researcher"
    },
    {
      id: randomUUID(),
      username: "sophia_ui",
      email: "2329005@kiit.ac.in",
      passwordHash: defaultPasswordHash,
      fullName: "Sophia Chen",
      bio: "Design Systems Lead @ Multiverse Studio. Minimalist typography, micro-interactions & tactile interfaces. ☕📐",
      avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop",
      role: "designer"
    }
  ];

  const userMap: Record<string, string> = {};

  for (const u of users) {
    try {
      await db.insert(usersTable).values({
        id: u.id,
        username: u.username,
        email: u.email,
        passwordHash: u.passwordHash,
        fullName: u.fullName,
        bio: u.bio,
        avatarUrl: u.avatarUrl,
        role: u.role,
        permissions: ["read:profile", "write:post", "moderate:community"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: { theme: "dark", notificationsEnabled: true },
        devices: [],
        blockedUsers: [],
        mutedUsers: [],
        privacy: { profileVisibility: "public", allowDmFromStrangers: true }
      });
      userMap[u.username] = u.id;
      console.log(`✅ Seeded user: @${u.username}`);
    } catch (err: any) {
      console.log(`⚠️ User @${u.username} already present or skipped: ${err.message}`);
    }
  }

  const founderId = userMap["yorayriniwnl"] || users[0].id;
  const anyaId = userMap["anyaa_yaps"] || users[1].id;
  const aditiId = userMap["aditi_cofounder"] || users[2].id;
  const marcusId = userMap["marcus_ai"] || users[3].id;
  const sophiaId = userMap["sophia_ui"] || users[4].id;

  // Seed Posts
  const posts = [
    {
      id: randomUUID(),
      authorId: anyaId,
      content: "Just finished rendering the main biome for our upcoming open-world game! 🚀 Built with Unreal Engine 5.4 Nanite & Lumen.",
      images: [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600861194942-f883de0dfe96?q=80&w=1200&auto=format&fit=crop"
      ],
      likesCount: 2,
      commentsCount: 0,
      bookmarksCount: 1,
      shareCount: 42,
      score: 100,
      tags: ["unrealengine", "gamedev", "spatial"],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: randomUUID(),
      authorId: founderId,
      content: "Just deployed the 10/10 Peak UI overhaul on Yor Talks! 🌟 3D perspective tilt cards, cursor-guided ambient illumination, and physics-based magnetic controls.",
      images: [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"
      ],
      likesCount: 4,
      commentsCount: 0,
      bookmarksCount: 2,
      shareCount: 120,
      score: 250,
      tags: ["design", "multiverse", "uiux"],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: randomUUID(),
      authorId: aditiId,
      content: "Excited to announce our upcoming Multiverse Global Hackathon 2026! 🚀 Over $50,000 in bounties for open-source AI agents and spatial UI widgets.",
      images: [
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop"
      ],
      likesCount: 2,
      commentsCount: 0,
      bookmarksCount: 1,
      shareCount: 88,
      score: 180,
      tags: ["hackathon", "bounties", "ai"],
      createdAt: new Date(Date.now() - 14400000).toISOString(),
      updatedAt: new Date(Date.now() - 14400000).toISOString()
    }
  ];

  for (const p of posts) {
    try {
      await db.insert(postsTable).values(p);
      console.log(`✅ Seeded post: ${p.id.slice(0, 8)}...`);
    } catch (err: any) {
      console.log(`⚠️ Post skipped: ${err.message}`);
    }
  }

  // Seed Communities
  const communities = [
    {
      id: randomUUID(),
      name: "Spatial Computing & XR",
      slug: "spatial-computing-xr",
      description: "The frontier of WebXR, Apple Vision Pro, Meta Quest, and 3D spatial computing interfaces.",
      ownerId: founderId,
      moderators: [founderId, anyaId],
      memberIds: [founderId, anyaId, marcusId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: randomUUID(),
      name: "Generative AI & World Models",
      slug: "generative-ai-world-models",
      description: "Deep discussions, research papers, and code implementations for multi-modal AI.",
      ownerId: marcusId,
      moderators: [marcusId, aditiId],
      memberIds: [founderId, anyaId, aditiId, marcusId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  for (const c of communities) {
    try {
      await db.insert(communitiesTable).values(c);
      console.log(`✅ Seeded community: ${c.name}`);
    } catch (err: any) {
      console.log(`⚠️ Community skipped: ${err.message}`);
    }
  }

  // Seed Events
  const events = [
    {
      id: randomUUID(),
      hostId: aditiId,
      title: "Multiverse Global Hackathon 2026",
      description: "48-hour global online hackathon building spatial AI agents. $50k prize pool.",
      coverUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1000&auto=format&fit=crop",
      category: "Hackathon",
      startsAt: new Date(Date.now() + 604800000).toISOString(),
      location: "Virtual Stage 1",
      isOnline: true,
      attendeeIds: [founderId, anyaId, marcusId],
      interestedIds: [sophiaId],
      rsvpStatus: "going"
    }
  ];

  for (const ev of events) {
    try {
      await db.insert(eventsTable).values(ev);
      console.log(`✅ Seeded event: ${ev.title}`);
    } catch (err: any) {
      console.log(`⚠️ Event skipped: ${err.message}`);
    }
  }

  // Seed Products
  const products = [
    {
      id: randomUUID(),
      sellerId: founderId,
      title: "Cyber Anodized 65% Aluminum Mechanical Keyboard",
      description: "Handcrafted custom mechanical keyboard with CNC milled 6063 aluminum body.",
      price: 349,
      images: [
        "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=1000&auto=format&fit=crop"
      ],
      category: "Hardware",
      condition: "new",
      savedBy: [anyaId],
      createdAt: new Date().toISOString()
    }
  ];

  for (const pr of products) {
    try {
      await db.insert(productsTable).values(pr);
      console.log(`✅ Seeded product: ${pr.title}`);
    } catch (err: any) {
      console.log(`⚠️ Product skipped: ${err.message}`);
    }
  }

  // Seed Articles
  const articles = [
    {
      id: randomUUID(),
      authorId: founderId,
      title: "Designing for the Multiverse: Fluid Micro-Interactions & Spatial Polish",
      excerpt: "How we engineered a 10/10 peak UI design system featuring 3D perspective cards.",
      content: "When building modern interactive platforms, visual polish is not decorative afterthought...",
      coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
      readTime: 6,
      claps: 1420,
      collection: "Engineering & Design",
      createdAt: new Date().toISOString()
    }
  ];

  for (const ar of articles) {
    try {
      await db.insert(articlesTable).values(ar);
      console.log(`✅ Seeded article: ${ar.title}`);
    } catch (err: any) {
      console.log(`⚠️ Article skipped: ${err.message}`);
    }
  }

  // Seed Notifications
  const notifications = [
    {
      id: randomUUID(),
      recipientId: founderId,
      type: "like",
      title: "New Post Reaction",
      message: "Anya liked your post 'Designing for the Multiverse'.",
      channel: "in_app",
      createdAt: new Date().toISOString()
    }
  ];

  for (const notif of notifications) {
    try {
      await db.insert(notificationsTable).values(notif);
      console.log(`✅ Seeded notification: ${notif.title}`);
    } catch (err: any) {
      console.log(`⚠️ Notification skipped: ${err.message}`);
    }
  }

  console.log("✨ Full database seed script completed successfully!");
  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
