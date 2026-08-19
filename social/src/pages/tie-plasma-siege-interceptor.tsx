import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, Bomb
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelGolanFortresses {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TiePlasmaSiegeInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'bombard' | 'crashed' | 'fortresses_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(14);
  const [plasmaMortarRounds, setPlasmaMortarRounds] = useState(20);
  const [fortressesDestroyed, setFortressesDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(585000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const fortressesRef = useRef<RebelGolanFortresses[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const firePlasmaMortars = () => {
    if (gameState !== 'bombard' || plasmaMortarRounds <= 0) return;
    uiaudio.warp();
    setPlasmaMortarRounds(r => Math.max(0, r - 2));
    const s = shipPos.current;

    // Check hit on Rebel Golan Fortresses
    fortressesRef.current.forEach((f) => {
      if (f.alive && f.z < 520 && f.z > 50) {
        if (Math.hypot(f.x - s.x, f.y - s.y) < 80) {
          f.alive = false;
          uiaudio.success();
          setFortressesDestroyed(fd => fd + 1);
          setScore(sc => sc + 120000);
        }
      }
    });

    if (fortressesRef.current.every(f => !f.alive)) {
      setGameState('fortresses_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 480000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'bombard') return;
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

      if (e.code === 'Space') firePlasmaMortars();
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
  }, [gameState, plasmaMortarRounds]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('bombard');
    setScore(0);
    setShields(14);
    setPlasmaMortarRounds(20);
    setFortressesDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    fortressesRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Plasma Siege Loop
  useEffect(() => {
    if (gameState !== 'bombard') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 50);
      const s = shipPos.current;

      // Move Rebel Golan Space Fortresses
      fortressesRef.current.forEach((f) => {
        f.z -= 4.0;
        if (f.z < 50 && f.z > 10 && f.alive) {
          f.z = 640; // Loop around
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

      // Golan Orbital Grid Network
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 90, 240, 50, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Rebel Golan Defense Fortresses
      fortressesRef.current.forEach((f) => {
        if (f.alive && f.z > 0) {
          const scale = 250 / f.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 18;

          // Octagonal Fortress Citadel
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const px = f.x + Math.cos(angle) * (36 * scale);
            const py = f.y + Math.sin(angle) * (36 * scale);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/exp M7 Siege (Central Pod Flanked by Dual Huge Plasma Siege Mortar Pods)
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

      // Dual Plasma Siege Mortar Cylinders (Left at -30, Right at +30)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3.5;

      // Left Siege Mortar
      ctx.fillRect(-40, -28, 18, 56);
      ctx.strokeRect(-40, -28, 18, 56);

      // Right Siege Mortar
      ctx.fillRect(22, -28, 18, 56);
      ctx.strokeRect(22, -28, 18, 56);

      // High-Density Plasma Muzzle Glow
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(-31, -28, 6, 0, Math.PI * 2);
      ctx.arc(31, -28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, plasmaMortarRounds]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Bomb className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-amber-400">
              TIE PLASMA SIEGE // HEAVY SIEGE MORTAR INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/exp M7 Siege dual rapid-pulse heavy plasma mortar craft for {currentUser?.name}
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

        {gameState === 'bombard' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-sky-400">{shields} / 14</span>
              </div>
              <div>
                <span className="text-zinc-400">PLASMA ROUNDS: </span>
                <span className="font-bold text-pink-400">{plasmaMortarRounds} / 20</span>
              </div>
              <div>
                <span className="text-zinc-400">GOLAN FORTRESSES: </span>
                <span className="font-bold text-emerald-400">{fortressesDestroyed} PULVERIZED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-pink-400 font-bold">
              [WASD] FLY, [SPACE] FIRE DUAL PLASMA SIEGE MORTARS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'bombard' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-amber-400">
                  {gameState === 'fortresses_destroyed' ? 'REBEL GOLAN DEFENSE FORTRESSES ANNIHILATED!' : 'TIE SIEGE READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the devastating Imperial TIE/exp M7 Siege, lock dual rapid-pulse plasma mortars onto fortified Rebel Golan orbital citadels, and breach fortress armor!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-700 to-amber-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH SIEGE CRAFT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
