import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, Sun
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelMonCalamariCruisers {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieBeamInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'assault' | 'crashed' | 'cruisers_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(14);
  const [beamCapacitorCharge, setBeamCapacitorCharge] = useState(100);
  const [isFiringBeam, setIsFiringBeam] = useState(false);
  const [cruisersDestroyed, setCruisersDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(555000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const cruisersRef = useRef<RebelMonCalamariCruisers[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireBeamWeapon = () => {
    if (gameState !== 'assault' || beamCapacitorCharge <= 10) return;
    setIsFiringBeam(true);
    uiaudio.warp();
    setBeamCapacitorCharge(c => Math.max(0, c - 15));
    const s = shipPos.current;

    // Check hit on Rebel Mon Calamari Cruisers
    cruisersRef.current.forEach((cr) => {
      if (cr.alive && cr.z < 520 && cr.z > 50) {
        if (Math.hypot(cr.x - s.x, cr.y - s.y) < 70) {
          cr.alive = false;
          uiaudio.success();
          setCruisersDestroyed(cd => cd + 1);
          setScore(sc => sc + 110000);
        }
      }
    });

    if (cruisersRef.current.every(cr => !cr.alive)) {
      setGameState('cruisers_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 420000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'assault') return;
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

      if (e.code === 'Space') fireBeamWeapon();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        shipPos.current.roll = 0;
      }
      if (e.code === 'Space') setIsFiringBeam(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, beamCapacitorCharge]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('assault');
    setScore(0);
    setShields(14);
    setBeamCapacitorCharge(100);
    setIsFiringBeam(false);
    setCruisersDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    cruisersRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Beam Assault Combat Loop
  useEffect(() => {
    if (gameState !== 'assault') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 50);
      const s = shipPos.current;

      // Recharge capacitor slowly
      setBeamCapacitorCharge(c => Math.min(100, c + 0.15));

      // Move Rebel Cruisers
      cruisersRef.current.forEach((cr) => {
        cr.z -= 3.8;
        if (cr.z < 50 && cr.z > 10 && cr.alive) {
          cr.z = 640; // Loop around
          setShields(shield => {
            if (shield <= 1) {
              setGameState('crashed');
              uiaudio.error();
              return 0;
            }
            uiaudio.error();
            return shield - 1;
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

      // Distant Mon Calamari Fleet Formation Wireframe
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 80, 220, 45, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Rebel Mon Calamari Star Cruisers (Organic Cylindrical Shape)
      cruisersRef.current.forEach((cr) => {
        if (cr.alive && cr.z > 0) {
          const scale = 250 / cr.z;
          ctx.fillStyle = '#3b82f6';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 16;

          ctx.beginPath();
          ctx.ellipse(cr.x, cr.y, 45 * scale, 18 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/exp M5 Beam (Central Cockpit Pod Flanked by Dual Huge Sustained Turbo-Beam Projector Pods)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Continuous Sustained Beam Weapons (when firing)
      if (isFiringBeam) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 32;

        // Left Turbo-Beam
        ctx.beginPath();
        ctx.moveTo(-28, -20); ctx.lineTo(-28, -320);
        ctx.stroke();

        // Right Turbo-Beam
        ctx.beginPath();
        ctx.moveTo(28, -20); ctx.lineTo(28, -320);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

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

      // Dual Heavy Turbo-Beam Projector Pods (Left at -28, Right at +28)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;

      // Left Projector
      ctx.fillRect(-36, -24, 16, 48);
      ctx.strokeRect(-36, -24, 16, 48);

      // Right Projector
      ctx.fillRect(20, -24, 16, 48);
      ctx.strokeRect(20, -24, 16, 48);

      // Green Sustained Emitter Lenses
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(-28, -24, 5, 0, Math.PI * 2);
      ctx.arc(28, -24, 5, 0, Math.PI * 2);
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
  }, [gameState, score, shields, isFiringBeam, beamCapacitorCharge]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Sun className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              TIE BEAM // SUSTAINED TURBO-BEAM INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/exp M5 Beam dual sustained capital-grade thermal laser projector for {currentUser?.name}
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

        {gameState === 'assault' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-sky-400">{shields} / 14</span>
              </div>
              <div>
                <span className="text-zinc-400">BEAM CHARGE: </span>
                <span className="font-bold text-emerald-400">{Math.floor(beamCapacitorCharge)}%</span>
              </div>
              <div>
                <span className="text-zinc-400">MC80 CRUISERS: </span>
                <span className="font-bold text-cyan-400">{cruisersDestroyed} MELTED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-emerald-400 font-bold">
              [WASD] FLY, [SPACE] SUSTAINED TURBO-BEAM LANCE
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'assault' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  {gameState === 'cruisers_destroyed' ? 'REBEL MON CALAMARI FLEET ANNIHILATED!' : 'TIE BEAM READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the devastating Imperial TIE/exp M5 Beam, lock sustained high-output turbo-beams onto Rebel Mon Calamari cruisers, and burn through deflector shields!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH BEAM FIGHTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
