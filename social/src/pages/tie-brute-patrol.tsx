import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PirateFrigate {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieBrutePatrol() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'patrol' | 'crashed' | 'pirates_eliminated'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [piratesDestroyed, setPiratesDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(290000);

  const brutePos = useRef({ x: 370, y: 360, roll: 0 });
  const piratesRef = useRef<PirateFrigate[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireHeavyRotaryCannons = () => {
    if (gameState !== 'patrol') return;
    uiaudio.warp();
    const b = brutePos.current;

    // Check hit on Pirate frigates
    piratesRef.current.forEach((p) => {
      if (p.alive && p.z < 520 && p.z > 50) {
        if (Math.hypot(p.x - b.x, p.y - b.y) < 65) {
          p.alive = false;
          uiaudio.success();
          setPiratesDestroyed(pd => pd + 1);
          setScore(sc => sc + 35000);
        }
      }
    });

    if (piratesRef.current.every(p => !p.alive)) {
      setGameState('pirates_eliminated');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 160000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'patrol') return;
      const b = brutePos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') b.y = Math.max(100, b.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') b.y = Math.min(420, b.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        b.x = Math.max(100, b.x - step);
        b.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        b.x = Math.min(640, b.x + step);
        b.roll = 0.3;
      }

      if (e.code === 'Space') fireHeavyRotaryCannons();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        brutePos.current.roll = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('patrol');
    setScore(0);
    setShields(8);
    setPiratesDestroyed(0);
    brutePos.current = { x: 370, y: 360, roll: 0 };
    piratesRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // TIE/rb Brute Kessel Sector Patrol Loop
  useEffect(() => {
    if (gameState !== 'patrol') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 40);
      const b = brutePos.current;

      // Move Pirate Gunships
      piratesRef.current.forEach((p) => {
        p.z -= 4.0;
        if (p.z < 50 && p.z > 10 && p.alive) {
          p.z = 640; // Loop around
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
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Kessel Asteroid Nebula Space Void
      ctx.fillStyle = '#11051b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Kessel Spice Asteroid Mine Grid
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 6; s++) {
        const offset = (frame * 3 + s * 80) % 480;
        ctx.strokeRect(cx - 300 + s * 100, cy + 50, 60, 60);
      }

      // Draw Pirate Marauder Gunships (Spiky Yellow/Orange Rust Ships)
      piratesRef.current.forEach((p) => {
        if (p.alive && p.z > 0) {
          const scale = 250 / p.z;
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 15 * scale);
          ctx.lineTo(p.x + 24 * scale, p.y + 12 * scale);
          ctx.lineTo(p.x - 24 * scale, p.y + 12 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/rb Brute (Asymmetric Dual Pod + Thick Armored Wings)
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.roll);

      // Dark Heavy Reinforced Imperial Armor
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Primary Pilot Cockpit Pod (Left Pod)
      ctx.beginPath();
      ctx.arc(-14, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Glowing Cockpit Viewport
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(-14, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Auxiliary Heavy Rotary Cannon Pod (Right Pod)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(16, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Heavy Rotary Laser Barrel (Long Green Cannons Extending Forward)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(16, -18); ctx.lineTo(16, -45);
      ctx.stroke();

      // Connecting Armored Pylon Bridge
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-14, 0); ctx.lineTo(16, 0);
      ctx.stroke();

      // Vertical Armored Hexagonal Solar Wings (Left & Right)
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;

      // Left Hex Wing
      ctx.beginPath();
      ctx.moveTo(-45, -35); ctx.lineTo(-40, 0); ctx.lineTo(-45, 35);
      ctx.lineTo(-52, 20); ctx.lineTo(-52, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Hex Wing
      ctx.beginPath();
      ctx.moveTo(45, -35); ctx.lineTo(40, 0); ctx.lineTo(45, 35);
      ctx.lineTo(52, 20); ctx.lineTo(52, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-red-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-red-200 to-cyan-400">
              TIE BRUTE // KESSEL SECTOR PATROL
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/rb reinforced heavy starfighter with auxiliary rotary cannon for {currentUser?.name}
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

        {gameState === 'patrol' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">ARMOR: </span>
                <span className="font-bold text-purple-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">PIRATES: </span>
                <span className="font-bold text-amber-300">{piratesDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-purple-300 font-bold">
              [WASD] FLY TIE BRUTE, [SPACE] AUXILIARY ROTARY CANNON
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'patrol' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-red-300 to-cyan-400">
                  {gameState === 'pirates_eliminated' ? 'KESSEL SECTOR PIRATE FLEET DESTROYED!' : 'TIE/RB REINFORCED BRUTE READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the heavily armored TIE/rb dual-pod Brute, unleash sustained auxiliary rotary laser barrage, and purge pirate blockade runners!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-red-600 to-amber-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>COMMENCE KESSEL PATROL</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
