import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserRound, Compass, Home, ShoppingBag, PlusSquare, Settings, Film, MessageCircle, X, Trophy, Video, Headphones, Gamepad2, Crown, Shield, Sparkles, MapPin, Smile, Code2, Music, Briefcase, BarChart3, Swords, Languages, Boxes, Volume2, FileText, Crosshair, Disc, Flame, Wand2, Shirt, TrendingUp, Activity, Monitor, Building2, Rocket, Radio, Scissors, Award, Gavel, GraduationCap, Calendar, Tv, Gift, Heart, Coffee, Key, Keyboard, ArrowRightLeft, Waves, Navigation, ShieldAlert, Presentation, Utensils, Calculator, Eye, Scale, Lock, FileSignature, Grid3X3, ImageIcon, Cpu, Megaphone, Lightbulb, IceCream, Palette, Bookmark, Vote, Clock, Zap, Target, Bomb, Cloud, Sun, Milk, CloudRain, Coins, Radar, PartyPopper, Percent, EyeOff, Wind, Gauge, CloudLightning, Mountain, Layers, Wifi, Gem, Terminal, Orbit, MoveHorizontal, ArrowDown, Star, ArrowDownToLine, CornerDownRight, Dna, Focus, Grid, VolumeX, Box, Infinity, Globe, Disc3 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sounds } from '@/lib/sound';

