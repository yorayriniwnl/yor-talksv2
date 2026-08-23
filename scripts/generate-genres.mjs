import fs from 'fs';
import path from 'path';

const MOCK_DATA_PATH = path.join(process.cwd(), 'social', 'src', 'lib', 'mockData.ts');

const GENRES = [
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

const FIRST_NAMES = ['Liam', 'Emma', 'Noah', 'Olivia', 'William', 'Ava', 'James', 'Isabella', 'Oliver', 'Sophia', 'Benjamin', 'Mia', 'Elijah', 'Charlotte', 'Lucas', 'Amelia', 'Mason', 'Harper', 'Logan', 'Evelyn', 'Kenji', 'Sven', 'Tariq', 'Hiroshi', 'Zara', 'Elena', 'Mei', 'Omar', 'Kavita', 'Ravi'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Yamamoto', 'Chen', 'Patel', 'Singh', 'Dubois', 'Müller', 'Rossi', 'Kim', 'Okafor', 'Ivanov'];

function generateUsers(count) {
  let output = `\n// --- GENERATED USERS FOR NEW GENRES ---\nObject.assign(MOCK_USERS, {\n`;
  const userIds = [];
  
  for (let i = 0; i < count; i++) {
    const genre = GENRES[i % GENRES.length];
    const id = `user-gen-genre-${i}`;
    userIds.push(id);
    const firstName = randomItem(FIRST_NAMES);
    const lastName = randomItem(LAST_NAMES);
    const username = `${firstName.toLowerCase()}_${genre.prefix}_${randomInt(10, 999)}`;
    
    output += `  '${id}': {
    id: '${id}',
    username: '${username}',
    displayName: '${firstName} ${lastName}',
    avatarUrl: '${randomItem(IMAGES)}',
    coverUrl: '${randomItem(IMAGES)}',
    bio: '${genre.label} Specialist ${genre.emoji} Sharing my journey, insights, and passion with the community.',
    followers: ${randomInt(1000, 500000)},
    following: ${randomInt(50, 1000)},
    followingIds: ['user-roy', 'user-anya'],
    verified: ${Math.random() > 0.5},
  },\n`;
  }
  output += `});\n`;
  return { output, userIds };
}

function generateVideos(userIds, count, startVidId) {
  let output = `\n// --- GENERATED VIDEOS FOR NEW GENRES ---\nMOCK_VIDEOS.push(\n`;
  for (let i = 0; i < count; i++) {
    const id = `vid-${startVidId + i}`;
    const authorId = randomItem(userIds);
    const genre = GENRES.find(g => authorId.includes(g.prefix)) || randomItem(GENRES);
    
    output += `  {
    id: '${id}',
    authorId: '${authorId}',
    videoUrl: '${randomItem(VIDEOS)}',
    thumbnailUrl: '${randomItem(IMAGES)}',
    description: 'Exploring the depths of ${genre.label}. This is what happens when you push the boundaries! ${genre.emoji}',
    likes: ${randomInt(500, 50000)},
    comments: ${randomInt(10, 2000)},
    shares: ${randomInt(5, 500)},
    views: ${randomInt(10000, 1000000)},
    createdAt: new Date(Date.now() - ${randomInt(100000, 100000000)}).toISOString(),
    likedByMe: ${Math.random() > 0.7},
    savedByMe: ${Math.random() > 0.8},
  }${i < count - 1 ? ',' : ''}\n`;
  }
  output += `);\n`;
  return output;
}

function generatePosts(userIds, count, startPostId) {
  let output = `\n// --- GENERATED POSTS FOR NEW GENRES ---\nMOCK_POSTS.push(\n`;
  for (let i = 0; i < count; i++) {
    const id = `post-gen-genre-${startPostId + i}`;
    const authorId = randomItem(userIds);
    const genre = GENRES.find(g => authorId.includes(g.prefix)) || randomItem(GENRES);
    
    output += `  {
    id: '${id}',
    authorId: '${authorId}',
    content: 'Deep dive into ${genre.label}! We just unlocked a completely new level of performance and creativity. ${genre.emoji} Thoughts on this approach?',
    media: [
      '${randomItem(IMAGES)}'
    ],
    likes: ${randomInt(500, 50000)},
    comments: ${randomInt(10, 2000)},
    shares: ${randomInt(5, 500)},
    resonanceScore: ${(Math.random() * (0.99 - 0.75) + 0.75).toFixed(2)},
    createdAt: new Date(Date.now() - ${randomInt(100000, 100000000)}).toISOString(),
    likedByMe: ${Math.random() > 0.7},
    savedByMe: ${Math.random() > 0.8},
  }${i < count - 1 ? ',' : ''}\n`;
  }
  output += `);\n`;
  return output;
}

function generateStories(userIds, count) {
  let output = `\n// --- GENERATED STORIES FOR NEW GENRES ---\nMOCK_STORIES.push(\n`;
  for (let i = 0; i < count; i++) {
    const id = `story-gen-genre-${i}`;
    const authorId = randomItem(userIds);
    
    output += `  {
    id: '${id}',
    authorId: '${authorId}',
    mediaUrl: '${randomItem(IMAGES)}',
    isViewed: ${Math.random() > 0.5},
    createdAt: new Date(Date.now() - ${randomInt(1000, 8000000)}).toISOString(),
  }${i < count - 1 ? ',' : ''}\n`;
  }
  output += `);\n`;
  return output;
}

async function run() {
  const { output: usersCode, userIds } = generateUsers(60);
  const videosCode = generateVideos(userIds, 220, 881);
  const postsCode = generatePosts(userIds, 100, 1000);
  const storiesCode = generateStories(userIds, 30);
  
  const inject = `\n${usersCode}\n${videosCode}\n${postsCode}\n${storiesCode}\n`;
  
  fs.appendFileSync(MOCK_DATA_PATH, inject);
  console.log('Appended successfully!');
}

run();
