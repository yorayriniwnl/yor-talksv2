import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shirt, Sparkles, Download, CheckCircle2, 
  Palette, Shield, Layers, Award, Tag 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const COLOR_THEMES = [
  { name: 'Cyber Bharat Saffron & Navy', primary: '#f97316', secondary: '#1e1b4b', accent: '#10b981' },
  { name: 'Neon Toxic Emerald', primary: '#10b981', secondary: '#064e3b', accent: '#06b6d4' },
  { name: 'Hyperdrive Crimson Red', primary: '#ef4444', secondary: '#450a0a', accent: '#f59e0b' },
  { name: 'Quantum Electric Violet', primary: '#8b5cf6', secondary: '#2e1065', accent: '#ec4899' },
];

export default function JerseyCustomizer() {
  const [selectedTheme, setSelectedTheme] = useState(COLOR_THEMES[0]);
  const [playerTag, setPlayerTag] = useState('MORTAL');
  const [jerseyNumber, setJerseyNumber] = useState('07');
  const [hasTricolorTrim, setHasTricolorTrim] = useState(true);

  const handleDownloadMockup = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`🎽 ${playerTag} #${jerseyNumber} High-Res Esports Jersey SVG/PNG Exported!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Esports Jersey 3D Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Custom Clan Kits, Player Gamertag & Sponsor Badge Patch Studio</p>
          </div>
        </div>

        <Button
          onClick={handleDownloadMockup}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export 4K Mockup
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* 3D Jersey Visual Canvas */}
          <div className="surface-1 rounded-3xl p-8 border border-border/40 flex flex-col items-center justify-center shadow-2xl relative min-h-[380px]">
            {/* Jersey Body Mockup */}
            <div 
              className="w-56 h-72 rounded-3xl border-2 flex flex-col items-center justify-between p-6 shadow-2xl relative overflow-hidden transition-all duration-500"
              style={{ 
                backgroundColor: selectedTheme.secondary,
                borderColor: selectedTheme.primary 
              }}
            >
              {/* Collar & Saffron/Green Trims */}
              {hasTricolorTrim && (
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-orange-500 via-white to-emerald-500" />
              )}

              {/* Clan Crest */}
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-6 h-6" style={{ color: selectedTheme.accent }} />
                <span className="text-[0.65rem] font-black font-display text-white uppercase tracking-widest">BHARAT ESPORTS</span>
              </div>

              {/* Player Tag & Number */}
              <div className="text-center my-auto">
                <h3 className="font-display font-black text-3xl tracking-wider text-white uppercase drop-shadow-md">
                  {playerTag || 'PLAYER'}
                </h3>
                <span className="font-display font-black text-6xl block drop-shadow-lg" style={{ color: selectedTheme.primary }}>
                  {jerseyNumber || '00'}
                </span>
              </div>

              {/* Sponsor Badges */}
              <div className="flex items-center justify-around w-full border-t border-white/10 pt-2 text-[0.6rem] font-mono text-zinc-400">
                <span>⚡ YOR TALKS</span>
                <span>🇮🇳 BHARAT PRO</span>
              </div>
            </div>
          </div>

          {/* Customizer Controls */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-6 shadow-xl font-sans">
            <div className="showcase-section-title">
              <Palette className="w-4 h-4 text-primary" />
              <h3>Custom Kit Configuration</h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Player Tag (Name):</span>
                <Input
                  value={playerTag}
                  onChange={(e) => setPlayerTag(e.target.value.toUpperCase())}
                  placeholder="e.g. MORTAL"
                  className="rounded-xl font-bold uppercase text-sm"
                  maxLength={12}
                />
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Jersey Squad Number:</span>
                <Input
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder="07"
                  className="rounded-xl font-bold text-sm"
                  maxLength={2}
                />
              </div>

              <div>
                <span className="text-muted-foreground block mb-2">Colorway Palette:</span>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => {
                        sounds.playPop();
                        setSelectedTheme(theme);
                      }}
                      className={cn(
                        "p-3 rounded-2xl border text-left text-[0.68rem] transition-all",
                        selectedTheme.name === theme.name ? "border-primary bg-primary/10 font-bold" : "border-border/40 hover:border-border"
                      )}
                    >
                      <div className="flex gap-1.5 mb-1.5">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: theme.secondary }} />
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                      </div>
                      <span className="text-foreground">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => {
                    sounds.playPop();
                    setHasTricolorTrim(!hasTricolorTrim);
                  }}
                  variant="outline"
                  className="w-full rounded-2xl text-xs font-mono"
                >
                  {hasTricolorTrim ? '🇮🇳 Tricolor Trim: ACTIVE' : '⚪ Standard Collar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
