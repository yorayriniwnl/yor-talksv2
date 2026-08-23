import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MOCK_DATA_PATH = path.join(process.cwd(), 'social', 'src', 'lib', 'mockData.ts');

const GENRES = [
  // Original 50
  { prefix: 'cul', label: 'Culinary Arts & Michelin Gastronomy', emoji: '🧑‍🍳' },
  { prefix: 'wood', label: 'Woodworking & Traditional Carpentry', emoji: '🪚' },
  { prefix: 'cos', label: 'Cosplay, Props & Anime Culture', emoji: '🎭' },
  { prefix: 'cryp', label: 'Web3, Smart Contracts & Crypto', emoji: '🪙' },
  { prefix: 'fit', label: 'Powerlifting & Calisthenics', emoji: '🏋️' },
  { prefix: 'mag', label: 'Illusion, Magic & Sleight of Hand', emoji: '🎩' },
  { prefix: 'farm', label: 'Urban Farming & Permaculture', emoji: '🌱' },
  { prefix: 'fin', label: 'Personal Finance & Wealth', emoji: '📈' },
  { prefix: 'trav', label: 'Deep Travel & Extreme Exploration', emoji: '🌍' },
  { prefix: 'indie', label: 'Indie Game Dev & Pixel Art', emoji: '🕹️' },
  { prefix: 'pot', label: 'Ceramics & Glassblowing', emoji: '🏺' },
  { prefix: 'watch', label: 'Horology & Bespoke Watchmaking', emoji: '⌚' },
  { prefix: 'mar', label: 'Marine Biology & Oceanography', emoji: '🦈' },
  { prefix: 'aero', label: 'Aviation & Aerospace Engineering', emoji: '🚀' },
  { prefix: 'fash', label: 'Fashion Design & Avant-Garde', emoji: '👗' },
  { prefix: 'mind', label: 'Yoga & Eastern Mindfulness', emoji: '🧘' },
  { prefix: 'hema', label: 'Historical Reenactment & HEMA', emoji: '⚔️' },
  { prefix: 'min', label: 'Miniature Painting & Dioramas', emoji: '🖌️' },
  { prefix: 'rpg', label: 'Tabletop RPGs & Board Games', emoji: '🎲' },
  { prefix: 'vfx', label: 'CGI, VFX & Procedural Animation', emoji: '🎬' },
  { prefix: 'arch', label: 'Brutalist Architecture & Design', emoji: '🏢' },
  { prefix: 'bot', label: 'Botany & Rare Houseplants', emoji: '🌿' },
  { prefix: 'auto', label: 'JDM & Classic Car Restoration', emoji: '🏎️' },
  { prefix: 'dj', label: 'Vinyl DJing & Turntablism', emoji: '🎛️' },
  { prefix: 'knit', label: 'Advanced Knitting & Crochet', emoji: '🧶' },
  { prefix: 'surf', label: 'Big Wave Surfing & Foil', emoji: '🏄' },
  { prefix: 'climb', label: 'Bouldering & Free Soloing', emoji: '🧗' },
  { prefix: 'hist', label: 'Ancient History & Archaeology', emoji: '🏛️' },
  { prefix: 'phil', label: 'Modern Philosophy & Ethics', emoji: '🦉' },
  { prefix: 'astrol', label: 'Astrology & Tarot Reading', emoji: '🔮' },
  { prefix: 'makeup', label: 'SFX Makeup & Prosthetics', emoji: '🧟' },
  { prefix: 'sneaker', label: 'Sneaker Customization', emoji: '👟' },
  { prefix: 'synth', label: 'Modular Synths & Eurorack', emoji: '🎹' },
  { prefix: 'tattoo', label: 'Traditional Irezumi Tattooing', emoji: '🖋️' },
  { prefix: 'skate', label: 'Freestyle Skateboarding', emoji: '🛹' },
  { prefix: 'coffee', label: 'Specialty Coffee & Roasting', emoji: '☕' },
  { prefix: 'tea', label: 'Gongfu Tea Ceremonies', emoji: '🍵' },
  { prefix: 'lock', label: 'Lockpicking & Physical Security', emoji: '🔓' },
  { prefix: 'photo', label: 'Large Format Film Photography', emoji: '📷' },
  { prefix: 'paint', label: 'Abstract Oil Painting', emoji: '🎨' },
  { prefix: 'poetry', label: 'Spoken Word Poetry', emoji: '🎤' },
  { prefix: 'asmr', label: 'Binaural ASMR & Soundscapes', emoji: '🎧' },
  { prefix: 'bush', label: 'Bushcraft & Wilderness Survival', emoji: '🏕️' },
  { prefix: 'black', label: 'Blacksmithing & Knife Making', emoji: '⚒️' },
  { prefix: 'jewel', label: 'Fine Jewelry Engraving', emoji: '💎' },
  { prefix: 'bird', label: 'Ornithology & Birdwatching', emoji: '🦅' },
  { prefix: 'meteor', label: 'Extreme Storm Chasing', emoji: '🌪️' },
  { prefix: 'myco', label: 'Mycology & Mushroom Foraging', emoji: '🍄' },
  { prefix: 'scuba', label: 'Deep Cave Scuba Diving', emoji: '🤿' },
  { prefix: 'dance', label: 'Contemporary & Urban Dance', emoji: '💃' },
  // Adding 10 Ultra-Niche
  { prefix: 'laser', label: 'Laser Cutting & CNC Routing', emoji: '⚡' },
  { prefix: 'bonsai', label: 'Ancient Bonsai Cultivation', emoji: '🌲' },
  { prefix: 'glass', label: 'Neon Sign & Tube Bending', emoji: '💡' },
  { prefix: 'synthbio', label: 'DIY Synthetic Biology', emoji: '🧬' },
  { prefix: 'lock', label: 'Safe Cracking & Penetration Testing', emoji: '🏦' },
  { prefix: 'aquascape', label: 'High-Tech Aquascaping', emoji: '🐠' },
  { prefix: 'paleo', label: 'Dinosaur Fossil Prep', emoji: '🦖' },
  { prefix: 'ice', label: 'Extreme Ice Sculpting', emoji: '🧊' },
  { prefix: 'drone', label: 'FPV Drone Racing', emoji: '🚁' },
  { prefix: 'robot', label: 'Combat Robotics', emoji: '🤖' }
];

