import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface TieFighter {
  x: number;
  y: number;
  z: number;
  type: 'tie_standard' | 'vader_advanced';
  alive: boolean;
}

export default function TieFighterArcade() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'dogfight' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(6);
  const [highScore, setHighScore] = useState(122000);

  const crosshairPos = useRef({ x: 370, y: 240 });
  const fightersRef = useRef<TieFighter[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireQuadLasers = () => {
    if (gameState !== 'dogfight') return;
    uiaudio.warp();
    const ch = crosshairPos.current;

    // Check hit on closest TIE fighter near crosshair
    fightersRef.current.forEach((tf) => {
      if (tf.alive && tf.z < 400 && tf.z > 50) {
        const scale = 1 - tf.z / 600;
        const screenX = 370 + (tf.x - 370) * scale;
        const screenY = 240 + (tf.y - 240) * scale;

        if (Math.hypot(screenX - ch.x, screenY - ch.y) < 45 * scale) {
          tf.alive = false;
          uiaudio.success();
          setScore(s => s + (tf.type === 'vader_advanced' ? 5000 : 1500));
        }
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'dogfight') return;
      const ch = crosshairPos.current;
      const step = 12;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') ch.y = Math.max(80, ch.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') ch.y = Math.min(400, ch.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') ch.x = Math.max(80, ch.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') ch.x = Math.min(660, ch.x + step);

      if (e.code === 'Space') fireQuadLasers();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('dogfight');
    setScore(0);
    setShields(6);
    crosshairPos.current = { x: 370, y: 240 };
    fightersRef.current = [
      { x: 200, y: 150, z: 600, type: 'tie_standard', alive: true },
      { x: 500, y: 180, z: 500, type: 'tie_standard', alive: true },
      { x: 370, y: 100, z: 700, type: 'vader_advanced', alive: true },
    ];
  };

  // 1983 Vector Wireframe TIE Fighter Dogfight Physics Loop
  useEffect(() => {
    if (gameState !== 'dogfight') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Spawn Waves of Approaching TIE Fighters
      if (Math.random() < 0.04 && fightersRef.current.length < 8) {
        fightersRef.current.push({
          x: Math.random() * (canvas.width - 200) + 100,
          y: Math.random() * (canvas.height - 200) + 100,
          z: 600,
          type: Math.random() < 0.2 ? 'vader_advanced' : 'tie_standard',
          alive: true,
        });
      }

      // Move Fighters closer (z decreases)
      fightersRef.current.forEach((tf) => {
        if (tf.alive) {
          tf.z -= 4;

          // If too close, fires green laser and damages shields
          if (tf.z <= 30) {
            tf.alive = false;
            setShields(s => {
              if (s <= 1) {
                setGameState('gameover');
                uiaudio.error();
                return 0;
              }
              uiaudio.error();
              return s - 1;
            });
          }
        }
      });

      fightersRef.current = fightersRef.current.filter(tf => tf.z > 20);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Deep Space Vector Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Vector Starfield
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 40; s++) {
        const sx = ((s * 97 + frame * 0.5) % canvas.width);
        const sy = (s * 43) % canvas.height;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Draw Approaching TIE Fighters in 1983 Vector Wireframe Style
      fightersRef.current.forEach((tf) => {
        if (tf.alive) {
          const scale = 1 - tf.z / 600;
          const screenX = cx + (tf.x - cx) * scale;
          const screenY = cy + (tf.y - cy) * scale;
          const wingH = 60 * scale;
          const wingW = 12 * scale;
          const cockpitR = 14 * scale;

          ctx.strokeStyle = tf.type === 'vader_advanced' ? '#ec4899' : '#06b6d4';
          ctx.lineWidth = 2;

          // Central Cockpit Sphere
          ctx.beginPath();
          ctx.arc(screenX, screenY, cockpitR, 0, Math.PI * 2);
          ctx.stroke();

          // Left & Right Solar Panels (Hexagonal Vector Wings)
          ctx.strokeRect(screenX - cockpitR * 2.5 - wingW, screenY - wingH / 2, wingW, wingH);
          ctx.strokeRect(screenX + cockpitR * 2.5, screenY - wingH / 2, wingW, wingH);

          // Wing Pylon Struts
          ctx.beginPath();
          ctx.moveTo(screenX - cockpitR, screenY); ctx.lineTo(screenX - cockpitR * 2.5, screenY);
          ctx.moveTo(screenX + cockpitR, screenY); ctx.lineTo(screenX + cockpitR * 2.5, screenY);
          ctx.stroke();
        }
      });

      // Draw X-Wing Vector Cockpit HUD Crosshair Reticle
      const ch = crosshairPos.current;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(ch.x - 20, ch.y - 20, 40, 40);
      ctx.beginPath();
      ctx.moveTo(ch.x - 30, ch.y); ctx.lineTo(ch.x + 30, ch.y);
      ctx.moveTo(ch.x, ch.y - 30); ctx.lineTo(ch.x, ch.y + 30);
      ctx.stroke();

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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Target className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              STAR WARS 1983 // 3D VECTOR TIE-FIGHTER ARCADE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Atari vector wireframe dogfight, Vader's TIE Advanced interception for {currentUser?.name}
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
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-base text-cyan-300">{shields} / 6</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-amber-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD / ARROWS] AIM RETICLE, [SPACE] FIRE QUAD LASERS
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  {gameState === 'gameover' ? 'SHIELDS COMPROMISED - X-WING DESTROYED!' : 'STAR WARS 1983 VECTOR ARCADE'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Clear incoming waves of Imperial TIE Fighters and Darth Vader's ship in deep space!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>COMMENCE SPACE DOGFIGHT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
