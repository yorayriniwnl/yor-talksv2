import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Sparkles, Copy, 
  Crown, Shield, Swords, Download, CheckCircle2, Zap, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface CrosshairPreset {
  id: string;
  player: string;
  team: string;
  game: string;
  color: string;
  code: string;
  specs: string;
}

const PRO_CROSSHAIRS: CrosshairPreset[] = [
  { id: 'ch-1', player: 'MORTAL (Naman Mathur)', team: 'Team SouL Esports', game: 'BGMI / Valorant', color: '#00ffcc', code: '0;P;c;5;o;1;d;1;z;3;f;0;0t;1;0l;3;0v;3;0g;1;0o;1;0a;1;0f;0;1b;0', specs: 'Cyan Micro Dot (1-3-1-1)' },
  { id: 'ch-2', player: 'Jonathan Gaming', team: 'GodLike Esports', game: 'BGMI / Valorant', color: '#00ff00', code: '0;s;1;P;c;1;h;0;0t;1;0l;4;0v;4;0g;1;0o;2;0a;1;0f;0;1b;0', specs: 'Classic Static Green Cross (1-4-2-1)' },
  { id: 'ch-3', player: 'Sc0utOP (Tanmay Singh)', team: 'Team XSpark', game: 'BGMI / CS2', color: '#ffff00', code: '0;P;c;4;h;0;d;1;z;2;0t;1;0l;2;0v;2;0g;1;0o;2;0a;1;0f;0;1b;0', specs: 'Yellow High-Precision Center Dot' },
  { id: 'ch-4', player: 'TenZ', team: 'Sentinels Tier-1', game: 'Valorant Tier-1', color: '#00ffff', code: '0;s;1;P;c;5;h;0;m;1;0t;1;0l;4;0v;2;0g;1;0o;2;0a;1;0f;0;1b;0', specs: 'Cyan 1-4-2-2 High-Headshot Ratio' },
];

export default function CrosshairVault() {
  const [crosshairs, setCrosshairs] = useState<CrosshairPreset[]>(PRO_CROSSHAIRS);
  const [activeCrosshair, setActiveCrosshair] = useState('ch-1');

  const handleCopyCode = (code: string, player: string) => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(code);
    toast.success(`🎯 ${player}'s Crosshair Import Code copied to clipboard!`);
  };

  const selected = crosshairs.find(c => c.id === activeCrosshair) || crosshairs[0];

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-emerald-500 to-teal-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Crosshair Customizer & Pro Code Vault</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Tier-1 Esports Presets, Sub-Pixel Crosshairs & 1-Click Game Ingest</p>
          </div>
        </div>

        <Button
          onClick={() => handleCopyCode(selected.code, selected.player)}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy Selected Code
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Crosshairs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {crosshairs.map((c) => {
            const isSelected = activeCrosshair === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveCrosshair(c.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {c.game}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{c.team}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{c.player}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Specs:</strong> {c.specs}</p>
                    <p className="truncate"><strong className="text-cyan-400">Code:</strong> {c.code}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(c.code, c.player);
                    }}
                    className={cn(
                      "w-full rounded-xl font-bold text-xs h-10",
                      isSelected ? "bg-primary text-primary-foreground glow-neon-primary" : "bg-muted text-foreground"
                    )}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy {c.player.split(' ')[0]} Crosshair Code
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
