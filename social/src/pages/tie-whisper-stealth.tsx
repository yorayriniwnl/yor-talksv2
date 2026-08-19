import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, EyeOff
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PirateCorvette {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieWhisperStealth() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'hunt' | 'crashed' | 'corvettes_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [stealthCloaked, setStealthCloaked] = useState(false);
  const [corvettesDestroyed, setCorvettesDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(325000);

  const whisperPos = useRef({ x: 370, y: 360, roll: 0 });
  const corvettesRef = useRef<PirateCorvette[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const toggleStealthCloak = () => {
    uiaudio.warp();
    setStealthCloaked(c => !c);
  };

  const fireStealthTorpedoes = () => {
    if (gameState !== 'hunt') return;
    uiaudio.warp();
    const w = whisperPos.current;

    // Check hit on Pirate Corvettes
    corvettesRef.current.forEach((c) => {
      if (c.alive && c.z < 520 && c.z > 50) {
        if (Math.hypot(c.x - w.x, c.y - w.y) < 65) {
          c.alive = false;
          uiaudio.success();
          setCorvettesDestroyed(cd => cd + 1);
          setScore(sc => sc + (stealthCloaked ? 60000 : 40000));
        }
      }
    });

    if (corvettesRef.current.every(c => !c.alive)) {
      setGameState('corvettes_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 190000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'hunt') return;
      const w = whisperPos.current;
      const step = 16;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') w.y = Math.max(100, w.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') w.y = Math.min(420, w.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        w.x = Math.max(100, w.x - step);
        w.roll = -0.35;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        w.x = Math.min(640, w.x + step);
        w.roll = 0.35;
      }

      if (e.code === 'Space') fireStealthTorpedoes();
      if (e.code === 'KeyC') toggleStealthCloak();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        whisperPos.current.roll = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, stealthCloaked]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('hunt');
    setScore(0);
    setShields(8);
    setStealthCloaked(false);
    setCorvettesDestroyed(0);
    whisperPos.current = { x: 370, y: 360, roll: 0 };
    corvettesRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // TIE/wi Whisper Stealth Interceptor Loop
  useEffect(() => {
    if (gameState !== 'hunt') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const w = whisperPos.current;

      // Move Corvettes
      corvettesRef.current.forEach((c) => {
        c.z -= 4.2;
        if (c.z < 50 && c.z > 10 && c.alive) {
          c.z = 640; // Loop around
          if (!stealthCloaked) {
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
        }
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Ocean Ocean Debris Void (Kef Bir)
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Death Star II Superstructure Wireframe Debris in Waves
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 5; s++) {
        const offset = (frame * 3 + s * 90) % 480;
        ctx.strokeRect(cx - 280 + s * 120, cy + 60, 80, 40);
      }

      // Draw Pirate Corvettes (Heavy Cyan Block Ships)
      corvettesRef.current.forEach((c) => {
        if (c.alive && c.z > 0) {
          const scale = 250 / c.z;
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.rect(c.x - 20 * scale, c.y - 12 * scale, 40 * scale, 24 * scale);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Kylo Ren TIE/wi Whisper (Swept-back Dagger Solar Wings + Red Core)
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(w.roll);

      if (stealthCloaked) {
        ctx.globalAlpha = 0.35;
      }

      // Stealth Matte Black Armor
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Central Pod with Red Glowing Cockpit
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = stealthCloaked ? 4 : 16;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Long Swept-Back Dagger Solar Wings (Left & Right)
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Left Swept Wing
      ctx.beginPath();
      ctx.moveTo(-15, -10);
      ctx.lineTo(-75, -60);
      ctx.lineTo(-85, 30);
      ctx.lineTo(-15, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Swept Wing
      ctx.beginPath();
      ctx.moveTo(15, -10);
      ctx.lineTo(75, -60);
      ctx.lineTo(85, 30);
      ctx.lineTo(15, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy Red Forward Lasers
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-75, -60); ctx.lineTo(-75, -90);
      ctx.moveTo(75, -60); ctx.lineTo(75, -90);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, stealthCloaked]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-indigo-900 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <EyeOff className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-rose-300 to-indigo-400">
              TIE WHISPER // KYLO REN STEALTH INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/wi custom modified stealth interceptor & Kef Bir debris hunt for {currentUser?.name}
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

        {gameState === 'hunt' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-red-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">STEALTH: </span>
                <span className={cn("font-bold", stealthCloaked ? "text-cyan-400" : "text-zinc-500")}>
                  {stealthCloaked ? 'CLOAKED (INVISIBLE)' : 'UNCLOAKED'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-rose-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-red-400 font-bold">
              [WASD] FLY, [SPACE] HEAVY LASERS, [C] TOGGLE CLOAK
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'hunt' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-rose-300 to-indigo-400">
                  {gameState === 'corvettes_destroyed' ? 'TARGET PIRATE FLEET NEUTRALIZED!' : 'TIE/WI WHISPER STEALTH READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot Kylo Ren's custom TIE/wi Whisper stealth interceptor through Kef Bir wreckage, activate sensor cloaking, and annihilate pirate corvettes!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-700 to-indigo-800 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE WHISPER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
