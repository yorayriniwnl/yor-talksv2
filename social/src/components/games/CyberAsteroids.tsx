import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Trophy, Play, RotateCcw, Sparkles, Flame, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  points: number;
}

interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export function CyberAsteroids() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(3800);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  // Ship physics
  const shipRef = useRef({
    x: 160,
    y: 160,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    rotationSpeed: 0.08,
    thrust: 0.15
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const asteroidsRef = useRef<Asteroid[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setLives(3);
    setGameOver(false);
    shipRef.current = {
      x: 160,
      y: 160,
      angle: -Math.PI / 2,
      vx: 0,
      vy: 0,
      rotationSpeed: 0.08,
      thrust: 0.15
    };
    lasersRef.current = [];

    // Spawn 4 large asteroids
    const list: Asteroid[] = [];
    for (let i = 0; i < 4; i++) {
      list.push({
        x: Math.random() > 0.5 ? 20 : 300,
        y: Math.random() * 320,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: 24,
        points: 50
      });
    }
    asteroidsRef.current = list;
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
    const ship = shipRef.current;
    lasersRef.current.push({
      x: ship.x + Math.cos(ship.angle) * 14,
      y: ship.y + Math.sin(ship.angle) * 14,
      vx: Math.cos(ship.angle) * 7 + ship.vx,
      vy: Math.sin(ship.angle) * 7 + ship.vy,
      life: 40
    });
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
        const ship = shipRef.current;

        // Steering & Thrust
        if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
          ship.angle -= ship.rotationSpeed;
        }
        if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
          ship.angle += ship.rotationSpeed;
        }
        if (keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current['W']) {
          ship.vx += Math.cos(ship.angle) * ship.thrust;
          ship.vy += Math.sin(ship.angle) * ship.thrust;
        }

        // Apply friction
        ship.vx *= 0.985;
        ship.vy *= 0.985;

        ship.x = (ship.x + ship.vx + canvas.width) % canvas.width;
        ship.y = (ship.y + ship.vy + canvas.height) % canvas.height;

        // Draw Ship (ISRO Vikram Triangle)
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-10, -8);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();

        // Update Lasers
        lasersRef.current.forEach((laser, li) => {
          laser.x = (laser.x + laser.vx + canvas.width) % canvas.width;
          laser.y = (laser.y + laser.vy + canvas.height) % canvas.height;
          laser.life--;

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(laser.x, laser.y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Laser-Asteroid Collisions
          asteroidsRef.current.forEach((ast, ai) => {
            const dist = Math.hypot(laser.x - ast.x, laser.y - ast.y);
            if (dist < ast.radius) {
              sounds.playPop();
              lasersRef.current.splice(li, 1);
              setScore(s => {
                const ns = s + ast.points;
                if (ns > highScore) setHighScore(ns);
                return ns;
              });

              // Split asteroid if large
              if (ast.radius > 14) {
                asteroidsRef.current.push({
                  x: ast.x,
                  y: ast.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3,
                  radius: ast.radius / 1.8,
                  points: 100
                });
                asteroidsRef.current.push({
                  x: ast.x,
                  y: ast.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3,
                  radius: ast.radius / 1.8,
                  points: 100
                });
              }
              asteroidsRef.current.splice(ai, 1);
            }
          });
        });
        lasersRef.current = lasersRef.current.filter(l => l.life > 0);

        // Update Asteroids
        asteroidsRef.current.forEach((ast) => {
          ast.x = (ast.x + ast.vx + canvas.width) % canvas.width;
          ast.y = (ast.y + ast.vy + canvas.height) % canvas.height;

          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ast.x, ast.y, ast.radius, 0, Math.PI * 2);
          ctx.stroke();

          // Ship-Asteroid Collision
          const sDist = Math.hypot(ship.x - ast.x, ship.y - ast.y);
          if (sDist < ast.radius + 8) {
            sounds.playGlitch();
            setLives(l => {
              const nl = l - 1;
              if (nl <= 0) {
                setGameOver(true);
                setIsPlaying(false);
                triggerConfetti();
                toast.success('Mission Concluded! Defense points logged to National Leaderboard.');
              }
              return nl;
            });
            ship.x = 160;
            ship.y = 160;
            ship.vx = 0;
            ship.vy = 0;
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
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Asteroids Orbit Defense
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Inertial Vector Flight & Asteroid Blaster</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[0.62rem]">High Score</div>
          <div className="font-bold text-amber-400">{highScore} Pts</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Defense Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Ship Lives</span>
          <span className="font-display font-black text-xl text-rose-500">{'❤️ '.repeat(lives)}</span>
        </div>
      </div>

      {/* 320x320 Canvas Screen */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-full max-w-[320px] h-[320px] block"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            {gameOver ? (
              <>
                <Trophy className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Orbit Defended!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Final Score: {score} Pts (+{Math.round(score / 5)} Karma)</p>
              </>
            ) : (
              <>
                <Zap className="w-10 h-10 text-amber-400 mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Engage Asteroid Defense</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">A/D or Arrows to Steer, W to Thrust, Spacebar to Blast!</p>
              </>
            )}

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-amber-500 hover:bg-amber-600 text-black glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-black" /> {gameOver ? 'Defend Again' : 'Launch Starship'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
