import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Monitor, Wifi, Thermometer, ShieldCheck, 
  CheckCircle2, Users, Send, Key, Sparkles, Trophy 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface Station {
  id: string;
  name: string;
  assignedPlayer: string;
  ping: string;
  fps: string;
  temp: string;
  status: 'active' | 'standby';
}

const STATIONS: Station[] = [
  { id: 'pc-1', name: 'Battlestation Alpha #1', assignedPlayer: 'Jonathan Gaming (IGL / Entry)', ping: '4ms (Jio Fiber Leased)', fps: '540 FPS (i9 14900KS + RTX 4090)', temp: '21.5°C Ambient', status: 'active' },
  { id: 'pc-2', name: 'Battlestation Alpha #2', assignedPlayer: 'Neyoo (Assault / Support)', ping: '4ms (Jio Fiber Leased)', fps: '520 FPS (i9 14900KS + RTX 4090)', temp: '21.5°C Ambient', status: 'active' },
  { id: 'pc-3', name: 'Battlestation Alpha #3', assignedPlayer: 'Shadow (Fragger)', ping: '5ms (Airtel Black Backup)', fps: '500 FPS (i7 14700K + RTX 4080)', temp: '22.0°C Ambient', status: 'active' },
  { id: 'pc-4', name: 'VOD Review / Coach Deck', assignedPlayer: 'Coach Ghatak (Strategy / Analytics)', ping: '3ms (LAN Direct 10GbE)', fps: 'Dual 4K 144Hz HUD Displays', temp: '21.0°C Ambient', status: 'active' },
];

export default function BootcampAllocator() {
  const [stations, setStations] = useState<Station[]>(STATIONS);

  const handleSyncLockerRoom = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🏢 Bootcamp Facility Pass & 1Gbps Fiber Matrix synced to Clan Discord & Team Biometrics!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Bootcamp Facility Allocator</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">10GbE LAN Stations, 1Gbps Fiber Leased Line & AC Temperature Telemetry</p>
          </div>
        </div>

        <Button
          onClick={handleSyncLockerRoom}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Sync Facility Pass
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-4 font-sans">
          {stations.map((s) => (
            <div
              key={s.id}
              className="surface-1 p-6 rounded-3xl border border-border/40 flex flex-col md:flex-row md:items-center justify-between shadow-xl gap-4"
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-indigo-400 block">{s.name}</span>
                <h3 className="font-display font-black text-lg text-foreground">{s.assignedPlayer}</h3>
                <p className="text-xs font-mono text-muted-foreground">{s.fps} • <strong className="text-emerald-400">{s.ping}</strong></p>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5" /> {s.temp}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> LAN Ready
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
