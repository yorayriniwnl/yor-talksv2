import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, Activity, Sparkles, CheckCircle2, 
  ShieldCheck, Heart, AlertCircle, Play, RotateCcw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function PostureAIHub() {
  const [isTracking, setIsTracking] = useState(true);
  const [neckAngle, setNeckAngle] = useState(8);
  const [spineScore, setSpineScore] = useState(94);

  const handleCorrectPosture = () => {
    sounds.playChime();
    triggerConfetti();
    setNeckAngle(4);
    setSpineScore(98);
    toast.success('🧘 Perfect Ergonomic Alignment Locked! +100 Gamer Health Karma');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Gamer Ergonomics & Posture Vision AI</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-Time Neck Tilt, Spine Alignment & Eye Distance Calibrator</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Vision AI: CALIBRATED
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Ergonomic Telemetry Bar */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Neck Tilt Angle</span>
            <strong className="font-display font-black text-2xl text-emerald-400">{neckAngle}° (Optimal)</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Spine Alignment Score</span>
            <strong className="font-display font-black text-2xl text-primary">{spineScore}%</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Eye-to-Monitor Distance</span>
            <strong className="font-display font-black text-2xl text-emerald-400">62 cm Safe</strong>
          </div>
        </div>

        {/* Posture Simulation Sandbox */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl max-w-xl mx-auto text-center font-sans">
          <div className="showcase-section-title justify-center">
            <Heart className="w-4 h-4 text-emerald-400" />
            <h3>Desk Ergonomic Correction Drill</h3>
          </div>

          <p className="text-xs font-mono text-muted-foreground">
            Maintaining a 0-10° neck forward tilt prevents gamer hunch and wrist strain during intense competitive matches.
          </p>

          <Button
            onClick={handleCorrectPosture}
            className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Re-Align Posture (+100 Karma)
          </Button>
        </div>
      </div>
    </div>
  );
}
