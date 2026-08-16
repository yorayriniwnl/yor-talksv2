import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Sliders, Flame, RotateCcw, Zap, 
  Palette, Play, RefreshCw, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

const PALETTES = [
  { id: 'diwali', name: 'Diwali Golden Laser 🎆', colors: ['#f59e0b', '#fbbf24', '#f43f5e', '#ffffff'] },
  { id: 'cyber', name: 'Bengaluru Cyber Neon ⚡', colors: ['#06b6d4', '#a855f7', '#ec4899', '#3b82f6'] },
  { id: 'holi', name: 'Holi Color Splash 🎨', colors: ['#ec4899', '#8b5cf6', '#10b981', '#f59e0b'] },
  { id: 'saffron', name: 'Bharat Saffron Glow 🇮🇳', colors: ['#f97316', '#ffffff', '#10b981', '#38bdf8'] },
];

export default function ParticleSandbox() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPalette, setSelectedPalette] = useState(PALETTES[0]);
  const [particleCount, setParticleCount] = useState(400);
  const [gravityInverted, setGravityInverted] = useState(false);

  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; isDown: boolean }>({ x: 360, y: 180, isDown: false });

  // Init particles
  const initParticles = (count: number, palette: typeof PALETTES[0]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 1.5 + Math.random() * 3,
        color: palette.colors[Math.floor(Math.random() * palette.colors.length)],
        alpha: 0.6 + Math.random() * 0.4
      });
    }
    particlesRef.current = list;
  };

  useEffect(() => {
    initParticles(particleCount, selectedPalette);
  }, [particleCount, selectedPalette]);

  // Main Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      ctx.fillStyle = 'rgba(5, 5, 10, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particlesRef.current.forEach((p) => {
        // Gravitational attraction toward mouse
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.hypot(dx, dy) || 1;

        const force = Math.min(6, 120 / dist);
        const angle = Math.atan2(dy, dx);

        const gMul = gravityInverted ? -1 : 1;
        p.vx += Math.cos(angle) * force * 0.08 * gMul;
        p.vy += Math.sin(angle) * force * 0.08 * gMul;

        // Friction & damping
        p.vx *= 0.98;
        p.vy *= 0.98;

        p.x += p.vx;
        p.y += p.vy;

        // Screen wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animId);
  }, [gravityInverted]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  };

  const triggerFireworksBlast = () => {
    sounds.playPop();
    triggerConfetti();
    toast.success('🎆 Diwali Laser Fireworks Supernova Triggered!');

    // Scatter particles violently
    particlesRef.current.forEach((p) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 12 + Math.random() * 16;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Particle Fireworks & Physics Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-time WebGL & Canvas Gravity Vortex Simulator</p>
          </div>
        </div>

        <Button
          onClick={triggerFireworksBlast}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" /> Blast Supernova Fireworks
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Interactive Canvas */}
        <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-2xl relative">
          <canvas
            ref={canvasRef}
            width={720}
            height={360}
            onMouseMove={handleMouseMove}
            className="w-full h-80 block bg-zinc-950 cursor-crosshair"
          />
        </div>

        {/* Studio Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Palette Chooser */}
          <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
            <div className="showcase-section-title">
              <Palette className="w-4 h-4 text-primary" />
              <h3>Particle Palette & Laser Glow</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  onClick={() => {
                    sounds.playPop();
                    setSelectedPalette(pal);
                  }}
                  className={cn(
                    "p-3 rounded-2xl border text-xs font-bold text-left transition-all",
                    selectedPalette.id === pal.id ? "border-primary bg-primary/20 shadow-md" : "border-border/40 hover:bg-muted/40"
                  )}
                >
                  <span className="text-foreground block">{pal.name}</span>
                  <div className="flex gap-1.5 mt-2">
                    {pal.colors.map((c, idx) => (
                      <span key={idx} style={{ backgroundColor: c }} className="w-3 h-3 rounded-full inline-block" />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Physics Modifiers */}
          <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-6 shadow-sm">
            <div className="showcase-section-title">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3>Vortex & Gravity Physics</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Particle Density</span>
                <span className="text-primary font-bold">{particleCount} Particles</span>
              </div>
              <input
                type="range"
                min="100"
                max="800"
                step="50"
                value={particleCount}
                onChange={(e) => setParticleCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <Button
              onClick={() => {
                sounds.playPop();
                setGravityInverted(!gravityInverted);
              }}
              variant="outline"
              className="w-full rounded-2xl font-bold text-xs h-11"
            >
              <Zap className="w-3.5 h-3.5 mr-1 text-amber-400" />
              {gravityInverted ? 'Gravity Mode: Repel Force (Inverted)' : 'Gravity Mode: Attract to Cursor'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
