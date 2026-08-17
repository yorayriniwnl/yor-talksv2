import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Play, RotateCcw, Sparkles, Volume2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Platform {
  x: number;
  y: number;
  w: number;
  lit: boolean;
}

export function CyberDiya() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(5200);
  const [gameOver, setGameOver] = useState(false);
  const [diyasLit, setDiyasLit] = useState(0);

  const playerRef = useRef({
    x: 60,
    y: 180,
    vy: 0,
    r: 14,
    grounded: true,
  });

  const platformsRef = useRef<Platform[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setDiyasLit(0);
    setGameOver(false);
    playerRef.current = {
      x: 60,
      y: 180,
      vy: 0,
      r: 14,
      grounded: true,
    };
    platformsRef.current = [
      { x: 40, y: 220, w: 80, lit: true },
      { x: 160, y: 190, w: 70, lit: false },
      { x: 270, y: 160, w: 70, lit: false },
    ];
    setIsPlaying(true);
  };

  const jump = () => {
    if (!isPlaying || gameOver) return;
    sounds.playPop();
    playerRef.current.vy = -7.5;
  };

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      // Midnight Temple Skyline Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#090214');
      grad.addColorStop(0.5, '#1e082b');
      grad.addColorStop(1, '#06010a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw floating temple lotus lamps in distance
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      for (let i = 0; i < 6; i++) {
        const lx = (Date.now() / 30 + i * 60) % canvas.width;
        ctx.beginPath();
        ctx.arc(lx, 100 + Math.sin(Date.now() / 400 + i) * 15, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isPlaying && !gameOver) {
        const p = playerRef.current;

        // Apply Gravity
        p.vy += 0.35;
        p.y += p.vy;

        // Move Platforms leftward
        platformsRef.current.forEach((plat) => {
          plat.x -= 2;

          // Check Player Landing on Platform
          if (
            p.x + p.r > plat.x &&
            p.x - p.r < plat.x + plat.w &&
            p.y + p.r >= plat.y &&
            p.y + p.r <= plat.y + 12 &&
            p.vy > 0
          ) {
            p.y = plat.y - p.r;
            p.vy = 0;

            if (!plat.lit) {
              plat.lit = true;
              sounds.playChime();
              setDiyasLit((d) => d + 1);
              setScore((s) => {
                const ns = s + 250;
                if (ns > highScore) setHighScore(ns);
                return ns;
              });
              toast.success('🪔 TEMPLE DIYA ILLUMINATED! +250 Points');
            }
          }
        });

        // Recycle Platforms
        platformsRef.current.forEach((plat) => {
          if (plat.x + plat.w < 0) {
            plat.x = canvas.width + 20 + Math.random() * 40;
            plat.y = 140 + Math.random() * 90;
            plat.lit = false;
          }
        });

        // Fall Death Check
        if (p.y > canvas.height + 20) {
          sounds.playGlitch();
          setGameOver(true);
          setIsPlaying(false);
          triggerConfetti();
          toast.success(`✨ Diwali Light Flight Complete! Final Score: ${score} Pts`);
        }

        // Draw Platforms & Lotus Diyas
        platformsRef.current.forEach((plat) => {
          ctx.fillStyle = '#27103d';
          ctx.fillRect(plat.x, plat.y, plat.w, 10);

          // Draw Diya on Platform
          ctx.fillStyle = plat.lit ? '#fbbf24' : '#52525b';
          ctx.beginPath();
          ctx.arc(plat.x + plat.w / 2, plat.y - 4, 6, 0, Math.PI);
          ctx.fill();

          if (plat.lit) {
            ctx.fillStyle = '#f43f5e';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#f59e0b';
            ctx.beginPath();
            ctx.arc(plat.x + plat.w / 2, plat.y - 8, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });

        // Draw Player Diya
        ctx.fillStyle = '#f59e0b';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#f59e0b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Golden Flame Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 3, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, highScore, score]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-red-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Deepavali Diya Light Runner
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Jump Across Floating Lotus Platforms & Light Temple Diyas</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Best Flight</span>
          <strong className="text-amber-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Diyas Lit</span>
          <span className="font-display font-black text-xl text-amber-400">🪔 {diyasLit} Diyas</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4 select-none">
        <canvas
          ref={canvasRef}
          width={360}
          height={280}
          onClick={jump}
          className="w-full max-w-[360px] h-[280px] block cursor-pointer"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <Flame className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
            <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Diya Runner</h4>
            <p className="text-xs text-zinc-400 mb-4 font-mono">Click or press jump to leap between lotus platforms and illuminate temple lamps!</p>

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> Launch Diya Runner
            </Button>
          </div>
        )}
      </div>

      {/* Jump Control */}
      <Button
        onClick={jump}
        className="w-full rounded-2xl font-bold text-xs h-12 bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg"
      >
        ✨ Jump & Float (Spacebar / Tap)
      </Button>
    </div>
  );
}
