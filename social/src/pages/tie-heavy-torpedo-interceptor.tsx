import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, Rocket
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelNebulonFrigates {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieHeavyTorpedoInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'strike' | 'crashed' | 'frigates_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(14);
  const [heavyTorpedoAmmo, setHeavyTorpedoAmmo] = useState(12);
  const [frigatesDestroyed, setFrigatesDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(600000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const frigatesRef = useRef<RebelNebulonFrigates[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const launchHeavyTorpedo = () => {
    if (gameState !== 'strike' || heavyTorpedoAmmo <= 0) return;
    uiaudio.warp();
    setHeavyTorpedoAmmo(a => Math.max(0, a - 2));
    const s = shipPos.current;

    // Check hit on Rebel Nebulon-B Frigates
    frigatesRef.current.forEach((f) => {
      if (f.alive && f.z < 520 && f.z > 50) {
        if (Math.hypot(f.x - s.x, f.y - s.y) < 75) {
          f.alive = false;
          uiaudio.success();
          setFrigatesDestroyed(fd => fd + 1);
          setScore(sc => sc + 130000);
        }
      }
    });

    if (frigatesRef.current.every(f => !f.alive)) {
      setGameState('frigates_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 500000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'strike') return;
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

      if (e.code === 'Space') launchHeavyTorpedo();
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
  }, [gameState, heavyTorpedoAmmo]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('strike');
    setScore(0);
    setShields(14);
    setHeavyTorpedoAmmo(12);
    setFrigatesDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    frigatesRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Heavy Torpedo Strike Loop
  useEffect(() => {
    if (gameState !== 'strike') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 50);
      const s = shipPos.current;

      // Move Rebel Nebulon-B Frigates
      frigatesRef.current.forEach((f) => {
        f.z -= 3.8;
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

      // Distant Rebel Fleet Formation Wireframe
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 80, 230, 45, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Rebel EF76 Nebulon-B Escort Frigates (Spade Forehead + Narrow Spar + Engine Aft)
      frigatesRef.current.forEach((f) => {
        if (f.alive && f.z > 0) {
          const scale = 250 / f.z;
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 16;

          // Forehead Head
          ctx.beginPath();
          ctx.rect(f.x - 10 * scale, f.y - 25 * scale, 20 * scale, 25 * scale);
          // Connecting Spar
          ctx.rect(f.x - 3 * scale, f.y, 6 * scale, 30 * scale);
          // Aft Engines
          ctx.rect(f.x - 14 * scale, f.y + 30 * scale, 28 * scale, 15 * scale);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/exp M8 Heavy Torpedo (Central Pod Flanked by Dual Huge Magazine Pods)
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

      // Dual Heavy Torpedo Magazine Pods (Left at -30, Right at +30)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;

      // Left Torpedo Pod
      ctx.fillRect(-40, -26, 18, 52);
      ctx.strokeRect(-40, -26, 18, 52);

      // Right Torpedo Pod
      ctx.fillRect(22, -26, 18, 52);
      ctx.strokeRect(22, -26, 18, 52);

      // Heavy Proton Torpedo Warhead Tubes (Cyan)
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(-31, -26, 5, 0, Math.PI * 2);
      ctx.arc(31, -26, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Outer Solar Wing Struts
      ctx.strokeStyle = '#38bdf8';
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
  }, [gameState, score, shields, heavyTorpedoAmmo]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-sky-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(56,189,248,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400">
              TIE HEAVY TORPEDO // NEBULON-B STRIKE INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/exp M8 Heavy Torpedo dual magazine proton torpedo bomber for {currentUser?.name}
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

        {gameState === 'strike' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-sky-400">{shields} / 14</span>
              </div>
              <div>
                <span className="text-zinc-400">PROTON TORPEDOES: </span>
                <span className="font-bold text-amber-400">{heavyTorpedoAmmo} / 12</span>
              </div>
              <div>
                <span className="text-zinc-400">NEBULON-B: </span>
                <span className="font-bold text-cyan-400">{frigatesDestroyed} DESTROYED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-sky-400 font-bold">
              [WASD] FLY, [SPACE] LAUNCH HEAVY PROTON TORPEDOES
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'strike' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400">
                  {gameState === 'frigates_destroyed' ? 'REBEL NEBULON-B FRIGATE FLEET DESTROYED!' : 'TIE HEAVY TORPEDO READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the devastating Imperial TIE/exp M8 Heavy Torpedo, fire dual heavy proton torpedoes into the connecting spars of Rebel Nebulon-B frigates, and tear them apart!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-700 to-indigo-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH STRIKE FIGHTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
