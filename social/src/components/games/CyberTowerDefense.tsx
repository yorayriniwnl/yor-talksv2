import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Play, RotateCcw, Trophy, Sparkles, Flame, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
}

interface Turret {
  id: number;
  x: number;
  y: number;
  range: number;
  cooldown: number;
  type: 'laser' | 'plasma' | 'slow';
}

export function CyberTowerDefense() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [credits, setCredits] = useState(250);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [coreHp, setCoreHp] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [selectedTurretType, setSelectedTurretType] = useState<'laser' | 'plasma' | 'slow'>('laser');

  const enemiesRef = useRef<Enemy[]>([]);
  const turretsRef = useRef<Turret[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setCredits(250);
    setScore(0);
    setWave(1);
    setCoreHp(100);
    setGameOver(false);
    enemiesRef.current = [];
    turretsRef.current = [
      { id: 1, x: 120, y: 90, range: 70, cooldown: 0, type: 'laser' },
      { id: 2, x: 240, y: 190, range: 70, cooldown: 0, type: 'plasma' },
    ];
    setIsPlaying(true);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Turret cost
    const cost = selectedTurretType === 'laser' ? 100 : selectedTurretType === 'plasma' ? 150 : 80;
    if (credits < cost) {
      sounds.playGlitch();
      toast.error('Insufficient Credits to build turret!');
      return;
    }

    sounds.playPop();
    setCredits(c => c - cost);
    turretsRef.current.push({
      id: Date.now(),
      x,
      y,
      range: selectedTurretType === 'plasma' ? 90 : 70,
      cooldown: 0,
      type: selectedTurretType,
    });
    toast.success(`⚡ Placed ${selectedTurretType.toUpperCase()} Turret!`);
  };

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let spawnTimer = 0;

    const loop = () => {
      // Clear Screen
      ctx.fillStyle = '#06020e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Path
      ctx.fillStyle = '#180e30';
      ctx.fillRect(0, 130, 180, 40);
      ctx.fillRect(140, 130, 40, 100);
      ctx.fillRect(140, 190, 220, 40);

      // Draw Core Base
      ctx.fillStyle = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#06b6d4';
      ctx.fillRect(320, 180, 40, 60);
      ctx.shadowBlur = 0;

      if (isPlaying && !gameOver) {
        // Spawn Enemies
        spawnTimer++;
        if (spawnTimer > 75) {
          spawnTimer = 0;
          enemiesRef.current.push({
            id: Date.now() + Math.random(),
            x: 0,
            y: 145,
            hp: 60 + wave * 15,
            maxHp: 60 + wave * 15,
            speed: 1.2 + wave * 0.05,
          });
        }

        // Move Enemies along path
        enemiesRef.current.forEach((en, idx) => {
          if (en.x < 155 && en.y <= 150) {
            en.x += en.speed;
          } else if (en.x >= 155 && en.y < 205) {
            en.y += en.speed;
          } else {
            en.x += en.speed;
          }

          // Check reaching base
          if (en.x >= 320) {
            sounds.playGlitch();
            enemiesRef.current.splice(idx, 1);
            setCoreHp(h => {
              const nh = h - 20;
              if (nh <= 0) {
                setGameOver(true);
                setIsPlaying(false);
                toast.error('❌ Core Breached! Game Over.');
              }
              return Math.max(0, nh);
            });
          }
        });

        // Turret Logic & Shooting
        turretsRef.current.forEach(t => {
          if (t.cooldown > 0) t.cooldown--;

          // Find target enemy in range
          const target = enemiesRef.current.find(en => {
            const dx = en.x - t.x;
            const dy = en.y - t.y;
            return Math.sqrt(dx * dx + dy * dy) <= t.range;
          });

          if (target && t.cooldown === 0) {
            t.cooldown = t.type === 'plasma' ? 35 : 20;
            target.hp -= t.type === 'plasma' ? 45 : 25;

            // Draw Laser Beam
            ctx.strokeStyle = t.type === 'plasma' ? '#f43f5e' : '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();

            if (target.hp <= 0) {
              sounds.playPop();
              const eIdx = enemiesRef.current.indexOf(target);
              if (eIdx !== -1) enemiesRef.current.splice(eIdx, 1);
              setCredits(c => c + 35);
              setScore(s => s + 50);
            }
          }
        });

        // Draw Turrets
        turretsRef.current.forEach(t => {
          ctx.fillStyle = t.type === 'plasma' ? '#f43f5e' : '#06b6d4';
          ctx.beginPath();
          ctx.arc(t.x, t.y, 9, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw Enemies
        enemiesRef.current.forEach(en => {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(en.x, en.y, 7, 0, Math.PI * 2);
          ctx.fill();

          // HP Bar
          ctx.fillStyle = '#10b981';
          ctx.fillRect(en.x - 8, en.y - 12, (en.hp / en.maxHp) * 16, 2);
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, wave]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Tower Defense
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Defend the Bharat Core from Glitch Bots</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Credits</span>
          <strong className="text-emerald-400 font-bold text-sm">₹{credits} C</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Score</span>
          <strong className="font-display font-black text-lg text-primary">{score}</strong>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Wave</span>
          <strong className="font-display font-black text-lg text-amber-400">Wave {wave}</strong>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Core HP</span>
          <strong className={cn("font-display font-black text-lg", coreHp < 40 ? "text-rose-500" : "text-emerald-400")}>
            {coreHp}%
          </strong>
        </div>
      </div>

      {/* Turret Selection Bar */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-zinc-950 border border-border/40 mb-3 font-mono text-xs">
        <span className="text-[0.65rem] text-muted-foreground ml-2">Build Turret:</span>
        <div className="flex gap-2">
          {[
            { id: 'laser', name: '⚡ Laser (100C)' },
            { id: 'plasma', name: '💥 Plasma (150C)' },
          ].map(t => (
            <Button
              key={t.id}
              size="sm"
              variant={selectedTurretType === t.id ? 'default' : 'outline'}
              onClick={() => {
                sounds.playPop();
                setSelectedTurretType(t.id as any);
              }}
              className={cn("rounded-xl text-xs h-8", selectedTurretType === t.id && "bg-primary text-primary-foreground")}
            >
              {t.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4 select-none">
        <canvas
          ref={canvasRef}
          width={360}
          height={280}
          onClick={handleCanvasClick}
          className="w-full max-w-[360px] h-[280px] block cursor-crosshair"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            {gameOver ? (
              <>
                <Trophy className="w-10 h-10 text-rose-500 mb-2 animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Defense Failed</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Score: {score} Pts</p>
              </>
            ) : (
              <>
                <Shield className="w-10 h-10 text-cyan-400 mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Core Defense</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Click canvas to build laser turrets along the path!</p>
              </>
            )}

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> {gameOver ? 'Defend Again' : 'Engage Core Defense'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
