import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Globe, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelTransportXWing {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieInterdictorSkirmish() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'interdiction' | 'crashed' | 'fleet_captured'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(14);
  const [transportsCaptured, setTransportsCaptured] = useState(0);
  const [highScore, setHighScore] = useState(415000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const transportsRef = useRef<RebelTransportXWing[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireGravityShadowPulse = () => {
    if (gameState !== 'interdiction') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Rebel Transports
    transportsRef.current.forEach((t) => {
      if (t.alive && t.z < 520 && t.z > 50) {
        if (Math.hypot(t.x - s.x, t.y - s.y) < 65) {
          t.alive = false;
          uiaudio.success();
          setTransportsCaptured(tc => tc + 1);
          setScore(sc => sc + 60000);
        }
      }
    });

    if (transportsRef.current.every(t => !t.alive)) {
      setGameState('fleet_captured');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 250000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'interdiction') return;
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

      if (e.code === 'Space') fireGravityShadowPulse();
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
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('interdiction');
    setScore(0);
    setShields(14);
    setTransportsCaptured(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    transportsRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Interdictor Combat Loop
  useEffect(() => {
    if (gameState !== 'interdiction') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shipPos.current;

      // Move Rebel Transports
      transportsRef.current.forEach((t) => {
        t.z -= 4.3;
        if (t.z < 50 && t.z > 10 && t.alive) {
          t.z = 640; // Loop around
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

      // Interdiction Gravity Well Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Pulsing Gravity Shadow Distortions (Concentric Circles)
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.lineWidth = 2;
      for (let g = 0; g < 4; g++) {
        const rad = ((frame * 2 + g * 80) % 360);
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Rebel GR-75 Medium Transports
      transportsRef.current.forEach((t) => {
        if (t.alive && t.z > 0) {
          const scale = 250 / t.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.ellipse(t.x, t.y, 30 * scale, 16 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/in Interdictor (Central Cockpit + 4 Gravity Well Bulges + Bent Heavy Wings)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Central Imperial Hull
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4 Gravity Well Projector Domes (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
      const domeOffsets = [
        { x: -14, y: -14 },
        { x: 14, y: -14 },
        { x: -14, y: 14 },
        { x: 14, y: 14 },
      ];

      domeOffsets.forEach(d => {
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Cyan Pilot Viewport
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Bent Heavy Solar Wings (Left & Right)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;

      // Left Wing
      ctx.beginPath();
      ctx.moveTo(-45, -35);
      ctx.lineTo(-65, -12);
      ctx.lineTo(-65, 12);
      ctx.lineTo(-45, 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Wing
      ctx.beginPath();
      ctx.moveTo(45, -35);
      ctx.lineTo(65, -12);
      ctx.lineTo(65, 12);
      ctx.lineTo(45, 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Pylons
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-18, 0); ctx.lineTo(-45, 0);
      ctx.moveTo(18, 0); ctx.lineTo(45, 0);
      ctx.stroke();

      // Gravity Pulse Beam Cannon
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -18); ctx.lineTo(0, -48);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-900 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Globe className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-amber-400">
              TIE INTERDICTOR // GRAVITY-WELL CRUISER SKIRMISH
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/in Interdictor 4-dome gravity shadow hyperspace capture for {currentUser?.name}
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

        {gameState === 'interdiction' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-purple-400">{shields} / 14</span>
              </div>
              <div>
                <span className="text-zinc-400">TRANSPORTS: </span>
                <span className="font-bold text-pink-400">{transportsCaptured} CAPTURED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-sky-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-purple-400 font-bold">
              [WASD] FLY INTERDICTOR, [SPACE] FIRE GRAVITY SHADOW PULSE
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'interdiction' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-amber-400">
                  {gameState === 'fleet_captured' ? 'REBEL FLEET HYPERSPACE TRAPPED!' : 'TIE INTERDICTOR READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the heavy 4-dome TIE Interdictor, project artificial gravity shadows into hyperspace, and capture fleeing Rebel convoys!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-700 to-pink-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH INTERDICTOR</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
