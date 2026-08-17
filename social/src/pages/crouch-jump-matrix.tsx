import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Footprints 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface JumpTier {
  id: string;
  jumpType: string;
  game: string;
  elevationGain: string;
  audioSignature: string;
  executionTechnique: string;
}

const JUMP_TIERS: JumpTier[] = [
  { id: 'jp-1', jumpType: 'Dust 2 Mid Xbox Crouch-Jump Boost', game: 'CS2 Tier-1 Scrims', elevationGain: '+64 Units Vertical Clearance', audioSignature: '0 dB (Silent landing if shift-tapped before impact)', executionTechnique: 'W + Space + Ctrl simultaneous trigger into Catwalk leap' },
  { id: 'jp-2', jumpType: 'Ascent Catwalk Green Box Solo Climb', game: 'Valorant Tier-1', elevationGain: '+72 Units Box Elevation', audioSignature: 'Silent jump-crouch friction grab on box ledge lip', executionTechnique: 'Run jump at 45° angle with instantaneous crouch key latch' },
  { id: 'jp-3', jumpType: 'Mirage Window to Short Silent Drop', game: 'CS2 Pro Scrims', elevationGain: 'Downward Silent Velocity Cancel', audioSignature: '0 dB Occlusion (Cancels fall thud audio radius)', executionTechnique: 'Crouch sliding on outer wood sill edge before descent' },
];

export default function CrouchJumpMatrix() {
  const [jumps, setJumps] = useState<JumpTier[]>(JUMP_TIERS);
  const [activeJump, setActiveJump] = useState('jp-1');

  const handleExportJumpStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Crouch-Jump & Silent-Drop Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ArrowUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Crouch-Jump & Silent-Drop Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Elevation Boosts, 0 dB Silent Landings, Ledge Grabs & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportJumpStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Movement Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Jump Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {jumps.map((j) => {
            const isSelected = activeJump === j.id;
            return (
              <div
                key={j.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveJump(j.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {j.game}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{j.elevationGain}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{j.jumpType}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Audio:</strong> {j.audioSignature}</p>
                    <p><strong className="text-amber-400">Technique:</strong> {j.executionTechnique}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Movement Route' : 'Inspect Physics'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