const IMAGES = [
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574015974293-817f0ebebb74?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560205001-a5cf2b069fa4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1601662528567-526cd06f6582?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1611162616475-46b635cb6868?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551818255-e6e10975bc17?q=80&w=1200&auto=format&fit=crop'
];

const VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smart-watch-with-the-stopwatch-running-32808-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-spinning-around-the-earth-29351-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-abstract-video-of-a-man-with-heads-like-a-matryoshka-32647-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-animation-of-futuristic-devices-99786-large.mp4'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

const FIRST_NAMES = ['Liam', 'Emma', 'Noah', 'Olivia', 'William', 'Ava', 'James', 'Isabella', 'Oliver', 'Sophia', 'Benjamin', 'Mia', 'Elijah', 'Charlotte', 'Lucas', 'Amelia', 'Mason', 'Harper', 'Logan', 'Evelyn', 'Kenji', 'Sven', 'Tariq', 'Hiroshi', 'Zara', 'Elena', 'Mei', 'Omar', 'Kavita', 'Ravi', 'Diego', 'Mateo', 'Sofia', 'Chloe', 'Zoe', 'Jackson', 'Aiden', 'Sebastian', 'Luna', 'Mila', 'Levi', 'Luke', 'Wyatt', 'Carter', 'Jayden', 'Gabriel', 'Isaac', 'Lincoln', 'Anthony'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Yamamoto', 'Chen', 'Patel', 'Singh', 'Dubois', 'Müller', 'Rossi', 'Kim', 'Okafor', 'Ivanov', 'Silva', 'Santos', 'Russo', 'Conti', 'Ali', 'Hassan', 'Cohen', 'Levi', 'Wang', 'Li', 'Park', 'Choi', 'Nakamura', 'Kobayashi', 'Gomez'];

function generateUsers(count) {
  let output = `\n// --- ULTIMATE EXPANSION USERS ---\nObject.assign(MOCK_USERS, {\n`;
  const userIds = [];
  
  for (let i = 0; i < count; i++) {
    const genre = randomItem(GENRES);
    const id = `user-${crypto.randomUUID()}`;
    userIds.push(id);
    const firstName = randomItem(FIRST_NAMES);
    const lastName = randomItem(LAST_NAMES);
    const username = `${firstName.toLowerCase()}_${genre.prefix}_${randomInt(100, 99999)}`;
    
    output += `  '${id}': {
    id: '${id}',
    username: '${username}',
    displayName: '${firstName} ${lastName}',
    avatarUrl: '${randomItem(IMAGES)}',
    coverUrl: '${randomItem(IMAGES)}',
    bio: 'Ultimate ${genre.label} Master ${genre.emoji} Breaking the rules and defining the future of the discipline.',
    followers: ${randomInt(500, 10000000)},
    following: ${randomInt(10, 5000)},
    followingIds: ['user-roy', 'user-anya'],
    verified: ${Math.random() > 0.5},
  },\n`;
  }
  output += `});\n`;
  return { output, userIds };
}

function generateVideos(userIds, count) {
  let output = `\n// --- ULTIMATE EXPANSION VIDEOS ---\nMOCK_VIDEOS.push(\n`;
  for (let i = 0; i < count; i++) {
    const id = `vid-${crypto.randomUUID()}`;
    const authorId = randomItem(userIds);
    const genre = randomItem(GENRES);
    
    output += `  {
    id: '${id}',
    authorId: '${authorId}',
    videoUrl: '${randomItem(VIDEOS)}',
    thumbnailUrl: '${randomItem(IMAGES)}',
    description: 'Insane discovery in ${genre.label}! We just leveled up completely. ${genre.emoji}',
    likes: ${randomInt(500, 5000000)},
    comments: ${randomInt(10, 50000)},
    shares: ${randomInt(5, 10000)},
    views: ${randomInt(10000, 20000000)},
    createdAt: new Date(Date.now() - ${randomInt(1000, 100000000)}).toISOString(),
    likedByMe: ${Math.random() > 0.5},
    savedByMe: ${Math.random() > 0.8},
  }${i < count - 1 ? ',' : ''}\n`;
  }
  output += `);\n`;
  return output;
}

function generatePosts(userIds, count) {
  let output = `\n// --- ULTIMATE EXPANSION POSTS ---\nMOCK_POSTS.push(\n`;
  for (let i = 0; i < count; i++) {
    const id = `post-${crypto.randomUUID()}`;
    const authorId = randomItem(userIds);
    const genre = randomItem(GENRES);
    
    output += `  {
    id: '${id}',
    authorId: '${authorId}',
    content: 'A masterpiece in ${genre.label}. Absolute perfection in form and execution. ${genre.emoji}',
    media: [
      '${randomItem(IMAGES)}'
    ],
    likes: ${randomInt(500, 200000)},
    comments: ${randomInt(10, 5000)},
    shares: ${randomInt(5, 5000)},
    resonanceScore: ${(Math.random() * (0.99 - 0.70) + 0.70).toFixed(2)},
    createdAt: new Date(Date.now() - ${randomInt(1000, 100000000)}).toISOString(),
    likedByMe: ${Math.random() > 0.6},
    savedByMe: ${Math.random() > 0.7},
  }${i < count - 1 ? ',' : ''}\n`;
  }
  output += `);\n`;
  return output;
}

async function run() {
  const { output: usersCode, userIds } = generateUsers(1000); // 1000 users!
  const videosCode = generateVideos(userIds, 4000); // 4000 videos!
  const postsCode = generatePosts(userIds, 2000); // 2000 posts!
  
  const inject = `\n${usersCode}\n${videosCode}\n${postsCode}\n`;
  
  fs.appendFileSync(MOCK_DATA_PATH, inject);
  console.log('Appended 7000 massive records successfully!');
}

run();
