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
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";

const GENRES = [
  { prefix: "tech", label: "AI, Quantum Computing & Neural Systems", emoji: "🤖", tags: ["tech", "ai", "quantum", "coding", "web3"] },
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
  { prefix: "robot", label: "Humanoid Robotics, ROS2 & Quadruped AI", emoji: "🦾", tags: ["robotics", "ros", "ai", "hardware"] },
  { prefix: "bio", label: "Biohacking, Longevity & Cellular Health", emoji: "🧬", tags: ["biohacking", "health", "longevity", "science"] },
  { prefix: "urban", label: "Urban Exploration, Rooftops & Parkour", emoji: "👟", tags: ["parkour", "rooftop", "urbex", "city"] },
  { prefix: "callig", label: "Devanagari, Urdu & Arabic Calligraphy", emoji: "✒️", tags: ["calligraphy", "lettering", "typography", "art"] },
  { prefix: "vinyl", label: "Rare Vinyl Pressings & Audiophile Gear", emoji: "📻", tags: ["vinyl", "records", "audiophile", "hifi"] },
  { prefix: "leather", label: "Full-Grain Leathercraft & Saddlery", emoji: "👜", tags: ["leathercraft", "bespoke", "crafts", "handmade"] }
];

const FIRST_NAMES = [
  "Aarav", "Ananya", "Rohan", "Diya", "Vihaan", "Ishita", "Aditya", "Tara", "Kabir", "Meera",
  "Siddharth", "Zoya", "Arjun", "Kavya", "Dev", "Rhea", "Reyansh", "Pooja", "Varun", "Tanvi",
  "Sameer", "Nisha", "Vikram", "Sneha", "Karan", "Simran", "Aryan", "Pari", "Dhruv", "Avani",
  "Neil", "Ira", "Kunal", "Maya", "Manish", "Shreya", "Nikhil", "Aadhya", "Rahul", "Priya",
  "Akash", "Ritu", "Alok", "Sunita", "Harsh", "Bhavna", "Gaurav", "Divya", "Pranav", "Natasha",
  "Armaan", "Tanya", "Raghav", "Sanya", "Shaurya", "Kriti", "Yash", "Samaira", "Abhay", "Lavanya",
  "Rudra", "Myra", "Madhav", "Anvi", "Advait", "Siya", "Vivaan", "Riddhi", "Hrithik", "Navya",
  "Ojas", "Kiara", "Reyan", "Vanya", "Yuvraj", "Ruhi", "Atharv", "Shanaya", "Tejas", "Anika"
];

