import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Percent, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface RetakeTier {
  id: string;
  scenario: string;
  game: string;
  retakeOdds: string;
  utilityImpact: string;
  defuseProtocol: string;
}

const RETAKE_TIERS: RetakeTier[] = [
  { id: 'rt-1', scenario: '5v4 Defenders Man-Advantage (A-Site Ascent)', game: 'Valorant Tier-1', retakeOdds: '72% Win Probability', utilityImpact: 'Double Flash + Smoke Heaven boosts retake conversion to 88%', defuseProtocol: 'Half-defuse tap at 22s remaining forces attacker peek into crossfire' },
  { id: 'rt-2', scenario: '3v3 Even Retake (B-Site Bind)', game: 'Valorant / CS2', retakeOdds: '48% Win Probability', utilityImpact: 'Molly on default spike plant stalls defuse by 8.5s', defuseProtocol: 'Smoked defuse with flash assist is required to counter post-plant spam' },
  { id: 'rt-3', scenario: '2v4 Disadvantaged Hero Retake (C-Site Haven)', game: 'Valorant / Scrims', retakeOdds: '22% Win Probability', utilityImpact: 'Initiator Recon dart required to isolate first isolation duel', defuseProtocol: 'Save weapons recommended if time is under 18s without tap' },
];

export default function PlantRetakeMatrix() {
  const [scenarios, setScenarios] = useState<RetakeTier[]>(RETAKE_TIERS);
  const [activeScenario, setActiveScenario] = useState('rt-1');

  const handleExportRetakeStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📊 Tactical Bomb Plant & Retake Probability Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-primary text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Bomb Plant & Retake Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Man-Advantage Odds, Lineup Delay Timings, Half-Defuse Protocols & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportRetakeStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Retake Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Scenario Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {scenarios.map((s) => {
            const isSelected = activeScenario === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveScenario(s.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {s.game}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{s.retakeOdds}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.scenario}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Utility Impact:</strong> {s.utilityImpact}</p>
                    <p><strong className="text-amber-400">Defuse Protocol:</strong> {s.defuseProtocol}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Retake Scenario' : 'Calculate Probabilities'}
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
