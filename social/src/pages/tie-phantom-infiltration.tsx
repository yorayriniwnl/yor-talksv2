import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, EyeOff, Eye, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface MonCalamariCorvette {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TiePhantomInfiltration() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'infiltrate' | 'crashed' | 'fleet_infiltrated'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [isCloaked, setIsCloaked] = useState(true);
  const [corvettesDestroyed, setCorvettesDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(435000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const corvettesRef = useRef<MonCalamariCorvette[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const toggleCloak = () => {
    uiaudio.warp();
    setIsCloaked(c => !c);
  };

  const fireTripleLaserStrike = () => {
    if (gameState !== 'infiltrate') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Mon Calamari Corvettes
    corvettesRef.current.forEach((c) => {
      if (c.alive && c.z < 520 && c.z > 50) {
        if (Math.hypot(c.x - s.x, c.y - s.y) < 65) {
          c.alive = false;
          uiaudio.success();
          setCorvettesDestroyed(cd => cd + 1);
          setScore(sc => sc + 65000);
        }
      }
    });

    if (corvettesRef.current.every(c => !c.alive)) {
      setGameState('fleet_infiltrated');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 270000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'infiltrate') return;
      const s = shipPos.current;
      const step = 16;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') s.y = Math.max(100, s.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') s.y = Math.min(420, s.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        s.x = Math.max(100, s.x - step);
        s.roll = -0.35;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        s.x = Math.min(640, s.x + step);
        s.roll = 0.35;
      }

      if (e.code === 'KeyC') toggleCloak();
      if (e.code === 'Space') fireTripleLaserStrike();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        shipPos.current.roll = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isCloaked]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('infiltrate');
    setScore(0);
    setShields(8);
    setIsCloaked(true);
    setCorvettesDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    corvettesRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Phantom Cloaked Infiltration Combat Loop
  useEffect(() => {
    if (gameState !== 'infiltrate') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shipPos.current;

      // Move Mon Calamari Corvettes
      corvettesRef.current.forEach((c) => {
        c.z -= 4.3;
        if (c.z < 50 && c.z > 10 && c.alive) {
          c.z = 640; // Loop around
          if (!isCloaked) {
            setShields(sh => {
              if (sh <= 1) {
                setGameState('crashed');
                uiaudio.error();
                return 0;
              }
              uiaudio.error();
              return sh - 1;
            });
          }
        }
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stygium Cloaking Shimmering Grid Field
      if (isCloaked) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 6; g++) {
          const gy = (frame * 2 + g * 80) % 480;
          ctx.beginPath();
          ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy);
          ctx.stroke();
        }
      }

      // Draw Rebel Mon Calamari Corvettes
      corvettesRef.current.forEach((c) => {
        if (c.alive && c.z > 0) {
          const scale = 250 / c.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 35 * scale, 14 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/ph Phantom (Tri-Wing Inverted Stealth Geometry)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      if (isCloaked) {
        ctx.globalAlpha = 0.35; // Translucent Stygium Cloak
      }

      // Central Imperial Command Pod
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Pilot Viewport
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Tri-Wing Configuration (Top Vertical Wing + Bottom Left Wing + Bottom Right Wing)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Top Wing
      ctx.beginPath();
      ctx.moveTo(-10, -16);
      ctx.lineTo(0, -60);
      ctx.lineTo(10, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bottom-Left Wing
      ctx.beginPath();
      ctx.moveTo(-14, 10);
      ctx.lineTo(-48, 48);
      ctx.lineTo(-6, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bottom-Right Wing
      ctx.beginPath();
      ctx.moveTo(14, 10);
      ctx.lineTo(48, 48);
      ctx.lineTo(6, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Triple Laser Cannons (Wingtips)
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, -60, 3.5, 0, Math.PI * 2);
      ctx.arc(-48, 48, 3.5, 0, Math.PI * 2);
      ctx.arc(48, 48, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, isCloaked]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-900 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <EyeOff className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
              TIE PHANTOM // STYGIUM CLOAK INFILTRATION
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/ph Tri-Wing Stygium cloaking stealth strike for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* High Score */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BEST:</span>
            <span className="text-amber-300 font-bold">{highScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Arena Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        {gameState === 'infiltrate' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">CLOAK: </span>
                <span className={cn("font-bold", isCloaked ? "text-emerald-400" : "text-red-400")}>
                  {isCloaked ? 'ACTIVE (UNDETECTED)' : 'OFFLINE (EXPOSED)'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">CORVETTES: </span>
                <span className="font-bold text-pink-400">{corvettesDestroyed} DESTROYED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [C] TOGGLE CLOAK, [WASD] FLY, [SPACE] TRIPLE LASER STRIKE
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'infiltrate' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                  {gameState === 'fleet_infiltrated' ? 'REBEL MON CALAMARI FLEET INFILTRATED!' : 'TIE PHANTOM READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot Grand Admiral Zaarin's top-secret TIE/ph Phantom, engage full Stygium cloaking, and assassinate Rebel capital ships!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-700 to-sky-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH PHANTOM</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
