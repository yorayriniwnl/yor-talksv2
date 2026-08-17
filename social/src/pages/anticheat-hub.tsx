import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, ShieldCheck, Activity, Cpu, 
  Terminal, Lock, AlertTriangle, Gavel, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface AnomalyLog {
  id: string;
  player: string;
  game: string;
  anomalyType: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  banned: boolean;
}

const LOGS: AnomalyLog[] = [
  { id: 'an-1', player: 'CyberNinja_99', game: 'Valorant', anomalyType: 'Sub-tick Linear Aimbot Flick (0.2ms curve)', severity: 'HIGH', timestamp: '14:22:01 IST', banned: false },
  { id: 'an-2', player: 'X_GhostSniper', game: 'BGMI', anomalyType: 'Recoil Table Memory Tamper Hook', severity: 'HIGH', timestamp: '14:18:44 IST', banned: false },
  { id: 'an-3', player: 'SpeedDemon_IN', game: 'CS2 Bharat', anomalyType: 'Hardware DMA Bus Anomaly', severity: 'MEDIUM', timestamp: '14:10:12 IST', banned: false },
];

export default function AntiCheatWatchtower() {
  const [logs, setLogs] = useState<AnomalyLog[]>(LOGS);
  const [driverStatus] = useState<'ACTIVE' | 'OFFLINE'>('ACTIVE');

  const handleIssueHWIDBan = (id: string, player: string) => {
    sounds.playGlitch();
    triggerConfetti();
    setLogs(prev => prev.map(l => l.id === id ? { ...l, banned: true } : l));
    toast.error(`🔨 HWID Permanent Ban Dispatched for ${player}! Match forfeited.`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Esports Anti-Cheat Watchtower</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Kernel Ring-0 Heartbeat, DMA Telemetry & HWID Ban Authority</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Ring-0 Driver: ACTIVE
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Real-Time Integrity Bar */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Monitored Tournament Roster</span>
            <strong className="font-display font-black text-2xl text-primary">128 Players</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Sub-Tick Mouse Analysis</span>
            <strong className="font-display font-black text-2xl text-emerald-400">1000 Hz Normal</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Active Ban Authority</span>
            <strong className="font-display font-black text-2xl text-rose-500">Ring-0 Enforced</strong>
          </div>
        </div>

        {/* Anomaly Detections Feed */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3>Flagged Mouse & Memory Anomalies</h3>
          </div>

          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "surface-1 p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md transition-all",
                  log.banned ? "border-zinc-800 opacity-60 bg-zinc-950/50" : "border-rose-500/40 bg-rose-500/5"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[0.62rem] font-mono font-bold">
                      {log.severity} RISK
                    </span>
                    <strong className="font-display font-black text-base text-foreground">{log.player}</strong>
                    <span className="text-xs font-mono text-muted-foreground">({log.game})</span>
                  </div>
                  <p className="text-xs font-mono text-rose-300">{log.anomalyType}</p>
                  <span className="text-[0.65rem] font-mono text-muted-foreground block">Timestamp: {log.timestamp}</span>
                </div>

                <div>
                  {log.banned ? (
                    <span className="px-4 py-2 rounded-2xl bg-zinc-900 text-zinc-400 font-mono font-bold text-xs flex items-center gap-1.5">
                      <Gavel className="w-4 h-4 text-rose-500" /> HWID BANNED
                    </span>
                  ) : (
                    <Button
                      onClick={() => handleIssueHWIDBan(log.id, log.player)}
                      className="rounded-2xl font-bold text-xs h-11 px-5 bg-rose-600 hover:bg-rose-700 text-white shadow-lg"
                    >
                      <Gavel className="w-4 h-4 mr-1.5" /> Enforce HWID Ban
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
