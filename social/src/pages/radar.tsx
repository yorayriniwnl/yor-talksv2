import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Radio, Users, Briefcase, Flame, Sparkles, 
  ArrowRight, ShieldCheck, Zap, Globe, Compass, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { useLocation } from 'wouter';

interface CityHub {
  id: string;
  name: string;
  state: string;
  tagline: string;
  activeDevs: number;
  liveStreams: number;
  openBountiesINR: number;
  trendingTags: string[];
  bannerUrl: string;
  featuredStudios: string[];
}

const CITY_HUBS: CityHub[] = [
  {
    id: 'bengaluru',
    name: 'Bengaluru (ಬೆಂಗಳೂರು)',
    state: 'Karnataka',
    tagline: 'Silicon Valley of India · AI, WebGL & Spatial Computing Capital',
    activeDevs: 142500,
    liveStreams: 840,
    openBountiesINR: 4500000,
    trendingTags: ['#BangaloreAI', '#UnrealEngineIndia', '#KoramangalaDevs', '#SpatialUI'],
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    featuredStudios: ['Bengaluru Spatial Studios', 'Koramangala Pixel Guild', 'Indiranagar AI Lab']
  },
  {
    id: 'mumbai',
    name: 'Mumbai (मुंबई)',
    state: 'Maharashtra',
    tagline: 'National Esports Arena & Cinematic Bollywood VFX Guild',
    activeDevs: 98200,
    liveStreams: 1240,
    openBountiesINR: 3800000,
    trendingTags: ['#MumbaiEsports', '#BGMIConqueror', '#BandraVFX', '#BollywoodCGI'],
    bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
    featuredStudios: ['Bandra VFX Studios', 'Mumbai Gaming Guild', 'South Bombay Esports']
  },
  {
    id: 'delhi',
    name: 'Delhi-NCR (दिल्ली)',
    state: 'National Capital Region',
    tagline: 'Competitive Tier-1 Tournaments & Creator Production Capital',
    activeDevs: 112000,
    liveStreams: 960,
    openBountiesINR: 3200000,
    trendingTags: ['#DelhiCreators', '#CS2IndiaLeague', '#GurgaonTech', '#NoidaStudios'],
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200&auto=format&fit=crop',
    featuredStudios: ['Delhi Overclock Games', 'CyberHub Studios', 'NCR Esports Clan']
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad (హైదరాబాద్)',
    state: 'Telangana',
    tagline: 'Cyberabad Tech & High-Performance Game Engineering Hub',
    activeDevs: 84000,
    liveStreams: 520,
    openBountiesINR: 2700000,
    trendingTags: ['#CyberabadCode', '#HitecCityDevs', '#GachibowliGaming'],
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop',
    featuredStudios: ['HITEC City Game Works', 'Charminar Pixel Labs']
  },
  {
    id: 'pune',
    name: 'Pune (पुणे)',
    state: 'Maharashtra',
    tagline: 'Oxford of the East · Indie Game Dev & Open Source Circles',
    activeDevs: 64000,
    liveStreams: 340,
    openBountiesINR: 1900000,
    trendingTags: ['#PuneIndies', '#KoregaonParkDesign', '#PuneOpenSource'],
    bannerUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    featuredStudios: ['Pune Indie Guild', 'Baner Code Foundry']
  }
];

export default function Radar() {
  const [, setLocation] = useLocation();
  const [selectedCity, setSelectedCity] = useState(CITY_HUBS[0]);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat City Radar & Tech Hubs</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-Time City Telemetry, Local Creator Streams & Scrims</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Globe className="w-3.5 h-3.5 text-primary" /> 5 National Tech Hubs Live
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* City Selector Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {CITY_HUBS.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                sounds.playPop();
                setSelectedCity(c);
              }}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold shrink-0 transition-all font-sans flex items-center gap-2",
                selectedCity.id === c.id ? "bg-primary text-primary-foreground shadow-lg glow-neon-primary" : "surface-1 text-muted-foreground hover:bg-muted"
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              {c.name}
            </button>
          ))}
        </div>

        {/* Selected City Spotlight Card */}
        <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-2xl relative">
          <div className="h-64 sm:h-72 relative overflow-hidden bg-black">
            <img src={selectedCity.bannerUrl} alt="" className="w-full h-full object-cover opacity-80 transition-transform duration-700 hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 mb-2">
                  <MapPin className="w-3.5 h-3.5" /> {selectedCity.state} · Hub Active
                </span>
                <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight leading-tight">
                  {selectedCity.name}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 font-serif mt-1 max-w-2xl">{selectedCity.tagline}</p>
              </div>

              <Button
                onClick={() => setLocation('/explore')}
                className="rounded-2xl font-bold text-xs px-6 h-11 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
              >
                Teleport to {selectedCity.name.split(' ')[0]} Feed
              </Button>
            </div>
          </div>
        </div>

        {/* City Telemetry Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface-1 p-5 rounded-3xl border border-border/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[0.65rem] font-mono text-muted-foreground uppercase">Active Builders & Gamers</div>
              <div className="font-display font-black text-2xl text-foreground">{selectedCity.activeDevs.toLocaleString()}</div>
            </div>
          </div>

          <div className="surface-1 p-5 rounded-3xl border border-border/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[0.65rem] font-mono text-muted-foreground uppercase">Live Streamers Right Now</div>
              <div className="font-display font-black text-2xl text-rose-500">{selectedCity.liveStreams} Online</div>
            </div>
          </div>

          <div className="surface-1 p-5 rounded-3xl border border-border/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[0.65rem] font-mono text-muted-foreground uppercase">Open Bounties & Grants</div>
              <div className="font-display font-black text-2xl text-amber-400">₹{(selectedCity.openBountiesINR / 100000).toFixed(1)} Lakhs</div>
            </div>
          </div>
        </div>

        {/* Trending Tags & Studios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trending City Tags */}
          <div className="surface-1 p-6 rounded-3xl border border-border/40">
            <div className="showcase-section-title mb-4">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3>Trending City Hashtags</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCity.trendingTags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 rounded-2xl bg-muted/40 border border-border/40 text-xs font-mono font-bold text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Featured Studios */}
          <div className="surface-1 p-6 rounded-3xl border border-border/40">
            <div className="showcase-section-title mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3>Verified Game & Tech Studios</h3>
            </div>
            <div className="space-y-2.5">
              {selectedCity.featuredStudios.map((studio) => (
                <div key={studio} className="p-3 rounded-2xl bg-muted/20 border border-border/30 flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{studio}</span>
                  <span className="text-[0.65rem] font-mono text-emerald-400 font-bold">Verified Studio</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
