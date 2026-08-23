import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  usersTable,
  postsTable,
  videosTable,
  communitiesTable,
  eventsTable,
  productsTable,
  articlesTable,
  storiesTable,
  liveStreamsTable
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";

const GENRES = [
  { prefix: "tech", label: "AI, Quantum Computing & Neural Systems", emoji: "🤖", tags: ["tech", "ai", "quantum", "coding"] },
  { prefix: "bolly", label: "Bollywood, Cinema & OTT Dramas", emoji: "🎬", tags: ["bollywood", "cinema", "entertainment", "actors"] },
  { prefix: "cric", label: "Cricket, IPL & Athletic Performance", emoji: "🏏", tags: ["cricket", "ipl", "sports", "fitness"] },
  { prefix: "cul", label: "Indian & Global Haute Gastronomy", emoji: "🧑‍🍳", tags: ["food", "culinary", "michelin", "recipes"] },
  { prefix: "wood", label: "Woodworking, Joinery & Bespoke Furniture", emoji: "🪚", tags: ["woodworking", "carpentry", "crafts"] },
  { prefix: "cos", label: "Cosplay, Props & Anime Culture", emoji: "🎭", tags: ["cosplay", "anime", "otaku", "manga"] },
  { prefix: "cryp", label: "Web3, Zero-Knowledge & Cryptoeconomics", emoji: "🪙", tags: ["crypto", "web3", "defi", "blockchain"] },
  { prefix: "fit", label: "Powerlifting, Hyrox & Calisthenics", emoji: "🏋️", tags: ["fitness", "bodybuilding", "calisthenics", "health"] },
  { prefix: "mag", label: "Illusion, Magic & Sleight of Hand", emoji: "🎩", tags: ["magic", "illusion", "mentalism"] },
  { prefix: "farm", label: "Hydroponics, Permaculture & Organic Farms", emoji: "🌱", tags: ["farming", "agriculture", "organic", "plants"] },
  { prefix: "fin", label: "Venture Capital, Fintech & Wealth Creation", emoji: "📈", tags: ["finance", "investing", "startups", "wealth"] },
  { prefix: "trav", label: "Himalayan Treks & Global Exploration", emoji: "🌍", tags: ["travel", "mountains", "wanderlust", "adventure"] },
  { prefix: "indie", label: "Indie Game Dev, Unreal Engine & Pixel Art", emoji: "🕹️", tags: ["gamedev", "indiegame", "unrealengine", "pixelart"] },
  { prefix: "pot", label: "Studio Ceramics, Pottery & Glass Art", emoji: "🏺", tags: ["pottery", "ceramics", "art", "crafts"] },
  { prefix: "watch", label: "Horology, Automatic Movements & Watchmaking", emoji: "⌚", tags: ["watches", "horology", "luxury", "mechanics"] },
  { prefix: "mar", label: "Marine Biology, Deep Sea & Coral Reefs", emoji: "🦈", tags: ["marine", "ocean", "diving", "wildlife"] },
  { prefix: "aero", label: "ISRO Space Missions & Jet Propulsion", emoji: "🚀", tags: ["aerospace", "space", "isro", "physics"] },
  { prefix: "fash", label: "High Street Fashion, Streetwear & Sarees", emoji: "👗", tags: ["fashion", "streetwear", "style", "design"] },
  { prefix: "mind", label: "Vedic Meditation, Sound Baths & Yoga", emoji: "🧘", tags: ["yoga", "mindfulness", "meditation", "wellness"] },
  { prefix: "hema", label: "Historical Swordsmanship & HEMA", emoji: "⚔️", tags: ["martialarts", "hema", "swords", "history"] },
  { prefix: "min", label: "Miniature Painting, Gunpla & Dioramas", emoji: "🖌️", tags: ["gunpla", "miniatures", "painting", "hobby"] },
  { prefix: "rpg", label: "Dungeons & Dragons, Tabletop & Strategy", emoji: "🎲", tags: ["ttrpg", "dnd", "boardgames", "strategy"] },
  { prefix: "vfx", label: "Houdini FX, NeRFs & Gaussian Splatting", emoji: "✨", tags: ["vfx", "cgi", "3dart", "houdini"] },
  { prefix: "arch", label: "Sustainable Architecture & Brutalism", emoji: "🏢", tags: ["architecture", "design", "urban", "interiors"] },
  { prefix: "bot", label: "Rare Tropical Plants & Indoor Jungles", emoji: "🌿", tags: ["plants", "botany", "urbanjungle", "nature"] },
  { prefix: "auto", label: "Supercars, JDM Tuning & Hypercars", emoji: "🏎️", tags: ["cars", "supercars", "jdm", "motorsport"] },
  { prefix: "dj", label: "Electronic Music, Synthesizers & DJing", emoji: "🎛️", tags: ["edm", "techno", "musicproduction", "dj"] },
  { prefix: "knit", label: "Artisanal Textiles, Embroidery & Weaving", emoji: "🧶", tags: ["textiles", "embroidery", "weaving", "handmade"] },
  { prefix: "surf", label: "Goa & Andaman Big Wave Surfing", emoji: "🏄", tags: ["surfing", "ocean", "beaches", "extreme"] },
  { prefix: "climb", label: "Bouldering, Lead Climbing & Alpine Peaks", emoji: "🧗", tags: ["climbing", "bouldering", "mountaineering"] },
  { prefix: "hist", label: "Ancient Indian Architecture & Heritage", emoji: "🏛️", tags: ["history", "heritage", "monuments", "culture"] },
  { prefix: "phil", label: "Modern Stoicism, Epistemology & Logic", emoji: "🦉", tags: ["philosophy", "wisdom", "books", "thinking"] },
  { prefix: "astrol", label: "Vedic Astrology, Astronomy & Cosmic Rhythms", emoji: "🔮", tags: ["astronomy", "cosmos", "stars", "zodiac"] },
  { prefix: "makeup", label: "Prosthetics, SFX Makeup & Bridal Art", emoji: "💄", tags: ["makeup", "beauty", "sfx", "artistry"] },
  { prefix: "sneaker", label: "Sneakerhead Culture, Drops & Restorations", emoji: "👟", tags: ["sneakers", "kicks", "nike", "streetstyle"] },
  { prefix: "synth", label: "Modular Eurorack & Darkwave Synths", emoji: "🎹", tags: ["eurorack", "synthesizer", "ambient", "sounddesign"] },
  { prefix: "tattoo", label: "Fine-Line, Geometric & Tribal Tattoos", emoji: "🖋️", tags: ["tattoo", "ink", "tattooart", "bodyart"] },
  { prefix: "skate", label: "Street Skateboarding, Vert & Rails", emoji: "🛹", tags: ["skateboarding", "skate", "skatelife"] },
  { prefix: "coffee", label: "Chikmagalur Specialty Coffee & Pour-Overs", emoji: "☕", tags: ["coffee", "barista", "espresso", "pourover"] },
  { prefix: "tea", label: "Darjeeling First Flush & Assam Oolong", emoji: "🍵", tags: ["tea", "chai", "darjeeling", "ceremony"] },
  { prefix: "photo", label: "Medium Format Leica & Street Photography", emoji: "📷", tags: ["photography", "leica", "streetphoto", "film"] },
  { prefix: "paint", label: "Modern Abstract Acrylic & Canvas Art", emoji: "🎨", tags: ["art", "painting", "acrylic", "gallery"] },
  { prefix: "poetry", label: "Urdu Shayari & Contemporary Spoken Word", emoji: "🎤", tags: ["poetry", "shayari", "spokenword", "literature"] },
  { prefix: "asmr", label: "Spatial Audio, Binaural Soundscapes & Rain", emoji: "🎧", tags: ["asmr", "audio", "relaxation", "sleep"] },
  { prefix: "bush", label: "Western Ghats Bushcraft & Survival Skills", emoji: "🏕️", tags: ["survival", "bushcraft", "camping", "outdoors"] },
  { prefix: "black", label: "Wootz Crucible Steel & Custom Knifemaking", emoji: "⚒️", tags: ["blacksmith", "metalwork", "knives", "forging"] },
  { prefix: "jewel", label: "Kundan, Polki & High Fine Jewelry", emoji: "💎", tags: ["jewelry", "diamonds", "gold", "gems"] },
  { prefix: "bird", label: "Bharatpur Bird Sanctuary & Wildlife", emoji: "🦅", tags: ["birds", "wildlife", "nature", "safari"] },
  { prefix: "drone", label: "FPV Cinelifters & Autonomous Quadcopters", emoji: "🚁", tags: ["fpv", "drones", "cinematography", "aerial"] },
  { prefix: "robot", label: "Humanoid Robotics, ROS2 & Quadruped AI", emoji: "🦾", tags: ["robotics", "ros", "ai", "hardware"] }
];

