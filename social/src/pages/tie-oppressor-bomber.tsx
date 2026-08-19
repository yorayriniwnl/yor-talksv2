import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, Bomb
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelNebulonFrigateNode {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieOppressorBomber() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'bombing' | 'crashed' | 'frigate_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(14);
  const [torpedoesRemaining, setTorpedoesRemaining] = useState(8);
  const [nodesDestroyed, setNodesDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(475000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const nodesRef = useRef<RebelNebulonFrigateNode[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireProtonTorpedo = () => {
    if (gameState !== 'bombing' || torpedoesRemaining <= 0) return;
    uiaudio.warp();
    setTorpedoesRemaining(t => t - 1);
    const s = shipPos.current;

    // Check hit on Rebel Frigate Subsystems
    nodesRef.current.forEach((n) => {
      if (n.alive && n.z < 520 && n.z > 50) {
        if (Math.hypot(n.x - s.x, n.y - s.y) < 70) {
          n.alive = false;
          uiaudio.success();
          setNodesDestroyed(nd => nd + 1);
          setScore(sc => sc + 80000);
        }
      }
    });

    if (nodesRef.current.every(n => !n.alive)) {
      setGameState('frigate_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 320000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'bombing') return;
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

      if (e.code === 'KeyB' || e.code === 'Space') fireProtonTorpedo();
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
  }, [gameState, torpedoesRemaining]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('bombing');
    setScore(0);
    setShields(14);
    setTorpedoesRemaining(8);
    setNodesDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    nodesRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Oppressor Heavy Bomber Combat Loop
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
      const s = shipPos.current;

      // Move Rebel Frigate Nodes
      nodesRef.current.forEach((n) => {
        n.z -= 4.2;
        if (n.z < 50 && n.z > 10 && n.alive) {
          n.z = 640; // Loop around
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

      // Distant Nebulon-B Escort Frigate Spine Silhouette
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 140);
      ctx.lineTo(cx, cy - 20);
      ctx.lineTo(cx + 80, cy - 10);
      ctx.stroke();

      // Draw Rebel Frigate Target Shield Nodes
      nodesRef.current.forEach((n) => {
        if (n.alive && n.z > 0) {
          const scale = 250 / n.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.arc(n.x, n.y, 22 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Crosshairs over node
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(n.x - 28 * scale, n.y); ctx.lineTo(n.x + 28 * scale, n.y);
          ctx.moveTo(n.x, n.y - 28 * scale); ctx.lineTo(n.x, n.y + 28 * scale);
          ctx.stroke();
        }
      });

      // Draw TIE/op Oppressor (Heavily Armored Forward Swept Solar Wings + Dorsal Torpedo Tubes)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Heavy Armored Pod Fuselage
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Pilot Viewport
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // Twin Heavy Dorsal Proton Torpedo Pods (Top)
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.fillRect(-14, -28, 8, 14);
      ctx.strokeRect(-14, -28, 8, 14);
      ctx.fillRect(6, -28, 8, 14);
      ctx.strokeRect(6, -28, 8, 14);

      // Heavy Stepped Solar Wings (Left & Right)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;

      // Left Heavy Wing
      ctx.beginPath();
      ctx.moveTo(-18, -10);
      ctx.lineTo(-55, -35);
      ctx.lineTo(-65, 0);
      ctx.lineTo(-55, 35);
      ctx.lineTo(-18, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Heavy Wing
      ctx.beginPath();
      ctx.moveTo(18, -10);
      ctx.lineTo(55, -35);
      ctx.lineTo(65, 0);
      ctx.lineTo(55, 35);
      ctx.lineTo(18, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy Laser Emitters
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-55, -35, 3.5, 0, Math.PI * 2);
      ctx.arc(55, -35, 3.5, 0, Math.PI * 2);
      ctx.arc(-55, 35, 3.5, 0, Math.PI * 2);
      ctx.arc(55, 35, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, torpedoesRemaining]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Bomb className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
              TIE OPPRESSOR // HEAVY STRIKE BOMBER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/op Oppressor heavy armor proton torpedo strike bomber for {currentUser?.name}
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
                <span className="text-zinc-400">ARMOR: </span>
                <span className="font-bold text-amber-400">{shields} / 14</span>
              </div>
              <div>
                <span className="text-zinc-400">TORPEDOES: </span>
                <span className="font-bold text-rose-400">{torpedoesRemaining} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">FRIGATE NODES: </span>
                <span className="font-bold text-emerald-400">{nodesDestroyed} DESTROYED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-amber-400 font-bold">
              [WASD] FLY, [SPACE/B] LAUNCH HEAVY PROTON TORPEDO
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                  {gameState === 'frigate_destroyed' ? 'REBEL NEBULON-B FRIGATE DESTROYED!' : 'TIE OPPRESSOR READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the heavily armored Imperial TIE/op Oppressor, penetrate Rebel flak screens, and annihilate capital starship shield generators with proton torpedo salvoes!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-600 via-red-700 to-rose-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH OPPRESSOR</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
