import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, Rocket
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelNebulonEscorts {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieWarheadInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'bombardment' | 'crashed' | 'escorts_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(12);
  const [missilesRemaining, setMissilesRemaining] = useState(12);
  const [escortsDestroyed, setEscortsDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(525000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const escortsRef = useRef<RebelNebulonEscorts[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireTwinWarheads = () => {
    if (gameState !== 'bombardment' || missilesRemaining <= 0) return;
    uiaudio.warp();
    setMissilesRemaining(m => Math.max(0, m - 2));
    const s = shipPos.current;

    // Check hit on Rebel Escorts
    escortsRef.current.forEach((e) => {
      if (e.alive && e.z < 520 && e.z > 50) {
        if (Math.hypot(e.x - s.x, e.y - s.y) < 70) {
          e.alive = false;
          uiaudio.success();
          setEscortsDestroyed(ed => ed + 1);
          setScore(sc => sc + 95000);
        }
      }
    });

    if (escortsRef.current.every(e => !e.alive)) {
      setGameState('escorts_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 360000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'bombardment') return;
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

      if (e.code === 'Space') fireTwinWarheads();
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
  }, [gameState, missilesRemaining]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('bombardment');
    setScore(0);
    setShields(12);
    setMissilesRemaining(12);
    setEscortsDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    escortsRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Warhead Bombardment Combat Loop
  useEffect(() => {
    if (gameState !== 'bombardment') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shipPos.current;

      // Move Rebel Escorts
      escortsRef.current.forEach((e) => {
        e.z -= 4.2;
        if (e.z < 50 && e.z > 10 && e.alive) {
          e.z = 640; // Loop around
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

      // Distant Nebulon Frigate Flak Grid
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 140, cy - 100); ctx.lineTo(cx + 140, cy - 100);
      ctx.moveTo(cx, cy - 140); ctx.lineTo(cx, cy - 60);
      ctx.stroke();

      // Draw Rebel Escort Corvettes
      escortsRef.current.forEach((e) => {
        if (e.alive && e.z > 0) {
          const scale = 250 / e.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.ellipse(e.x, e.y, 28 * scale, 18 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/exp M3 Warhead (Central Command Pod Flanked by Twin Heavy Concussion Missile Tubes)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Central Command Pod
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#f59e0b';
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

      // Twin Heavy Concussion Missile Launcher Tubes (Left at -28, Right at +28)
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;

      // Left Tube
      ctx.fillRect(-34, -22, 12, 44);
      ctx.strokeRect(-34, -22, 12, 44);

      // Right Tube
      ctx.fillRect(22, -22, 12, 44);
      ctx.strokeRect(22, -22, 12, 44);

      // Missile Warhead Heads
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(-28, -22, 5, 0, Math.PI * 2);
      ctx.arc(28, -22, 5, 0, Math.PI * 2);
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
  }, [gameState, score, shields, missilesRemaining]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
              TIE WARHEAD // CONCUSSION MISSILE INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/exp M3 Warhead twin heavy missile launcher barrage for {currentUser?.name}
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

        {gameState === 'bombardment' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-sky-400">{shields} / 12</span>
              </div>
              <div>
                <span className="text-zinc-400">WARHEADS: </span>
                <span className="font-bold text-rose-400">{missilesRemaining} / 12</span>
              </div>
              <div>
                <span className="text-zinc-400">ESCORTS: </span>
                <span className="font-bold text-emerald-400">{escortsDestroyed} DESTROYED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-amber-400 font-bold">
              [WASD] FLY, [SPACE] LAUNCH TWIN CONCUSSION MISSILES
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'bombardment' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                  {gameState === 'escorts_destroyed' ? 'REBEL ESCORT FORMATION DESTROYED!' : 'TIE WARHEAD READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the missile-specialized Imperial TIE/exp M3 Warhead, lock onto Rebel escort vessels, and unleash dual heavy concussion missile salvoes!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-600 via-red-700 to-rose-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH WARHEAD</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