const FIRST_NAMES = [
  "Aarav", "Ananya", "Rohan", "Diya", "Vihaan", "Ishita", "Aditya", "Tara", "Kabir", "Meera",
  "Siddharth", "Zoya", "Arjun", "Kavya", "Dev", "Rhea", "Reyansh", "Pooja", "Varun", "Tanvi",
  "Sameer", "Nisha", "Vikram", "Sneha", "Karan", "Simran", "Aryan", "Pari", "Dhruv", "Avani",
  "Neil", "Ira", "Kunal", "Maya", "Manish", "Shreya", "Nikhil", "Aadhya", "Rahul", "Priya",
  "Akash", "Ritu", "Alok", "Sunita", "Harsh", "Bhavna", "Gaurav", "Divya", "Pranav", "Natasha"
];

const LAST_NAMES = [
  "Sharma", "Patel", "Verma", "Singh", "Reddy", "Rao", "Nair", "Desai", "Joshi", "Iyer",
  "Chopra", "Kapoor", "Bhatia", "Malhotra", "Mehta", "Saxena", "Sen", "Roy", "Banerjee", "Dutta",
  "Aggarwal", "Gupta", "Mishra", "Trivedi", "Pandey", "Chatterjee", "Mukherjee", "Das", "Menon", "Pillai"
];

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=256&auto=format&fit=crop"
];

const COVERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600861194942-f883de0dfe96?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1574015974293-817f0ebebb74?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?q=80&w=1200&auto=format&fit=crop"
];

const VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-with-flying-cars-41551-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-41552-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41554-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-game-animation-of-a-character-running-42996-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-dj-mixing-music-in-a-club-41555-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-spinning-around-the-earth-29351-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-animation-of-futuristic-devices-99786-large.mp4"
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function runUltraSeed() {
  console.log("🌟 INITIATING ULTRA-MASSIVE META-SCALE SEED (PostgreSQL)...");

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const createdUserIds: string[] = [];
  const TOTAL_USERS = 600;
  const POSTS_PER_USER = 8;
  const VIDEOS_PER_USER = 6;

  console.log(`\n1. Creating ${TOTAL_USERS} diverse creators & profiles across 50+ genres...`);
  
  const userBatches: any[] = [];
  for (let i = 0; i < TOTAL_USERS; i++) {
    const genre = GENRES[i % GENRES.length];
    const fName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lName = LAST_NAMES[(i * 3 + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
    const username = `${fName.toLowerCase()}_${genre.prefix}_${randomInt(100, 99999)}`;
    const id = randomUUID();
    createdUserIds.push(id);

    userBatches.push({
      id,
      email: `${username}@yortalks.in`,
      username,
      passwordHash,
      fullName: `${fName} ${lName}`,
      bio: `Creator & Leader in ${genre.label} ${genre.emoji} · Building the future of Indian creator economy.`,
      avatarUrl: AVATARS[i % AVATARS.length],
      role: i < 10 ? "founder" : (i < 50 ? "moderator" : "user"),
      createdAt: new Date(Date.now() - randomInt(10000000, 5000000000)).toISOString(),
      updatedAt: new Date().toISOString(),
      followers: [],
      following: [],
      settings: { theme: "dark", notificationsEnabled: true, language: "en-IN" },
      devices: [],
      blockedUsers: [],
      mutedUsers: [],
      privacy: { profileVisibility: "public", allowDmFromStrangers: true },
      emailVerified: true
    });
  }

  // Batch insert users in chunks of 100
  for (let c = 0; c < userBatches.length; c += 100) {
    const chunk = userBatches.slice(c, c + 100);
    await db.insert(usersTable).values(chunk).onConflictDoNothing();
    process.stdout.write(`...inserted ${Math.min(c + 100, userBatches.length)}/${TOTAL_USERS} users\r`);
  }
  console.log(`\n✅ ${TOTAL_USERS} Users Created.`);

  console.log(`\n2. Generating ${TOTAL_USERS * POSTS_PER_USER} Feed Posts across all genres...`);
  const postBatches: any[] = [];
  
  for (let uIdx = 0; uIdx < createdUserIds.length; uIdx++) {
    const uid = createdUserIds[uIdx];
    const genre = GENRES[uIdx % GENRES.length];

    for (let p = 0; p < POSTS_PER_USER; p++) {
      const templates = [
        `Major breakthrough in ${genre.label}! We just optimized our workflow and the results are mindblowing. What do you think? ${genre.emoji} #${genre.tags.join(" #")}`,
        `Dropped a brand new deep-dive showcase on ${genre.label}. Check out the live stats and breakdown! 🚀✨ #${genre.tags[0]} #yortalks #creators`,
        `Nothing compares to the relentless pursuit of perfection in ${genre.label}. Late night session paying off! ⚡🔥 #${genre.tags.join(" #")}`,
        `Live update from the studio: experimenting with new methods for ${genre.label}. The community feedback has been incredible! 🙌❤️ #${genre.tags[1] || "trending"}`,
        `Exclusive early preview for my Yor Talks followers in the ${genre.label} space. Full breakdown coming tomorrow! 💎✨ #${genre.tags.join(" #")}`,
        `Why traditional methods in ${genre.label} are failing in 2026 and how next-gen tools are changing the game. Thread below 👇 🧵 #${genre.tags[0]}`,
        `Milestone reached! Thank you to everyone supporting my journey in ${genre.label}. We are just getting started! 🏆🎉 #${genre.tags.join(" #")}`,
        `Quick question for all ${genre.label} builders and enthusiasts: What is the biggest roadblock you are facing right now? Drop a comment! 💬👇`
      ];

      postBatches.push({
        id: randomUUID(),
        authorId: uid,
        content: templates[p % templates.length],
        images: Math.random() > 0.35 ? [randomChoice(COVERS)] : [],
        likedBy: createdUserIds.slice(0, randomInt(5, 50)),
        bookmarkedBy: createdUserIds.slice(0, randomInt(1, 15)),
        comments: [],
        shareCount: randomInt(10, 500),
        score: randomInt(50, 2500),
        tags: genre.tags,
        createdAt: new Date(Date.now() - randomInt(100000, 1000000000)).toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  for (let c = 0; c < postBatches.length; c += 200) {
    const chunk = postBatches.slice(c, c + 200);
    await db.insert(postsTable).values(chunk).onConflictDoNothing();
    process.stdout.write(`...inserted ${Math.min(c + 200, postBatches.length)}/${postBatches.length} posts\r`);
  }
  console.log(`\n✅ ${postBatches.length} Posts Generated.`);

  console.log(`\n3. Generating ${TOTAL_USERS * VIDEOS_PER_USER} Short-Form Reels & Videos...`);
  const videoBatches: any[] = [];
  for (let uIdx = 0; uIdx < createdUserIds.length; uIdx++) {
    const uid = createdUserIds[uIdx];
    const genre = GENRES[uIdx % GENRES.length];

    for (let v = 0; v < VIDEOS_PER_USER; v++) {
      const titles = [
        `How to master ${genre.label} in 60 seconds ${genre.emoji}`,
        `Insane ${genre.label} demo live from Mumbai studio! 🔥`,
        `Watch till the end: Secret technique in ${genre.label} 🤯`,
        `${genre.label} Masterclass 2026 | Episode #${v + 1} ⚡`,
        `Top 3 mistakes everyone makes in ${genre.label} ❌`,
        `Unfiltered behind-the-scenes in ${genre.label} 🎥`
      ];

      videoBatches.push({
        id: randomUUID(),
        authorId: uid,
        title: titles[v % titles.length],
        type: "short",
        videoUrl: randomChoice(VIDEOS),
        thumbnailUrl: randomChoice(COVERS),
        views: randomInt(15000, 2500000),
        likedBy: createdUserIds.slice(0, randomInt(20, 120)),
        createdAt: new Date(Date.now() - randomInt(100000, 1500000000)).toISOString(),
      });
    }
  }

  for (let c = 0; c < videoBatches.length; c += 200) {
    const chunk = videoBatches.slice(c, c + 200);
    await db.insert(videosTable).values(chunk).onConflictDoNothing();
    process.stdout.write(`...inserted ${Math.min(c + 200, videoBatches.length)}/${videoBatches.length} reels\r`);
  }
  console.log(`\n✅ ${videoBatches.length} Reels & Videos Generated.`);

  console.log(`\n4. Generating 100+ Communities across every genre...`);
  const communityBatches: any[] = [];
  for (let g = 0; g < GENRES.length; g++) {
    const genre = GENRES[g];
    const ownerId = createdUserIds[g % createdUserIds.length];

    communityBatches.push({
      id: randomUUID(),
      name: `${genre.label} Club ${genre.emoji}`,
      slug: `${genre.prefix}-creators-club`,
      description: `The premier Indian & global community hub for ${genre.label} enthusiasts, researchers, and creators.`,
      ownerId,
      moderators: [ownerId, createdUserIds[(g + 1) % createdUserIds.length]],
      memberIds: createdUserIds.slice(0, randomInt(30, 200)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    communityBatches.push({
      id: randomUUID(),
      name: `${genre.label} Mastermind & Pro Lounge`,
      slug: `${genre.prefix}-pro-lounge`,
      description: `Advanced roundtable discussions, collaborative projects, and live mentorship for ${genre.label}.`,
      ownerId: createdUserIds[(g + 2) % createdUserIds.length],
      moderators: [ownerId],
      memberIds: createdUserIds.slice(0, randomInt(20, 150)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  for (let c = 0; c < communityBatches.length; c += 50) {
    const chunk = communityBatches.slice(c, c + 50);
    await db.insert(communitiesTable).values(chunk).onConflictDoNothing();
  }
  console.log(`✅ ${communityBatches.length} Communities Created.`);

  console.log(`\n5. Generating 100+ Events & Hackathons...`);
  const eventBatches: any[] = [];
  for (let i = 0; i < 80; i++) {
    const genre = GENRES[i % GENRES.length];
    const hostId = createdUserIds[i % createdUserIds.length];

    eventBatches.push({
      id: randomUUID(),
      hostId,
      title: `${genre.label} Global Conclave & Hackathon 2026`,
      description: `Join thousands of creators in ${genre.label} for a multi-day hybrid event featuring keynotes, workshops, and ₹50,00,000 in prizes!`,
      coverUrl: randomChoice(COVERS),
      category: genre.tags[0],
      startsAt: new Date(Date.now() + (i + 1) * 86400000 * 2).toISOString(),
      location: i % 2 === 0 ? "Bengaluru International Exhibition Centre (BIEC)" : "Virtual Main Stage Live Stream",
      isOnline: i % 2 !== 0,
      attendeeIds: createdUserIds.slice(0, randomInt(25, 100)),
      interestedIds: createdUserIds.slice(0, randomInt(40, 150)),
      rsvpStatus: "going"
    });
  }
  await db.insert(eventsTable).values(eventBatches).onConflictDoNothing();
  console.log(`✅ ${eventBatches.length} Events Created.`);

  console.log(`\n6. Generating Marketplace Products & Collectibles...`);
  const productBatches: any[] = [];
  for (let i = 0; i < 100; i++) {
    const genre = GENRES[i % GENRES.length];
    const sellerId = createdUserIds[i % createdUserIds.length];

    productBatches.push({
      id: randomUUID(),
      sellerId,
      title: `Exclusive ${genre.label} Pro Kit & Gear #${i + 1}`,
      description: `Bespoke artisanal grade equipment for ${genre.label}. Handcrafted and serialized limited edition.`,
      price: randomInt(1500, 85000),
      images: [randomChoice(COVERS)],
      category: genre.tags[0],
      condition: "new",
      savedBy: createdUserIds.slice(0, randomInt(5, 30)),
      createdAt: new Date().toISOString()
    });
  }
  await db.insert(productsTable).values(productBatches).onConflictDoNothing();
  console.log(`✅ ${productBatches.length} Products Created.`);

  console.log(`\n7. Generating Long-Form Articles & Stories...`);
  const articleBatches: any[] = [];
  for (let i = 0; i < 60; i++) {
    const genre = GENRES[i % GENRES.length];
    const authorId = createdUserIds[i % createdUserIds.length];

    articleBatches.push({
      id: randomUUID(),
      authorId,
      title: `The Comprehensive Guide to ${genre.label} in the Modern Era`,
      excerpt: `A detailed exploration of how Indian innovators and creators are revolutionizing ${genre.label} at global scale.`,
      content: `# Exploring ${genre.label}\n\nOver the past decade, ${genre.label} has transformed from a niche domain into a powerhouse of cultural and technological impact.\n\n## Key Trends\n1. Autonomous integration\n2. Real-time community collaboration\n3. High-throughput monetization\n\nStay tuned for our upcoming deep-dive workshop series on Yor Talks!`,
      coverUrl: randomChoice(COVERS),
      readTime: randomInt(4, 12),
      claps: randomInt(100, 8500),
      createdAt: new Date(Date.now() - randomInt(100000, 1000000000)).toISOString(),
      collection: genre.tags[0]
    });
  }
  await db.insert(articlesTable).values(articleBatches).onConflictDoNothing();
  console.log(`✅ ${articleBatches.length} Articles Created.`);

  console.log(`\n8. Generating 200+ Live Stories & Highlights...`);
  const storyBatches: any[] = [];
  for (let i = 0; i < 150; i++) {
    const authorId = createdUserIds[i % createdUserIds.length];
    const genre = GENRES[i % GENRES.length];

    storyBatches.push({
      id: randomUUID(),
      authorId,
      mediaUrl: randomChoice(COVERS),
      type: "image",
      textContent: `Live from ${genre.label} meetup! ✨ #yortalks`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      viewerIds: createdUserIds.slice(0, randomInt(10, 80)),
      reactions: [],
      isHighlight: i % 4 === 0,
      highlightTitle: i % 4 === 0 ? `${genre.prefix.toUpperCase()} Moments` : null
    });
  }
  await db.insert(storiesTable).values(storyBatches).onConflictDoNothing();
  console.log(`✅ ${storyBatches.length} Stories Created.`);

  console.log(`\n✨ =========================================================`);
  console.log(`🎉 ULTRA-MASSIVE META-SCALE DATABASE SEED COMPLETED!`);
  console.log(`📊 TOTAL RECORDS SEEDED:`);
  console.log(`   - Profiles / Users: ${TOTAL_USERS}`);
  console.log(`   - Feed Posts: ${postBatches.length}`);
  console.log(`   - Short-Form Reels: ${videoBatches.length}`);
  console.log(`   - Communities: ${communityBatches.length}`);
  console.log(`   - Events & Hackathons: ${eventBatches.length}`);
  console.log(`   - Marketplace Products: ${productBatches.length}`);
  console.log(`   - Articles: ${articleBatches.length}`);
  console.log(`   - Stories: ${storyBatches.length}`);
  console.log(`========================================================= ✨`);
  process.exit(0);
}

runUltraSeed().catch(console.error);
