import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Play, RotateCcw, Flame, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGilliDanda() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [distance, setDistance] = useState(0);
  const [bestDistance, setBestDistance] = useState(245);
  const [gameState, setGameState] = useState<'ready' | 'airborne' | 'flying' | 'landed'>('ready');

  const gilliRef = useRef({
    x: 60,
    y: 230,
    vx: 0,
    vy: 0,
    angle: 0,
    inAir: false,
  });

  const animFrameRef = useRef<number | null>(null);

  const startFlip = () => {
    sounds.playPop();
    setDistance(0);
    gilliRef.current = {
      x: 60,
      y: 230,
      vx: 0,
      vy: -5,
      angle: 0.2,
      inAir: true,
    };
    setGameState('airborne');
    setIsPlaying(true);
    toast.info('🎯 GILLI IN AIR! Time your Danda strike NOW!');
  };

  const strikeDanda = () => {
    if (gameState !== 'airborne') return;
    const g = gilliRef.current;

    // Optimal strike window: Y between 120 and 190
    if (g.y >= 100 && g.y <= 210) {
      sounds.playChime();
      triggerConfetti();
      const power = 10 + Math.random() * 8;
      g.vx = power;
      g.vy = -6 - Math.random() * 4;
      setGameState('flying');
      toast.success('💥 PERFECT DANDA STRIKE! Massive flight trajectory engaged!');
    } else {
      sounds.playGlitch();
      setGameState('landed');
      toast.error('❌ MISTIMED STRIKE! The Gilli fell to the ground.');
    }
  };

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      // Cyber Village Dust Pitch Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#13041a');
      grad.addColorStop(0.6, '#280c2f');
      grad.addColorStop(1, '#0b0212');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground Soil
      ctx.fillStyle = '#21081a';
      ctx.fillRect(0, 240, canvas.width, 40);

      // Ground Line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 240);
      ctx.lineTo(canvas.width, 240);
      ctx.stroke();

      const g = gilliRef.current;

      if (isPlaying) {
        if (gameState === 'airborne') {
          g.vy += 0.2;
          g.y += g.vy;
          g.angle += 0.1;

          if (g.y >= 235) {
            g.y = 235;
            setGameState('landed');
          }
        } else if (gameState === 'flying') {
          g.vy += 0.25;
          g.x += g.vx;
          g.y += g.vy;
          g.angle += 0.2;

          const calculatedDist = Math.round(g.x * 0.85);
          setDistance(calculatedDist);

          if (g.y >= 235) {
            g.y = 235;
            g.vx = 0;
            g.vy = 0;
            setGameState('landed');
            if (calculatedDist > bestDistance) setBestDistance(calculatedDist);
            toast.success(`🏆 Gilli Landed! Flight Distance: ${calculatedDist} Meters!`);
          }
        }

        // Draw Gilli (Diamond wooden cylinder)
        ctx.save();
        ctx.translate(g.x % canvas.width, g.y);
        ctx.rotate(g.angle);
        ctx.fillStyle = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f59e0b';
        ctx.fillRect(-12, -4, 24, 8);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameState, bestDistance]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-red-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Gilli Danda Street Classic
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Flip the Gilli & Time Your Mega Power Danda Strike</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Record Strike</span>
          <strong className="text-amber-400 font-bold">{bestDistance} Meters</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Flight Distance</span>
          <span className="font-display font-black text-xl text-primary">{distance} M</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Status</span>
          <span className="font-display font-bold text-base text-amber-400 uppercase">{gameState}</span>
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
            <Zap className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
            <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Gilli Danda</h4>
            <p className="text-xs text-zinc-400 mb-4 font-mono">1. Tap "Flip Gilli" to launch into air. 2. Tap "Strike Danda" when aligned!</p>

            <Button
              onClick={startFlip}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> Flip Gilli to Start
            </Button>
          </div>
        )}
      </div>

      {/* Dual Controls */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={startFlip}
          disabled={gameState === 'airborne' || gameState === 'flying'}
          variant="outline"
          className="rounded-2xl h-12 text-xs font-bold font-mono"
        >
          ⬆️ Flip Gilli in Air
        </Button>
        <Button
          onClick={strikeDanda}
          disabled={gameState !== 'airborne'}
          className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg"
        >
          💥 Strike Danda (HIT!)
        </Button>
      </div>
    </div>
  );
}
