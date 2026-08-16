import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, ShieldCheck, Crown, Trophy, Copy, Share2, 
  Flame, Zap, Compass, CheckCircle2, Eye, Palette 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const RARITY_THEMES = [
  { id: 'gold', name: 'Mythic Gold 🏆', border: 'from-amber-400 via-yellow-200 to-amber-600', glow: 'shadow-[0_0_35px_rgba(245,158,11,0.4)]', badge: 'Tier-1 Mythic' },
  { id: 'saffron', name: 'Bharat Saffron Laser 🇮🇳', border: 'from-orange-500 via-white to-emerald-500', glow: 'shadow-[0_0_35px_rgba(249,115,22,0.4)]', badge: 'National Pioneer' },
  { id: 'cosmic', name: 'Cosmic Obsidian 🌌', border: 'from-purple-500 via-pink-500 to-cyan-400', glow: 'shadow-[0_0_35px_rgba(168,85,247,0.4)]', badge: 'Galaxy Legend' },
  { id: 'emerald', name: 'Cyberpunk Emerald ⚡', border: 'from-emerald-400 via-teal-300 to-cyan-500', glow: 'shadow-[0_0_35px_rgba(16,185,129,0.4)]', badge: 'Code Grandmaster' },
];

export default function HologramStudio() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [selectedTheme, setSelectedTheme] = useState(RARITY_THEMES[0]);

  // 3D Parallax Tilt State
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -15;
    const rY = ((x - centerX) / centerX) * 15;

    setRotateX(rX);
    setRotateY(rY);
    setGlarePos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos({ x: 50, y: 50 });
  };

  const handleCopyEmbed = () => {
    sounds.playPop();
    navigator.clipboard.writeText(`<iframe src="https://yortalks.in/holo/${currentUser?.username || 'ayush'}" width="380" height="520" frameborder="0"></iframe>`);
    toast.success('3D Holographic Card Embed Code copied to clipboard!');
  };

  const handleShare = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('Holographic Pass Link generated & copied!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">3D Spatial Hologram Card Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Gyroscopic 3D Parallax & Foil Specular Card Generator</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCopyEmbed}
            variant="outline"
            className="rounded-2xl font-bold text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-1" /> Embed Code
          </Button>

          <Button
            size="sm"
            onClick={handleShare}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" /> Share Pass
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Interactive 3D Card Preview Column */}
          <div className="lg:col-span-6 flex justify-center perspective-[1000px] py-6">
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                transition: 'transform 0.1s ease-out',
                transformStyle: 'preserve-3d'
              }}
              className={cn(
                "relative w-80 h-[480px] rounded-3xl p-1 bg-gradient-to-tr cursor-pointer transition-all duration-300",
                selectedTheme.border,
                selectedTheme.glow
              )}
            >
              {/* Inner Card Container */}
              <div className="relative w-full h-full rounded-[22px] bg-zinc-950/95 overflow-hidden p-6 flex flex-col justify-between border border-white/10">
                {/* Dynamic Foil Glare Reflection */}
                <div
                  style={{
                    background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.22) 0%, transparent 60%)`
                  }}
                  className="absolute inset-0 pointer-events-none z-20"
                />

                {/* Card Top Header */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[0.68rem] font-mono uppercase font-bold tracking-widest text-emerald-400">
                      LIVE ON YOR
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[0.62rem] font-mono font-bold bg-white/10 border border-white/20 text-white">
                    {selectedTheme.badge}
                  </span>
                </div>

                {/* Avatar & Title */}
                <div className="relative z-10 text-center space-y-3 my-auto">
                  <div className="relative inline-block">
                    <Avatar className="w-24 h-24 mx-auto border-2 border-amber-400/80 shadow-2xl">
                      <AvatarImage src={currentUser?.avatarUrl} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-xs shadow-lg">
                      🔱
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-black text-xl text-white tracking-wide">
                      {currentUser?.displayName || 'Ayush Roy'}
                    </h3>
                    <p className="text-xs font-mono text-zinc-400">@{currentUser?.username || 'ayush'}</p>
                  </div>
                </div>

                {/* Card Bottom Stats */}
                <div className="relative z-10 space-y-3 pt-3 border-t border-white/10 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[0.6rem] text-zinc-400 block uppercase">Guild Level</span>
                      <strong className="text-amber-400 font-display font-bold text-sm">LVL 48</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[0.6rem] text-zinc-400 block uppercase">Code ELO</span>
                      <strong className="text-cyan-400 font-display font-bold text-sm">2,420 GM</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[0.65rem] text-zinc-400">
                    <span>YOR TALKS · BHARAT 🇮🇳</span>
                    <span>VERIFIED CREATOR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Theme Customizer Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-4">
              <div className="showcase-section-title">
                <Palette className="w-4 h-4 text-primary" />
                <h3>Select Hologram Foil Rarity</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RARITY_THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedTheme(th);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all duration-200 space-y-1",
                      selectedTheme.id === th.id ? "border-primary bg-primary/20 shadow-md scale-102" : "border-border/40 hover:bg-muted/40"
                    )}
                  >
                    <span className="font-bold text-xs text-foreground block">{th.name}</span>
                    <span className="text-[0.65rem] font-mono text-muted-foreground">{th.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-3">
              <div className="showcase-section-title">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3>Holographic Security Stamping</h3>
              </div>
              <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                Your 3D card features cryptographic timestamping directly linked to your on-chain Yor Points & Guild Badge achievements. Move your mouse or tilt your device to view the dynamic gyroscopic light refraction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
