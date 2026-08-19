import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Asteroid {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  val: number;
  type: 'iron' | 'platinum' | 'crystal';
}

interface OreChunk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  val: number;
  color: string;
}

export default function AsteroidMiner() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [cargoCredits, setCargoCredits] = useState(0);
  const [highScore, setHighScore] = useState(52400);
  const [fuelPct, setFuelPct] = useState(100);

  const shipRef = useRef({ x: 370, y: 240, vx: 0, vy: 0, angle: 0, laserActive: false });
  const asteroidsRef = useRef<Asteroid[]>([]);
  const oreChunksRef = useRef<OreChunk[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const spawnAsteroid = () => {
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (edge === 0) { x = Math.random() * 740; y = -20; }
    else if (edge === 1) { x = 760; y = Math.random() * 480; }
    else if (edge === 2) { x = Math.random() * 740; y = 500; }
    else { x = -20; y = Math.random() * 480; }

    const types: ('iron' | 'platinum' | 'crystal')[] = ['iron', 'platinum', 'crystal'];
    const type = types[Math.floor(Math.random() * types.length)];
    const hp = type === 'crystal' ? 40 : (type === 'platinum' ? 60 : 30);
    const val = type === 'crystal' ? 500 : (type === 'platinum' ? 300 : 100);

    asteroidsRef.current.push({
      x,
      y,
      r: Math.random() * 12 + 18,
      vx: (370 - x) * 0.003 + (Math.random() - 0.5) * 0.8,
      vy: (240 - y) * 0.003 + (Math.random() - 0.5) * 0.8,
      hp,
      maxHp: hp,
      val,
      type,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.code === 'Space') shipRef.current.laserActive = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      if (e.code === 'Space') shipRef.current.laserActive = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setCargoCredits(0);
    setFuelPct(100);
    shipRef.current = { x: 370, y: 240, vx: 0, vy: 0, angle: 0, laserActive: false };
    asteroidsRef.current = [];
    oreChunksRef.current = [];
    for (let i = 0; i < 5; i++) spawnAsteroid();
  };

  // Asteroid Miner Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const loop = () => {
      tick++;
      if (tick % 120 === 0 && asteroidsRef.current.length < 8) spawnAsteroid();

      const ship = shipRef.current;
      const keys = keysPressed.current;

      // Ship Rotation
      if (keys['KeyA'] || keys['ArrowLeft']) ship.angle -= 0.06;
      if (keys['KeyD'] || keys['ArrowRight']) ship.angle += 0.06;

      // Ship Forward Thrust
      if (keys['KeyW'] || keys['ArrowUp']) {
        ship.vx += Math.cos(ship.angle) * 0.15;
        ship.vy += Math.sin(ship.angle) * 0.15;
      }

      // Drag friction
      ship.vx *= 0.985;
      ship.vy *= 0.985;
      ship.x += ship.vx;
      ship.y += ship.vy;

      // Screen edge wrapping
      if (ship.x < 0) ship.x = canvas.width;
      if (ship.x > canvas.width) ship.x = 0;
      if (ship.y < 0) ship.y = canvas.height;
      if (ship.y > canvas.height) ship.y = 0;

      // Mining Laser Raycast Intersect
      if (ship.laserActive) {
        const laserLen = 220;
        const lx2 = ship.x + Math.cos(ship.angle) * laserLen;
        const ly2 = ship.y + Math.sin(ship.angle) * laserLen;

        asteroidsRef.current.forEach((ast) => {
          const dx = ast.x - ship.x;
          const dy = ast.y - ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angleToAst = Math.atan2(dy, dx);
          let angleDiff = Math.abs(ship.angle - angleToAst);
          while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

          if (dist < laserLen && angleDiff < 0.25) {
            ast.hp -= 1;
            if (ast.hp <= 0) {
              // Fragment into collectable ore chunks
              uiaudio.success();
              const colors = { iron: '#94a3b8', platinum: '#38bdf8', crystal: '#ec4899' };
              for (let c = 0; c < 4; c++) {
                oreChunksRef.current.push({
                  x: ast.x + (Math.random() - 0.5) * 10,
                  y: ast.y + (Math.random() - 0.5) * 10,
                  vx: (Math.random() - 0.5) * 2,
                  vy: (Math.random() - 0.5) * 2,
                  val: Math.round(ast.val / 4),
                  color: colors[ast.type],
                });
              }
            }
          }
        });
      }

      asteroidsRef.current = asteroidsRef.current.filter(a => a.hp > 0);

      // Tractor Beam Magnetically Sucks Ore Chunks to Ship
      oreChunksRef.current.forEach((ore) => {
        const dx = ship.x - ore.x;
        const dy = ship.y - ore.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 180) {
          // Tractor pull acceleration
          ore.vx += (dx / dist) * 0.4;
          ore.vy += (dy / dist) * 0.4;
        }

        ore.x += ore.vx;
        ore.y += ore.vy;

        // Collection into Cargo Hold
        if (dist < 20) {
          ore.val = 0;
          uiaudio.click();
          setCargoCredits(c => {
            const next = c + 50;
            setHighScore(h => Math.max(h, next));
            return next;
          });
        }
      });

      oreChunksRef.current = oreChunksRef.current.filter(o => o.val > 0);

      // Asteroid Collision with Ship
      asteroidsRef.current.forEach((ast) => {
        ast.x += ast.vx;
        ast.y += ast.vy;

        const dx = ship.x - ast.x;
        const dy = ship.y - ast.y;
        if (Math.sqrt(dx * dx + dy * dy) < ast.r + 12) {
          uiaudio.error();
          setGameState('gameover');
        }
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Ore Chunks
      oreChunksRef.current.forEach((ore) => {
        ctx.fillStyle = ore.color;
        ctx.shadowColor = ore.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ore.x, ore.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Asteroids
      asteroidsRef.current.forEach((ast) => {
        ctx.fillStyle = ast.type === 'crystal' ? '#ec4899' : (ast.type === 'platinum' ? '#38bdf8' : '#64748b');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = ast.type === 'crystal' ? 12 : 0;
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // HP bar above asteroid
        if (ast.hp < ast.maxHp) {
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(ast.x - 15, ast.y - ast.r - 8, (ast.hp / ast.maxHp) * 30, 3);
        }
      });

      // Draw Mining Ship
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      // Mining Laser Beam
      if (ship.laserActive) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(220, 0);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Ship Hull (Neon Cyan Arrow)
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, cargoCredits]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Target className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              ASTEROID MINER // 3D PLASMA TRACTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Mining laser vapor fragmentation & magnetic tractor beam harvesting for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* High Score */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BEST:</span>
            <span className="text-amber-300 font-bold">{highScore.toLocaleString()} CR</span>
          </div>
        </div>
      </div>

      {/* Mining Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
              <span className="text-zinc-400">CARGO VALUE: </span>
              <span className="font-bold text-base text-amber-300">{cargoCredits.toLocaleString()} CR</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY | [HOLD SPACE] MINING LASER
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'playing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  {gameState === 'gameover' ? 'HULL BREACH - SHIP DESTROYED' : 'ASTEROID MINER'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Target rich platinum and crystal asteroids with your laser. Your plasma tractor beam automatically captures fragmented ore!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH MINING SHIP</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
