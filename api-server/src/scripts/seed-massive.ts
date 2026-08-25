import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  usersTable,
  postsTable,
  videosTable,
  communitiesTable,
  eventsTable,
  productsTable,
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";

const NUM_USERS = 80;
const POSTS_PER_USER = 6;
const VIDEOS_PER_USER = 3;

const sampleNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Arjun", "Zara", "Diya", "Anya", "Kavya", "Ishita", "Rohan", "Siddharth", "Meera", "Vikram", "Ananya", "Dev", "Tara", "Kabir", "Nisha", "Sameer", "Tanvi", "Reyansh", "Pooja", "Varun", "Rhea"];
const sampleLastNames = ["Sharma", "Patel", "Singh", "Reddy", "Verma", "Rao", "Nair", "Desai", "Joshi", "Iyer", "Chopra", "Kapoor", "Bhatia", "Malhotra", "Mehta", "Saxena", "Sen", "Roy", "Banerjee", "Dutta"];
const sampleAvatars = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"
];

const sampleCovers = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600861194942-f883de0dfe96?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=1200&auto=format&fit=crop"
];

const sampleVideoUrls = [
  "https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-41551-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-41552-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41554-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-game-animation-of-a-character-running-42996-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-dj-mixing-music-in-a-club-41555-large.mp4"
];

const sampleMusicThumbnails = [
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=500&auto=format&fit=crop"
];

const GENRE_BIOS = [
  "AI & Neural Tech Lead · Tensor graph runtimes, WebGPU & spatial interfaces 🤖⚡",
  "Esports Pro & VCT Radiant Duelist · 1v4 Clutches & Sanwa frame traps 🏆🎮",
  "Modular Synthesist & Sound Designer · 138 BPM Eurorack live sets 🎛️🎧",
  "Cyber-Samurai 3D Concept Artist · GLSL raymarching & manga inking 🎨✨",
  "Haute Couture Pioneer · Bioluminescent LED garments & techwear 👗🔬",
  "Motorsports Aerodynamicist · 20B 3-rotor rotary & CFD ground effect 🏎️💨",
  "FPV Proximity Pilot · 8K Alpine crevasse dives & robotic vision 🛸❄️",
  "Master Bladesmith & Horologist · 512-layer Damascus & tourbillon carriages ⚔️⌚",
  "Specialty Coffee Brewer · 96h Anaerobic Gesha & Gongfu tea ceremonies ☕🌸",
  "Quantum Physicist & Astrophotographer · Transmon qubits & deep-sky nebulas 🌌⚛️"
];

const GENRE_POSTS = [
  "Benchmarked our new WebGPU quantized transformer runtime — achieved 140 tokens/sec directly inside Chrome with sub-20ms first-token latency! 🤖⚡ #ai #webgpu",
  "Insane 1v4 clutch on Ascent A-site during VCT scrims tonight! Tracking is crisp at 8000Hz polling rate. Clip dropping in reels soon 🏆🎮 #esports #radiant",
  "Just patched this 138 BPM dark modular techno groove live from the flight case. Make Noise Maths into dual analog diode filters hits different 🎛️🔊 #modular #synth",
  "Finished the keyframe concept for Chapter 4: Neon rain reflections over Kyoto's cyberpunk alleys. Drawn with G-Pen and digital watercolor 🎨🖌️ #manga #3dart",
  "Runway test complete for our optical heartbeat dress: 4,000 micro-LEDs reacting to real-time spatial biometric telemetry! 👗✨ #fashiontech #wearables",
  "CFD airflow simulation for the new active DRS rear wing: 850kg downforce at 250 km/h with 18% drag reduction on the straights 🏎️💨 #motorsports #aero",
  "Diving 160 km/h down the volcanic fissure in Iceland. 6S freestyle quad with O3 Air Unit in 8K HDR! 🛸🌋 #fpv #drone",
  "Just pulled this 512-layer high-carbon Damascus broadsword from the oil quench. Zero warp, perfect temper line! ⚔️🔥 #bladesmith #damascus",
  "Cupping the new 96-hour anaerobic fermentation Gesha lot: explosive notes of white jasmine, candied peach, and bergamot ☕🌸 #specialtycoffee #pourover",
  "12 hours of exposure over the Atacama Desert resolved the ionized hydrogen filaments in the core of the Carina Nebula 🔭🌌 #astrophotography #deepspace"
];

