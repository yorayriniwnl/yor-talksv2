import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Crosshair, Download, Share2, Sparkles, 
  Trash2, MapPin, CheckCircle2, Users, Flame 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SquadMarker {
  id: string;
  role: string;
  color: string;
  x: number;
  y: number;
}

const TACTICAL_MAPS = [
  { id: 'erangel', name: 'BGMI: Erangel (Pochinki & School)', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop' },
  { id: 'miramar', name: 'BGMI: Miramar (Pecado Stadium)', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop' },
  { id: 'ascent', name: 'Valorant: Ascent (A Site & Mid)', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop' },
];

export default function TacticsWhiteboard() {
  const [selectedMap, setSelectedMap] = useState(TACTICAL_MAPS[0]);
  const [markers, setMarkers] = useState<SquadMarker[]>([
    { id: 'm1', role: 'IGL', color: '#38bdf8', x: 180, y: 140 },
    { id: 'm2', role: 'Entry', color: '#f43f5e', x: 260, y: 160 },
    { id: 'm3', role: 'Sniper', color: '#10b981', x: 120, y: 220 },
    { id: 'm4', role: 'Support', color: '#fbbf24', x: 200, y: 240 },
  ]);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Redraw map and lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines between squad
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    markers.forEach((m, idx) => {
      if (idx === 0) ctx.moveTo(m.x, m.y);
      else ctx.lineTo(m.x, m.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }, [markers]);

  const handleDragMarker = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left));
    const y = Math.max(20, Math.min(rect.height - 20, e.clientY - rect.top));

    setMarkers(prev => prev.map(m => m.id === id ? { ...m, x, y } : m));
  };

  const handleExportStrategy = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Playbook Plan exported to Squad War Room!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Clan Scrim Tactics & Strategy Whiteboard</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">2D Squad Positioning & Attack Vectors Blueprint</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExportStrategy}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export Playbook
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Map Switcher Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {TACTICAL_MAPS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                sounds.playPop();
                setSelectedMap(m);
              }}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold shrink-0 transition-all font-sans flex items-center gap-2",
                selectedMap.id === m.id ? "bg-primary text-primary-foreground shadow-lg glow-neon-primary" : "surface-1 text-muted-foreground hover:bg-muted"
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              {m.name}
            </button>
          ))}
        </div>

        {/* Tactical Interactive Whiteboard Canvas */}
        <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-2xl p-6 select-none relative">
          <div className="relative w-full h-[420px] rounded-2xl overflow-hidden border border-border/60 bg-black">
            {/* Background Map Blueprint */}
            <img src={selectedMap.url} alt="" className="w-full h-full object-cover opacity-50 grayscale" />
            <div className="absolute inset-0 bg-zinc-950/40" />

            {/* Canvas lines */}
            <canvas ref={canvasRef} width={640} height={420} className="absolute inset-0 pointer-events-none w-full h-full" />

            {/* Drag-and-Drop Squad Markers */}
            {markers.map((m) => (
              <div
                key={m.id}
                style={{ left: `${m.x}px`, top: `${m.y}px` }}
                onMouseDown={() => setActiveMarkerId(m.id)}
                onMouseMove={(e) => activeMarkerId === m.id && handleDragMarker(m.id, e)}
                onMouseUp={() => setActiveMarkerId(null)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-20 flex flex-col items-center group"
              >
                <div
                  style={{ backgroundColor: m.color }}
                  className="w-10 h-10 rounded-full text-black flex items-center justify-center font-display font-black text-xs shadow-2xl border-2 border-white group-hover:scale-110 transition-transform"
                >
                  {m.role[0]}
                </div>
                <span className="text-[0.62rem] font-mono font-bold text-white bg-black/80 px-2 py-0.5 rounded-full mt-1 border border-white/20">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
