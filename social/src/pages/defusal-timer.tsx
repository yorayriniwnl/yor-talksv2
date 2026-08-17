import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bomb, Sparkles, Copy, 
  Play, Pause, RotateCcw, Shield, Swords, CheckCircle2, Zap, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function DefusalTimerHUD() {
  const [timeLeft, setTimeLeft] = useState(45.0);
  const [isRunning, setIsRunning] = useState(false);
  const [defusalProgress, setDefusalProgress] = useState(0);
  const [isDefusing, setIsDefusing] = useState(false);
  const [hasKit, setHasKit] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 0.1) {
            setIsRunning(false);
            sounds.playPop();
            toast.error('💥 SPIKE / BOMB DETONATED! T-Side Wins Round.');
            return 0;
          }
          return parseFloat((t - 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    let defuseInterval: NodeJS.Timeout;
    if (isDefusing && isRunning && timeLeft > 0) {
      const defuseTime = hasKit ? 5.0 : 10.0;
      defuseInterval = setInterval(() => {
        setDefusalProgress(p => {
          const next = p + (100 / (defuseTime * 10));
          if (next >= 100) {
            setIsDefusing(false);
            setIsRunning(false);
            sounds.playChime();
            triggerConfetti();
            toast.success('🛡️ SPIKE / BOMB DEFUSED! CT-Side Clutches the Round.');
            return 100;
          }
          return next;
        });
      }, 100);
    } else {
      setDefusalProgress(0);
    }
    return () => clearInterval(defuseInterval);
  }, [isDefusing, isRunning, timeLeft, hasKit]);

  const handleCopyOBSHUD = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/defusal-timer?kit=${hasKit}&fps=60`);
    toast.success('📋 OBS Studio Transparent 60FPS Spike / Defusal HUD URL copied!');
  };

  const handleReset = () => {
    sounds.playPop();
    setIsRunning(false);
    setIsDefusing(false);
    setTimeLeft(45.0);
    setDefusalProgress(0);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-600 to-amber-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Bomb className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Bomb & Spike Defusal Timer</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">45.00s Tick Countdown, Defuse Kit Thresholds & 60FPS OBS HUD Source</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSHUD}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Spike HUD
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Timer Main Screen */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-mono text-xs font-bold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> SPIKE ARMED • TACTICAL SITE B
          </div>

          <div className="font-display font-black text-7xl md:text-8xl tracking-tight text-red-500">
            {timeLeft.toFixed(1)}<span className="text-2xl text-muted-foreground ml-1 font-mono">s</span>
          </div>

          {/* Defusal Bar */}
          {isDefusing && (
            <div className="max-w-md mx-auto space-y-2">
              <div className="flex justify-between text-xs font-mono text-cyan-400 font-bold">
                <span>Defusing Spike...</span>
                <span>{Math.round(defusalProgress)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden border border-cyan-500/30">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-100" 
                  style={{ width: `${defusalProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
            <Button
              onClick={() => {
                sounds.playPop();
                setIsRunning(!isRunning);
              }}
              className={cn(
                "rounded-2xl font-bold text-xs px-6 h-12 shadow-lg",
                isRunning ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-primary text-primary-foreground glow-neon-primary"
              )}
            >
              {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isRunning ? 'Pause Timer' : 'Plant Spike (Start)'}
            </Button>

            <Button
              disabled={!isRunning || timeLeft <= 0}
              onClick={() => {
                sounds.playPop();
                setIsDefusing(!isDefusing);
              }}
              className="rounded-2xl font-bold text-xs px-6 h-12 bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg"
            >
              <Shield className="w-4 h-4 mr-2" />
              {isDefusing ? 'Stop Defuse' : 'Hold Defuse'}
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              className="rounded-2xl font-mono text-xs px-4 h-12"
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
