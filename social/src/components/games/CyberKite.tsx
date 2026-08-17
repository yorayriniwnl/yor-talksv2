import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, Trophy, Play, RotateCcw, Flame, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Kite {
  x: number;
  y: number;
  angle: number;
  color: string;
  isEnemy: boolean;
  cut: boolean;
}

export function CyberKite() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(4800);
  const [gameOver, setGameOver] = useState(false);
  const [kitesCut, setKitesCut] = useState(0);

  const playerRef = useRef({
    x: 180,
    y: 200,
    angle: 0,
    altitude: 120,
    manjaPower: 80,
  });

  const enemiesRef = useRef<Kite[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setKitesCut(0);
    setGameOver(false);
    playerRef.current = {
      x: 180,
      y: 200,
      angle: 0,
      altitude: 120,
      manjaPower: 80,
    };
    enemiesRef.current = [
      { x: 80, y: 70, angle: 0.2, color: '#f43f5e', isEnemy: true, cut: false },
      { x: 280, y: 90, angle: -0.2, color: '#06b6d4', isEnemy: true, cut: false },
      { x: 180, y: 50, angle: 0.1, color: '#fbbf24', isEnemy: true, cut: false },
    ];
    setIsPlaying(true);
  };

  const pullManja = () => {
    if (!isPlaying || gameOver) return;
    sounds.playPop();
    playerRef.current.altitude += 8;
    playerRef.current.y = Math.max(40, playerRef.current.y - 8);
  };

  const releaseSlack = () => {
    if (!isPlaying || gameOver) return;
    sounds.playPop();
    playerRef.current.y = Math.min(240, playerRef.current.y + 8);
  };

  const steer = (dir: 'left' | 'right') => {
    if (!isPlaying || gameOver) return;
    sounds.playPop();
    playerRef.current.x += dir === 'left' ? -18 : 18;
    playerRef.current.x = Math.max(30, Math.min(330, playerRef.current.x));
  };

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      // Cyber Dusk Sunset Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#1e0826');
      grad.addColorStop(0.5, '#4c0519');
      grad.addColorStop(1, '#090214');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Wind Particles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let i = 0; i < 15; i++) {
        const wx = (Date.now() / 15 + i * 25) % canvas.width;
        const wy = (i * 20) % canvas.height;
        ctx.fillRect(wx, wy, 12, 1);
      }

      if (isPlaying && !gameOver) {
        const p = playerRef.current;

        // Draw Player String (Manja)
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(180, canvas.height);
        ctx.lineTo(p.x, p.y + 15);
        ctx.stroke();

        // Draw Player Diamond Patang Kite
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(16, 0);
        ctx.lineTo(0, 18);
        ctx.lineTo(-16, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Draw and update Enemy Kites
        enemiesRef.current.forEach((e, idx) => {
          if (e.cut) {
            e.y += 2;
            e.x += Math.sin(Date.now() / 200 + idx) * 2;
          } else {
            e.x += Math.sin(Date.now() / 400 + idx) * 1.5;

            // Check String Cut Collision
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < 28) {
              e.cut = true;
              sounds.playChime();
              triggerConfetti();
              toast.success('🪁 KAI PO CHE! Opponent Patang string sliced!');
              setKitesCut((c) => c + 1);
              setScore((s) => {
                const ns = s + 500;
                if (ns > highScore) setHighScore(ns);
                return ns;
              });
            }
          }

          // Draw Enemy Kite
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.moveTo(0, -16);
          ctx.lineTo(14, 0);
          ctx.lineTo(0, 16);
          ctx.lineTo(-14, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, highScore, score]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Patang Baazi Cyber Kite Fight
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Cut Opponent Manja Strings in Cyber Sunset Skies</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Best Flight</span>
          <strong className="text-amber-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Patangs Cut</span>
          <span className="font-display font-black text-xl text-emerald-400">{kitesCut} Kites</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4 select-none">
        <canvas
          ref={canvasRef}
          width={360}
          height={280}
          className="w-full max-w-[360px] h-[280px] block"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <Wind className="w-10 h-10 text-amber-400 mb-2" />
            <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Patang Baazi</h4>
            <p className="text-xs text-zinc-400 mb-4 font-mono">Use Steer and Pull controls to slice opponent strings!</p>

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> Launch Patang
            </Button>
          </div>
        )}
      </div>

      {/* Flight Controls */}
      <div className="grid grid-cols-4 gap-2">
        <Button onClick={() => steer('left')} variant="outline" className="rounded-xl h-10 text-xs font-mono font-bold">
          ⬅️ Left
        </Button>
        <Button onClick={pullManja} variant="outline" className="rounded-xl h-10 text-xs font-mono font-bold text-amber-400">
          ⬆️ Pull (Kheench)
        </Button>
        <Button onClick={releaseSlack} variant="outline" className="rounded-xl h-10 text-xs font-mono font-bold text-cyan-400">
          ⬇️ Slack (Dheel)
        </Button>
        <Button onClick={() => steer('right')} variant="outline" className="rounded-xl h-10 text-xs font-mono font-bold">
          Right ➡️
        </Button>
      </div>
    </div>
  );
}
