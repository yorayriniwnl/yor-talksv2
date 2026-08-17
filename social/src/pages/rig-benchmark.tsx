import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, Monitor, Zap, Award, Sparkles, 
  CheckCircle2, ShieldCheck, Download, HardDrive 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface RigSpec {
  id: string;
  category: string;
  hardware: string;
  benchmark: string;
  rating: 'Tier 1 Pro' | 'Esports Ready';
}

const RIG_SPECS: RigSpec[] = [
  { id: 'r-1', category: 'Processor (CPU)', hardware: 'AMD Ryzen 7 7800X3D (8C/16T)', benchmark: '540 FPS Average in Valorant', rating: 'Tier 1 Pro' },
  { id: 'r-2', category: 'Graphics (GPU)', hardware: 'NVIDIA GeForce RTX 4080 Super 16GB', benchmark: 'NVENC 4K60 AV1 Stream Load 8%', rating: 'Tier 1 Pro' },
  { id: 'r-3', category: 'Display Monitor', hardware: 'ZOWIE XL2566K 360Hz DyAc+ 24.5"', benchmark: '0.5ms Response Time Fast TN', rating: 'Tier 1 Pro' },
  { id: 'r-4', category: 'Gaming Mouse', hardware: 'Razer Viper V3 Pro (8000Hz Polling)', benchmark: '0.125ms Sub-Tick Wireless', rating: 'Tier 1 Pro' },
];

export default function RigBenchmark() {
  const [battlestationScore, setBattlestationScore] = useState(99.2);

  const handleExportRigBadge = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🏅 Verified Pro Battlestation Rig Badge pinned to your Yor Talks Profile!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Battlestation & Rig Benchmark</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">360Hz Display Benchmarks, 8000Hz Polling & NVENC AV1 Telemetry</p>
          </div>
        </div>

        <Button
          onClick={handleExportRigBadge}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Award className="w-3.5 h-3.5 mr-1" /> Pin Rig Badge to Profile
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Scorecard */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 text-center shadow-2xl space-y-2 relative overflow-hidden bg-gradient-to-b from-cyan-500/10 to-transparent">
          <span className="text-xs font-mono uppercase text-muted-foreground tracking-widest block">National Battlestation Benchmark Index</span>
          <h2 className="font-display font-black text-6xl text-primary drop-shadow-md">{battlestationScore} / 100</h2>
          <p className="text-xs font-mono text-cyan-400 font-bold">Top 0.5% Competitive Esports Streaming Hardware in India</p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {RIG_SPECS.map((r) => (
            <div
              key={r.id}
              className="surface-1 p-6 rounded-3xl border border-border/40 flex items-center justify-between shadow-xl"
            >
              <div className="space-y-1">
                <span className="text-[0.65rem] font-mono text-muted-foreground uppercase block">{r.category}</span>
                <h4 className="font-display font-bold text-base text-foreground">{r.hardware}</h4>
                <p className="text-xs font-mono text-primary font-bold">{r.benchmark}</p>
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs">
                {r.rating}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
