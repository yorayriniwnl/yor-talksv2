import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, ShieldAlert, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelYwingBombers {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieEscortInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'escort' | 'crashed' | 'bombers_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shuttleIntegrity, setShuttleIntegrity] = useState(100);
  const [flakPulseEnergy, setFlakPulseEnergy] = useState(100);
  const [bombersDestroyed, setBombersDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(570000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const bombersRef = useRef<RebelYwingBombers[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const triggerFlakPulse = () => {
    if (gameState !== 'escort' || flakPulseEnergy <= 15) return;
    uiaudio.warp();
    setFlakPulseEnergy(e => Math.max(0, e - 25));
    const s = shipPos.current;

    // Omnidirectional flak hit check
    bombersRef.current.forEach((b) => {
      if (b.alive && b.z < 520 && b.z > 50) {
        if (Math.hypot(b.x - s.x, b.y - s.y) < 95) {
          b.alive = false;
          uiaudio.success();
          setBombersDestroyed(bd => bd + 1);
          setScore(sc => sc + 85000);
        }
      }
    });

    if (bombersRef.current.every(b => !b.alive)) {
      setGameState('bombers_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 450000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'escort') return;
      const s = shipPos.current;
      const step = 18;

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

      if (e.code === 'Space') triggerFlakPulse();
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
  }, [gameState, flakPulseEnergy]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('escort');
    setScore(0);
    setShuttleIntegrity(100);
    setFlakPulseEnergy(100);
    setBombersDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    bombersRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Escort Dogfight Loop
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

      // Recharge flak energy
      setFlakPulseEnergy(e => Math.min(100, e + 0.3));

      // Move Rebel Y-Wing Bombers
      bombersRef.current.forEach((b) => {
        b.z -= 4.2;
        if (b.z < 50 && b.z > 10 && b.alive) {
          b.z = 640; // Loop around
          setShuttleIntegrity(shuttle => {
            if (shuttle <= 15) {
              setGameState('crashed');
              uiaudio.error();
              return 0;
            }
            uiaudio.error();
            return shuttle - 15;
          });
        }
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Imperial Lambda VIP Shuttle Wireframe (Escort Objective ahead at cx, cy - 70)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Tri-Wing Shuttle Profile
      ctx.moveTo(cx, cy - 110); ctx.lineTo(cx, cy - 60);
      ctx.moveTo(cx - 35, cy - 40); ctx.lineTo(cx, cy - 60); ctx.lineTo(cx + 35, cy - 40);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`VIP LAMBDA SHUTTLE [${shuttleIntegrity}%]`, cx - 55, cy - 118);

      // Draw Rebel BTL Y-Wing Heavy Bombers
      bombersRef.current.forEach((b) => {
        if (b.alive && b.z > 0) {
          const scale = 250 / b.z;
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;

          // Y-Wing Double-Pronged Silhouette
          ctx.beginPath();
          ctx.rect(b.x - 12 * scale, b.y - 18 * scale, 24 * scale, 36 * scale);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/exp M6 Escort (Central Command Cockpit Pod Flanked by Twin Flak Turret Pods with 360° Laser Ring)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Central Command Cockpit Pod
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pilot Viewport
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Twin Omnidirectional Flak Pods (Left at -28, Right at +28)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;

      // Left Flak Pod
      ctx.fillRect(-36, -20, 16, 40);
      ctx.strokeRect(-36, -20, 16, 40);

      // Right Flak Pod
      ctx.fillRect(20, -20, 16, 40);
      ctx.strokeRect(20, -20, 16, 40);

      // Amber Flak Muzzle Cores
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(-28, -20, 4, 0, Math.PI * 2);
      ctx.arc(28, -20, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Outer Solar Wing Struts
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-45, -28); ctx.lineTo(-45, 28);
      ctx.moveTo(45, -28); ctx.lineTo(45, 28);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shuttleIntegrity, flakPulseEnergy]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
              TIE ESCORT // OMNIDIRECTIONAL FLAK INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/exp M6 Escort dual rapid-fire point-defense flak fighter for {currentUser?.name}
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
                <span className="text-zinc-400">SHUTTLE HP: </span>
                <span className="font-bold text-sky-400">{shuttleIntegrity}%</span>
              </div>
              <div>
                <span className="text-zinc-400">FLAK ENERGY: </span>
                <span className="font-bold text-amber-400">{Math.floor(flakPulseEnergy)}%</span>
              </div>
              <div>
                <span className="text-zinc-400">Y-WINGS: </span>
                <span className="font-bold text-rose-400">{bombersDestroyed} SHOT DOWN</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-amber-400 font-bold">
              [WASD] FLY, [SPACE] 360° OMNIDIRECTIONAL FLAK BURST
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                  {gameState === 'bombers_destroyed' ? 'REBEL Y-WING BOMBER WING DESTROYED!' : 'TIE ESCORT READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the rapid-response Imperial TIE/exp M6 Escort, intercept incoming Rebel Y-wing bomber formations, and protect the Imperial VIP Lambda shuttle!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-600 via-red-700 to-rose-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH ESCORT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