const GENRE_VIDEO_TITLES = [
  "Spatial WebXR 90 FPS Rendering on Standalone Headsets 🤖",
  "Radiant 1v4 Clutch with Sheriff on Ascent A-Site 🏆🔥",
  "Live Eurorack Modular Synth & Dark Techno Session 🎛️⚡",
  "Unreal Engine 5.4 Nanite & Volumetric Cloud Breakdown 🎨",
  "3D Printed Voronoi TPU Midsole Sneaker High-Speed Print 👟",
  "20B 3-Rotor Bridgeport Screaming to 9,800 RPM on Dyno 🏎️",
  "8K 120 FPS FPV Dive Through Eiger Glacial Crevasse 🛸❄️",
  "1000 FPS Slow-Mo: Oil Quenching 512-Layer Damascus Blade ⚔️",
  "96h Anaerobic Gesha Pour-Over: 3-Stage Pulse Bloom ☕🌸",
  "Chilean ALMA Interferometer Radio Readout of Galactic Core 🌌"
];

async function seedMassive() {
  console.log("🚀 Starting mega-scale database seed...");
  
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const createdUserIds: string[] = [];

  console.log(`Generating ${NUM_USERS} users...`);
  for (let i = 0; i < NUM_USERS; i++) {
    const fName = sampleNames[i % sampleNames.length];
    const lName = sampleLastNames[Math.floor(Math.random() * sampleLastNames.length)];
    const username = `${fName.toLowerCase()}_${lName.toLowerCase()}_${i + 1}`;
    const id = randomUUID();

    try {
      await db.insert(usersTable).values({
        id,
        email: `${String(2300001 + i)}@kiit.ac.in`,
        username: username,
        passwordHash,
        fullName: `${fName} ${lName}`,
        bio: GENRE_BIOS[i % GENRE_BIOS.length],
        avatarUrl: sampleAvatars[i % sampleAvatars.length],
        role: i < 5 ? "founder" : "user",
        createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        updatedAt: new Date().toISOString(),
        settings: { theme: "dark", notificationsEnabled: true },
        devices: [],
        blockedUsers: [],
        mutedUsers: [],
        privacy: { profileVisibility: "public", allowDmFromStrangers: true }
      });
      createdUserIds.push(id);
    } catch (e) {
      // ignore duplicates
    }
  }
  
  if (createdUserIds.length === 0) {
    console.log("Fetching existing user IDs...");
    const existing = await db.select().from(usersTable).limit(100);
    createdUserIds.push(...existing.map(u => u.id));
  }

  console.log(`Generating feed posts across all genres...`);
  let postCount = 0;
  for (let uIdx = 0; uIdx < createdUserIds.length; uIdx++) {
    const uid = createdUserIds[uIdx];
    for (let i = 0; i < POSTS_PER_USER; i++) {
      try {
        const postContent = GENRE_POSTS[(uIdx * POSTS_PER_USER + i) % GENRE_POSTS.length];
        await db.insert(postsTable).values({
          id: randomUUID(),
          authorId: uid,
          content: postContent,
          images: Math.random() > 0.3 ? [sampleCovers[(uIdx + i) % sampleCovers.length]] : [],
          likesCount: Math.floor(Math.random() * 15),
          commentsCount: 0,
          bookmarksCount: Math.floor(Math.random() * 5),
          shareCount: Math.floor(Math.random() * 80),
          score: Math.floor(Math.random() * 500),
          tags: ["multiverse", "creators", "showcase", "2026"],
          createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
          updatedAt: new Date().toISOString()
        });
        postCount++;
      } catch(e) {}
    }
  }
  console.log(`Generated ${postCount} posts.`);

  console.log(`Generating Reels, Shorts & Audio Tracks across all genres...`);
  let videoCount = 0;
  for (let uIdx = 0; uIdx < createdUserIds.length; uIdx++) {
    const uid = createdUserIds[uIdx];
    for (let i = 0; i < VIDEOS_PER_USER; i++) {
      const vidTitle = GENRE_VIDEO_TITLES[(uIdx * VIDEOS_PER_USER + i) % GENRE_VIDEO_TITLES.length];
      const isSong = Math.random() > 0.4;
      try {
        await db.insert(videosTable).values({
          id: randomUUID(),
          authorId: uid,
          title: vidTitle,
          type: "short",
          videoUrl: sampleVideoUrls[(uIdx + i) % sampleVideoUrls.length],
          thumbnailUrl: sampleCovers[(uIdx + i) % sampleCovers.length],
          views: Math.floor(Math.random() * 450000) + 15000,
          likedBy: createdUserIds.slice(0, Math.floor(Math.random() * 35)),
          createdAt: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
        });
        videoCount++;
      } catch(e) {}
    }
  }
  console.log(`Generated ${videoCount} reels & videos.`);

  console.log(`Generating Communities...`);
  const communityCategories = ["Technology", "Art & Design", "Gaming", "Music", "Hardware", "Science", "Startups", "Fashion"];
  for (let i = 0; i < 15; i++) {
    const ownerId = createdUserIds[i % createdUserIds.length];
    try {
      await db.insert(communitiesTable).values({
        id: randomUUID(),
        name: `Multiverse Hub: ${communityCategories[i % communityCategories.length]} ${i + 1}`,
        slug: `multiverse-hub-${communityCategories[i % communityCategories.length].toLowerCase().replace(/[^a-z0-9]/g, "-")}-${i + 1}`,
        description: `Official community hub for ${communityCategories[i % communityCategories.length]} creators, builders, and enthusiasts.`,
        ownerId,
        moderators: [ownerId],
        memberIds: createdUserIds.slice(0, Math.floor(Math.random() * 30) + 5),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch(e) {}
  }

  console.log(`Generating Events & Hackathons...`);
  for (let i = 0; i < 12; i++) {
    const hostId = createdUserIds[i % createdUserIds.length];
    try {
      await db.insert(eventsTable).values({
        id: randomUUID(),
        hostId,
        title: `Global Multiverse Summit & Hackathon #${i + 1}`,
        description: `48-hour global sprint building spatial UI components, zero-latency WebRTC streams, and generative agent pipelines.`,
        coverUrl: sampleCovers[i % sampleCovers.length],
        category: "Hackathon",
        startsAt: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
        location: "Virtual Main Stage & Live Stream",
        isOnline: true,
        attendeeIds: createdUserIds.slice(0, Math.floor(Math.random() * 20) + 3),
        interestedIds: createdUserIds.slice(0, Math.floor(Math.random() * 15)),
        rsvpStatus: "going"
      });
    } catch(e) {}
  }

  console.log(`Generating Marketplace Products...`);
  for (let i = 0; i < 15; i++) {
    const sellerId = createdUserIds[i % createdUserIds.length];
    try {
      await db.insert(productsTable).values({
        id: randomUUID(),
        sellerId,
        title: `Custom Anodized CNC Mechanical Component Series #${i + 1}`,
        description: `Precision CNC milled 6063 aerospace aluminum part with mirror PVD brass weights and custom finishes.`,
        price: Math.floor(Math.random() * 400) + 50,
        images: [sampleCovers[i % sampleCovers.length]],
        category: "Hardware",
        condition: "new",
        savedBy: createdUserIds.slice(0, Math.floor(Math.random() * 10)),
        createdAt: new Date().toISOString()
      });
    } catch(e) {}
  }

  console.log("✨ Mega-scale database seed completed successfully!");
  process.exit(0);
}

seedMassive().catch(console.error);


