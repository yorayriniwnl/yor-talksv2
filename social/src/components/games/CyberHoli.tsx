import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, Flame, Zap, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
}

interface Target {
  x: number;
  y: number;
  r: number;
  color: string;
  pts: number;
}

const COLORS = ['#f43f5e', '#fbbf24', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6'];

export function CyberHoli() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(6200);
  const [gameOver, setGameOver] = useState(false);
  const [activeColor, setActiveColor] = useState('#f43f5e');

  const particlesRef = useRef<Particle[]>([]);
  const targetsRef = useRef<Target[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setGameOver(false);
    particlesRef.current = [];
    targetsRef.current = [
      { x: 90, y: 70, r: 24, color: '#f43f5e', pts: 150 },
      { x: 270, y: 70, r: 24, color: '#fbbf24', pts: 150 },
      { x: 180, y: 140, r: 30, color: '#06b6d4', pts: 300 },
    ];
    setIsPlaying(true);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    sounds.playPop();

    // Spawn 25 colored Gulal particles
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: activeColor,
        radius: 3 + Math.random() * 5,
        alpha: 1,
      });
    }

    // Check target hit
    targetsRef.current.forEach((t, idx) => {
      const dx = x - t.x;
      const dy = y - t.y;
      if (Math.sqrt(dx * dx + dy * dy) <= t.r) {
        sounds.playChime();
        t.color = activeColor;
        setScore((s) => {
          const ns = s + t.pts;
          if (ns > highScore) setHighScore(ns);
          return ns;
        });
      }
    });
  };

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      // Dark canvas fade
      ctx.fillStyle = 'rgba(6, 2, 14, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Targets
      targetsRef.current.forEach((t) => {
        ctx.fillStyle = t.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      if (isPlaying && !gameOver) {
        // Move & draw Gulal particles
        particlesRef.current.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.02;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          if (p.alpha <= 0) {
            particlesRef.current.splice(idx, 1);
          }
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, activeColor]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Holi Color Splatter
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Splatter Cyber Gulal & Colorize Holographic Orbs</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Best Splatter</span>
          <strong className="text-amber-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Splatter Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Active Gulal Color</span>
          <span className="font-bold uppercase" style={{ color: activeColor }}>
            {activeColor}
          </span>
        </div>
      </div>

      {/* Color Palette Selector */}
      <div className="flex items-center justify-center gap-2 p-2 rounded-2xl bg-zinc-950 border border-border/40 mb-3 select-none">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              sounds.playPop();
              setActiveColor(c);
            }}
            className={cn(
              "w-8 h-8 rounded-xl border-2 transition-all active:scale-90",
              activeColor === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4 select-none">
        <canvas
          ref={canvasRef}
          width={360}
          height={280}
          onClick={handleCanvasClick}
          className="w-full max-w-[360px] h-[280px] block cursor-crosshair"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <Palette className="w-10 h-10 text-pink-400 mb-2" />
            <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Holi Splatter</h4>
            <p className="text-xs text-zinc-400 mb-4 font-mono">Click or tap canvas to burst vibrant cyber colors!</p>

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> Start Holi Splatter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
