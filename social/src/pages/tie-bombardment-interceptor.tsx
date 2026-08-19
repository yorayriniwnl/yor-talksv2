import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, Bomb
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelGolanStations {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieBombardmentInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'siege' | 'crashed' | 'stations_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(14);
  const [protonBombs, setProtonBombs] = useState(16);
  const [stationsDestroyed, setStationsDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(540000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const stationsRef = useRef<RebelGolanStations[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const dropProtonMortars = () => {
    if (gameState !== 'siege' || protonBombs <= 0) return;
    uiaudio.warp();
    setProtonBombs(b => Math.max(0, b - 2));
    const s = shipPos.current;

    // Check hit on Rebel Golan Defense Stations
    stationsRef.current.forEach((st) => {
      if (st.alive && st.z < 520 && st.z > 50) {
        if (Math.hypot(st.x - s.x, st.y - s.y) < 75) {
          st.alive = false;
          uiaudio.success();
          setStationsDestroyed(sd => sd + 1);
          setScore(sc => sc + 100000);
        }
      }
    });

    if (stationsRef.current.every(st => !st.alive)) {
      setGameState('stations_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 400000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'siege') return;
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

      if (e.code === 'Space') dropProtonMortars();
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
  }, [gameState, protonBombs]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('siege');
    setScore(0);
    setShields(14);
    setProtonBombs(16);
    setStationsDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    stationsRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Bombardment Siege Loop
  useEffect(() => {
    if (gameState !== 'siege') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shipPos.current;

      // Move Rebel Golan Platforms
      stationsRef.current.forEach((st) => {
        st.z -= 4.0;
        if (st.z < 50 && st.z > 10 && st.alive) {
          st.z = 640; // Loop around
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

      // Golan Defense Shield Barrier Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 100, 160, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Rebel Golan Defense Platforms
      stationsRef.current.forEach((st) => {
        if (st.alive && st.z > 0) {
          const scale = 250 / st.z;
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 16;

          // Hexagonal Defense Platform
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = st.x + Math.cos(angle) * (32 * scale);
            const py = st.y + Math.sin(angle) * (32 * scale);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/exp M4 Bombardment (Central Cockpit Pod Flanked by Twin Heavy Mortar Launch Pods, No Solar Wings)
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

      // Twin Heavy Proton Mortar Cylindrical Pods (Left at -30, Right at +30)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3.5;

      // Left Mortar Pod
      ctx.fillRect(-38, -26, 16, 52);
      ctx.strokeRect(-38, -26, 16, 52);

      // Right Mortar Pod
      ctx.fillRect(22, -26, 16, 52);
      ctx.strokeRect(22, -26, 16, 52);

      // Proton Bomb Plasma Core Glow
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(-30, -26, 5, 0, Math.PI * 2);
      ctx.arc(30, -26, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, protonBombs]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Bomb className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-amber-400">
              TIE BOMBARDMENT // HEAVY PROTON MORTAR INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/exp M4 Bombardment wingless twin heavy mortar strike craft for {currentUser?.name}
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

        {gameState === 'siege' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-sky-400">{shields} / 14</span>
              </div>
              <div>
                <span className="text-zinc-400">PROTON BOMBS: </span>
                <span className="font-bold text-pink-400">{protonBombs} / 16</span>
              </div>
              <div>
                <span className="text-zinc-400">GOLAN PLATFORMS: </span>
                <span className="font-bold text-emerald-400">{stationsDestroyed} PULVERIZED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-pink-400 font-bold">
              [WASD] FLY, [SPACE] LAUNCH TWIN PROTON MORTARS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'siege' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-amber-400">
                  {gameState === 'stations_destroyed' ? 'REBEL GOLAN DEFENSE CORRIDOR PULVERIZED!' : 'TIE BOMBARDMENT READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the wingless Imperial TIE/exp M4 Bombardment, breach planetary defense shields, and drop dual heavy proton mortars on Rebel Golan platforms!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-700 to-amber-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH BOMBARDMENT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
