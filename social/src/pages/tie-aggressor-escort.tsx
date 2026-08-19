import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelYWingBomber {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieAggressorEscort() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'escort' | 'crashed' | 'fleet_defended'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(12);
  const [bombersDestroyed, setBombersDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(445000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const turretAngle = useRef(0);
  const bombersRef = useRef<RebelYWingBomber[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireTwinHeavyLasers = () => {
    if (gameState !== 'escort') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Rebel Y-Wing Bombers
    bombersRef.current.forEach((b) => {
      if (b.alive && b.z < 520 && b.z > 50) {
        if (Math.hypot(b.x - s.x, b.y - s.y) < 65) {
          b.alive = false;
          uiaudio.success();
          setBombersDestroyed(bd => bd + 1);
          setScore(sc => sc + 68000);
        }
      }
    });

    if (bombersRef.current.every(b => !b.alive)) {
      setGameState('fleet_defended');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 280000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'escort') return;
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

      if (e.code === 'Space') fireTwinHeavyLasers();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        shipPos.current.roll = 0;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      turretAngle.current = Math.atan2(my - shipPos.current.y, mx - shipPos.current.x);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('escort');
    setScore(0);
    setShields(12);
    setBombersDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    bombersRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Aggressor Fleet Escort Combat Loop
  useEffect(() => {
    if (gameState !== 'escort') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shipPos.current;

      // Move Rebel Y-Wing Bombers
      bombersRef.current.forEach((b) => {
        b.z -= 4.3;
        if (b.z < 50 && b.z > 10 && b.alive) {
          b.z = 640; // Loop around
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

      // Imperial Fleet Defense Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Imperial Star Destroyer Silhouette (Wireframe at Top)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 140);
      ctx.lineTo(cx + 260, cy - 50);
      ctx.lineTo(cx - 260, cy - 50);
      ctx.closePath();
      ctx.stroke();

      // Draw Rebel BTL Y-Wing Heavy Bombers
      bombersRef.current.forEach((b) => {
        if (b.alive && b.z > 0) {
          const scale = 250 / b.z;
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;

          // Y-Wing Cockpit + Twin Engine Nacelles
          ctx.beginPath();
          ctx.rect(b.x - 8 * scale, b.y - 18 * scale, 16 * scale, 36 * scale);
          ctx.rect(b.x - 28 * scale, b.y - 12 * scale, 12 * scale, 30 * scale);
          ctx.rect(b.x + 16 * scale, b.y - 12 * scale, 12 * scale, 30 * scale);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/ag Aggressor (Twin Pod Hull + 360 Dorsal Ball Turret + Stepped Solar Wings)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Left Pilot Pod
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-14, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Right Gunner Pod
      ctx.beginPath();
      ctx.arc(14, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Connecting Armored Pylon
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-14, -6, 28, 12);

      // 360° Dorsal Ball Turret (Between Pods)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Turret Barrel Angle
      const tang = turretAngle.current - s.roll;
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(tang) * 24, Math.sin(tang) * 24);
      ctx.stroke();

      // Stepped Solar Wings (Left & Right)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;

      // Left Stepped Wing
      ctx.beginPath();
      ctx.moveTo(-40, -35);
      ctx.lineTo(-58, -12);
      ctx.lineTo(-58, 12);
      ctx.lineTo(-40, 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Stepped Wing
      ctx.beginPath();
      ctx.moveTo(40, -35);
      ctx.lineTo(58, -12);
      ctx.lineTo(58, 12);
      ctx.lineTo(40, 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Struts
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-14, 0); ctx.lineTo(-40, 0);
      ctx.moveTo(14, 0); ctx.lineTo(40, 0);
      ctx.stroke();

      // Twin Heavy Forward Laser Cannons
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-14, -14, 3, 0, Math.PI * 2);
      ctx.arc(14, -14, 3, 0, Math.PI * 2);
      ctx.fill();

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-sky-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(56,189,248,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-amber-600 flex items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400">
              TIE AGGRESSOR // TWIN-TURRET FLEET ESCORT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/ag Aggressor twin-pod 360° ball turret anti-bomber escort for {currentUser?.name}
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

        {gameState === 'escort' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-sky-400">{shields} / 12</span>
              </div>
              <div>
                <span className="text-zinc-400">Y-WINGS: </span>
                <span className="font-bold text-amber-400">{bombersDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-emerald-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-sky-400 font-bold">
              [WASD] FLY, [MOUSE] AIM 360° TURRET, [SPACE] HEAVY CANNONS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'escort' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400">
                  {gameState === 'fleet_defended' ? 'STAR DESTROYER FLEET ESCORT SECURED!' : 'TIE AGGRESSOR READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the twin-pod TIE/ag Aggressor, operate the 360-degree dorsal laser turret, and shield Imperial capital ships against Rebel torpedo runs!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-sky-600 via-amber-700 to-rose-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH AGGRESSOR</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
