import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Trophy, Play, RotateCcw, Volume2, 
  Flame, Sparkles, Shield, Compass, Navigation 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface TrafficCar {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

export default function RickshawDrift() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(5400);
  const [nitro, setNitro] = useState(100);
  const [gameOver, setGameOver] = useState(false);

  // Rickshaw physics
  const playerRef = useRef({
    x: 170,
    y: 210,
    w: 24,
    h: 36,
    vx: 0,
    speed: 4,
  });

  const trafficRef = useRef<TrafficCar[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setNitro(100);
    setGameOver(false);
    playerRef.current = {
      x: 170,
      y: 210,
      w: 24,
      h: 36,
      vx: 0,
      speed: 4,
    };
    trafficRef.current = [
      { x: 120, y: -40, w: 22, h: 32, speed: 2 },
      { x: 210, y: -160, w: 22, h: 32, speed: 2.5 },
    ];
    setIsPlaying(true);
  };

  const steer = (dir: 'left' | 'right') => {
    if (!isPlaying || gameOver) return;
    sounds.playPop();
    playerRef.current.x += dir === 'left' ? -25 : 25;
    playerRef.current.x = Math.max(70, Math.min(270, playerRef.current.x));
  };

  const playHorn = () => {
    sounds.playChime();
    toast.info('📯 PPOOOOO PPOOOO! Desi Pressure Horn Honked!');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') steer('left');
      if (e.code === 'KeyD' || e.code === 'ArrowRight') steer('right');
      if (e.code === 'KeyH') playHorn();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver]);

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let roadOffset = 0;

    const loop = () => {
      // Clear Screen
      ctx.fillStyle = '#06020e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Highway Asphalt
      ctx.fillStyle = '#130a24';
      ctx.fillRect(60, 0, 240, canvas.height);

      // Road Borders
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(56, 0, 4, canvas.height);
      ctx.fillRect(300, 0, 4, canvas.height);

      // Moving Road Dashes
      roadOffset = (roadOffset + 5) % 30;
      ctx.fillStyle = '#fbbf24';
      for (let y = -30 + roadOffset; y < canvas.height; y += 30) {
        ctx.fillRect(178, y, 4, 15);
      }

      if (isPlaying && !gameOver) {
        const p = playerRef.current;

        // Move Traffic
        trafficRef.current.forEach((t) => {
          t.y += t.speed + 2;

          // Check Collision
          if (
            p.x + p.w > t.x &&
            p.x < t.x + t.w &&
            p.y + p.h > t.y &&
            p.y < t.y + t.h
          ) {
            sounds.playGlitch();
            setGameOver(true);
            setIsPlaying(false);
            triggerConfetti();
            toast.success(`⚡ Rickshaw Highway Drift Over! Score: ${score} Pts`);
          }
        });

        // Recycle Traffic
        trafficRef.current.forEach((t) => {
          if (t.y > canvas.height + 20) {
            t.y = -50 - Math.random() * 80;
            t.x = 80 + Math.random() * 190;
            setScore((s) => {
              const ns = s + 150;
              if (ns > highScore) setHighScore(ns);
              return ns;
            });
          }
        });

        // Draw Traffic Cars
        ctx.fillStyle = '#06b6d4';
        trafficRef.current.forEach((t) => {
          ctx.fillRect(t.x, t.y, t.w, t.h);
        });

        // Draw Cyber Rickshaw
        ctx.fillStyle = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#f59e0b';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, highScore, score]);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-red-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Cyber Auto-Rickshaw Highway Drift</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Neon Bengaluru Sea Link High-Speed Drift Simulator</p>
          </div>
        </div>

        <Button onClick={playHorn} variant="outline" className="rounded-2xl text-xs font-mono">
          <Volume2 className="w-3.5 h-3.5 mr-1" /> Pressure Horn (H)
        </Button>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
            <div>
              <span className="text-muted-foreground uppercase text-[0.6rem] block">Drift Score</span>
              <span className="font-display font-black text-xl text-primary">{score}</span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase text-[0.6rem] block">High Score</span>
              <span className="font-display font-black text-xl text-amber-400">{highScore} Pts</span>
            </div>
          </div>

          {/* Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4 select-none">
            <canvas
              ref={canvasRef}
              width={360}
              height={280}
              className="w-full max-w-[360px] h-[280px] block"
            />

            {!isPlaying && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                {gameOver ? (
                  <>
                    <Trophy className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
                    <h4 className="font-display font-bold text-lg text-white mb-1">Drift Crash!</h4>
                    <p className="text-xs text-zinc-400 mb-4 font-mono">Score: {score} Pts (+{Math.round(score / 4)} Karma)</p>
                  </>
                ) : (
                  <>
                    <Zap className="w-10 h-10 text-amber-400 mb-2" />
                    <h4 className="font-display font-bold text-lg text-white mb-1">Silk Board Cyber Drift</h4>
                    <p className="text-xs text-zinc-400 mb-4 font-mono">Steer with A/D or Arrow keys. Dodge cyber cabs!</p>
                  </>
                )}

                <Button
                  onClick={startGame}
                  className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                >
                  <Play className="w-4 h-4 mr-1.5 fill-white" /> {gameOver ? 'Restart Drift' : 'Launch Rickshaw Drift'}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Steer Controls */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => steer('left')}
              variant="outline"
              className="rounded-2xl h-12 text-xs font-bold font-mono"
            >
              ⬅️ Steer Left (A)
            </Button>
            <Button
              onClick={() => steer('right')}
              variant="outline"
              className="rounded-2xl h-12 text-xs font-bold font-mono"
            >
              Steer Right (D) ➡️
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
