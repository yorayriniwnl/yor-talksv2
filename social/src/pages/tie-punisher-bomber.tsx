import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Bomb
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface MonCalamariCruiser {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TiePunisherBomber() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'bombing' | 'crashed' | 'fleet_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(10);
  const [cruisersDestroyed, setCruisersDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(345000);

  const punisherPos = useRef({ x: 370, y: 360, roll: 0 });
  const cruisersRef = useRef<MonCalamariCruiser[]>([
    { x: 240, y: 200, z: 340, alive: true },
    { x: 500, y: 180, z: 480, alive: true },
    { x: 370, y: 240, z: 600, alive: true },
    { x: 300, y: 170, z: 660, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireProtonClusterVolley = () => {
    if (gameState !== 'bombing') return;
    uiaudio.warp();
    const p = punisherPos.current;

    // Check hit on Mon Calamari Cruisers
    cruisersRef.current.forEach((c) => {
      if (c.alive && c.z < 540 && c.z > 50) {
        if (Math.hypot(c.x - p.x, c.y - p.y) < 70) {
          c.alive = false;
          uiaudio.success();
          setCruisersDestroyed(cd => cd + 1);
          setScore(sc => sc + 55000);
        }
      }
    });

    if (cruisersRef.current.every(c => !c.alive)) {
      setGameState('fleet_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 200000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'bombing') return;
      const p = punisherPos.current;
      const step = 16;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') p.y = Math.max(100, p.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') p.y = Math.min(420, p.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        p.x = Math.max(100, p.x - step);
        p.roll = -0.35;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        p.x = Math.min(640, p.x + step);
        p.roll = 0.35;
      }

      if (e.code === 'Space') fireProtonClusterVolley();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        punisherPos.current.roll = 0;
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
    setGameState('bombing');
    setScore(0);
    setShields(10);
    setCruisersDestroyed(0);
    punisherPos.current = { x: 370, y: 360, roll: 0 };
    cruisersRef.current = [
      { x: 240, y: 200, z: 340, alive: true },
      { x: 500, y: 180, z: 480, alive: true },
      { x: 370, y: 240, z: 600, alive: true },
      { x: 300, y: 170, z: 660, alive: true },
    ];
  };

  // TIE/it Interdictor Punisher Heavy Bomber Loop
  useEffect(() => {
    if (gameState !== 'bombing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const p = punisherPos.current;

      // Move Mon Calamari Cruisers
      cruisersRef.current.forEach((c) => {
        c.z -= 4.0;
        if (c.z < 50 && c.z > 10 && c.alive) {
          c.z = 660; // Loop around
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

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      for (let s = 0; s < 5; s++) {
        const offset = (frame * 3 + s * 90) % 480;
        ctx.strokeRect(cx - 280 + s * 120, cy + 60, 60, 60);
      }

      // Draw Mon Calamari MC80 Cruisers (Organic Heavy Ellipsoid Ships)
      cruisersRef.current.forEach((c) => {
        if (c.alive && c.z > 0) {
          const scale = 250 / c.z;
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 45 * scale, 18 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/it Punisher Heavy Bomber (4 Large Fuselage Pods + Curved Solar Wings)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.roll);

      // Heavy Reinforced Armor Plates
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // 4 Heavy Cylindrical Fuselage Pods (2 Central Pilot/Bombing + 2 Flanking Ordnance Bays)
      // Central Left Pod (Pilot)
      ctx.beginPath();
      ctx.arc(-14, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Central Right Pod (Avionics/Bombardier)
      ctx.beginPath();
      ctx.arc(14, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer Left Pod (Proton Torpedo Bay)
      ctx.beginPath();
      ctx.arc(-38, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer Right Pod (Concussion Missile Bay)
      ctx.beginPath();
      ctx.arc(38, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Cyan Pilot Viewport
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(-14, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Large Curved Heavy Solar Wings (Left & Right)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3.5;

      // Left Inward-Bent Wing
      ctx.beginPath();
      ctx.moveTo(-52, -45);
      ctx.lineTo(-75, -20);
      ctx.lineTo(-75, 20);
      ctx.lineTo(-52, 45);
      ctx.lineTo(-52, -45);
      ctx.fill();
      ctx.stroke();

      // Right Inward-Bent Wing
      ctx.beginPath();
      ctx.moveTo(52, -45);
      ctx.lineTo(75, -20);
      ctx.lineTo(75, 20);
      ctx.lineTo(52, 45);
      ctx.lineTo(52, -45);
      ctx.fill();
      ctx.stroke();

      // Quad Heavy Proton Torpedo Tubes
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-38, -12); ctx.lineTo(-38, -35);
      ctx.moveTo(38, -12); ctx.lineTo(38, -35);
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-900 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Bomb className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
              TIE PUNISHER // HEAVY 4-POD ORDNANCE BOMBER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/it Interdictor heavy cluster ordnance bomber & Mon Calamari fleet assault for {currentUser?.name}
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

        {gameState === 'bombing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-400">{shields} / 10</span>
              </div>
              <div>
                <span className="text-zinc-400">CRUISERS: </span>
                <span className="font-bold text-amber-400">{cruisersDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-sky-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY 4-POD PUNISHER, [SPACE] CLUSTER TORPEDO VOLLEY
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'bombing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
                  {gameState === 'fleet_destroyed' ? 'REBEL MON CALAMARI FLEET DESTROYED!' : 'TIE/IT PUNISHER BOMBER READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the massive 4-pod heavy TIE Punisher, launch heavy proton torpedo cluster volleys, and obliterate Rebel capital warships!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-700 to-amber-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE PUNISHER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