const LAST_NAMES = [
  "Sharma", "Patel", "Verma", "Singh", "Reddy", "Rao", "Nair", "Desai", "Joshi", "Iyer",
  "Chopra", "Kapoor", "Bhatia", "Malhotra", "Mehta", "Saxena", "Sen", "Roy", "Banerjee", "Dutta",
  "Aggarwal", "Gupta", "Mishra", "Trivedi", "Pandey", "Chatterjee", "Mukherjee", "Das", "Menon", "Pillai",
  "Shetty", "Choudhury", "Bose", "Nambiar", "Gokhale", "Kulkarni", "Prabhu", "Bhardwaj", "Goswami", "Shukla",
  "Vaidya", "Bhatt", "Tripathi", "Dubey", "Dwivedi", "Thakur", "Rathore", "Chauhan", "Parmar", "Solanki"
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
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop"
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
  "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop"
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

async function runMegaScaleSeed() {
  console.log("🌌 INITIATING HALF-MILLION (580K+) META-TIER SEED (PostgreSQL)...");

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const TOTAL_USERS = 25000;
  const POSTS_PER_USER = 12;
  const VIDEOS_PER_USER = 10;
  const createdUserIds: string[] = [];

  console.log(`\n1. Generating ${TOTAL_USERS} diverse creator identities across 55+ genres...`);
  
  const userBatches: any[] = [];
  for (let i = 0; i < TOTAL_USERS; i++) {
    const genre = GENRES[i % GENRES.length];
    const fName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lName = LAST_NAMES[(i * 7 + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
    const username = `${fName.toLowerCase()}_${genre.prefix}_${i + 1}_${randomInt(10, 999999)}`;
    const id = randomUUID();
    createdUserIds.push(id);

    userBatches.push({
      id,
      email: `${username}@yortalks.in`,
      username,
      passwordHash,
      fullName: `${fName} ${lName}`,
      bio: `Official Pioneer in ${genre.label} ${genre.emoji} · Building India's next creator wave on Yor Talks.`,
      avatarUrl: AVATARS[i % AVATARS.length],
      role: i < 100 ? "founder" : (i < 500 ? "moderator" : "user"),
      createdAt: new Date(Date.now() - randomInt(10000000, 8000000000)).toISOString(),
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

  for (let c = 0; c < userBatches.length; c += 2500) {
    const chunk = userBatches.slice(c, c + 2500);
    await db.insert(usersTable).values(chunk).onConflictDoNothing();
    process.stdout.write(`...seeded ${Math.min(c + 2500, userBatches.length)}/${TOTAL_USERS} users\r`);
  }
  console.log(`\n✅ ${TOTAL_USERS} Profiles Created in DB.`);

  console.log(`\n2. Generating ${TOTAL_USERS * POSTS_PER_USER} Feed Posts across all genres...`);
  const postBatches: any[] = [];
  
  for (let uIdx = 0; uIdx < createdUserIds.length; uIdx++) {
    const uid = createdUserIds[uIdx];
    const genre = GENRES[uIdx % GENRES.length];

    for (let p = 0; p < POSTS_PER_USER; p++) {
      const templates = [
        `Huge leap forward in ${genre.label}! We just deployed our next-gen stack and the precision is unbelievable. What are your thoughts? ${genre.emoji} #${genre.tags.join(" #")}`,
        `Fresh showcase on ${genre.label} just dropped! Streaming live telemetry and stats. Check it out! 🚀✨ #${genre.tags[0]} #yortalks #india`,
        `Nothing matches the sheer dedication required to master ${genre.label}. Studio lights still on at 3 AM! ⚡🔥 #${genre.tags.join(" #")}`,
        `Live testing in progress: pushing boundaries in ${genre.label}. Community reaction has been off the charts! 🙌❤️ #${genre.tags[1] || "trending"}`,
        `Yor Talks exclusive preview: full architectural breakdown of our ${genre.label} release coming tomorrow! 💎✨ #${genre.tags.join(" #")}`,
        `The old ways of doing ${genre.label} are officially obsolete. Here is why the next wave of Indian creators will dominate 👇 🧵 #${genre.tags[0]}`,
        `Major milestone unlocked! Big gratitude to everyone backing our mission in ${genre.label}. Let's keep building! 🏆🎉 #${genre.tags.join(" #")}`,
        `Discussion time for all ${genre.label} minds: What tool or breakthrough changed your workflow the most this year? Drop a reply below! 💬👇`,
        `Behind the scenes setup: calibrating the gear for tomorrow's 4K live demonstration of ${genre.label} 🎥⚡ #${genre.tags.join(" #")}`,
        `Reflecting on 5 years in ${genre.label}. The most important lesson: consistency beats raw talent every single time. ✨🙏 #${genre.tags[0]}`,
        `Just finished reviewing the latest submissions in ${genre.label}. Indian talent is performing on a world-class level! 🇮🇳🔥 #${genre.tags.join(" #")}`,
        `Interactive challenge for the ${genre.label} community: tag your latest project below for an instant feature! 🌟✨ #${genre.tags[0]}`
      ];

      postBatches.push({
        id: randomUUID(),
        authorId: uid,
        content: templates[p % templates.length],
        images: Math.random() > 0.3 ? [randomChoice(COVERS)] : [],
        likedBy: createdUserIds.slice(0, randomInt(10, 80)),
        bookmarkedBy: createdUserIds.slice(0, randomInt(2, 25)),
        comments: [],
        shareCount: randomInt(15, 850),
        score: randomInt(100, 5000),
        tags: genre.tags,
        createdAt: new Date(Date.now() - randomInt(100000, 2000000000)).toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  for (let c = 0; c < postBatches.length; c += 5000) {
    const chunk = postBatches.slice(c, c + 5000);
    await db.insert(postsTable).values(chunk).onConflictDoNothing();
    process.stdout.write(`...seeded ${Math.min(c + 5000, postBatches.length)}/${postBatches.length} posts\r`);
  }
  console.log(`\n✅ ${postBatches.length} Posts Ingested into Database.`);

  console.log(`\n3. Generating ${TOTAL_USERS * VIDEOS_PER_USER} Short-Form Reels & Videos...`);
  const videoBatches: any[] = [];
  for (let uIdx = 0; uIdx < createdUserIds.length; uIdx++) {
    const uid = createdUserIds[uIdx];
    const genre = GENRES[uIdx % GENRES.length];

    for (let v = 0; v < VIDEOS_PER_USER; v++) {
      const titles = [
        `Mastering ${genre.label} in 60 seconds ${genre.emoji}`,
        `Viral ${genre.label} showcase live from Bengaluru! 🔥`,
        `Watch till the very end: Secret pro tip in ${genre.label} 🤯`,
        `${genre.label} Masterclass 2026 | Session #${v + 1} ⚡`,
        `The 3 fatal mistakes beginner ${genre.label} creators make ❌`,
        `High-octane backstage look at ${genre.label} 🎥`,
        `Speedrun test in ${genre.label} — broke our personal record! ⏱️💨`,
        `Why everyone in India is talking about ${genre.label} right now 🇮🇳✨`,
        `4K Ultra Slow-Mo breakdown of ${genre.label} in action 📹`,
        `Zero to Hero in ${genre.label}: Complete Roadmap 🚀`
      ];

      videoBatches.push({
        id: randomUUID(),
        authorId: uid,
        title: titles[v % titles.length],
        type: "short",
        videoUrl: randomChoice(VIDEOS),
        thumbnailUrl: randomChoice(COVERS),
        views: randomInt(25000, 5000000),
        likedBy: createdUserIds.slice(0, randomInt(30, 200)),
        createdAt: new Date(Date.now() - randomInt(100000, 2500000000)).toISOString(),
      });
    }
  }

  for (let c = 0; c < videoBatches.length; c += 5000) {
    const chunk = videoBatches.slice(c, c + 5000);
    await db.insert(videosTable).values(chunk).onConflictDoNothing();
    process.stdout.write(`...seeded ${Math.min(c + 5000, videoBatches.length)}/${videoBatches.length} reels\r`);
  }
  console.log(`\n✅ ${videoBatches.length} Reels & Videos Ingested into Database.`);

  console.log(`\n4. Generating 500+ Communities & Pro Lounges...`);
  const communityBatches: any[] = [];
  for (let g = 0; g < GENRES.length; g++) {
    const genre = GENRES[g];
    const ownerId = createdUserIds[g % createdUserIds.length];

    communityBatches.push({
      id: randomUUID(),
      name: `${genre.label} Creators Club ${genre.emoji}`,
      slug: `${genre.prefix}-creators-club-v5`,
      description: `The premier Indian & international hub for verified ${genre.label} creators, builders, and enthusiasts.`,
      ownerId,
      moderators: [ownerId, createdUserIds[(g + 1) % createdUserIds.length]],
      memberIds: createdUserIds.slice(0, randomInt(50, 400)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    communityBatches.push({
      id: randomUUID(),
      name: `${genre.label} Pro Lounge & Mastermind`,
      slug: `${genre.prefix}-pro-lounge-v5`,
      description: `High-level project collaborations, venture backing, and private roundtable discussions for ${genre.label}.`,
      ownerId: createdUserIds[(g + 2) % createdUserIds.length],
      moderators: [ownerId],
      memberIds: createdUserIds.slice(0, randomInt(40, 300)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  for (let c = 0; c < communityBatches.length; c += 200) {
    const chunk = communityBatches.slice(c, c + 200);
    await db.insert(communitiesTable).values(chunk).onConflictDoNothing();
  }
  console.log(`✅ ${communityBatches.length} Communities Created.`);

  console.log(`\n5. Generating 1000+ Events & Hackathons...`);
  const eventBatches: any[] = [];
  for (let i = 0; i < 1000; i++) {
    const genre = GENRES[i % GENRES.length];
    const hostId = createdUserIds[i % createdUserIds.length];

    eventBatches.push({
      id: randomUUID(),
      hostId,
      title: `${genre.label} National Summit & Grand Hackathon 2026 #${i + 1}`,
      description: `Join thousands of creators in ${genre.label} for a multi-day hybrid event featuring keynotes, workshops, and ₹1,00,00,000 in creator grants!`,
      coverUrl: randomChoice(COVERS),
      category: genre.tags[0],
      startsAt: new Date(Date.now() + (i + 1) * 86400000 * 2).toISOString(),
      location: i % 2 === 0 ? "Jio World Convention Centre, Mumbai" : "Virtual Main Stage Live Stream",
      isOnline: i % 2 !== 0,
      attendeeIds: createdUserIds.slice(0, randomInt(50, 300)),
      interestedIds: createdUserIds.slice(0, randomInt(80, 450)),
      rsvpStatus: "going"
    });
  }
  for (let c = 0; c < eventBatches.length; c += 500) {
    const chunk = eventBatches.slice(c, c + 500);
    await db.insert(eventsTable).values(chunk).onConflictDoNothing();
  }
  console.log(`✅ ${eventBatches.length} Events Created.`);

  console.log(`\n6. Generating 2000+ Marketplace Products...`);
  const productBatches: any[] = [];
  for (let i = 0; i < 2000; i++) {
    const genre = GENRES[i % GENRES.length];
    const sellerId = createdUserIds[i % createdUserIds.length];

    productBatches.push({
      id: randomUUID(),
      sellerId,
      title: `Limited Edition ${genre.label} Custom Hardware & Collectible #${i + 1}`,
      description: `Bespoke artisanal grade equipment for ${genre.label}. Handcrafted and serialized limited edition with authenticity certificate.`,
      price: randomInt(2500, 150000),
      images: [randomChoice(COVERS)],
      category: genre.tags[0],
      condition: "new",
      savedBy: createdUserIds.slice(0, randomInt(10, 80)),
      createdAt: new Date().toISOString()
    });
  }
  for (let c = 0; c < productBatches.length; c += 500) {
    const chunk = productBatches.slice(c, c + 500);
    await db.insert(productsTable).values(chunk).onConflictDoNothing();
  }
  console.log(`✅ ${productBatches.length} Products Created.`);

  console.log(`\n7. Generating 1000+ Long-Form Articles & Guides...`);
  const articleBatches: any[] = [];
  for (let i = 0; i < 1000; i++) {
    const genre = GENRES[i % GENRES.length];
    const authorId = createdUserIds[i % createdUserIds.length];

    articleBatches.push({
      id: randomUUID(),
      authorId,
      title: `The 2026 Playbook: Scaling ${genre.label} to Global Dominance #${i + 1}`,
      excerpt: `An exhaustive analysis of how high-tier creators are leveraging modern distribution pipelines and community tokenomics in ${genre.label}.`,
      content: `# Scaling ${genre.label} in 2026\n\nThe landscape for ${genre.label} has undergone massive shifts over the past year. In this comprehensive guide, we dissect the core strategies leading founders and creators use to build enduring moats.\n\n## Strategic Pillars\n1. Direct Community Ownership\n2. Real-time Telemetry & Micro-Drops\n3. High-Bandwidth Spatial Media\n\nRead on for step-by-step case studies from our top creators!`,
      coverUrl: randomChoice(COVERS),
      readTime: randomInt(5, 18),
      claps: randomInt(500, 25000),
      createdAt: new Date(Date.now() - randomInt(100000, 1500000000)).toISOString(),
      collection: genre.tags[0]
    });
  }
  for (let c = 0; c < articleBatches.length; c += 500) {
    const chunk = articleBatches.slice(c, c + 500);
    await db.insert(articlesTable).values(chunk).onConflictDoNothing();
  }
  console.log(`✅ ${articleBatches.length} Articles Created.`);

  console.log(`\n8. Generating 5000+ Live Stories & Highlights...`);
  const storyBatches: any[] = [];
  for (let i = 0; i < 5000; i++) {
    const authorId = createdUserIds[i % createdUserIds.length];
    const genre = GENRES[i % GENRES.length];

    storyBatches.push({
      id: randomUUID(),
      authorId,
      mediaUrl: randomChoice(COVERS),
      type: "image",
      textContent: `Live from ${genre.label} studio session! ✨ #yortalks`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      viewerIds: createdUserIds.slice(0, randomInt(20, 150)),
      reactions: [],
      isHighlight: i % 3 === 0,
      highlightTitle: i % 3 === 0 ? `${genre.prefix.toUpperCase()} Vault` : null
    });
  }
  for (let c = 0; c < storyBatches.length; c += 1000) {
    const chunk = storyBatches.slice(c, c + 1000);
    await db.insert(storiesTable).values(chunk).onConflictDoNothing();
  }
  console.log(`✅ ${storyBatches.length} Stories Created.`);

  console.log(`\n✨ =========================================================`);
  console.log(`🎉 HALF-MILLION (580K+) META-TIER SEED COMPLETED SUCCESSFULLY!`);
  console.log(`📊 TOTAL RECORDS IN DATABASE:`);
  console.log(`   - Profiles / Users: ${TOTAL_USERS}`);
  console.log(`   - Feed Posts: ${postBatches.length}`);
  console.log(`   - Short-Form Reels: ${videoBatches.length}`);
  console.log(`   - Communities: ${communityBatches.length}`);
  console.log(`   - Events & Hackathons: ${eventBatches.length}`);
  console.log(`   - Marketplace Products: ${productBatches.length}`);
  console.log(`   - Articles: ${articleBatches.length}`);
  console.log(`   - Stories: ${storyBatches.length}`);
  console.log(`   ⚡ TOTAL NEW ROWS: ${TOTAL_USERS + postBatches.length + videoBatches.length + communityBatches.length + eventBatches.length + productBatches.length + articleBatches.length + storyBatches.length}`);
  console.log(`========================================================= ✨`);
  process.exit(0);
}

runMegaScaleSeed().catch(console.error);
