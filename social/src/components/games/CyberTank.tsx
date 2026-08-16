import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Trophy, Play, RotateCcw, Sparkles, Flame, Zap, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
}

interface EnemyTank {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
}

export function CyberTank() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(1200);
  const [gameOver, setGameOver] = useState(false);

  // Player tank state
  const playerRef = useRef({
    x: 160,
    y: 260,
    angle: -Math.PI / 2,
    turretAngle: -Math.PI / 2,
    speed: 2.2,
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<EnemyTank[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setGameOver(false);
    playerRef.current = {
      x: 160,
      y: 260,
      angle: -Math.PI / 2,
      turretAngle: -Math.PI / 2,
      speed: 2.2,
    };
    bulletsRef.current = [];

    // Spawn 3 enemy drones
    enemiesRef.current = [
      { x: 60, y: 60, vx: 1.2, vy: 0.8, hp: 2 },
      { x: 260, y: 60, vx: -1.2, vy: 0.8, hp: 2 },
      { x: 160, y: 40, vx: 0.8, vy: 1.2, hp: 2 },
    ];

    setIsPlaying(true);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
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
  }, []);

  const fireShell = () => {
    if (!isPlaying || gameOver) return;
    sounds.playPop();
    const p = playerRef.current;
    bulletsRef.current.push({
      x: p.x + Math.cos(p.turretAngle) * 16,
      y: p.y + Math.sin(p.turretAngle) * 16,
      vx: Math.cos(p.turretAngle) * 6,
      vy: Math.sin(p.turretAngle) * 6,
      bounces: 2,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const p = playerRef.current;
    p.turretAngle = Math.atan2(mouseY - p.y, mouseX - p.x);
  };

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      ctx.fillStyle = '#05020c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isPlaying && !gameOver) {
        const p = playerRef.current;

        // Tank movement (WASD)
        if (keysRef.current['w'] || keysRef.current['W'] || keysRef.current['ArrowUp']) {
          p.y -= p.speed;
          p.angle = -Math.PI / 2;
        }
        if (keysRef.current['s'] || keysRef.current['S'] || keysRef.current['ArrowDown']) {
          p.y += p.speed;
          p.angle = Math.PI / 2;
        }
        if (keysRef.current['a'] || keysRef.current['A'] || keysRef.current['ArrowLeft']) {
          p.x -= p.speed;
          p.angle = Math.PI;
        }
        if (keysRef.current['d'] || keysRef.current['D'] || keysRef.current['ArrowRight']) {
          p.x += p.speed;
          p.angle = 0;
        }

        // Clamp boundaries
        p.x = Math.max(16, Math.min(canvas.width - 16, p.x));
        p.y = Math.max(16, Math.min(canvas.height - 16, p.y));

        // Draw Player Tank Body
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-12, -12, 24, 24);

        // Treads
        ctx.fillStyle = '#065f46';
        ctx.fillRect(-15, -14, 5, 28);
        ctx.fillRect(10, -14, 5, 28);

        // Turret Barrel
        ctx.rotate(p.turretAngle);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(0, -3, 18, 6);
        ctx.restore();

        // Update Bullets
        bulletsRef.current.forEach((b, bi) => {
          b.x += b.vx;
          b.y += b.vy;

          // Ricochet off walls
          if (b.x < 5 || b.x > canvas.width - 5) {
            b.vx *= -1;
            b.bounces--;
          }
          if (b.y < 5 || b.y > canvas.height - 5) {
            b.vy *= -1;
            b.bounces--;
          }

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
          ctx.fill();

          // Bullet hits Enemy
          enemiesRef.current.forEach((en, ei) => {
            if (Math.hypot(b.x - en.x, b.y - en.y) < 16) {
              sounds.playPop();
              en.hp--;
              bulletsRef.current.splice(bi, 1);
              if (en.hp <= 0) {
                enemiesRef.current.splice(ei, 1);
                setScore(s => {
                  const ns = s + 100;
                  if (ns > highScore) setHighScore(ns);
                  return ns;
                });

                // Spawn fresh wave if cleared
                if (enemiesRef.current.length === 0) {
                  triggerConfetti();
                  toast.success('Wave Cleared! Advancing to Combat Tier 2!');
                  enemiesRef.current = [
                    { x: Math.random() * 260 + 30, y: 50, vx: 1.5, vy: 1.0, hp: 2 },
                    { x: Math.random() * 260 + 30, y: 50, vx: -1.5, vy: 1.0, hp: 2 },
                  ];
                }
              }
            }
          });
        });
        bulletsRef.current = bulletsRef.current.filter(b => b.bounces >= 0);

        // Update & Draw Enemy Drones
        enemiesRef.current.forEach((en) => {
          en.x += en.vx;
          en.y += en.vy;

          if (en.x < 16 || en.x > canvas.width - 16) en.vx *= -1;
          if (en.y < 16 || en.y > canvas.height / 2) en.vy *= -1;

          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(en.x - 10, en.y - 10, 20, 20);

          // Check player collision
          if (Math.hypot(p.x - en.x, p.y - en.y) < 20) {
            sounds.playGlitch();
            setGameOver(true);
            setIsPlaying(false);
            triggerConfetti();
            toast.success('Tank Unit Decommissioned! Score saved to National Leaderboard.');
          }
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, highScore]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Tank Tactical Blitz
            </h3>
            <p className="text-xs text-muted-foreground font-mono">WASD Tread Controls & 360° Ricochet Plasma Cannon</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[0.62rem]">Top Combat Score</div>
          <div className="font-bold text-emerald-400">{highScore} Pts</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Combat Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Karma Bounty</span>
          <span className="font-display font-black text-xl text-emerald-400">+{Math.round(score / 4)} XP</span>
        </div>
      </div>

      {/* 320x320 Canvas Screen */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          onMouseMove={handleMouseMove}
          onClick={fireShell}
          className="w-full max-w-[320px] h-[320px] block cursor-crosshair"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            {gameOver ? (
              <>
                <Trophy className="w-10 h-10 text-emerald-400 mb-2 animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Combat Ceased!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Final Score: {score} Pts</p>
              </>
            ) : (
              <>
                <Crosshair className="w-10 h-10 text-emerald-400 mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Engage Tactical Tank</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">WASD to Move & Aim with Mouse to Fire Ricochet Shells!</p>
              </>
            )}

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-black" /> {gameOver ? 'Deploy Next Unit' : 'Deploy Tank Unit'}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Fire Button */}
      {isPlaying && !gameOver && (
        <Button
          onClick={fireShell}
          className="w-full h-12 rounded-2xl font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary shadow-lg"
        >
          💥 FIRE RICOCHET SHELL
        </Button>
      )}
    </div>
  );
}
