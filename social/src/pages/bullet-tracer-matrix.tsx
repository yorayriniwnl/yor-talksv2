import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Crosshair, Eye, EyeOff 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface TracerSetup {
  id: string;
  weaponType: string;
  game: string;
  tracerVisibility: string;
  smokeDissipationWindow: string;
  tacticalAdvantage: string;
}

const TRACER_SETUPS: TracerSetup[] = [
  { id: 'bt-1', weaponType: 'M4A1-S Suppressed Stealth Carbine', game: 'CS2 Tier-1', tracerVisibility: '0.00% Zero Visible Bullet Tracers Through Smoke', smokeDissipationWindow: 'No Cavity Illumination Vector Created', tacticalAdvantage: 'Enables 100% Undetected Smoke Spamming & Anti-Spam Safety' },
  { id: 'bt-2', weaponType: 'M4A4 & AK-47 Unsuppressed Rifles', game: 'CS2 Tier-1', tracerVisibility: '100% Bright Visible Glowing Tracers Every 3rd Round', smokeDissipationWindow: '1.40s Continuous Tracer Vector Position Reveal', tacticalAdvantage: 'High Risk of Immediate Blind Return Headshot Spams' },
  { id: 'bt-3', weaponType: 'Phantom Suppressed Silenced Rifle', game: 'Valorant Scrims', tracerVisibility: 'Zero Tracers & No Directional Hit Sound Indicators', smokeDissipationWindow: '0.00s Zero Smoke Bloom Trail', tacticalAdvantage: 'Supreme Viper Pit & Smoke Defense Choke Spamming' },
];

export default function BulletTracerMatrix() {
  const [tracers, setTracers] = useState<TracerSetup[]>(TRACER_SETUPS);
  const [activeTracer, setActiveTracer] = useState('bt-1');

  const handleExportTracerStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Bullet Tracer & Smoke Visibility Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bullet Tracer & Stealth Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.00% Suppressed Tracers, 1.40s AK-47 Smoke Vector Tells & Anti-Spam Angles</p>
          </div>
        </div>

        <Button
          onClick={handleExportTracerStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Tracer Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Tracers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {tracers.map((t) => {
            const isSelected = activeTracer === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveTracer(t.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {t.game}
                    </span>
                    <span className="text-xs font-mono text-sky-400 font-bold">{t.tracerVisibility}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{t.weaponType}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Vector:</strong> {t.smokeDissipationWindow}</p>
                    <p><strong className="text-sky-400">Impact:</strong> {t.tacticalAdvantage}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Tracer Profile' : 'Inspect Smoke Stealth'}
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
