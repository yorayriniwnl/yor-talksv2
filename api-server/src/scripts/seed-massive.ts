import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  usersTable,
  postsTable,
  videosTable,
  articlesTable,
  communitiesTable,
  eventsTable,
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";

const NUM_USERS = 50;
const POSTS_PER_USER = 5;
const VIDEOS_PER_USER = 2;

const sampleNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Zara", "Diya", "Anya", "Kavya", "Ishita"];
const sampleLastNames = ["Sharma", "Patel", "Singh", "Reddy", "Verma", "Rao", "Nair", "Desai", "Joshi", "Iyer"];
const sampleAvatars = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?q=80&w=256&auto=format&fit=crop"
];

const sampleCovers = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600861194942-f883de0dfe96?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop"
];

const sampleVideoUrls = [
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
  "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4"
];

const sampleMusicThumbnails = [
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=500&auto=format&fit=crop"
];

async function seedMassive() {
  console.log("Starting massive database seed...");
  
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const createdUserIds: string[] = [];

  console.log(`Generating ${NUM_USERS} users...`);
  for (let i = 0; i < NUM_USERS; i++) {
    const fName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const lName = sampleLastNames[Math.floor(Math.random() * sampleLastNames.length)];
    const username = `${fName.toLowerCase()}_${lName.toLowerCase()}_${i}`;
    const id = randomUUID();

    try {
      await db.insert(usersTable).values({
        id,
        email: `${username}@example.com`,
        username: username,
        passwordHash,
        fullName: `${fName} ${lName}`,
        bio: `Explorer, creator, and enthusiast. Follow my journey! (#${i})`,
        avatarUrl: sampleAvatars[i % sampleAvatars.length],
        role: "user",
        createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      });
      createdUserIds.push(id);
    } catch (e) {
      // ignore duplicates
    }
  }
  
  if (createdUserIds.length === 0) {
    console.log("No users created, fetching existing users...");
    const existing = await db.select().from(usersTable).limit(50);
    createdUserIds.push(...existing.map(u => u.id));
  }

  console.log(`Generating posts for users...`);
  let postCount = 0;
  for (const uid of createdUserIds) {
    for (let i = 0; i < POSTS_PER_USER; i++) {
      try {
        await db.insert(postsTable).values({
          id: randomUUID(),
          authorId: uid,
          content: `Just sharing my thoughts for the day! Loving the vibrant community here. #update${i}`,
          images: Math.random() > 0.5 ? [sampleCovers[Math.floor(Math.random() * sampleCovers.length)]] : [],
          score: Math.floor(Math.random() * 500),
          createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
        });
        postCount++;
      } catch(e) {}
    }
  }
  console.log(`Generated ${postCount} posts.`);

  console.log(`Generating Reels & Songs (Videos)...`);
  let videoCount = 0;
  for (const uid of createdUserIds) {
    for (let i = 0; i < VIDEOS_PER_USER; i++) {
      const isSong = Math.random() > 0.5;
      try {
        await db.insert(videosTable).values({
          id: randomUUID(),
          authorId: uid,
          title: isSong ? `Lofi Chill Track ${i}` : `Daily Vlog #${i}`,
          type: isSong ? "song" : "reel",
          videoUrl: sampleVideoUrls[Math.floor(Math.random() * sampleVideoUrls.length)],
          thumbnailUrl: isSong ? sampleMusicThumbnails[0] : sampleCovers[0],
          views: Math.floor(Math.random() * 10000),
          createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
        });
        videoCount++;
      } catch(e) {}
    }
  }
  console.log(`Generated ${videoCount} reels & songs.`);

  console.log("Massive seeding complete!");
  process.exit(0);
}

seedMassive().catch(console.error);

