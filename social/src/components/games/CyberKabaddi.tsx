import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Trophy, Play, RotateCcw, Flame, Sparkles, Volume2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Defender {
  x: number;
  y: number;
  r: number;
  vx: number;
  tackled: boolean;
}

export function CyberKabaddi() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(3600);
  const [raidTimer, setRaidTimer] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [pointsInRaid, setPointsInRaid] = useState(0);

  const raiderRef = useRef({
    x: 180,
    y: 240,
    r: 12,
    speed: 4,
    bonusClaimed: false,
  });

  const defendersRef = useRef<Defender[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setPointsInRaid(0);
    setRaidTimer(30);
    setGameOver(false);
    raiderRef.current = {
      x: 180,
      y: 240,
      r: 12,
      speed: 4,
      bonusClaimed: false,
    };
    defendersRef.current = [
      { x: 80, y: 70, r: 14, vx: 1.5, tackled: false },
      { x: 180, y: 55, r: 14, vx: -2, tackled: false },
      { x: 280, y: 70, r: 14, vx: 1.8, tackled: false },
      { x: 130, y: 110, r: 14, vx: -1.2, tackled: false },
      { x: 230, y: 110, r: 14, vx: 1.5, tackled: false },
    ];
    setIsPlaying(true);
  };

  const moveRaider = (dx: number, dy: number) => {
    if (!isPlaying || gameOver) return;
    sounds.playPop();
    const r = raiderRef.current;
    r.x = Math.max(25, Math.min(335, r.x + dx));
    r.y = Math.max(25, Math.min(265, r.y + dy));

    // Check Bonus Line (Y < 80)
    if (r.y < 80 && !r.bonusClaimed) {
      r.bonusClaimed = true;
      sounds.playChime();
      toast.info('🌟 BONUS POINT CLAIMED! Cross the midline to bank it!');
    }

    // Check Safe Midline Return (Y > 230)
    if (r.y > 230 && (pointsInRaid > 0 || r.bonusClaimed)) {
      sounds.playChime();
      triggerConfetti();
      const earned = pointsInRaid * 150 + (r.bonusClaimed ? 100 : 0);
      toast.success(`⚡ RAID SUCCESSFUL! +${earned} Points banked!`);
      setScore((s) => {
        const ns = s + earned;
        if (ns > highScore) setHighScore(ns);
        return ns;
      });
      // Reset for next raid
      setPointsInRaid(0);
      r.bonusClaimed = false;
      r.y = 235;
      r.x = 180;
      setRaidTimer(30);
      defendersRef.current.forEach((d) => (d.tackled = false));
    }
  };

  // 30s Raid Timer countdown
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const interval = setInterval(() => {
      setRaidTimer((t) => {
        if (t <= 1) {
          sounds.playGlitch();
          setGameOver(true);
          setIsPlaying(false);
          toast.error('⏰ RAID TIME OUT! Raider Caught by Defenders.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, gameOver]);

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      // Mat Background (Red Soil Cyber Arena)
      ctx.fillStyle = '#18040d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Midline (Safe Zone)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 230);
      ctx.lineTo(canvas.width, 230);
      ctx.stroke();

      // Baulk Line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 150);
      ctx.lineTo(canvas.width, 150);
      ctx.stroke();

      // Bonus Line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.lineTo(canvas.width, 80);
      ctx.stroke();

      if (isPlaying && !gameOver) {
        const r = raiderRef.current;

        // Move and draw defenders
        defendersRef.current.forEach((d) => {
          if (!d.tackled) {
            d.x += d.vx;
            if (d.x < 30 || d.x > canvas.width - 30) d.vx *= -1;

            // Collision with Raider (Touch / Tag)
            const dist = Math.hypot(r.x - d.x, r.y - d.y);
            if (dist < r.r + d.r) {
              d.tackled = true;
              sounds.playPop();
              setPointsInRaid((p) => p + 1);
              toast.success('🎯 DEFENDER TOUCHED! Hurry back to the green midline!');
            }
          }

          // Draw Defender
          ctx.fillStyle = d.tackled ? '#3f3f46' : '#06b6d4';
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw Raider
        ctx.fillStyle = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f59e0b';
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, pointsInRaid]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Pro Kabaddi Raid Arena
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Touch Defenders, Cross Bonus Line & Return to Midline</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Best Score</span>
          <strong className="text-amber-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Raid Timer</span>
          <span className={cn("font-display font-black text-xl", raidTimer <= 5 ? "text-rose-500 animate-pulse" : "text-amber-400")}>
            {raidTimer}s
          </span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Touch Points</span>
          <span className="font-display font-black text-xl text-emerald-400">{pointsInRaid}</span>
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
            <Users className="w-10 h-10 text-amber-400 mb-2" />
            <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Kabaddi Raid</h4>
            <p className="text-xs text-zinc-400 mb-4 font-mono">Move up, tag cyan defenders, reach top red bonus line, then return to green safe zone!</p>

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> Start Raid (Chant Kabaddi)
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="grid grid-cols-4 gap-2">
        <Button onClick={() => moveRaider(-20, 0)} variant="outline" className="rounded-xl h-10 text-xs font-mono font-bold">
          ⬅️ Left
        </Button>
        <Button onClick={() => moveRaider(0, -20)} variant="outline" className="rounded-xl h-10 text-xs font-mono font-bold text-amber-400">
          ⬆️ Raid Up
        </Button>
        <Button onClick={() => moveRaider(0, 20)} variant="outline" className="rounded-xl h-10 text-xs font-mono font-bold text-emerald-400">
          ⬇️ Retreat Safe
        </Button>
        <Button onClick={() => moveRaider(20, 0)} variant="outline" className="rounded-xl h-10 text-xs font-mono font-bold">
          Right ➡️
        </Button>
      </div>
    </div>
  );
}
