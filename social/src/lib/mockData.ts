// High-performance procedural generator for instantaneous Meta-scale content

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
  "Armaan", "Tanya", "Raghav", "Sanya", "Shaurya"
];

const LAST_NAMES = [
  "Sharma", "Patel", "Verma", "Singh", "Reddy", "Rao", "Nair", "Desai", "Joshi", "Iyer",
  "Chopra", "Kapoor", "Bhatia", "Malhotra", "Mehta", "Saxena", "Sen", "Roy", "Banerjee", "Dutta",
  "Aggarwal", "Gupta", "Mishra", "Trivedi", "Pandey", "Chatterjee", "Mukherjee", "Das", "Menon", "Pillai",
  "Shetty", "Choudhury", "Bose", "Nambiar", "Gokhale", "Kulkarni", "Prabhu", "Bhardwaj", "Goswami", "Shukla",
  "Vaidya", "Bhatt", "Tripathi", "Dubey", "Dwivedi"
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

export const MOCK_USERS: Record<string, any> = {};
export const MOCK_POSTS: any[] = [];
export const MOCK_STORIES: any[] = [];
export const MOCK_COMMUNITIES: any[] = [];
export const MOCK_EVENTS: any[] = [];
export const MOCK_PRODUCTS: any[] = [];
export const MOCK_ARTICLES: any[] = [];
export const MOCK_VIDEOS: any[] = [];
export const MOCK_LIVESTREAMS: any[] = [];
export const MOCK_CONVERSATIONS: any[] = [];
export const MOCK_MESSAGES_BY_CONVERSATION: Record<string, any[]> = {};
export const MOCK_NOTIFICATIONS: any[] = [];
export const MOCK_SHOWCASES: Record<string, any[]> = {};
export const MOCK_PROFILE_COMMENTS: Record<string, any[]> = {};

const userIds: string[] = [];

// 1. Generate 55 Core Verified Creators
for (let i = 0; i < GENRES.length; i++) {
  const genre = GENRES[i];
  const fName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lName = LAST_NAMES[i % LAST_NAMES.length];
  const id = `u_${genre.prefix}_${i + 1}`;
  userIds.push(id);

  MOCK_USERS[id] = {
    id,
    username: `${fName.toLowerCase()}_${genre.prefix}`,
    displayName: `${fName} ${lName}`,
    avatarUrl: AVATARS[i % AVATARS.length],
    coverUrl: COVERS[i % COVERS.length],
    bio: `Official Pioneer in ${genre.label} ${genre.emoji} · Building India's creator future on Yor Talks.`,
    verified: true,
    followers: 12500 + i * 840,
    following: 140 + (i % 50),
    followingIds: [],
    blockedUserIds: [],
    mutedUserIds: []
  };
}

// 2. Generate Multi-Genre Posts
for (let i = 0; i < GENRES.length * 4; i++) {
  const genre = GENRES[i % GENRES.length];
  const uid = userIds[i % userIds.length];
  const pid = `post_${i + 1}`;

  MOCK_POSTS.push({
    id: pid,
    authorId: uid,
    content: `Exploring high-precision breakthroughs in ${genre.label}! We just published our newest workflow and benchmarks. What are your thoughts? ${genre.emoji} #${genre.tags.join(" #")}`,
    media: [COVERS[(i * 3) % COVERS.length]],
    likes: 850 + (i * 27) % 5000,
    comments: 42 + (i * 5) % 300,
    shares: 19 + (i * 3) % 150,
    resonanceScore: 0.75 + (i % 25) * 0.01,
    x: ((i * 137) % 3000) - 1500,
    y: ((i * 283) % 1600) - 800,
    createdAt: new Date(Date.now() - i * 3600000 * 3).toISOString(),
    likedByMe: i % 3 === 0,
    savedByMe: i % 5 === 0
  });
}

// 3. Generate Short-Form Reels & Videos
for (let i = 0; i < GENRES.length * 3; i++) {
  const genre = GENRES[i % GENRES.length];
  const uid = userIds[i % userIds.length];
  const vid = `vid_${i + 1}`;

  MOCK_VIDEOS.push({
    id: vid,
    authorId: uid,
    videoUrl: VIDEOS[i % VIDEOS.length],
    thumbnailUrl: COVERS[(i * 2) % COVERS.length],
    title: `Mastering ${genre.label} in 60 seconds ${genre.emoji}`,
    views: 45000 + i * 12300,
    likes: 3400 + i * 850,
    createdAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
    type: "short"
  });
}

// 4. Generate Communities
for (let i = 0; i < GENRES.length; i++) {
  const genre = GENRES[i];
  const cid = `comm_${genre.prefix}`;

  MOCK_COMMUNITIES.push({
    id: cid,
    name: `${genre.label} Hub ${genre.emoji}`,
    description: `The primary meeting point for verified ${genre.label} pioneers, designers, and enthusiasts.`,
    coverUrl: COVERS[i % COVERS.length],
    members: 3400 + i * 290,
    isMember: i % 2 === 0,
    visibility: "public",
    category: genre.tags[0]
  });
}

// 5. Generate Events & Hackathons
for (let i = 0; i < GENRES.length; i++) {
  const genre = GENRES[i];
  const uid = userIds[i % userIds.length];

  MOCK_EVENTS.push({
    id: `ev_${i + 1}`,
    hostId: uid,
    title: `${genre.label} Grand Summit 2026`,
    description: `Join thousands of creators in ${genre.label} for keynote masterclasses, networking, and creator grants.`,
    coverUrl: COVERS[(i + 4) % COVERS.length],
    category: genre.tags[0],
    startsAt: new Date(Date.now() + (i + 1) * 86400000 * 3).toISOString(),
    location: i % 2 === 0 ? "Jio World Convention Centre, Mumbai" : "Live Spatial Virtual Stage",
    isOnline: i % 2 !== 0,
    attendeeIds: userIds.slice(0, 15),
    interestedIds: userIds.slice(15, 35),
    rsvpStatus: i % 3 === 0 ? "going" : "interested"
  });
}

// 6. Generate Marketplace Hardware & Collectibles
for (let i = 0; i < GENRES.length; i++) {
  const genre = GENRES[i];
  const uid = userIds[i % userIds.length];

  MOCK_PRODUCTS.push({
    id: `prod_${i + 1}`,
    sellerId: uid,
    title: `Artisanal Limited Edition ${genre.label} Collector Gear`,
    description: `Handcrafted and numbered custom equipment for ${genre.label}. High durability certification included.`,
    price: 4999 + i * 1500,
    images: [COVERS[(i + 2) % COVERS.length]],
    category: genre.tags[0],
    condition: "new",
    savedByMe: i % 4 === 0,
    createdAt: new Date(Date.now() - i * 86400000).toISOString()
  });
}

// 7. Generate Articles & Guides
for (let i = 0; i < GENRES.length; i++) {
  const genre = GENRES[i];
  const uid = userIds[i % userIds.length];

  MOCK_ARTICLES.push({
    id: `art_${i + 1}`,
    authorId: uid,
    title: `The 2026 Creator Playbook: Scaling ${genre.label}`,
    excerpt: `An in-depth breakdown of how top creators dominate distribution and monetize communities in ${genre.label}.`,
    content: `# Scaling ${genre.label}\n\nOver the past 12 months, creator toolkits have evolved rapidly. Here is the step-by-step framework to maximize your reach.`,
    coverUrl: COVERS[(i + 5) % COVERS.length],
    readTime: 6 + (i % 8),
    claps: 1200 + i * 340,
    createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    collection: genre.tags[0]
  });
}

// 8. Generate Stories & Highlights
for (let i = 0; i < GENRES.length; i++) {
  const genre = GENRES[i];
  const uid = userIds[i % userIds.length];

  MOCK_STORIES.push({
    id: `story_${i + 1}`,
    authorId: uid,
    mediaUrl: COVERS[(i + 1) % COVERS.length],
    type: "image",
    textContent: `Studio session live for ${genre.label}! ✨`,
    viewed: i % 2 === 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    viewerIds: userIds.slice(0, 10),
    reactions: ["🔥", "❤️"],
    isHighlight: i % 3 === 0,
    highlightTitle: i % 3 === 0 ? `${genre.prefix.toUpperCase()} Highlights` : undefined
  });
}

// 9. Generate Live Streams
for (let i = 0; i < 10; i++) {
  const genre = GENRES[i];
  const uid = userIds[i];

  MOCK_LIVESTREAMS.push({
    id: `stream_${i + 1}`,
    hostId: uid,
    title: `🔴 LIVE: 4K Masterclass on ${genre.label}`,
    coverUrl: COVERS[i],
    kind: "live",
    status: "live",
    viewers: 2400 + i * 450,
    startsAt: new Date().toISOString(),
    category: genre.tags[0],
    guestIds: [userIds[(i + 1) % userIds.length]]
  });
}
