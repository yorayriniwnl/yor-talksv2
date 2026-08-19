import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface ResistanceTarget {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieSilencerDogfight() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'dogfight' | 'crashed' | 'squadron_cleared'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(6);
  const [magPulseMissiles, setMagPulseMissiles] = useState(6);
  const [highScore, setHighScore] = useState(210000);

  const silencerPos = useRef({ x: 370, y: 360, roll: 0 });
  const targetsRef = useRef<ResistanceTarget[]>([
    { x: 260, y: 200, z: 300, alive: true },
    { x: 480, y: 180, z: 450, alive: true },
    { x: 370, y: 220, z: 600, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireMagPulseWarhead = () => {
    if (gameState !== 'dogfight' || magPulseMissiles <= 0) return;
    uiaudio.warp();
    setMagPulseMissiles(m => m - 1);
    const s = silencerPos.current;

    // Lock on closest Resistance X-Wing
    targetsRef.current.forEach((t) => {
      if (t.alive && t.z < 500 && t.z > 50) {
        if (Math.hypot(t.x - s.x, t.y - s.y) < 65) {
          t.alive = false;
          uiaudio.success();
          setScore(sc => sc + 30000);
        }
      }
    });

    if (targetsRef.current.every(t => !t.alive)) {
      setGameState('squadron_cleared');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 140000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'dogfight') return;
      const s = silencerPos.current;
      const step = 14;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') s.y = Math.max(100, s.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') s.y = Math.min(420, s.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        s.x = Math.max(100, s.x - step);
        s.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        s.x = Math.min(640, s.x + step);
        s.roll = 0.3;
      }

      if (e.code === 'Space') fireMagPulseWarhead();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        silencerPos.current.roll = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, magPulseMissiles]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('dogfight');
    setScore(0);
    setShields(6);
    setMagPulseMissiles(6);
    silencerPos.current = { x: 370, y: 360, roll: 0 };
    targetsRef.current = [
      { x: 260, y: 200, z: 300, alive: true },
      { x: 480, y: 180, z: 450, alive: true },
      { x: 370, y: 220, z: 600, alive: true },
    ];
  };

  // TIE Silencer Asteroid Canyon Dogfight Loop
  useEffect(() => {
    if (gameState !== 'dogfight') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const s = silencerPos.current;

      // Move Targets & Jagged Asteroid Canyon Walls
      targetsRef.current.forEach((t) => {
        t.z -= 3.5;
        if (t.z < 50 && t.z > 10 && t.alive) {
          t.z = 600; // Loop around
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

      // Dark Deep Space Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Jagged Asteroid Canyon Wall Wireframes
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      for (let w = 0; w < 4; w++) {
        const offset = ((frame * 4 + w * 120) % 480);
        ctx.beginPath();
        ctx.moveTo(60, canvas.height - offset);
        ctx.lineTo(140, canvas.height - offset - 40);
        ctx.lineTo(80, canvas.height - offset - 90);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width - 60, canvas.height - offset);
        ctx.lineTo(canvas.width - 140, canvas.height - offset - 40);
        ctx.lineTo(canvas.width - 80, canvas.height - offset - 90);
        ctx.stroke();
      }

      // Draw Resistance T-70 X-Wings (Targets)
      targetsRef.current.forEach((t) => {
        if (t.alive && t.z > 0) {
          const scale = 250 / t.z;
          ctx.fillStyle = '#06b6d4';
          ctx.strokeStyle = '#38bdf8';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 12;
          ctx.lineWidth = 2;

          // X-Wing Cross Shape
          ctx.beginPath();
          ctx.moveTo(t.x - 25 * scale, t.y - 15 * scale); ctx.lineTo(t.x + 25 * scale, t.y + 15 * scale);
          ctx.moveTo(t.x - 25 * scale, t.y + 15 * scale); ctx.lineTo(t.x + 25 * scale, t.y - 15 * scale);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Kylo Ren's Razor-Winged TIE Silencer (TIE/vn)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Elongated Stealth Cockpit Pod
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Dual Extended Swept Blade Solar Wings with Crimson Laser Tips
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;

      // Left Razor Wing
      ctx.beginPath();
      ctx.moveTo(-10, -10); ctx.lineTo(-65, 25); ctx.lineTo(-45, 35); ctx.lineTo(-10, 15); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Right Razor Wing
      ctx.beginPath();
      ctx.moveTo(10, -10); ctx.lineTo(65, 25); ctx.lineTo(45, 35); ctx.lineTo(10, 15); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, magPulseMissiles]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-zinc-900 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
              TIE SILENCER DOGFIGHT // ASTEROID CANYON COMBAT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Kylo Ren's TIE/vn space superiority fighter & mag-pulse warheads for {currentUser?.name}
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

        {gameState === 'dogfight' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">MAG-PULSE: </span>
                <span className="font-bold text-base text-red-400">{magPulseMissiles} / 6</span>
              </div>
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-300">{shields} / 6</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-red-400 font-bold">
              [WASD / ARROWS] STEER SILENCER, [SPACE] MAG-PULSE WARHEAD
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'dogfight' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-amber-400 to-cyan-400">
                  {gameState === 'squadron_cleared' ? 'RESISTANCE X-WING SQUADRON ELIMINATED!' : 'KYLO REN\'S TIE SILENCER DOGFIGHT'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Engage Resistance T-70 X-Wings at extreme speeds through the narrow jagged canyons of the asteroid belt!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE SILENCER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