export function CommandPalette() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const userList = Object.values(useAppStore((s) => s.users));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (path: string) => {
    sounds.playSwoosh();
    setLocation(path);
    setIsOpen(false);
    setQuery('');
  };

  const filteredUsers = query
    ? userList.filter((u) => u.displayName.toLowerCase().includes(query.toLowerCase()) || u.username.toLowerCase().includes(query.toLowerCase()))
    : userList.slice(0, 4);

  const quickNav = [
    { icon: Home, label: 'Home Feed', path: '/' },
    { icon: Compass, label: 'Explore Grid', path: '/explore' },
    { icon: Film, label: 'Reels Swiper', path: '/videos' },
    { icon: Sun, label: 'Esports Tactical Pop-Flash Lab', path: '/pop-flash-matrix' },
    { icon: Wind, label: 'Streamer Live Chat Emote Lorenz Studio', path: '/emote-lorenz-attractor' },
    { icon: Utensils, label: 'Desi Rajasthani Ker Sangri Handi Express', path: '/ker-sangri-handi' },
    { icon: MoveHorizontal, label: 'Esports Tactical Jiggle-Counter Lab', path: '/jiggle-counter-matrix' },
    { icon: Waves, label: 'Streamer Live Chat Emote Plasma Ring Studio', path: '/emote-plasma-ring' },
    { icon: Utensils, label: 'Desi Rajasthani Bikaneri Ghevar Express', path: '/bikaneri-ghevar' },
    { icon: EyeOff, label: 'Esports Tactical Bullet Tracer Lab', path: '/bullet-tracer-matrix' },
    { icon: Disc3, label: 'Streamer Live Chat Emote Torus Knot Studio', path: '/emote-torusknot-studio' },
    { icon: Utensils, label: 'Desi Rajasthani Dahi Gujiya Express', path: '/dahi-gujiya' },
    { icon: Shield, label: 'Esports Tactical Armor-Punch Lab', path: '/armor-punch-matrix' },
    { icon: Globe, label: 'Streamer Live Chat Emote Hypersphere Studio', path: '/emote-hypersphere-vortex' },
    { icon: Utensils, label: 'Desi Rajasthani Sangri Kadhi Express', path: '/sangri-kadhi' },
    { icon: ShieldAlert, label: 'Esports Tactical Hitbox Disjoint Lab', path: '/hitbox-disjoint-matrix' },
    { icon: Orbit, label: 'Streamer Live Chat Emote Gyroscope Studio', path: '/emote-gyroscope-ring' },
    { icon: Utensils, label: 'Desi Rajasthani Gatte Ki Kadhi Express', path: '/gatte-ki-kadhi' },
    { icon: Crosshair, label: 'Esports Tactical First-Bullet Inaccuracy Lab', path: '/first-bullet-inaccuracy' },
    { icon: Infinity, label: 'Streamer Live Chat Emote Möbius Loop Studio', path: '/emote-mobius-loop' },
    { icon: Utensils, label: 'Desi Rajasthani Chana Jaisalmeri Express', path: '/chana-jaisalmeri' },
    { icon: Volume2, label: 'Esports Tactical Audio-Occlusion Lab', path: '/audio-occlusion-matrix' },
    { icon: Box, label: 'Streamer Live Chat Emote 4D Tesseract Studio', path: '/emote-tesseract-cube' },
    { icon: Utensils, label: 'Desi Rajasthani Mogar Kachori Express', path: '/mogar-kachori' },
    { icon: Bomb, label: 'Esports Tactical Bomb-Carrier Concealment Lab', path: '/bomb-carrier-matrix' },
    { icon: Rocket, label: 'Streamer Live Chat Emote Warp Drive Studio', path: '/emote-warpdrive-tunnel' },
    { icon: Utensils, label: 'Desi Rajasthani Bajra Khichdi Express', path: '/bajra-khichdi' },
    { icon: VolumeX, label: 'Esports Tactical Silent Weapon-Catch Lab', path: '/weapon-catch-matrix' },
    { icon: Star, label: 'Streamer Live Chat Emote Constellation Studio', path: '/emote-constellation-chart' },
    { icon: Utensils, label: 'Desi Rajasthani Govind Gatta Express', path: '/govind-gatta' },
    { icon: Eye, label: 'Esports Tactical Right-Eye Peak & TPP Lab', path: '/right-peak-matrix' },
    { icon: Waves, label: 'Streamer Live Chat Emote Quantum Ribbon Studio', path: '/emote-quantum-ribbon' },
    { icon: Utensils, label: 'Desi Rajasthani Papad Mangodi Express', path: '/papad-mangodi' },
    { icon: Focus, label: 'Esports Tactical Scope Sway & Breath Lab', path: '/scope-sway-matrix' },
    { icon: Grid, label: 'Streamer Live Chat Emote Tachyon Grid Studio', path: '/emote-tachyon-grid' },
    { icon: Utensils, label: 'Desi Rajasthani Ker Dak Handi Express', path: '/ker-dak' },
    { icon: CornerDownRight, label: 'Esports Tactical Bounce-Angle Matrix Lab', path: '/bounce-angle-matrix' },
    { icon: Dna, label: 'Streamer Live Chat Emote Laser Helix Studio', path: '/emote-laser-helix' },
    { icon: Utensils, label: 'Desi Rajasthani Pitor Ki Sabzi Marwar Express', path: '/pitor-ki-sabzi' },
    { icon: ArrowDownToLine, label: 'Esports Tactical Ladder-Slide & Drop Lab', path: '/ladder-slide-matrix' },
    { icon: Orbit, label: 'Streamer Live Chat Emote Plasma Vortex Studio', path: '/emote-plasma-vortex' },
    { icon: Utensils, label: 'Desi Bengali Chingri Malai Curry Kolkata Express', path: '/chingri-malai-curry' },
    { icon: Waves, label: 'Esports Tactical Wall-Glide & Surfing Lab', path: '/wall-glide-matrix' },
    { icon: Volume2, label: 'Streamer Live Chat Emote Soundwave Studio', path: '/emote-soundwave-spectrum' },
    { icon: Utensils, label: 'Desi Mangalorean Kori Kundapuri Coastal Express', path: '/kori-kundapuri' },
    { icon: ArrowRightLeft, label: 'Esports Tactical Quick-Switch & Holster Lab', path: '/quick-switch-matrix' },
    { icon: Grid3X3, label: 'Streamer Live Chat Emote Laser Tunnel Studio', path: '/emote-laser-tunnel' },
    { icon: Utensils, label: 'Desi Sindhi Sai Bhaji & Bhuga Chawal Express', path: '/sindhi-sai-bhaji' },
    { icon: Radio, label: 'Esports Tactical Flash-Bait Audio Decoy Lab', path: '/flash-bait-matrix' },
    { icon: Orbit, label: 'Streamer Live Chat Emote Pulsar Rings Studio', path: '/emote-pulsar-rings' },
    { icon: Utensils, label: 'Desi Hyderabadi Tala Hua Gosht Nampally Express', path: '/tala-hua-gosht' },
    { icon: ArrowDown, label: 'Esports Tactical Fast-Drop Elevation Lab', path: '/fast-drop-matrix' },
    { icon: Star, label: 'Streamer Live Chat Emote Starlight Shower Studio', path: '/emote-starlight-shower' },
    { icon: Utensils, label: 'Desi Rajasthani Gatte Ka Pulao Royal Express', path: '/gatte-ka-pulao' },
    { icon: Bomb, label: 'Esports Tactical Utility Stacking & Choke Lab', path: '/utility-stacking-matrix' },
    { icon: Palette, label: 'Streamer Live Chat Emote Rainbow Beam Studio', path: '/emote-rainbow-beam' },
    { icon: Utensils, label: 'Desi Malabar Kozhi Roast Spice Express', path: '/malabar-kozhi-roast' },
    { icon: Mountain, label: 'Esports Tactical High-Ground Vertical FOV Lab', path: '/vertical-fov-matrix' },
    { icon: Grid3X3, label: 'Streamer Live Chat Emote Matrix Grid Studio', path: '/emote-matrix-grid' },
    { icon: Utensils, label: 'Desi Chettinad Mutton Sukka Spice Express', path: '/chettinad-sukka' },
    { icon: Zap, label: 'Esports Tactical Flash Pop-Peek & Retake Timing Lab', path: '/pop-peek-matrix' },
    { icon: Waves, label: 'Streamer Live Chat Emote Aurora Wave Studio', path: '/emote-aurora-wave' },
    { icon: Utensils, label: 'Desi Rajasthani Ker Sangri Desert Royal Express', path: '/rajasthani-ker-sangri' },
    { icon: Sun, label: 'Esports Tactical Shadow Advantage & Lighting Lab', path: '/shadow-advantage-matrix' },
    { icon: Wind, label: 'Streamer Live Chat Emote Particle Tornado Studio', path: '/emote-particle-tornado' },
    { icon: Utensils, label: 'Desi Kashmiri Gushtaba Royal Wazwan Express', path: '/kashmiri-gushtaba' },
    { icon: Target, label: 'Esports Tactical Run-and-Gun Inaccuracy Decay Lab', path: '/run-gun-decay-matrix' },
    { icon: Orbit, label: 'Streamer Live Chat Emote Quantum Portal Studio', path: '/emote-quantum-portal' },
    { icon: Utensils, label: 'Desi Kolkata Mughlai Kosha Mangsho Express', path: '/kosha-mangsho' },
    { icon: MoveHorizontal, label: 'Esports Tactical Micro-Strafe & Jiggle-Peek Lab', path: '/micro-strafe-matrix' },
    { icon: Swords, label: 'Streamer Live Chat Emote Sword Clash Studio', path: '/emote-sword-clash' },
    { icon: Utensils, label: 'Desi Amritsari Chole Kulche Heritage Express', path: '/amritsari-chole' },
    { icon: Headphones, label: 'Esports Tactical Sound Masking & Decoy Lab', path: '/sound-masking-matrix' },
    { icon: Orbit, label: 'Streamer Live Chat Emote Black Hole Warp Studio', path: '/emote-blackhole-warp' },
    { icon: Utensils, label: 'Desi Goan Prawn Balchão Coastal Express', path: '/goan-prawn-balchao' },
    { icon: Eye, label: 'Esports Tactical Off-Angle & Pixel-Gap Lab', path: '/off-angle-matrix' },
    { icon: Radio, label: 'Streamer Live Chat Emote Dholak Wave Studio', path: '/emote-dholak-beat' },
    { icon: Utensils, label: 'Desi Odisha Dalma & Chhena Poda Puri Express', path: '/odisha-dalma' },
    { icon: Mountain, label: 'Esports Tactical Lineup Elevation & Skybox Lab', path: '/skybox-lineup-matrix' },
    { icon: Terminal, label: 'Streamer Live Chat Emote Glitch Studio', path: '/emote-glitch-matrix' },
    { icon: Utensils, label: 'Desi Tamil Nadu Thalapakatti Dindigul Biryani Express', path: '/dindigul-biryani' },
    { icon: Target, label: 'Esports Tactical Weapon Spread & Spray Reset Lab', path: '/spread-recovery-matrix' },
    { icon: Gem, label: 'Streamer Live Chat Emote Prism Laser Studio', path: '/emote-prism-laser' },
    { icon: Sun, label: 'Desi Rajasthani Gatte Ki Sabzi Jodhpur Express', path: '/gatte-ki-sabzi' },
    { icon: Wifi, label: 'Esports Tactical Peeker’s Advantage & Latency Lab', path: '/peekers-advantage-matrix' },
    { icon: Boxes, label: 'Streamer Live Chat Emote Hologram Cube Studio', path: '/emote-hologram-cube' },
    { icon: Flame, label: 'Desi Mangalore Sukka & Kori Rotti Udupi Express', path: '/kori-rotti' },
    { icon: Layers, label: 'Esports Tactical Utility Trajectory & Bounce Lab', path: '/bounce-matrix' },
    { icon: Sparkles, label: 'Streamer Live Chat Emote Golden Sparkler Studio', path: '/emote-sparklers' },
    { icon: Utensils, label: 'Desi Malabar Thalassery Dum Biryani Express', path: '/thalassery-biryani' },
    { icon: Keyboard, label: 'Esports Tactical Counter-Strafe & Stop-Velocity Lab', path: '/counter-strafe-matrix' },
    { icon: CloudLightning, label: 'Streamer Live Chat Emote Lightning Storm Studio', path: '/emote-lightning' },
    { icon: Mountain, label: 'Desi Kashmiri Rogan Josh Wazwan Express', path: '/kashmiri-rogan-josh' },
    { icon: Crosshair, label: 'Esports Tactical Angle-Snapping & Micro-Adjustment Lab', path: '/angle-snap-matrix' },
    { icon: Grid3X3, label: 'Streamer Live Chat Emote Laser Matrix Grid Studio', path: '/emote-laser-matrix' },
    { icon: Flame, label: 'Desi Mangalore Ghee Roast Kundapura Express', path: '/mangalore-ghee-roast' },
    { icon: Gauge, label: 'Esports Tactical Bunny-Hop & Strafe Velocity Lab', path: '/bhop-velocity-matrix' },
    { icon: Sun, label: 'Streamer Live Chat Emote Supernova Blast Studio', path: '/emote-supernova' },
    { icon: Waves, label: 'Desi Malabar Prawns Roast Calicut Express', path: '/malabar-prawns' },
    { icon: ArrowRightLeft, label: 'Esports Tactical Crouch-Jump & Silent-Drop Lab', path: '/crouch-jump-matrix' },
    { icon: Waves, label: 'Streamer Live Chat Emote Aurora Borealis Wave Studio', path: '/emote-aurora' },
    { icon: Flame, label: 'Desi Hyderabadi Mirchi Ka Salan Nizami Express', path: '/mirchi-ka-salan' },
    { icon: Eye, label: 'Esports Tactical Jiggle-Peek & Shoulder-Bait Matrix', path: '/jiggle-peek-matrix' },
    { icon: Sparkles, label: 'Streamer Live Chat Emote Comet Shower Studio', path: '/emote-comet' },
    { icon: Flame, label: 'Desi Rajasthani Laal Maas Royal Rajputana Express', path: '/rajasthani-laal-maas' },
    { icon: ShieldAlert, label: 'Esports Tactical Wallbang & Bullet Penetration Lab', path: '/wallbang-matrix' },
    { icon: Flame, label: 'Streamer Live Chat Emote Dragon Fireworks Studio', path: '/emote-dragon' },
    { icon: Utensils, label: 'Desi Lucknowi Shahi Biryani Chowk Express', path: '/lucknowi-biryani' },
    { icon: EyeOff, label: 'Esports Tactical Flash Evasion & Anti-Blind Positioning Matrix', path: '/anti-flash-matrix' },
    { icon: Wind, label: 'Streamer Live Chat Emote Tornado Vortex Studio', path: '/emote-tornado' },
    { icon: Flame, label: 'Desi Chettinad Pepper Chicken Karaikudi Express', path: '/chettinad-chicken' },
    { icon: Navigation, label: 'Esports Tactical Map Rotation Timing Matrix', path: '/rotation-matrix' },
    { icon: Waves, label: 'Streamer Live Chat Emote Fountain Studio', path: '/emote-fountain' },
    { icon: Flame, label: 'Desi Kolkata Kathi Roll Park Street Express', path: '/park-kathi-roll' },
    { icon: Crosshair, label: 'Esports Tactical Weapon Spread & First-Shot Accuracy Matrix', path: '/accuracy-matrix' },
    { icon: Zap, label: 'Streamer Live Chat Emote Laser Beam Show Studio', path: '/laser-show' },
    { icon: Utensils, label: 'Desi Thali Unlimited Shudh Shakahari Bhojanalaya Express', path: '/desi-thali' },
    { icon: Percent, label: 'Esports Tactical Bomb Plant & Retake Probability Matrix', path: '/plant-retake-matrix' },
    { icon: PartyPopper, label: 'Streamer Live Chat Emote Confetti Cannon Studio', path: '/confetti-cannon' },
    { icon: Waves, label: 'Desi Fish Fry Coastal Karavali Mangalore Express', path: '/mangalore-fish-fry' },
    { icon: Radar, label: 'Esports Tactical Map Callouts & Radar Pings Deck', path: '/radar-pings' },
    { icon: Rocket, label: 'Streamer Live Chat Emote Firework Rocket Studio', path: '/firework-rocket' },
    { icon: Flame, label: 'Desi Nihari Nalli Old Delhi Daryaganj Express', path: '/nalli-nihari' },
    { icon: Zap, label: 'Esports Tactical Utility Cooldown & Ultimate Ability Matrix', path: '/ability-matrix' },
    { icon: Volume2, label: 'Streamer Live Chat Super-Spam Decibel Level Meter', path: '/decibel-meter' },
    { icon: Flame, label: 'Desi Galouti Kebab Chowk Tunday Express', path: '/galouti-kebab' },
    { icon: Coins, label: 'Esports Tactical In-Game Economy & Buy Phase Planner', path: '/economy-planner' },
    { icon: TrendingUp, label: 'Streamer Live Dono Goal Train & Sub Multiplier Studio', path: '/dono-train' },
    { icon: Utensils, label: 'Desi Hyderabadi Double Ka Meetha Shahi Tukda Express', path: '/double-ka-meetha' },
    { icon: Headphones, label: 'Esports Tactical Sound Distance & Audio Matrix', path: '/footstep-matrix' },
    { icon: CloudRain, label: 'Streamer Live Chat Emote Monsoonal Rain Studio', path: '/emote-rain' },
    { icon: Flame, label: 'Desi Butter Chicken Aslam Jama Masjid Express', path: '/aslam-butter-chicken' },
    { icon: Shield, label: 'Esports Tactical Armor Penetration & TTK Matrix', path: '/armor-matrix' },
    { icon: Flame, label: 'Streamer Live Chat Combo Streak Fire Meter', path: '/streak-meter' },
    { icon: Milk, label: 'Desi Lassi Malai Patiala Express', path: '/patiala-lassi' },
    { icon: Crosshair, label: 'Esports Tactical Crosshair Customizer & Pro Vault', path: '/crosshair-vault' },
    { icon: Smile, label: 'Streamer OBS Chat Emote Waterfall Studio', path: '/emote-waterfall' },
    { icon: Flame, label: 'Desi Pattu Parotta Salna Madurai Express', path: '/parotta-salna' },
    { icon: Sun, label: 'Esports Tactical Flashbang Duration & Blind Matrix', path: '/flash-matrix' },
    { icon: Tv, label: 'Streamer OBS Broadcast Ticker Bar Studio', path: '/ticker-bar' },
    { icon: Utensils, label: 'Desi Appam Stew Kerala Express', path: '/appam-stew' },
    { icon: Cloud, label: 'Esports Tactical Smoke Wall & Lineup Simulator', path: '/smoke-simulator' },
    { icon: Target, label: 'Streamer Subathon Goal Milestone Meter', path: '/goal-meter' },
    { icon: Flame, label: 'Desi Keema Pav Bohri Mohalla Express', path: '/keema-pav' },
    { icon: Bomb, label: 'Esports Tactical Bomb & Spike Defusal Timer', path: '/defusal-timer' },
    { icon: Vote, label: 'Streamer Live Chat Poll Overlay Studio', path: '/poll-overlay' },
    { icon: Coffee, label: 'Desi Bun Maska Chai Irani Cafe Express', path: '/bun-maska' },
    { icon: Crosshair, label: 'Esports Tactical Recoil & Spray Matrix', path: '/recoil-matrix' },
    { icon: Trophy, label: 'Streamer Tournament Series Score Tally HUD', path: '/score-tally' },
    { icon: Flame, label: 'Desi Baida Roti Chowpatty Express', path: '/baida-roti' },
    { icon: Award, label: 'Esports MVP Stat Card Generator', path: '/stat-card' },
    { icon: MessageCircle, label: 'Streamer Chat Highlights & Super-Pin Studio', path: '/chat-pins' },
    { icon: Flame, label: 'Desi Momos Chutney Majnu Ka Tila Express', path: '/momos-rush' },
    { icon: Film, label: 'Esports Instant Replay & Slow-Mo Studio', path: '/replay-studio' },
    { icon: Disc, label: 'Streamer Subathon Wheel & Dare Studio', path: '/subathon-wheel' },
    { icon: Utensils, label: 'Desi Dahi Bhalla Chandni Chowk Express', path: '/dahi-bhalla' },
    { icon: Tv, label: 'Esports Caster Multiview Director Deck', path: '/caster-director' },
    { icon: Volume2, label: 'Streamer Hinglish TTS Voice Alert Studio', path: '/tts-customizer' },
    { icon: Flame, label: 'Desi Misal Pav Kolhapuri Zhatka Express', path: '/misal-pav' },
    { icon: Swords, label: 'Esports Tactical Damage Trade & TTK Lab', path: '/damage-trade' },
    { icon: Activity, label: 'Streamer Bitrate Health & Ingest Watchtower', path: '/bitrate-health' },
    { icon: Flame, label: 'Desi Amritsari Kulcha Chole Express', path: '/amritsari-kulcha' },
    { icon: Bomb, label: 'Esports Tactical Utility & Lineup Lab', path: '/lineup-lab' },
    { icon: Smile, label: 'Streamer Emote Wall & Sub Hype', path: '/emote-wall' },
    { icon: Utensils, label: 'Desi Kolkata Kathi Roll Park Street Express', path: '/kathi-roll' },
    { icon: Radio, label: 'Esports Tactical Drone Scouting Hub', path: '/drone-scout' },
    { icon: Target, label: 'Streamer Sub-Goal Studio', path: '/sub-goal' },
    { icon: Crown, label: 'Desi Hyderabadi Haleem Nizam Express', path: '/hyderabadi-haleem' },
    { icon: Crosshair, label: 'Esports Killzone Heatmap & Strat Lab', path: '/killzone-analyzer' },
    { icon: Zap, label: 'Streamer Hype Train Director', path: '/hypetrain-hud' },
    { icon: Crown, label: 'Desi Dal Baati Churma Marwadi Express', path: '/dal-baati' },
    { icon: Trophy, label: 'Tier-1 Scrims Daily Leaderboard', path: '/scrims-leaderboard' },
    { icon: Clock, label: 'Streamer Marathon Subathon Timer', path: '/subathon-timer' },
    { icon: Utensils, label: 'Desi Litti Chokha Angaar Express', path: '/litti-chokha' },
    { icon: Building2, label: 'Esports Bootcamp Facility Allocator', path: '/bootcamp-allocator' },
    { icon: Vote, label: 'Streamer Live Chat Polls & Super-Votes', path: '/live-polls' },
    { icon: Utensils, label: 'Desi Poha Jalebi Indori Express', path: '/poha-jalebi' },
    { icon: Flame, label: 'LAN Stage Pyro & Special FX Deck', path: '/pyro-deck' },
    { icon: Bookmark, label: 'VOD Chapters & Timestamps AI', path: '/vod-chapters' },
    { icon: Utensils, label: 'Desi Bedmi Puri Mathura Express', path: '/bedmi-puri' },
    { icon: GraduationCap, label: 'Esports Coach Tactical Review Lab', path: '/coach-lab' },
    { icon: Palette, label: 'Streamer 3D LUT & Color Grader', path: '/lut-grader' },
    { icon: Utensils, label: 'Desi Rajma Chawal Dhaba Express', path: '/rajma-chawal' },
    { icon: Shirt, label: 'Esports Jersey Locker & Merch Vault', path: '/merch-vault' },
    { icon: FileText, label: 'Streamer Hinglish Teleprompter', path: '/teleprompter' },
    { icon: Utensils, label: 'Desi Idli Vada Sambar Express', path: '/idli-vada' },
    { icon: Radio, label: 'Streamer Backstage Green Room', path: '/green-room' },
    { icon: Crosshair, label: 'Esports Map Veto & Pick/Ban Studio', path: '/veto-studio' },
    { icon: IceCream, label: 'Desi Kulfi Falooda Matka Express', path: '/kulfi-falooda' },
    { icon: Shield, label: 'Esports Anti-Doping & Fair Play Hub', path: '/fairplay-compliance' },
    { icon: Activity, label: 'Dual-PC Audio Matrix & DSP Routing', path: '/audio-matrix' },
    { icon: Utensils, label: 'Desi Chole Bhature Express', path: '/chole-bhature' },
    { icon: Lightbulb, label: 'LAN Stage Lighting & DMX512 Matrix', path: '/lighting-controller' },
    { icon: Gift, label: 'Streamer Provably Fair Giveaway Wheel', path: '/giveaway-wheel' },
    { icon: Utensils, label: 'Desi Pav Bhaji Chowpatty Rush', path: '/pavbhaji-rush' },
    { icon: Cpu, label: 'Streamer Battlestation & Rig Benchmark', path: '/rig-benchmark' },
    { icon: Trophy, label: 'Esports Prize Pool Escrow & TDS Hub', path: '/prizepool-escrow' },
    { icon: Megaphone, label: 'Bharat Fan Chant & Cheer Synthesizer', path: '/fan-chants' },
    { icon: Volume2, label: 'Esports SFX & Streamer Stinger Vault', path: '/sfx-vault' },
    { icon: ImageIcon, label: 'Streamer 4K YouTube Thumbnail Studio', path: '/thumbnail-studio' },
    { icon: Calendar, label: 'Tier-1 Scrims Slot Timetable & Check-In', path: '/scrims-scheduler' },
    { icon: Crosshair, label: 'Esports Draft Combine & Scout Benchmark', path: '/draft-combine' },
    { icon: MessageCircle, label: 'Streamer OBS Chat Overlay Studio', path: '/chat-overlay' },
    { icon: Flame, label: 'Desi Biryani Handi Dum Simulator', path: '/biryani-dum' },
    { icon: FileSignature, label: 'Esports Contract Signer & Offer Terminal', path: '/contract-signer' },
    { icon: Grid3X3, label: 'Acoustic Foam Panel Studio Planner', path: '/foam-planner' },
    { icon: Utensils, label: 'Desi Vada Pav & Mumbai Express Rush', path: '/vadapav-rush' },
    { icon: Shirt, label: 'Bharat Esports Jersey 3D Studio', path: '/jersey-customizer' },
    { icon: Lock, label: 'Creator Brand NDA & IP Protection Vault', path: '/nda-vault' },
    { icon: Coffee, label: 'Desi Punjabi Lassi & Kulhad Bar', path: '/lassi-bar' },
    { icon: Video, label: 'Streamer Chroma Studio & Virtual Sets', path: '/chroma-studio' },
    { icon: Scale, label: 'Creator Brand Dispute & Escrow Arbitration', path: '/dispute-hub' },
    { icon: Music, label: 'Desi Tabla & Dholak Percussion Synthesizer', path: '/tabla-synth' },
    { icon: Calculator, label: 'Bharat Streamer Tax & TDS Compliance Hub', path: '/tax-hub' },
    { icon: Eye, label: 'Gamer Ergonomics & Posture Vision AI', path: '/posture-ai' },
    { icon: Utensils, label: 'Desi Street Panipuri & Golgappa Rush', path: '/panipuri-rush' },
    { icon: Radio, label: 'Bharat Esports Caster & Broadcast Deck', path: '/caster-deck' },
    { icon: Presentation, label: 'Creator Brand Pitch Deck & 4K PDF', path: '/pitch-deck' },
    { icon: Utensils, label: 'Desi Highway Dhaba Rush Simulator', path: '/dhaba-rush' },
    { icon: ShieldAlert, label: 'Bharat Esports Anti-Cheat Watchtower', path: '/anticheat' },
    { icon: Sparkles, label: 'Streamer AI Highlights & Auto-Subtitler', path: '/highlights' },
    { icon: Activity, label: 'Hawkeye Cricket Bowling & Speed Lab', path: '/cricket-lab' },
    { icon: ArrowRightLeft, label: 'Esports Player Transfer Portal & Trade', path: '/transfers' },
    { icon: Waves, label: 'Streamer Acoustic Room & Soundproof Lab', path: '/acoustics' },
    { icon: Navigation, label: 'Desi Cyber Auto-Rickshaw Drift', path: '/drift' },
    { icon: Key, label: 'Bharat Custom Scrims Room & Matchmaker', path: '/rooms' },
    { icon: Keyboard, label: 'Gamer Mechanical RGB Gear Customizer', path: '/gear' },
    { icon: Radio, label: 'Bharat Multistream & Restreamer Studio', path: '/multistream' },
    { icon: Trophy, label: 'Esports Match Scoreboard & HUD Studio', path: '/scoreboard' },
    { icon: Briefcase, label: 'Creator Brand Deal & Sponsorship Exchange', path: '/deals' },
    { icon: Coffee, label: 'Desi Chai Stall & Kullad Brew Simulator', path: '/chai' },
    { icon: Gift, label: 'Live Stream Superchat & Desi Dhol Studio', path: '/superchat' },
    { icon: Headphones, label: 'Bharat Squad Voice Comms & Matrix', path: '/comms' },
    { icon: Heart, label: 'Gamer Health & Ergonomics Hub', path: '/health' },
    { icon: Calendar, label: 'Bharat Esports Match Schedule & Calendar', path: '/calendar' },
    { icon: Tv, label: 'Clan Scrims VOD Review & Annotator', path: '/vods' },
    { icon: ShoppingBag, label: 'Bharat Creator Merch Storefront', path: '/store' },
    { icon: Gavel, label: 'Bharat Premier Cricket Mega Auction', path: '/auction' },
    { icon: GraduationCap, label: 'Bharat Esports Academy & Masterclasses', path: '/academy' },
    { icon: Radio, label: 'Streamer Voice FX & Audio Modulator', path: '/voice-fx' },
    { icon: Trophy, label: 'Bharat Esports Tournaments', path: '/tournaments' },
    { icon: Trophy, label: 'Virtual Trophy Room & Hall of Fame', path: '/trophies' },
    { icon: Crosshair, label: 'Esports Talent & Scouting Radar', path: '/scouting' },
    { icon: FileText, label: 'Creator Tax Invoices & GST Billing', path: '/invoices' },
    { icon: TrendingUp, label: 'Esports Pick\'em & Predictions', path: '/predictions' },
    { icon: Award, label: 'National Clan Power Rankings', path: '/rankings' },
    { icon: Crown, label: 'Creator Fan Club & VIP Memberships', path: '/fanclub' },
    { icon: Scissors, label: 'Bharat Esports Clip & Reel Studio', path: '/clips' },
    { icon: Shield, label: 'Clan Wars & Squad Command', path: '/clans' },
    { icon: Building2, label: 'Bharat Guild Multi-Sig Treasury', path: '/treasury' },
    { icon: Radio, label: 'Bharat Live Audio Stage & Podcasts', path: '/podcasts' },
    { icon: Rocket, label: 'Bharat Indie Game Launchpad', path: '/launchpad' },
    { icon: Swords, label: 'Esports Scrims & Map Veto', path: '/scrims' },
    { icon: Crosshair, label: 'Clan Scrim Tactics & Playbook', path: '/tactics' },
    { icon: Activity, label: '3D Audio Spectrum & FFT Studio', path: '/spectrum' },
    { icon: Monitor, label: 'Streamer OBS Overlay & HUD Studio', path: '/overlays' },
    { icon: FileText, label: 'Esports Pro Contract & Signing Maker', path: '/contracts' },
    { icon: Wand2, label: 'Bharat AI Art & Thumbnail Studio', path: '/art' },
    { icon: Shirt, label: 'Creator Merchandise & Jersey Studio', path: '/merch' },
    { icon: Disc, label: 'Desi DJ Turntable & Scratch Studio', path: '/dj' },
    { icon: Flame, label: 'Particle Fireworks & Physics Studio', path: '/particles' },
    { icon: Boxes, label: '3D Cyber Café Spatial Metaverse', path: '/metaverse' },
    { icon: Volume2, label: 'Desi Streamer SFX Soundboard', path: '/soundboard' },
    { icon: FileText, label: 'Creator Media Kit & Rate Card', path: '/media-kit' },
    { icon: Sparkles, label: 'Cyber Arcade & Mini-Games', path: '/arcade' },
    { icon: MapPin, label: 'Bharat City Tech Radar', path: '/radar' },
    { icon: Smile, label: 'Desi Meme & Sticker Studio', path: '/meme-studio' },
    { icon: Code2, label: '1v1 Code Duel & Shader Arena', path: '/duel' },
    { icon: Music, label: '3D Synthwave Matrix Studio', path: '/synth' },
    { icon: Languages, label: 'Indic AI Voice & Speech Studio', path: '/voice-ai' },
    { icon: Briefcase, label: 'Bharat Grants & Bounties (₹17.5L)', path: '/bounties' },
    { icon: BarChart3, label: 'Creator Telemetry & UPI Payouts', path: '/analytics' },
    { icon: Video, label: 'Creator Studio Pro', path: '/studio' },
    { icon: Headphones, label: 'Spatial Audio Lounge', path: '/lounge' },
    { icon: Gamepad2, label: 'Indie Bharat Game Hub', path: '/bazaar' },
    { icon: ShoppingBag, label: 'Yor Points Vault', path: '/points-shop' },
    { icon: MessageCircle, label: 'Direct Messages', path: '/messages' },
    { icon: Settings, label: 'Settings & Controls', path: '/settings' },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-start justify-center pt-20 px-4 font-sans"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-xl surface-1 border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Bar Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                <Search className="w-5 h-5 text-primary shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people, routes, or features... (ESC to exit)"
                  className="w-full bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground font-serif"
                />
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
                {/* Users Section */}
                <div>
                  <h4 className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground tracking-wider mb-2 px-2">
                    {query ? 'Matching Profiles' : 'Suggested People'}
                  </h4>
                  <div className="space-y-1">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleNavigate(`/profile/${u.id}`)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted/60 transition-colors text-left group"
                      >
                        <Avatar className="w-9 h-9 border border-border/40 shrink-0">
                          <AvatarImage src={u.avatarUrl} />
                          <AvatarFallback className="font-display font-bold">{u.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{u.displayName}</h5>
                          <p className="text-xs text-muted-foreground font-mono truncate">@{u.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Navigation Section */}
                {!query && (
                  <div>
                    <h4 className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground tracking-wider mb-2 px-2">
                      Quick Navigation
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {quickNav.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => handleNavigate(item.path)}
                            className="flex items-center gap-3 p-3 rounded-2xl surface-1 border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                          >
                            <Icon className="w-4 h-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
                            <span className="font-bold text-xs truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-5 py-2.5 surface-1 border-t border-border/30 flex items-center justify-between text-[0.68rem] font-mono text-muted-foreground">
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-bold text-foreground">Ctrl + K</kbd> anytime to toggle</span>
                <span>Yor Talks Multiverse</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
