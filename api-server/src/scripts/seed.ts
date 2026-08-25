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
  commentsTable,
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import parseArgs from "minimist";

// Simple PRNG (Linear Congruential Generator) for determinism
class PRNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  randomInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  randomUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = this.next() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + this.next() * (end.getTime() - start.getTime()));
  }
  boolean(chance = 0.5): boolean {
    return this.next() < chance;
  }
}

const GENRES = [
  { prefix: "tech", label: "AI, Quantum Computing & Neural Systems", tags: ["tech", "ai", "quantum", "coding", "web3"] },
  { prefix: "bolly", label: "Bollywood, Cinema & OTT Dramas", tags: ["bollywood", "cinema", "entertainment", "actors"] },
  { prefix: "cric", label: "Cricket, IPL & Athletic Performance", tags: ["cricket", "ipl", "sports", "fitness"] },
  { prefix: "cul", label: "Indian & Global Haute Gastronomy", tags: ["food", "culinary", "michelin", "recipes"] },
  { prefix: "wood", label: "Woodworking, Joinery & Bespoke Furniture", tags: ["woodworking", "carpentry", "crafts"] },
  { prefix: "cos", label: "Cosplay, Props & Anime Culture", tags: ["cosplay", "anime", "otaku", "manga"] },
  { prefix: "cryp", label: "Web3, Zero-Knowledge & Cryptoeconomics", tags: ["crypto", "web3", "defi", "blockchain"] },
  { prefix: "fit", label: "Powerlifting, Hyrox & Calisthenics", tags: ["fitness", "bodybuilding", "calisthenics", "health"] },
  { prefix: "mag", label: "Illusion, Magic & Sleight of Hand", tags: ["magic", "illusion", "mentalism"] },
  { prefix: "farm", label: "Hydroponics, Permaculture & Organic Farms", tags: ["farming", "agriculture", "organic", "plants"] },
  { prefix: "fin", label: "Venture Capital, Fintech & Wealth Creation", tags: ["finance", "investing", "startups", "wealth"] },
  { prefix: "trav", label: "Himalayan Treks & Global Exploration", tags: ["travel", "mountains", "wanderlust", "adventure"] },
  { prefix: "indie", label: "Indie Game Dev, Unreal Engine & Pixel Art", tags: ["gamedev", "indiegame", "unrealengine", "pixelart"] },
  { prefix: "pot", label: "Studio Ceramics, Pottery & Glass Art", tags: ["pottery", "ceramics", "art", "crafts"] },
  { prefix: "watch", label: "Horology, Automatic Movements & Watchmaking", tags: ["watches", "horology", "luxury", "mechanics"] },
  { prefix: "mar", label: "Marine Biology, Deep Sea & Coral Reefs", tags: ["marine", "ocean", "diving", "wildlife"] },
  { prefix: "aero", label: "ISRO Space Missions & Jet Propulsion", tags: ["aerospace", "space", "isro", "physics"] },
  { prefix: "fash", label: "High Street Fashion, Streetwear & Sarees", tags: ["fashion", "streetwear", "style", "design"] },
  { prefix: "mind", label: "Vedic Meditation, Sound Baths & Yoga", tags: ["yoga", "mindfulness", "meditation", "wellness"] },
  { prefix: "hema", label: "Historical Swordsmanship & HEMA", tags: ["martialarts", "hema", "swords", "history"] },
  { prefix: "bot", label: "Rare Tropical Plants & Indoor Jungles", tags: ["plants", "botany", "urbanjungle", "nature"] },
  { prefix: "auto", label: "Supercars, JDM Tuning & Hypercars", tags: ["cars", "supercars", "jdm", "motorsport"] },
  { prefix: "dj", label: "Electronic Music, Synthesizers & DJing", tags: ["edm", "techno", "musicproduction", "dj"] },
  { prefix: "surf", label: "Goa & Andaman Big Wave Surfing", tags: ["surfing", "ocean", "beaches", "extreme"] },
  { prefix: "hist", label: "Ancient Indian Architecture & Heritage", tags: ["history", "heritage", "monuments", "culture"] },
  { prefix: "phil", label: "Modern Stoicism, Epistemology & Logic", tags: ["philosophy", "wisdom", "books", "thinking"] },
  { prefix: "astrol", label: "Vedic Astrology, Astronomy & Cosmic Rhythms", tags: ["astronomy", "cosmos", "stars", "zodiac"] },
  { prefix: "synth", label: "Modular Eurorack & Darkwave Synths", tags: ["eurorack", "synthesizer", "ambient", "sounddesign"] },
  { prefix: "skate", label: "Street Skateboarding, Vert & Rails", tags: ["skateboarding", "skate", "skatelife"] },
  { prefix: "coffee", label: "Chikmagalur Specialty Coffee & Pour-Overs", tags: ["coffee", "barista", "espresso", "pourover"] },
  { prefix: "photo", label: "Medium Format Leica & Street Photography", tags: ["photography", "leica", "streetphoto", "film"] },
  { prefix: "paint", label: "Modern Abstract Acrylic & Canvas Art", tags: ["art", "painting", "acrylic", "gallery"] },
  { prefix: "poetry", label: "Urdu Shayari & Contemporary Spoken Word", tags: ["poetry", "shayari", "spokenword", "literature"] },
  { prefix: "asmr", label: "Spatial Audio, Binaural Soundscapes & Rain", tags: ["asmr", "audio", "relaxation", "sleep"] },
  { prefix: "drone", label: "FPV Cinelifters & Autonomous Quadcopters", tags: ["fpv", "drones", "cinematography", "aerial"] },
  { prefix: "robot", label: "Humanoid Robotics, ROS2 & Quadruped AI", tags: ["robotics", "ros", "ai", "hardware"] },
  { prefix: "bio", label: "Biohacking, Longevity & Cellular Health", tags: ["biohacking", "health", "longevity", "science"] },
  { prefix: "urban", label: "Urban Exploration, Rooftops & Parkour", tags: ["parkour", "rooftop", "urbex", "city"] },
  { prefix: "callig", label: "Devanagari, Urdu & Arabic Calligraphy", tags: ["calligraphy", "lettering", "typography", "art"] },
  { prefix: "leather", label: "Full-Grain Leathercraft & Saddlery", tags: ["leathercraft", "bespoke", "crafts", "handmade"] },
  { prefix: "genai", label: "Generative AI Art & ComfyUI Workflows", tags: ["aiart", "midjourney", "comfyui", "generative"] },
  { prefix: "ev", label: "Autonomous EV Conversions & Battery Packs", tags: ["ev", "battery", "engineering", "electric"] },
  { prefix: "astrophoto", label: "High Altitude Astrophotography & Nebulae", tags: ["astrophotography", "space", "nebula", "telescope"] },
  { prefix: "print3d", label: "3D Printing, SLA Resin & Rapid Prototyping", tags: ["3dprinting", "prototyping", "resin", "cad"] },
  { prefix: "soundeng", label: "Spatial Sound Engineering & Dolby Atmos", tags: ["mixing", "mastering", "soundengineer", "audio"] },
  { prefix: "standup", label: "Standup Comedy, Satire & Improvisation", tags: ["comedy", "standup", "humor", "improv"] },
  { prefix: "dronesoccer", label: "Drone Soccer & High-Speed FPV Racing", tags: ["dronesoccer", "fpvracing", "esports", "drones"] },
  { prefix: "herbal", label: "Wilderness Herbalism & Ayurveda", tags: ["herbalism", "ayurveda", "natural", "health"] },
  { prefix: "chess", label: "Grandmaster Chess & Tactical Openings", tags: ["chess", "grandmaster", "strategy", "games"] },
  { prefix: "speedcube", label: "Speedcubing & Algorithmic Solves", tags: ["speedcubing", "rubikscube", "algorithms", "puzzles"] },
];

