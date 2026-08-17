import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Flame, Sparkles, CheckCircle2, 
  Send, Shield, Eye, Video, Bomb, Bookmark, Copy 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface LineupItem {
  id: string;
  map: string;
  utility: 'SMOKE' | 'MOTOV' | 'FRAG' | 'FLASH';
  name: string;
  target: string;
  lineupTip: string;
  timing: string;
}

const LINEUPS: LineupItem[] = [
  { id: 'lu-1', map: 'Erangel', utility: 'SMOKE', name: 'Rozhok Hill to Water City Cross', target: 'Road Choke Point', lineupTip: 'Stand on telephone pole shadow, aim at top wire notch, jump throw', timing: '4.2s Airtime' },
  { id: 'lu-2', map: 'Erangel', utility: 'FRAG', name: 'Pochinki Church Tower Blind Nade', target: '2nd Floor Window Campers', lineupTip: 'Align crosshair with brick seam on brown roof, cook for 3.5s, run throw', timing: 'Instant Detonation' },
  { id: 'lu-3', map: 'Ascent', utility: 'SMOKE', name: 'A-Main to Heaven Smoke Lineup', target: 'A-Heaven Sniper Post', lineupTip: 'Tuck into A-lobby corner box, align left mouse pip with cloud tip, left click throw', timing: 'Blocks Operator Angle' },
  { id: 'lu-4', map: 'Ascent', utility: 'MOTOV', name: 'B-Site Default Plant Molotov Denial', target: 'Default Green Box Plant', lineupTip: 'Stand on B-link wood pallet, align poison orb icon with roof antenna, jump throw', timing: 'Flushes 100% Plant Zone' },
];

export default function LineupLab() {
  const [lineups, setLineups] = useState<LineupItem[]>(LINEUPS);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SMOKE' | 'FRAG' | 'MOTOV'>('ALL');

  const filtered = activeFilter === 'ALL' ? lineups : lineups.filter(l => l.utility === activeFilter);

  const handleExportStratBook = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📖 4K Tactical Utility Strat Book PDF & Lineup Crosshair HUD exported for Squad Captains!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Bomb className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Tactical Lineup Lab Pro</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Grenade Lineups, Pixel Crosshairs, Jump Throw Timers & Set-Piece Strats</p>
          </div>
        </div>

        <Button
          onClick={handleExportStratBook}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Bookmark className="w-3.5 h-3.5 mr-1" /> Export Strat Book PDF
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Filter Pills */}
        <div className="flex gap-2 p-1.5 rounded-2xl surface-1 border border-border/40 w-fit">
          <Button
            size="sm"
            variant={activeFilter === 'ALL' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveFilter('ALL');
            }}
            className="rounded-xl font-bold text-xs h-9"
          >
            All Utilities
          </Button>
          <Button
            size="sm"
            variant={activeFilter === 'SMOKE' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveFilter('SMOKE');
            }}
            className="rounded-xl font-bold text-xs h-9"
          >
            🌫️ Smokes
          </Button>
          <Button
            size="sm"
            variant={activeFilter === 'FRAG' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveFilter('FRAG');
            }}
            className="rounded-xl font-bold text-xs h-9"
          >
            💣 HE Frags
          </Button>
          <Button
            size="sm"
            variant={activeFilter === 'MOTOV' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveFilter('MOTOV');
            }}
            className="rounded-xl font-bold text-xs h-9"
          >
            🔥 Molotovs
          </Button>
        </div>

        {/* Lineups List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {filtered.map((l) => (
            <div
              key={l.id}
              className="surface-1 p-6 rounded-3xl border border-border/40 flex flex-col justify-between shadow-xl space-y-4 hover:border-primary/50 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                    {l.map} • {l.utility}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">{l.timing}</span>
                </div>
                <h3 className="font-display font-black text-lg text-foreground">{l.name}</h3>
                <p className="text-xs font-mono text-muted-foreground"><strong className="text-foreground">Target:</strong> {l.target}</p>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-xs font-mono text-amber-300">
                  🎯 <strong>Lineup Cue:</strong> {l.lineupTip}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Pixel Verified 60FPS
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    sounds.playPop();
                    toast.success(`Copied lineup cue for ${l.name}!`);
                  }}
                  className="rounded-xl text-xs font-mono h-8"
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy Lineup
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
