import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Play, RotateCcw, Sparkles, Flame, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  passed: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export function CyberRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(4820);
  const [gameOver, setGameOver] = useState(false);

  // Player physics state
  const playerRef = useRef({
    x: 40,
    y: 220,
    w: 24,
    h: 36,
    vy: 0,
    isGrounded: true,
    isSliding: false,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const speedRef = useRef(4);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setGameOver(false);
    speedRef.current = 4;
    playerRef.current = {
      x: 40,
      y: 220,
      w: 24,
      h: 36,
      vy: 0,
      isGrounded: true,
      isSliding: false,
    };
    obstaclesRef.current = [
      { x: 360, y: 226, w: 20, h: 30, passed: false },
      { x: 560, y: 226, w: 20, h: 30, passed: false },
    ];
    coinsRef.current = [
      { x: 450, y: 190, collected: false },
      { x: 650, y: 190, collected: false },
    ];
    setIsPlaying(true);
  };

  const jump = () => {
    if (playerRef.current.isGrounded && isPlaying && !gameOver) {
      sounds.playPop();
      playerRef.current.vy = -11.5;
      playerRef.current.isGrounded = false;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver]);

  // Main 60fps game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      // Clear screen
      ctx.fillStyle = '#06020e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background neon city skyline
      ctx.fillStyle = '#110826';
      ctx.fillRect(40, 110, 50, 150);
      ctx.fillRect(110, 80, 70, 180);
      ctx.fillRect(200, 130, 45, 130);
      ctx.fillRect(260, 95, 60, 165);

      // Draw Ground
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(0, 256, canvas.width, 4);
      ctx.fillStyle = '#0f051d';
      ctx.fillRect(0, 260, canvas.width, 60);

      if (isPlaying && !gameOver) {
        const p = playerRef.current;

        // Apply Gravity
        p.vy += 0.65;
        p.y += p.vy;

        if (p.y >= 220) {
          p.y = 220;
          p.vy = 0;
          p.isGrounded = true;
        }

        // Spawn & Move Obstacles
        speedRef.current += 0.0008; // gradual acceleration
        obstaclesRef.current.forEach((obs) => {
          obs.x -= speedRef.current;

          // Collision check
          if (
            p.x + p.w > obs.x &&
            p.x < obs.x + obs.w &&
            p.y + p.h > obs.y &&
            p.y < obs.y + obs.h
          ) {
            sounds.playGlitch();
            setGameOver(true);
            setIsPlaying(false);
            triggerConfetti();
            toast.success(`⚡ Cyber Rooftop Sprint Over! Final Score: ${score} Pts`);
          }

          if (!obs.passed && obs.x < p.x) {
            obs.passed = true;
            setScore((s) => {
              const ns = s + 100;
              if (ns > highScore) setHighScore(ns);
              return ns;
            });
          }
        });

        // Recycle Obstacles
        if (obstaclesRef.current.length > 0 && obstaclesRef.current[0].x < -40) {
          obstaclesRef.current.shift();
          const lastX = obstaclesRef.current[obstaclesRef.current.length - 1]?.x || 300;
          obstaclesRef.current.push({
            x: lastX + 180 + Math.random() * 120,
            y: 226,
            w: 20,
            h: 30,
            passed: false,
          });
        }

        // Spawn & Move Coins
        coinsRef.current.forEach((c) => {
          c.x -= speedRef.current;
          // Collect check
          if (
            !c.collected &&
            p.x + p.w > c.x - 8 &&
            p.x < c.x + 8 &&
            p.y + p.h > c.y - 8 &&
            p.y < c.y + 8
          ) {
            c.collected = true;
            sounds.playPop();
            setScore((s) => {
              const ns = s + 150;
              if (ns > highScore) setHighScore(ns);
              return ns;
            });
          }
        });

        if (coinsRef.current.length > 0 && coinsRef.current[0].x < -40) {
          coinsRef.current.shift();
          const lastX = coinsRef.current[coinsRef.current.length - 1]?.x || 300;
          coinsRef.current.push({
            x: lastX + 150 + Math.random() * 100,
            y: 180 + Math.random() * 30,
            collected: false,
          });
        }

        // Draw Obstacles
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ef4444';
        obstaclesRef.current.forEach((obs) => {
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        });

        // Draw Coins
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        coinsRef.current.forEach((c) => {
          if (!c.collected) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Draw Player
        ctx.fillStyle = '#06b6d4';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#06b6d4';
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
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Runner Rooftop Sprint
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Jump Over Lasers & Collect Golden Diyas</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Record Sprint</span>
          <strong className="text-amber-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Distance Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Sprint Multiplier</span>
          <span className="font-display font-black text-xl text-emerald-400">
            {isPlaying ? `${(speedRef.current / 3.5).toFixed(1)}x` : '1.0x'}
          </span>
        </div>
      </div>

      {/* 360x280 Canvas Screen */}
      <div
        onClick={jump}
        className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4 cursor-pointer select-none"
      >
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
                <h4 className="font-display font-bold text-lg text-white mb-1">Sprint Ended!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Score: {score} Pts (+{Math.round(score / 4)} Karma)</p>
              </>
            ) : (
              <>
                <Zap className="w-10 h-10 text-cyan-400 mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Neo Rooftop Rush</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Tap screen or press Spacebar / W to Jump!</p>
              </>
            )}

            <Button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> {gameOver ? 'Sprint Again' : 'Engage Rooftop Sprint'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