const FIRST_NAMES = ["Aarav", "Ananya", "Rohan", "Diya", "Vihaan", "Ishita", "Aditya", "Tara", "Kabir", "Meera", "Siddharth", "Zoya", "Arjun", "Kavya", "Dev", "Rhea", "Reyansh", "Pooja", "Varun", "Tanvi", "Neil", "Ira", "Kunal", "Maya", "Manish", "Shreya"];
const LAST_NAMES = ["Sharma", "Patel", "Verma", "Singh", "Reddy", "Rao", "Nair", "Desai", "Joshi", "Iyer", "Chopra", "Kapoor", "Bhatia", "Malhotra", "Mehta", "Saxena", "Sen", "Roy", "Banerjee", "Dutta", "Bose", "Khatri"];

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?q=80&w=256&auto=format&fit=crop"
];

const COVERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600861194942-f883de0dfe96?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop"
];

const LOCATIONS = ["Mumbai, IN", "Bengaluru, IN", "Delhi, IN", "San Francisco, CA", "London, UK", "Dubai, UAE", "Toronto, CA", "Singapore, SG"];

// Deep generative arrays
const SENTENCE_STARTERS = ["Exploring the depths of", "Just unlocked a new level in", "Thinking about the future of", "Can't believe how fast we're moving with", "Behind the scenes look at", "My journey mastering", "A quick tip for anyone in", "Breaking down the latest trend in"];
const ADJECTIVES = ["incredible", "groundbreaking", "massive", "subtle", "complex", "beautiful", "chaotic", "revolutionary"];
const NOUNS = ["architecture", "workflow", "system", "community", "ecosystem", "design", "technique", "process"];
const VERBS_PAST = ["built", "designed", "created", "discovered", "analyzed", "optimized", "launched", "tested"];

