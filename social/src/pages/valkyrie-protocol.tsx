import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Play, Pause, RotateCcw, Trophy, Zap, 
  Shield, Flame, Sparkles, Award, Rocket, Target, Volume2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isEnemy: boolean;
  radius: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  type: 'drone' | 'scout' | 'dreadnought';
  shootCooldown: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export default function ValkyrieProtocol() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(38400);
  const [bombs, setBombs] = useState(3);
  const [playerHp, setPlayerHp] = useState(100);
  const [wave, setWave] = useState(1);

  const playerRef = useRef({
    x: 350,
    y: 500,
    radius: 16,
    speed: 6,
    shootTimer: 0,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const spawnExplosion = (x: number, y: number, color: string, count = 20) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: Math.random() * 20 + 15,
        color,
        size: Math.random() * 3 + 1,
      });
    }
  };

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setPlayerHp(100);
    setBombs(3);
    setWave(1);

    playerRef.current = {
      x: 350,
      y: 500,
      radius: 16,
      speed: 6,
      shootTimer: 0,
    };
    bulletsRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
  };

  // Main 60 FPS Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let enemySpawnTimer = 0;
    let starOffset = 0;

    const loop = () => {
      const p = playerRef.current;
      const keys = keysPressed.current;

      // Player Movement
      if (keys['KeyA'] || keys['ArrowLeft']) p.x -= p.speed;
      if (keys['KeyD'] || keys['ArrowRight']) p.x += p.speed;
      if (keys['KeyW'] || keys['ArrowUp']) p.y -= p.speed;
      if (keys['KeyS'] || keys['ArrowDown']) p.y += p.speed;

      p.x = Math.max(p.radius, Math.min(canvas.width - p.radius, p.x));
      p.y = Math.max(p.radius, Math.min(canvas.height - p.radius, p.y));

      // Player Auto-Firing
      p.shootTimer++;
      if (p.shootTimer > 6) {
        p.shootTimer = 0;
        bulletsRef.current.push(
          { x: p.x - 10, y: p.y - 15, vx: 0, vy: -12, color: '#06b6d4', isEnemy: false, radius: 3 },
          { x: p.x + 10, y: p.y - 15, vx: 0, vy: -12, color: '#06b6d4', isEnemy: false, radius: 3 }
        );
      }

      // EMP Bomb Trigger
      if (keys['KeyB'] && bombs > 0) {
        keysPressed.current['KeyB'] = false;
        uiaudio.success();
        setBombs(b => b - 1);
        spawnExplosion(canvas.width / 2, canvas.height / 2, '#ec4899', 100);
        bulletsRef.current = bulletsRef.current.filter(b => !b.isEnemy);
        enemiesRef.current.forEach(e => { e.hp -= 50; });
      }

      // Spawn Enemy Waves
      enemySpawnTimer++;
      if (enemySpawnTimer > 40) {
        enemySpawnTimer = 0;
        const enemyType: Enemy['type'] = Math.random() > 0.8 ? 'dreadnought' : (Math.random() > 0.5 ? 'scout' : 'drone');
        const color = enemyType === 'dreadnought' ? '#ef4444' : (enemyType === 'scout' ? '#f59e0b' : '#a855f7');
        const hp = enemyType === 'dreadnought' ? 45 : (enemyType === 'scout' ? 12 : 5);

        enemiesRef.current.push({
          id: Math.random().toString(),
          x: 40 + Math.random() * (canvas.width - 80),
          y: -30,
          hp,
          maxHp: hp,
          radius: enemyType === 'dreadnought' ? 32 : (enemyType === 'scout' ? 18 : 14),
          type: enemyType,
          shootCooldown: 0,
          color,
        });
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Starfield Background
      starOffset += 3;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 37) % canvas.width;
        const sy = (i * 73 + starOffset) % canvas.height;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Update & Draw Bullets
      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        b.x += b.vx;
        b.y += b.vy;

        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Player bullet hit enemy
        if (!b.isEnemy) {
          for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
            const e = enemiesRef.current[j];
            const dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist < b.radius + e.radius) {
              e.hp -= 2;
              spawnExplosion(b.x, b.y, '#06b6d4', 4);
              bulletsRef.current.splice(i, 1);

              if (e.hp <= 0) {
                uiaudio.hover();
                spawnExplosion(e.x, e.y, e.color, 25);
                setScore(s => s + (e.type === 'dreadnought' ? 500 : 100));
                enemiesRef.current.splice(j, 1);
              }
              break;
            }
          }
        } else {
          // Enemy bullet hit player
          const dist = Math.hypot(b.x - p.x, b.y - p.y);
          if (dist < b.radius + p.radius) {
            uiaudio.error();
            spawnExplosion(p.x, p.y, '#ef4444', 20);
            bulletsRef.current.splice(i, 1);
            setPlayerHp(hp => {
              const newHp = hp - 15;
              if (newHp <= 0) {
                setGameState('gameover');
                setHighScore(h => Math.max(h, score));
              }
              return Math.max(0, newHp);
            });
          }
        }

        if (b.y < -20 || b.y > canvas.height + 20) bulletsRef.current.splice(i, 1);
      }

      // Update & Draw Enemies
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const e = enemiesRef.current[i];
        e.y += e.type === 'drone' ? 3 : (e.type === 'scout' ? 2 : 1);

        // Enemy firing
        e.shootCooldown++;
        if (e.shootCooldown > (e.type === 'dreadnought' ? 30 : 60)) {
          e.shootCooldown = 0;
          bulletsRef.current.push({
            x: e.x,
            y: e.y + e.radius,
            vx: 0,
            vy: 4.5,
            color: '#f43f5e',
            isEnemy: true,
            radius: 4
          });
        }

        // Draw Enemy Ship
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (e.y > canvas.height + 50) enemiesRef.current.splice(i, 1);
      }

      // Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (pt.life <= 0) particlesRef.current.splice(i, 1);
      }

      // Draw Player Ship (Valkyrie Cyber Fighter)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(18, 16);
      ctx.lineTo(0, 10);
      ctx.lineTo(-18, 16);
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
  }, [gameState, score, bombs]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Rocket className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
              VALKYRIE PROTOCOL // 16-BIT BULLET HELL
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              High-intensity vertical scrolling cyber shooter for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3 py-2 rounded-xl border border-white/10 flex items-center space-x-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BEST:</span>
            <span className="text-amber-300 font-bold">{highScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Game Canvas & HUD */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={700}
          height={550}
          className="w-full h-auto block"
        />

        {/* In-Game HUD */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 space-y-1">
              <div className="text-[10px] text-zinc-400">SCORE</div>
              <div className="text-xl font-bold text-white">{score.toLocaleString()}</div>
            </div>

            <div className="flex items-center space-x-3">
              {/* HP Bar */}
              <div className="bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 w-36 space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>SHIELD HP</span>
                  <span className="font-bold text-cyan-400">{playerHp}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all"
                    style={{ width: `${playerHp}%` }}
                  />
                </div>
              </div>

              {/* Bombs */}
              <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-center">
                <div className="text-[10px] text-zinc-400">EMP BOMBS [B]</div>
                <div className="text-sm font-bold text-pink-400">{'💣 '.repeat(bombs)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Start / Gameover Overlays */}
        <AnimatePresence>
          {gameState !== 'playing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              {gameState === 'idle' ? (
                <>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-400 to-cyan-400">
                      VALKYRIE PROTOCOL
                    </h2>
                    <p className="text-sm text-zinc-400 max-w-md font-mono">
                      Engage rogue alien drone fleets in deep LEO orbit. Use WASD to steer and B to detonate EMP screen clears!
                    </p>
                  </div>

                  <button
                    onClick={startGame}
                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span>ENGAGE COMBAT</span>
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-4xl font-black text-white">SIMULATION TERMINATED</h2>
                  <div className="text-xl font-mono text-cyan-400">FINAL SCORE: {score.toLocaleString()}</div>

                  <button
                    onClick={startGame}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 font-bold text-white shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>REDEPLOY FIGHTER</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
