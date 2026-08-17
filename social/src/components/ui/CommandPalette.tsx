import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserRound, Compass, Home, ShoppingBag, PlusSquare, Settings, Film, MessageCircle, X, Trophy, Video, Headphones, Gamepad2, Crown, Shield, Sparkles, MapPin, Smile, Code2, Music, Briefcase, BarChart3, Swords, Languages, Boxes, Volume2, FileText, Crosshair, Disc, Flame, Wand2, Shirt, TrendingUp, Activity, Monitor, Building2, Rocket, Radio, Scissors, Award, Gavel, GraduationCap, Calendar, Tv, Gift, Heart, Coffee, Key, Keyboard, ArrowRightLeft, Waves, Navigation, ShieldAlert, Presentation, Utensils, Calculator, Eye, Scale, Lock, FileSignature, Grid3X3 } from 'lucide-react';
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
