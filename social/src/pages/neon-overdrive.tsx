import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, Trophy, Zap, Shield, Flame, Gauge, 
  Volume2, Sparkles, Crosshair, Award, ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  nitro: number;
  shield: boolean;
  score: number;
  distance: number;
  multiplier: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'drone' | 'barrier' | 'police_bot' | 'plasma_mine';
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

interface PowerUp {
  x: number;
  y: number;
  size: number;
  type: 'nitro' | 'shield' | 'credits' | 'multiplier';
  color: string;
}

export default function NeonOverdriveGame() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(14850);
  const [distance, setDistance] = useState(0);
  const [nitroLevel, setNitroLevel] = useState(100);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [hasShield, setHasShield] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  // Upgrades
  const [credits, setCredits] = useState(1250);
  const [upgrades, setUpgrades] = useState({
    topSpeed: 1,
    nitroRegen: 1,
    shieldDuration: 1,
  });

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animationFrameRef = useRef<number | null>(null);

  const playerRef = useRef<Player>({
    x: 400,
    y: 450,
    width: 36,
    height: 60,
    vx: 0,
    vy: 0,
    nitro: 100,
    shield: false,
    score: 0,
    distance: 0,
    multiplier: 1,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);

  // Key listeners
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

  const spawnExplosion = (x: number, y: number, color: string, count = 25) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: Math.random() * 20 + 20,
        color,
        size: Math.random() * 4 + 2,
      });
    }
  };

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setDistance(0);
    setMultiplier(1);
    setNitroLevel(100);
    setHasShield(false);

    playerRef.current = {
      x: 400,
      y: 450,
      width: 36,
      height: 60,
      vx: 0,
      vy: 0,
      nitro: 100,
      shield: false,
      score: 0,
      distance: 0,
      multiplier: 1,
    };
    obstaclesRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
  };

  // Main Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let roadOffset = 0;
    let spawnTimer = 0;
    let powerUpTimer = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const p = playerRef.current;
      const keys = keysPressed.current;

      // Handle Inputs
      const baseAccel = 0.5 * (1 + upgrades.topSpeed * 0.15);
      const isBoosting = (keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && p.nitro > 0;

      if (isBoosting) {
        p.nitro = Math.max(0, p.nitro - 0.6);
        roadOffset += 14;
        p.distance += 0.35;
        p.score += Math.round(5 * p.multiplier);
        setSpeedKmh(Math.round(180 + Math.random() * 20));

        // Nitro exhaust particles
        particlesRef.current.push({
          x: p.x + (Math.random() - 0.5) * 16,
          y: p.y + 30,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 5 + 6,
          life: 1,
          maxLife: 15,
          color: Math.random() > 0.5 ? '#06b6d4' : '#ec4899',
          size: Math.random() * 4 + 2,
        });
      } else {
        p.nitro = Math.min(100, p.nitro + 0.15 * (1 + upgrades.nitroRegen * 0.2));
        roadOffset += 7;
        p.distance += 0.18;
        p.score += Math.round(1 * p.multiplier);
        setSpeedKmh(Math.round(105 + Math.random() * 10));
      }

      setNitroLevel(Math.round(p.nitro));
      setScore(p.score);
      setDistance(Math.round(p.distance));

      // Steering
      if (keys['KeyA'] || keys['ArrowLeft']) p.vx -= baseAccel;
      if (keys['KeyD'] || keys['ArrowRight']) p.vx += baseAccel;

      // Apply friction
      p.vx *= 0.88;
      p.x += p.vx;

      // Boundary constrain to highway
      const roadLeft = 200;
      const roadRight = 600;
      if (p.x < roadLeft) { p.x = roadLeft; p.vx = 0; }
      if (p.x > roadRight) { p.x = roadRight; p.vx = 0; }

      // Spawn Obstacles
      spawnTimer++;
      if (spawnTimer > (isBoosting ? 30 : 50)) {
        spawnTimer = 0;
        const laneX = roadLeft + 30 + Math.random() * (roadRight - roadLeft - 60);
        const types: Obstacle['type'][] = ['drone', 'barrier', 'police_bot', 'plasma_mine'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const colors = { drone: '#ef4444', barrier: '#f97316', police_bot: '#3b82f6', plasma_mine: '#a855f7' };

        obstaclesRef.current.push({
          x: laneX,
          y: -50,
          width: chosenType === 'barrier' ? 70 : 36,
          height: chosenType === 'barrier' ? 24 : 50,
          speed: isBoosting ? 12 : 7,
          type: chosenType,
          color: colors[chosenType],
        });
      }

      // Spawn PowerUps
      powerUpTimer++;
      if (powerUpTimer > 180) {
        powerUpTimer = 0;
        const laneX = roadLeft + 30 + Math.random() * (roadRight - roadLeft - 60);
        const pTypes: PowerUp['type'][] = ['nitro', 'shield', 'credits', 'multiplier'];
        const chosen = pTypes[Math.floor(Math.random() * pTypes.length)];
        const pColors = { nitro: '#06b6d4', shield: '#10b981', credits: '#eab308', multiplier: '#ec4899' };

        powerUpsRef.current.push({
          x: laneX,
          y: -50,
          size: 24,
          type: chosen,
          color: pColors[chosen],
        });
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Synthwave Background Horizon
      const grad = ctx.createLinearGradient(0, 0, 0, 250);
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, 250);

      // Neon Sun
      const sunGrad = ctx.createLinearGradient(400, 70, 400, 190);
      sunGrad.addColorStop(0, '#f43f5e');
      sunGrad.addColorStop(0.6, '#fb923c');
      sunGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(400, 150, 70, Math.PI, 0);
      ctx.fill();

      // Sun horizontal scan lines
      ctx.fillStyle = '#09090b';
      for (let i = 110; i < 160; i += 6) {
        ctx.fillRect(320, i, 160, 2);
      }

      // 2. Cyber Road & Perspective Grid
      const roadGrad = ctx.createLinearGradient(0, 200, 0, canvas.height);
      roadGrad.addColorStop(0, '#030712');
      roadGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, 200, canvas.width, canvas.height - 200);

      // Road Borders
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(roadLeft - 20, 200);
      ctx.lineTo(roadLeft - 40, canvas.height);
      ctx.moveTo(roadRight + 20, 200);
      ctx.lineTo(roadRight + 40, canvas.height);
      ctx.stroke();

      // Moving Grid Horizontal Lines
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
      ctx.lineWidth = 1;
      const stepY = (roadOffset % 40);
      for (let y = 200 + stepY; y < canvas.height; y += 35) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Center Lane Dashes
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;
      ctx.setLineDash([25, 20]);
      ctx.lineDashOffset = -roadOffset;
      ctx.beginPath();
      ctx.moveTo(400, 200);
      ctx.lineTo(400, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // 3. Update & Draw PowerUps
      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pu = powerUpsRef.current[i];
        pu.y += isBoosting ? 11 : 6;

        ctx.fillStyle = pu.color;
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Collision with player
        const dist = Math.hypot(p.x - pu.x, p.y - pu.y);
        if (dist < 35) {
          uiaudio.success();
          if (pu.type === 'nitro') p.nitro = 100;
          if (pu.type === 'shield') { p.shield = true; setHasShield(true); }
          if (pu.type === 'credits') setCredits(c => c + 100);
          if (pu.type === 'multiplier') {
            p.multiplier = Math.min(5, p.multiplier + 1);
            setMultiplier(p.multiplier);
          }
          spawnExplosion(pu.x, pu.y, pu.color, 15);
          powerUpsRef.current.splice(i, 1);
          continue;
        }

        if (pu.y > canvas.height + 50) powerUpsRef.current.splice(i, 1);
      }

      // 4. Update & Draw Obstacles
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        obs.y += isBoosting ? 13 : 7;

        // Render obstacle
        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 15;
        ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
        ctx.shadowBlur = 0;

        // Check collision
        const hitX = Math.abs(p.x - obs.x) < (p.width / 2 + obs.width / 2);
        const hitY = Math.abs(p.y - obs.y) < (p.height / 2 + obs.height / 2);

        if (hitX && hitY) {
          if (p.shield) {
            uiaudio.warp();
            p.shield = false;
            setHasShield(false);
            spawnExplosion(obs.x, obs.y, '#10b981', 30);
            obstaclesRef.current.splice(i, 1);
            continue;
          } else {
            // Game Over
            uiaudio.error();
            spawnExplosion(p.x, p.y, '#ef4444', 50);
            setGameState('gameover');
            setHighScore(prev => Math.max(prev, p.score));
            return;
          }
        }

        if (obs.y > canvas.height + 50) obstaclesRef.current.splice(i, 1);
      }

      // 5. Update & Draw Particles
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

      // 6. Draw Player: Cyber Rickshaw 3000
      ctx.save();
      ctx.translate(p.x, p.y);

      // Shield Aura
      if (p.shield) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Rickshaw Body (Neon Yellow/Cyan Hull)
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 8);
      ctx.fill();

      // Cyber Cabin Roof (Matte Dark)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-p.width / 2 + 4, -p.height / 2 + 10, p.width - 8, p.height - 20);

      // Cyan Windshield Glass
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fillRect(-p.width / 2 + 6, -p.height / 2 + 4, p.width - 12, 10);

      // Twin Tail-Lights
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.fillRect(-p.width / 2 + 4, p.height / 2 - 4, 8, 4);
      ctx.fillRect(p.width / 2 - 12, p.height / 2 - 4, 8, 4);

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, upgrades]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Game Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Flame className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
              CYBER RICKSHAW // NEON OVERDRIVE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              High-speed canvas arcade racing with procedural physics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="flex items-center space-x-1.5 bg-zinc-950/80 px-3 py-2 rounded-xl border border-white/10">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">HI-SCORE:</span>
            <span className="text-amber-300 font-bold">{highScore.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-zinc-950/80 px-3 py-2 rounded-xl border border-white/10">
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="text-zinc-400">CREDITS:</span>
            <span className="text-cyan-300 font-bold">₹{credits.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Game Stage & HUD */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-auto block"
        />

        {/* Real-time In-Game HUD Overlays */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none font-mono">
            {/* Score & Multiplier */}
            <div className="bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 space-y-1">
              <div className="text-xs text-zinc-400">SCORE</div>
              <div className="text-2xl font-black text-white">{score.toLocaleString()}</div>
              {multiplier > 1 && (
                <div className="text-[10px] text-pink-400 font-bold animate-pulse">
                  {multiplier}X HYPER MULTIPLIER
                </div>
              )}
            </div>

            {/* Speedometer & Distance */}
            <div className="flex items-center space-x-3">
              <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-center">
                <div className="text-[10px] text-zinc-400 flex items-center justify-center space-x-1">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span>VELOCITY</span>
                </div>
                <div className="text-xl font-black text-cyan-300">{speedKmh} <span className="text-xs">KM/H</span></div>
              </div>

              {/* Nitro Level Bar */}
              <div className="bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 w-36 space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span className="flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>NITRO</span>
                  </span>
                  <span className="font-bold text-amber-300">{nitroLevel}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-pink-500 transition-all"
                    style={{ width: `${nitroLevel}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start / Game Over Modal Overlays */}
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
                    <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400">
                      CYBER RICKSHAW
                    </h2>
                    <p className="text-sm text-zinc-400 max-w-md font-mono">
                      Dodge rogue police drones, grab quantum nitro canisters, and reach the Neo-Bengaluru warp gate!
                    </p>
                  </div>

                  <div className="flex items-center space-x-6 text-xs font-mono text-zinc-400 bg-zinc-900/60 px-6 py-3 rounded-xl border border-white/10">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-zinc-800 rounded border border-white/10 text-white font-bold">A / D</span>
                      <span>Steer</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-zinc-800 rounded border border-white/10 text-white font-bold">SPACE / W</span>
                      <span>Hyper Nitro</span>
                    </div>
                  </div>

                  <button
                    onClick={startGame}
                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 font-black tracking-wider text-white shadow-xl shadow-pink-500/25 hover:brightness-110 flex items-center space-x-3 transition-all"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span>LAUNCH ENGINE</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="inline-block px-3 py-1 bg-red-500/20 text-red-400 rounded-full font-mono text-xs border border-red-500/30">
                      CRITICAL CHASSIS FAILURE
                    </div>
                    <h2 className="text-4xl font-black text-white">GAME OVER</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full max-w-sm bg-zinc-900/80 p-6 rounded-2xl border border-white/10 font-mono">
                    <div className="text-left">
                      <div className="text-xs text-zinc-400">FINAL SCORE</div>
                      <div className="text-2xl font-bold text-white">{score.toLocaleString()}</div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-zinc-400">DISTANCE</div>
                      <div className="text-2xl font-bold text-cyan-400">{distance} KM</div>
                    </div>
                  </div>

                  <button
                    onClick={startGame}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 font-bold text-white shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>RETRY SIMULATION</span>
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
