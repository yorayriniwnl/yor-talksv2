import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Activity, ShieldCheck, CheckCircle2, 
  Send, Sparkles, Trophy, Users, BarChart3, Target 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface TacticalPoint {
  id: string;
  category: string;
  metric: string;
  analysis: string;
  status: 'optimal' | 'warning' | 'critical';
}

const TACTICS: TacticalPoint[] = [
  { id: 'tp-1', category: 'Site A Retake', metric: '84.2% Flash Utility Efficiency', analysis: 'Skye Pop-Flash blinded 3 defenders consistently', status: 'optimal' },
  { id: 'tp-2', category: 'Mid Aggression', metric: '61.8% First Blood Conversion', analysis: 'Jett Dash Entry secured opening kill in 8/12 attack rounds', status: 'optimal' },
  { id: 'tp-3', category: 'Eco Round Force', metric: 'Stinger / Sheriff Force-Buy Loss', analysis: 'High economy deficit during round 4 post-pistol loss', status: 'warning' },
];

export default function CoachLab() {
  const handleDispatchPlan = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📋 Pro Coaching Match Blueprint dispatched to Team Soul & GodLike Captains on Discord & WhatsApp!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Coach Tactical Review Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Heatmap Analytics, Utility Efficiency & Roster Blueprint Dispatch</p>
          </div>
        </div>

        <Button
          onClick={handleDispatchPlan}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Dispatch Match Plan
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-4 font-sans">
          {TACTICS.map((t) => (
            <div
              key={t.id}
              className={cn(
                "surface-1 p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between shadow-xl gap-4",
                t.status === 'optimal' ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"
              )}
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-emerald-400 block">{t.category}</span>
                <h3 className="font-display font-black text-lg text-foreground">{t.metric}</h3>
                <p className="text-xs font-mono text-muted-foreground">{t.analysis}</p>
              </div>

              <span className={cn(
                "px-3 py-1.5 rounded-xl font-mono font-bold text-xs flex items-center gap-1 w-fit",
                t.status === 'optimal' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
              )}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {t.status === 'optimal' ? 'Optimal Strategy' : 'Review Required'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
