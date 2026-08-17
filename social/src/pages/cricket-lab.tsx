import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Zap, Sliders, RotateCcw, 
  Sparkles, CheckCircle2, Play, Trophy, Shield 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function CricketLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState([145]);
  const [delivery, setDelivery] = useState<'inswinger' | 'outswinger' | 'yorker' | 'bouncer'>('inswinger');
  const [pitchResult, setPitchResult] = useState<string | null>(null);

  const handleSimulateDelivery = () => {
    sounds.playPop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset pitch
    ctx.fillStyle = '#10061e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw 22-yard Pitch
    ctx.fillStyle = '#221138';
    ctx.fillRect(100, 20, 160, 240);

    // Draw Stumps
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(170, 240, 20, 8);

    // Simulate Hawkeye trajectory arc
    ctx.strokeStyle = delivery === 'inswinger' ? '#06b6d4' : delivery === 'yorker' ? '#f43f5e' : '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180, 20);

    const devX = delivery === 'inswinger' ? 165 : delivery === 'outswinger' ? 195 : 180;
    const devY = delivery === 'yorker' ? 235 : delivery === 'bouncer' ? 120 : 180;

    ctx.quadraticCurveTo(devX, devY, 180, 240);
    ctx.stroke();

    // Draw Impact Spot
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(devX, devY, 6, 0, Math.PI * 2);
    ctx.fill();

    sounds.playChime();
    setPitchResult(`${speed[0]} km/h ${delivery.toUpperCase()} pitching at Good Length / Off-Stump Channel!`);
    toast.success(`🏏 Delivery fired at ${speed[0]} km/h! Hawkeye trajectory locked.`);
  };

  useEffect(() => {
    handleSimulateDelivery();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Hawkeye Cricket Bowling & Pitch Velocity Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">150+ km/h Speed Radar, Swing Trajectory & Pitch Impact Map</p>
          </div>
        </div>

        <Button
          onClick={handleSimulateDelivery}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Play className="w-3.5 h-3.5 mr-1" /> Fire Delivery
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Hawkeye Pitch Visualizer */}
          <div className="md:col-span-7 surface-1 rounded-3xl p-6 border border-border/40 shadow-xl space-y-4">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-primary font-bold">22-YARD HAWKEYE PROJECTION</span>
              <span className="text-amber-400 font-bold">{speed[0]} KM/H RADAR</span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center">
              <canvas ref={canvasRef} width={360} height={280} className="w-full max-w-[360px] h-[280px] block" />
            </div>

            {pitchResult && (
              <div className="p-3 rounded-2xl bg-zinc-950 border border-border/40 font-mono text-xs text-center text-emerald-400">
                {pitchResult}
              </div>
            )}
          </div>

          {/* Delivery Configuration Controls */}
          <div className="md:col-span-5 space-y-4 font-sans">
            {/* Speed Slider */}
            <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-4 shadow-sm font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground uppercase text-[0.65rem]">Ball Release Speed:</span>
                <strong className="text-emerald-400 font-display font-black text-base">{speed[0]} km/h</strong>
              </div>
              <Slider
                value={speed}
                onValueChange={(val) => setSpeed(val)}
                min={110}
                max={160}
                step={1}
                className="w-full"
              />
            </div>

            {/* Delivery Type Selector */}
            <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-3 shadow-sm font-mono text-xs">
              <span className="text-muted-foreground uppercase text-[0.65rem] block">Delivery Seam & Variation:</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'inswinger', label: 'In-Swinger ⚡' },
                  { id: 'outswinger', label: 'Out-Swinger 🎯' },
                  { id: 'yorker', label: 'Toe-Crusher Yorker 💥' },
                  { id: 'bouncer', label: 'Chin-Music Bouncer 💨' },
                ].map((d) => (
                  <Button
                    key={d.id}
                    size="sm"
                    variant={delivery === d.id ? 'default' : 'outline'}
                    onClick={() => {
                      sounds.playPop();
                      setDelivery(d.id as any);
                    }}
                    className={cn("rounded-xl text-xs font-bold", delivery === d.id && "bg-primary text-primary-foreground")}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
