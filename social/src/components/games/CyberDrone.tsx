import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Trophy, Play, RotateCcw, Sparkles, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Obstacle {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed?: boolean;
}

export function CyberDrone() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(24);
  const [gameOver, setGameOver] = useState(false);

  // Drone physics
  const droneYRef = useRef(140);
  const velocityRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const spawnTimerRef = useRef(0);

  const startGame = () => {
    sounds.playPop();
    droneYRef.current = 140;
    velocityRef.current = 0;
    obstaclesRef.current = [];
    spawnTimerRef.current = 0;
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  const jump = () => {
    if (!isPlaying || gameOver) return;
    sounds.playPop();
    velocityRef.current = -5.5;
  };

  // Keyboard control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver]);

  // Main Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gap = 110;

    const loop = () => {
      ctx.fillStyle = '#05020a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cyber Grid Background Lines
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      if (isPlaying && !gameOver) {
        // Apply Gravity
        velocityRef.current += 0.28;
        droneYRef.current += velocityRef.current;

        // Ground and ceiling collision
        if (droneYRef.current < 10 || droneYRef.current > canvas.height - 10) {
          endGame();
        }

        // Spawn Obstacles
        spawnTimerRef.current++;
        if (spawnTimerRef.current % 75 === 0) {
          const topH = 40 + Math.random() * 120;
          obstaclesRef.current.push({
            x: canvas.width,
            topHeight: topH,
            bottomHeight: canvas.height - topH - gap,
          });
        }

        // Update Obstacles
        obstaclesRef.current.forEach((obs) => {
          obs.x -= 2.8;

          // Draw Top Neon Column
          ctx.fillStyle = '#06b6d4';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#06b6d4';
          ctx.fillRect(obs.x, 0, 36, obs.topHeight);

          // Draw Bottom Neon Column
          ctx.fillStyle = '#ec4899';
          ctx.shadowColor = '#ec4899';
          ctx.fillRect(obs.x, canvas.height - obs.bottomHeight, 36, obs.bottomHeight);
          ctx.shadowBlur = 0;

          // Check Drone Collision (Drone is at x = 70, radius 12)
          const droneX = 70;
          const droneY = droneYRef.current;

          if (droneX + 12 > obs.x && droneX - 12 < obs.x + 36) {
            if (droneY - 12 < obs.topHeight || droneY + 12 > canvas.height - obs.bottomHeight) {
              endGame();
            }
          }

          // Check Score Pass
          if (!obs.passed && obs.x + 36 < droneX) {
            obs.passed = true;
            sounds.playPop();
            setScore(s => {
              const ns = s + 1;
              if (ns > highScore) setHighScore(ns);
              return ns;
            });
          }
        });

        obstaclesRef.current = obstaclesRef.current.filter(o => o.x > -50);

        // Draw Drone (Cyber Quadcopter)
        const dy = droneYRef.current;
        ctx.fillStyle = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f59e0b';
        ctx.beginPath();
        ctx.arc(70, dy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Drone Propellers
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(56, dy - 8);
        ctx.lineTo(84, dy - 8);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    const endGame = () => {
      sounds.playGlitch();
      setGameOver(true);
      setIsPlaying(false);
      triggerConfetti();
      toast.success('Flight Concluded! Score registered on National Drone Leaderboard.');
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, highScore]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Flappy Drone Bharat Blitz
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Navigate Futuristic Bengaluru & Mumbai Neon Towers</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[0.62rem]">Top Flight Record</div>
          <div className="font-bold text-cyan-400">{highScore} Gates</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Gates Cleared</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Flight Karma</span>
          <span className="font-display font-black text-xl text-amber-400">+{score * 25} XP</span>
        </div>
      </div>

      {/* 320x320 Canvas Screen */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4">
        <canvas
          ref={canvasRef}
          width={340}
          height={320}
          onClick={jump}
          className="w-full max-w-[340px] h-[320px] block cursor-pointer"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            {gameOver ? (
              <>
                <Trophy className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Flight Terminated!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">You navigated past {score} Cyber Gates!</p>
              </>
            ) : (
              <>
                <Zap className="w-10 h-10 text-cyan-400 mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Take Flight!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Press Spacebar or Click anywhere to trigger drone thrusters!</p>
              </>
            )}

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-cyan-500 hover:bg-cyan-600 text-black glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-black" /> {gameOver ? 'Relaunch Drone' : 'Engage Flight System'}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Thrust Button */}
      {isPlaying && !gameOver && (
        <Button
          onClick={jump}
          className="w-full h-12 rounded-2xl font-bold text-sm bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          🚀 TAP THRUSTER (FLY UP)
        </Button>
      )}
    </div>
  );
}
