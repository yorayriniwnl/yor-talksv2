import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, BatteryCharging
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelMonCalamariCruisers {
  x: number;
  y: number;
  z: number;
  disabled: boolean;
}

export default function TieIonNeutralizerInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'neutralize' | 'crashed' | 'fleet_disabled'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(14);
  const [ionCapacitorCharge, setIonCapacitorCharge] = useState(100);
  const [cruisersDisabled, setCruisersDisabled] = useState(0);
  const [highScore, setHighScore] = useState(615000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const cruisersRef = useRef<RebelMonCalamariCruisers[]>([
    { x: 230, y: 210, z: 320, disabled: false },
    { x: 510, y: 180, z: 460, disabled: false },
    { x: 370, y: 250, z: 580, disabled: false },
    { x: 300, y: 170, z: 640, disabled: false },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireIonPulse = () => {
    if (gameState !== 'neutralize' || ionCapacitorCharge <= 15) return;
    uiaudio.warp();
    setIonCapacitorCharge(c => Math.max(0, c - 25));
    const s = shipPos.current;

    // Check hit on Rebel Mon Calamari MC80 Cruisers
    cruisersRef.current.forEach((cr) => {
      if (!cr.disabled && cr.z < 520 && cr.z > 50) {
        if (Math.hypot(cr.x - s.x, cr.y - s.y) < 85) {
          cr.disabled = true;
          uiaudio.success();
          setCruisersDisabled(cd => cd + 1);
          setScore(sc => sc + 140000);
        }
      }
    });

    if (cruisersRef.current.every(cr => cr.disabled)) {
      setGameState('fleet_disabled');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 520000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'neutralize') return;
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

      if (e.code === 'Space') fireIonPulse();
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
  }, [gameState, ionCapacitorCharge]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('neutralize');
    setScore(0);
    setShields(14);
    setIonCapacitorCharge(100);
    setCruisersDisabled(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    cruisersRef.current = [
      { x: 230, y: 210, z: 320, disabled: false },
      { x: 510, y: 180, z: 460, disabled: false },
      { x: 370, y: 250, z: 580, disabled: false },
      { x: 300, y: 170, z: 640, disabled: false },
    ];
  };

  // TIE Ion Neutralizer Dogfight Loop
  useEffect(() => {
    if (gameState !== 'neutralize') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 50);
      const s = shipPos.current;

      // Recharge ion capacitors
      setIonCapacitorCharge(c => Math.min(100, c + 0.35));

      // Move Rebel MC80 Cruisers
      cruisersRef.current.forEach((cr) => {
        cr.z -= 3.8;
        if (cr.z < 50 && cr.z > 10 && !cr.disabled) {
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

      // Orbital Hyperspace Lane Grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 80, 230, 45, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Rebel Mon Calamari MC80 Cruisers (Curved Organic Cylindrical Silhouette)
      cruisersRef.current.forEach((cr) => {
        if (cr.z > 0) {
          const scale = 250 / cr.z;
          ctx.fillStyle = cr.disabled ? '#475569' : '#38bdf8';
          ctx.strokeStyle = cr.disabled ? '#64748b' : '#06b6d4';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = cr.disabled ? '#475569' : '#38bdf8';
          ctx.shadowBlur = cr.disabled ? 0 : 16;

          // Organic Mon Cal Oval Hull Profile
          ctx.beginPath();
          ctx.ellipse(cr.x, cr.y, 42 * scale, 18 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          if (cr.disabled) {
            ctx.fillStyle = '#06b6d4';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('SYSTEMS DISABLED', cr.x - 45, cr.y - 22);
          }
        }
      });

      // Draw TIE/exp M9 Ion Neutralizer (Central Pod Flanked by Dual Huge Ion Disruptor Cannons)
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
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Dual Heavy Ion Cannon Pods (Left at -30, Right at +30)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3.5;

      // Left Ion Cannon
      ctx.fillRect(-40, -28, 18, 56);
      ctx.strokeRect(-40, -28, 18, 56);

      // Right Ion Cannon
      ctx.fillRect(22, -28, 18, 56);
      ctx.strokeRect(22, -28, 18, 56);

      // Intense Cyan Ion Muzzle Glow
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(-31, -28, 6, 0, Math.PI * 2);
      ctx.arc(31, -28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Outer Solar Wing Struts
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-48, -28); ctx.lineTo(-48, 28);
      ctx.moveTo(48, -28); ctx.lineTo(48, 28);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, ionCapacitorCharge]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Zap className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
              TIE ION NEUTRALIZER // CAPITAL DISABLING INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/exp M9 Ion Neutralizer dual heavy ion cannon disabling fighter for {currentUser?.name}
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

        {gameState === 'neutralize' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-sky-400">{shields} / 14</span>
              </div>
              <div>
                <span className="text-zinc-400">ION CHARGE: </span>
                <span className="font-bold text-cyan-400">{Math.floor(ionCapacitorCharge)}%</span>
              </div>
              <div>
                <span className="text-zinc-400">MC80 CRUISERS: </span>
                <span className="font-bold text-emerald-400">{cruisersDisabled} DISABLED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY, [SPACE] FIRE DUAL HEAVY ION NEUTRALIZER PULSES
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'neutralize' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                  {gameState === 'fleet_disabled' ? 'REBEL MON CALAMARI CAPITAL FLEET DISABLED!' : 'TIE ION NEUTRALIZER READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the specialized Imperial TIE/exp M9 Ion Neutralizer, fire dual high-yield ion disruptor pulses into Rebel Mon Calamari MC80 cruisers, and disable all capital ship shields and engines!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-700 to-indigo-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH ION INTERCEPTOR</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
