import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Droplets, Eye, Activity, Sparkles, 
  CheckCircle2, Flame, Award, Clock, ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function GamerHealthHub() {
  const [waterGlasses, setWaterGlasses] = useState(6);
  const [postureChecked, setPostureChecked] = useState(true);
  const [eyeBreakSeconds, setEyeBreakSeconds] = useState(1200); // 20 min countdown
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // 20-20-20 timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && eyeBreakSeconds > 0) {
      interval = setInterval(() => {
        setEyeBreakSeconds(s => {
          if (s <= 1) {
            sounds.playChime();
            toast.info('👀 20-20-20 Eye Break! Look at an object 20 feet away for 20 seconds.');
            return 1200;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, eyeBreakSeconds]);

  const handleAddWater = () => {
    sounds.playPop();
    setWaterGlasses(w => {
      const nw = Math.min(12, w + 1);
      if (nw === 8) {
        triggerConfetti();
        toast.success('💧 Daily Hydration Target (2.0L) Achieved! +100 Health Karma.');
      }
      return nw;
    });
  };

  const handleCompleteWristStretch = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🧘 Wrist & Finger Stretch Routine Completed! APM fatigue reset.');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Gamer Health, Ergonomics & Wellness</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">20-20-20 Eye Rest, Hydration & High-APM Wrist Ergonomics</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Award className="w-3.5 h-3.5 fill-amber-400" /> Daily Health Karma: +100 XP
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: 20-20-20 Eye Rest Timer */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col justify-between shadow-xl space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl">
                  <Eye className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full">
                  AUTO-CHIME
                </span>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-foreground">20-20-20 Eye Break</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">Prevents digital eye fatigue during scrims</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-border/40 text-center font-mono">
                <span className="text-[0.65rem] text-muted-foreground uppercase block">Next Eye Break In</span>
                <strong className="font-display font-black text-3xl text-cyan-400">{formatTime(eyeBreakSeconds)}</strong>
              </div>
            </div>

            <Button
              onClick={() => {
                sounds.playPop();
                setEyeBreakSeconds(1200);
              }}
              variant="outline"
              className="w-full rounded-2xl font-bold text-xs h-11"
            >
              Reset 20m Timer
            </Button>
          </div>

          {/* Card 2: Hydration Tracker */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col justify-between shadow-xl space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl">
                  <Droplets className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
                  GOAL: 8 GLASSES
                </span>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-foreground">Hydration & Chai Log</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">Maintain brain focus & reaction speeds</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-border/40 text-center font-mono">
                <span className="text-[0.65rem] text-muted-foreground uppercase block">Consumed Today</span>
                <strong className="font-display font-black text-3xl text-blue-400">{waterGlasses} / 8 <span className="text-xs font-normal">Glasses</span></strong>
              </div>
            </div>

            <Button
              onClick={handleAddWater}
              className="w-full rounded-2xl font-bold text-xs h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              <Droplets className="w-4 h-4 mr-1.5" /> +1 Glass Water (250ml)
            </Button>
          </div>

          {/* Card 3: High-APM Wrist Stretch Guide */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col justify-between shadow-xl space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
                  <Activity className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  ERGONOMICS
                </span>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-foreground">High-APM Wrist Stretch</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">Carpi radialis & flexor muscle recovery</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-border/40 text-xs font-mono space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>30s Extensor wrist stretch</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tendons tendon-glide clench</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCompleteWristStretch}
              className="w-full rounded-2xl font-bold text-xs h-11 bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg"
            >
              Complete Stretch (+50 Karma)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
