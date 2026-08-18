import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X,
  Home, Compass, Film, MessageCircle, Bell, User, Users, FileText,
  Video, Radio, Scissors, Tv, Briefcase, Shirt, Box, Monitor, Layers, Sparkles, BarChart3, Volume2, Mic, Headphones, Cast,
  Trophy, Swords, Activity, Target, ArrowRightLeft, Award, Medal, GraduationCap, ShieldAlert, Calendar, Key, Gavel,
  Gamepad2, Boxes, ShoppingBag, Navigation, Music, Disc, Smile, Code2, Brain, Wand2,
  Store, ShoppingCart, Coins, Ticket, Shield, Building2, FileSignature, HandCoins, Heart, Crown, Star,
  LayoutDashboard, Settings, MapPin, Keyboard, HeartPulse, Mic2, Rocket, Coffee, TrendingUp
} from 'lucide-react';
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

  const navigationGroups = [
    {
      label: 'Core & Social',
      items: [
        { icon: Home, label: 'Home Feed', path: '/' },
        { icon: Compass, label: 'Explore Grid', path: '/explore' },
        { icon: Film, label: 'Reels Swiper', path: '/videos' },
        { icon: MessageCircle, label: 'Direct Messages', path: '/messages' },
        { icon: Bell, label: 'Notifications', path: '/notifications' },
        { icon: User, label: 'Profile', path: '/profile' },
        { icon: Users, label: 'Communities', path: '/communities' },
        { icon: FileText, label: 'Articles', path: '/articles' },
      ]
    },
    {
      label: 'Creator & Studio',
      items: [
        { icon: Video, label: 'Creator Studio Pro', path: '/studio' },
        { icon: Radio, label: 'Live Broadcast', path: '/live' },
        { icon: Scissors, label: 'Bharat Esports Clip & Reel Studio', path: '/clips' },
        { icon: Tv, label: 'Clan Scrims VOD Review & Annotator', path: '/vods' },
        { icon: Briefcase, label: 'Creator Media Kit & Rate Card', path: '/media-kit' },
        { icon: Shirt, label: 'Creator Merchandise & Jersey Studio', path: '/merch' },
        { icon: Box, label: 'Hologram Studio', path: '/hologram' },
        { icon: Monitor, label: 'Streamer Chroma Studio & Virtual Sets', path: '/chroma-studio' },
        { icon: Layers, label: 'Overlay Studio', path: '/overlay-studio' },
        { icon: Sparkles, label: 'Streamer AI Highlights & Auto-Subtitler', path: '/highlights' },
        { icon: BarChart3, label: 'Creator Analytics', path: '/creator-analytics' },
        { icon: Volume2, label: 'Desi Streamer SFX Soundboard', path: '/soundboard' },
        { icon: Mic, label: 'Streamer Voice FX & Audio Modulator', path: '/voice-fx' },
        { icon: Headphones, label: 'Streamer Acoustic Room & Soundproof Lab', path: '/acoustics' },
        { icon: Cast, label: 'Bharat Multistream & Restreamer Studio', path: '/multistream' },
      ]
    },
    {
      label: 'Esports & Competitive',
      items: [
        { icon: Trophy, label: 'Bharat Esports Tournaments', path: '/tournaments' },
        { icon: Swords, label: 'Esports Scrims & Map Veto', path: '/scrims' },
        { icon: Activity, label: 'Esports Match Scoreboard & HUD Studio', path: '/scoreboard' },
        { icon: Target, label: 'Clan Scrim Tactics & Playbook', path: '/tactics' },
        { icon: Search, label: 'Esports Talent & Scouting Radar', path: '/scouting' },
        { icon: ArrowRightLeft, label: 'Esports Player Transfer Portal & Trade', path: '/transfers' },
        { icon: Award, label: 'National Clan Power Rankings', path: '/rankings' },
        { icon: Medal, label: 'Virtual Trophy Room & Hall of Fame', path: '/trophies' },
        { icon: GraduationCap, label: 'Bharat Esports Academy & Masterclasses', path: '/academy' },
        { icon: ShieldAlert, label: 'Bharat Esports Anti-Cheat Watchtower', path: '/anticheat' },
        { icon: Calendar, label: 'Bharat Esports Match Schedule & Calendar', path: '/calendar' },
        { icon: Key, label: 'Bharat Custom Scrims Room & Matchmaker', path: '/rooms' },
        { icon: Gavel, label: 'Bharat Premier Cricket Mega Auction', path: '/auction' },
      ]
    },
    {
      label: 'Interactive & Entertainment',
      items: [
        { icon: Gamepad2, label: 'Cyber Arcade & Mini-Games', path: '/arcade' },
        { icon: Boxes, label: '3D Cyber Café Spatial Metaverse', path: '/metaverse' },
        { icon: ShoppingBag, label: 'Indie Bharat Game Hub', path: '/bazaar' },
        { icon: Navigation, label: 'Desi Cyber Auto-Rickshaw Drift', path: '/drift' },
        { icon: Activity, label: 'Hawkeye Cricket Bowling & Speed Lab', path: '/cricket-lab' },
        { icon: Music, label: '3D Synthwave Matrix Studio', path: '/synth-room' },
        { icon: Disc, label: 'Desi DJ Turntable & Scratch Studio', path: '/turntable' },
        { icon: Music, label: 'Desi Tabla & Dholak Percussion Synthesizer', path: '/tabla-synth' },
        { icon: Smile, label: 'Desi Meme & Sticker Studio', path: '/meme-studio' },
        { icon: Code2, label: '1v1 Code Duel & Shader Arena', path: '/code-duel' },
        { icon: Brain, label: 'AI Hub', path: '/ai' },
        { icon: Wand2, label: 'Bharat AI Art & Thumbnail Studio', path: '/ai-art' },
        { icon: Mic, label: 'Indic AI Voice & Speech Studio', path: '/voice-ai' },
        { icon: Sparkles, label: 'Particle Fireworks & Physics Studio', path: '/particles' },
        { icon: Activity, label: '3D Audio Spectrum & FFT Studio', path: '/spectrum' },
      ]
    },
    {
      label: 'Economy & Guilds',
      items: [
        { icon: Store, label: 'Marketplace', path: '/marketplace' },
        { icon: ShoppingCart, label: 'Bharat Creator Merch Storefront', path: '/store' },
        { icon: Coins, label: 'Yor Points Vault', path: '/points-shop' },
        { icon: Ticket, label: 'Battle Pass', path: '/pass' },
        { icon: Shield, label: 'Clan Wars & Squad Command', path: '/clans' },
        { icon: Building2, label: 'Bharat Guild Multi-Sig Treasury', path: '/treasury' },
        { icon: FileSignature, label: 'Esports Pro Contract & Signing Maker', path: '/contracts' },
        { icon: HandCoins, label: 'Bharat Grants & Bounties (₹17.5L)', path: '/bounties' },
        { icon: Heart, label: 'Live Stream Superchat & Desi Dhol Studio', path: '/superchat' },
        { icon: Crown, label: 'Creator Fan Club & VIP Memberships', path: '/fanclub' },
        { icon: Star, label: 'Achievements', path: '/achievements' },
      ]
    },
    {
      label: 'Utility & Settings',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Settings, label: 'Settings & Controls', path: '/settings' },
        { icon: MapPin, label: 'Bharat City Tech Radar', path: '/radar' },
        { icon: Keyboard, label: 'Gamer Mechanical RGB Gear Customizer', path: '/gear' },
        { icon: HeartPulse, label: 'Gamer Health & Ergonomics Hub', path: '/health' },
        { icon: Mic2, label: 'Bharat Squad Voice Comms & Matrix', path: '/comms' },
        { icon: Radio, label: 'Bharat Live Audio Stage & Podcasts', path: '/podcasts' },
        { icon: Rocket, label: 'Bharat Indie Game Launchpad', path: '/launchpad' },
        { icon: Calendar, label: 'Events', path: '/events' },
        { icon: Coffee, label: 'Desi Chai Stall & Kullad Brew Simulator', path: '/chai' },
        { icon: Headphones, label: 'Spatial Audio Lounge', path: '/lounge' },
        { icon: Shirt, label: 'Bharat Esports Jersey 3D Studio', path: '/jersey-customizer' },
        { icon: TrendingUp, label: 'Esports Pick\'em & Predictions', path: '/predictions' },
      ]
    }
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

              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
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

                {/* Navigation Groups Section */}
                {!query && navigationGroups.map((group) => (
                  <div key={group.label}>
                    <h4 className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground tracking-wider mb-2 px-2">
                      {group.label}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map((item) => {
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
                ))}
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