async function runMegaScaleSeed() {
  const args = parseArgs(process.argv.slice(2));
  const preset = args.preset || "development";
  
  let targetUsers = 1000;
  let targetPosts = 5000;
  let targetReels = 2000;
  let targetComments = 10000;
  let targetCommunities = 50;

  if (preset === "large") {
    targetUsers = 100000;
    targetPosts = 1000000;
    targetReels = 500000;
    targetComments = 2000000;
    targetCommunities = 1000;
  } else if (preset === "massive") {
    targetUsers = 500000;
    targetPosts = 3000000;
    targetReels = 1000000;
    targetComments = 5000000;
    targetCommunities = 5000;
  }

  // Allow explicit overrides
  if (args.users) targetUsers = parseInt(args.users, 10);
  if (args.posts) targetPosts = parseInt(args.posts, 10);
  if (args.reels) targetReels = parseInt(args.reels, 10);
  if (args.comments) targetComments = parseInt(args.comments, 10);

  const seedValue = args.seed ? parseInt(args.seed, 10) : 123456789;
  const prng = new PRNG(seedValue);

  console.log(`\n🌌 INITIATING SEED RUN (Preset: ${preset}, Seed: ${seedValue})...`);
  console.log(`Targets: Users=${targetUsers}, Posts=${targetPosts}, Reels=${targetReels}, Comments=${targetComments}, Communities=${targetCommunities}`);

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const createdUserIds: string[] = [];

  console.log(`\n1. Generating ${targetUsers} diverse creator identities...`);
  
  for (let c = 0; c < targetUsers; c += 2000) {
    const chunk: any[] = [];
    const limit = Math.min(c + 2000, targetUsers);
    for (let i = c; i < limit; i++) {
      const genre = prng.randomChoice(GENRES);
      const fName = prng.randomChoice(FIRST_NAMES);
      const lName = prng.randomChoice(LAST_NAMES);
      const username = `${fName.toLowerCase()}_${lName.toLowerCase()}_${prng.randomInt(100, 99999)}`;
      const id = prng.randomUuid();
      createdUserIds.push(id);
      
      // Power law follower count simulation
      const popTier = prng.randomInt(1, 100);
      let followers = prng.randomInt(10, 500);
      if (popTier > 90) followers = prng.randomInt(5000, 50000);
      if (popTier > 98) followers = prng.randomInt(100000, 2000000);

      chunk.push({
        id,
        email: `${String(2300001 + i)}@kiit.ac.in`,
        username,
        passwordHash,
        fullName: `${fName} ${lName}`,
        bio: `${prng.randomChoice(SENTENCE_STARTERS)} ${genre.label}. Exploring ${prng.randomChoice(NOUNS)}.`,
        avatarUrl: prng.randomChoice(AVATARS),
        role: popTier > 95 ? "founder" : "user",
        createdAt: prng.randomDate(new Date(2022, 1, 1), new Date()).toISOString(),
        updatedAt: new Date().toISOString(),
        followers: [],
        following: [],
        settings: { theme: "dark", notificationsEnabled: true, language: "en-IN" },
        devices: [],
        blockedUsers: [],
        mutedUsers: [],
        privacy: { profileVisibility: "public", allowDmFromStrangers: true },
        emailVerified: true,
        location: prng.randomChoice(LOCATIONS),
        country: "IN",
        language: "en",
        timeZone: "Asia/Kolkata",
        website: `https://${username}.com`,
        creatorCategory: genre.label,
        subgenres: [genre.tags[0], prng.randomChoice(genre.tags)],
        verified: followers > 50000 || prng.boolean(0.01),
        creatorType: prng.randomChoice(["influencer", "educator", "artist", "entrepreneur", "developer"]),
        accountType: prng.boolean(0.3) ? "professional" : "personal",
        followerCount: followers,
        followingCount: prng.randomInt(50, 1000),
        postCount: prng.randomInt(0, 500),
        reelCount: prng.randomInt(0, 200),
        engagementScore: Math.floor(followers * prng.randomInt(1, 15) / 100),
        reputationScore: prng.randomInt(10, 99),
        accountStatus: "active",
        activityStatus: prng.boolean(0.2) ? "online" : "offline",
        lastActiveTimestamp: new Date().toISOString()
      });
    }
    await db.insert(usersTable).values(chunk).onConflictDoNothing();
    process.stdout.write(`...seeded ${limit}/${targetUsers} users\r`);
  }
  console.log(`\n✅ ${targetUsers} Profiles Created in DB.`);

  console.log(`\n2. Generating ${targetPosts} Posts...`);
  const createdPostIds: string[] = [];
  
  for (let c = 0; c < targetPosts; c += 2000) {
    const chunk: any[] = [];
    const limit = Math.min(c + 2000, targetPosts);

    for (let i = c; i < limit; i++) {
      const uid = prng.randomChoice(createdUserIds);
      const genre = prng.randomChoice(GENRES);
      const postId = prng.randomUuid();
      createdPostIds.push(postId);

      const content = `${prng.randomChoice(SENTENCE_STARTERS)} ${genre.label}. We ${prng.randomChoice(VERBS_PAST)} a ${prng.randomChoice(ADJECTIVES)} ${prng.randomChoice(NOUNS)}. Thoughts? #${genre.tags.join(" #")}`;
      
      const popTier = prng.randomInt(1, 100);
      let views = prng.randomInt(100, 2000);
      let likes = prng.randomInt(5, 50);
      if (popTier > 95) {
        views = prng.randomInt(50000, 2000000);
        likes = prng.randomInt(2000, 50000);
      }

      chunk.push({
        id: postId,
        authorId: uid,
        content,
        images: prng.boolean(0.4) ? [prng.randomChoice(COVERS)] : [],
        likesCount: likes,
        commentsCount: 0,
        bookmarksCount: Math.floor(likes * 0.2),
        shareCount: Math.floor(likes * 0.1),
        score: likes * 3 + Math.floor(likes * 0.1) * 5,
        tags: genre.tags,
        mentions: [],
        createdAt: prng.randomDate(new Date(2023, 1, 1), new Date()).toISOString(),
        updatedAt: new Date().toISOString(),
        postType: prng.boolean(0.8) ? "text" : "image",
        visibility: "public",
        language: "en",
        contentCategory: genre.label,
        contentQualityScore: prng.randomInt(40, 100),
        trendingScore: Math.floor(likes * 2 + views / 100),
        views,
        engagementRate: Math.floor((likes / views) * 100)
      });
    }
    await db.insert(postsTable).values(chunk).onConflictDoNothing();
    process.stdout.write(`...seeded ${limit}/${targetPosts} posts\r`);
  }
  console.log(`\n✅ ${targetPosts} Posts Ingested into Database.`);
  
  console.log(`\n3. Generating ${targetComments} Relational Comments...`);
  for (let c = 0; c < targetComments; c += 2000) {
    const chunk: any[] = [];
    const limit = Math.min(c + 2000, targetComments);

    for (let i = c; i < limit; i++) {
      const uid = prng.randomChoice(createdUserIds);
      const pid = prng.randomChoice(createdPostIds);
      const cid = prng.randomUuid();

      const msgs = ["Great point!", "I completely agree.", "Not sure about that.", `That is so ${prng.randomChoice(ADJECTIVES)}.`, "Thanks for sharing!"];
      
      chunk.push({
        id: cid,
        postId: pid,
        authorId: uid,
        parentId: null, // We won't do deep nested replies in this bulk block to keep it fast
        content: prng.randomChoice(msgs),
        createdAt: prng.randomDate(new Date(2024, 1, 1), new Date()).toISOString(),
        updatedAt: new Date().toISOString(),
        likedBy: [],
        reactions: {},
        isPinned: false,
        repliesCount: 0
      });
    }
    await db.insert(commentsTable).values(chunk).onConflictDoNothing();
    process.stdout.write(`...seeded ${limit}/${targetComments} comments\r`);
  }
  console.log(`\n✅ ${targetComments} Comments Ingested into Database.`);

  console.log(`\n✨ SEED COMPLETED SUCCESSFULLY!`);
  process.exit(0);
}

runMegaScaleSeed().catch(console.error);
