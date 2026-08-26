import { 
  Key, Lock, Users, Shield,
  CheckCircle2, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Slot {
  slotNum: number;
  clanName: string;
  claimedBy: string;
  isLocked: boolean;
}

const INITIAL_SLOTS: Slot[] = [
  { slotNum: 1, clanName: 'GodLike Esports 🔱', claimedBy: 'Captain Shadow', isLocked: true },
  { slotNum: 2, clanName: 'Team Soul 👑', claimedBy: 'Mortal Soul', isLocked: true },
  { slotNum: 3, clanName: 'Global Esports 🚀', claimedBy: 'Hellranger', isLocked: true },
  { slotNum: 4, clanName: 'Reckoning Esports ⚔️', claimedBy: 'Skrossi', isLocked: true },
  { slotNum: 5, clanName: 'Open Slot (Click to Claim)', claimedBy: 'Available', isLocked: false },
  { slotNum: 6, clanName: 'Open Slot (Click to Claim)', claimedBy: 'Available', isLocked: false },
];

export default function CustomRoomLobby() {
  const slots = INITIAL_SLOTS;

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Custom Scrims Room & Slot Matchmaker</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Room allocation preview · live tournament service is not connected</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> Match Starts: 18:30 IST
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Room Key Vault */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-xl space-y-4 max-w-2xl mx-auto text-center font-sans">
          <div className="showcase-section-title justify-center">
            <Shield className="w-4 h-4 text-primary" />
            <h3>Encrypted Tournament Room Vault</h3>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-950 border border-border/40 font-mono text-sm space-y-3">
            <div className="py-4 space-y-3">
              <Lock className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
              <p className="text-xs text-muted-foreground">Room credentials are issued only by the tournament service after a verified captain is assigned to a live match.</p>
              <span className="mx-auto inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[0.65rem] font-mono font-bold text-amber-300">No active room credentials</span>
            </div>
          </div>
        </div>

        {/* 25 Slots Roster */}
        <div className="space-y-4">
          <div className="showcase-section-title">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3>Squad slot distribution preview</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slots.map((s) => (
              <div
                key={s.slotNum}
                className={cn(
                  "surface-1 p-4 rounded-2xl border flex items-center justify-between transition-all",
                  s.isLocked ? "border-border/40" : "border-dashed border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3 font-sans">
                  <span className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center font-mono font-bold text-xs text-primary">
                    #{s.slotNum}
                  </span>
                  <div>
                    <h4 className="font-display font-bold text-sm text-foreground">{s.clanName}</h4>
                    <span className="text-[0.65rem] font-mono text-muted-foreground">Leader: {s.claimedBy}</span>
                  </div>
                </div>

                {s.isLocked ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[0.65rem] font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Locked
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled
                    className="rounded-xl font-bold text-xs h-9 bg-muted text-muted-foreground"
                  >
                    Allocation unavailable
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
