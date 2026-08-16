import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Trophy, Play, RotateCcw, Sparkles, Shield, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Bullet {
  x: number;
  y: number;
  vy: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  color: string;
}

export function CyberStarfighter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [highScore, setHighScore] = useState(4800);
  const [gameOver, setGameOver] = useState(false);

  // Player position
  const playerRef = useRef({ x: 150, y: 260, speed: 6 });
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const enemySpawnTimerRef = useRef<number>(0);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setHealth(100);
    setGameOver(false);
    playerRef.current = { x: 150, y: 260, speed: 6 };
    bulletsRef.current = [];
    enemiesRef.current = [];
    enemySpawnTimerRef.current = 0;
    setIsPlaying(true);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (e.key === ' ' && isPlaying && !gameOver) {
        e.preventDefault();
        fireLaser();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, gameOver]);

  const fireLaser = () => {
    sounds.playPop();
    bulletsRef.current.push({
      x: playerRef.current.x,
      y: playerRef.current.y - 12,
      vy: -9
    });
  };

  // Main Canvas Physics & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield background
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 25; i++) {
        const sx = (Math.sin(i * 99 + Date.now() * 0.001) * 0.5 + 0.5) * canvas.width;
        const sy = (Math.cos(i * 33 + Date.now() * 0.002) * 0.5 + 0.5) * canvas.height;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      if (isPlaying && !gameOver) {
        // Move player
        if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
          playerRef.current.x = Math.max(15, playerRef.current.x - playerRef.current.speed);
        }
        if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
          playerRef.current.x = Math.min(canvas.width - 15, playerRef.current.x + playerRef.current.speed);
        }

        // Spawn Enemies
        enemySpawnTimerRef.current++;
        if (enemySpawnTimerRef.current % 40 === 0) {
          enemiesRef.current.push({
            id: Date.now() + Math.random(),
            x: 20 + Math.random() * (canvas.width - 40),
            y: -20,
            vx: (Math.random() - 0.5) * 2,
            vy: 2 + Math.random() * 2,
            hp: 2,
            color: Math.random() > 0.5 ? '#ec4899' : '#06b6d4'
          });
        }

        // Update Bullets
        bulletsRef.current.forEach((b, bi) => {
          b.y += b.vy;
          ctx.fillStyle = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#38bdf8';
          ctx.fillRect(b.x - 2, b.y, 4, 10);
          ctx.shadowBlur = 0;

          // Check bullet-enemy collisions
          enemiesRef.current.forEach((enemy, ei) => {
            const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
            if (dist < 18) {
              bulletsRef.current.splice(bi, 1);
              enemy.hp--;
              if (enemy.hp <= 0) {
                sounds.playPop();
                enemiesRef.current.splice(ei, 1);
                setScore(s => s + 150);
              }
            }
          });
        });
        bulletsRef.current = bulletsRef.current.filter(b => b.y > -20);

        // Update Enemies
        enemiesRef.current.forEach((enemy, ei) => {
          enemy.y += enemy.vy;
          enemy.x += enemy.vx;

          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
          ctx.fill();

          // Check player collision
          const pDist = Math.hypot(playerRef.current.x - enemy.x, playerRef.current.y - enemy.y);
          if (pDist < 20) {
            enemiesRef.current.splice(ei, 1);
            sounds.playGlitch();
            setHealth(h => {
              const nh = h - 25;
              if (nh <= 0) {
                setGameOver(true);
                setIsPlaying(false);
                triggerConfetti();
                toast.success('Mission Debrief: Score submitted to National Starfighter Leaderboard!');
              }
              return Math.max(0, nh);
            });
          }
        });
        enemiesRef.current = enemiesRef.current.filter(e => e.y < canvas.height + 30);

        // Draw Player Ship (ISRO Cyber Starfighter)
        const px = playerRef.current.x;
        const py = playerRef.current.y;

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(px, py - 16);
        ctx.lineTo(px + 14, py + 12);
        ctx.lineTo(px, py + 6);
        ctx.lineTo(px - 14, py + 12);
        ctx.closePath();
        ctx.fill();

        // Engine glow
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, py + 10, 4 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              ISRO Cyber Starfighter (Arcade)
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Retro Space Combat & Laser Defense</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[0.62rem]">All-Time Record</div>
          <div className="font-bold text-cyan-400">{Math.max(highScore, score)} Pts</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Combat Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Hull Shield</span>
          <span className={cn("font-display font-black text-xl", health > 30 ? "text-emerald-400" : "text-rose-500 animate-pulse")}>
            {health}%
          </span>
        </div>
      </div>

      {/* Canvas Screen */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-full max-w-[320px] h-[320px] block"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            {gameOver ? (
              <>
                <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Mission Concluded!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Final Score: {score} Points (+{Math.round(score / 5)} Karma)</p>
              </>
            ) : (
              <>
                <Zap className="w-12 h-12 text-cyan-400 mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Defend the Orbit!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Use A/D or Arrow keys to steer & Spacebar to fire plasma lasers!</p>
              </>
            )}

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-cyan-500 hover:bg-cyan-600 text-black glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-black" /> {gameOver ? 'Launch Next Sortie' : 'Engage Starfighter'}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Controls / Action Bar */}
      {isPlaying && !gameOver && (
        <div className="flex gap-2">
          <Button
            onClick={() => {
              playerRef.current.x = Math.max(15, playerRef.current.x - 20);
            }}
            variant="outline"
            className="flex-1 h-12 rounded-2xl font-bold text-sm"
          >
            ◀ Move Left
          </Button>

          <Button
            onClick={fireLaser}
            className="flex-1 h-12 rounded-2xl font-bold text-sm bg-primary text-primary-foreground glow-neon-primary"
          >
            🔥 FIRE LASER
          </Button>

          <Button
            onClick={() => {
              playerRef.current.x = Math.min(305, playerRef.current.x + 20);
            }}
            variant="outline"
            className="flex-1 h-12 rounded-2xl font-bold text-sm"
          >
            Move Right ▶
          </Button>
        </div>
      )}
    </div>
  );
}
