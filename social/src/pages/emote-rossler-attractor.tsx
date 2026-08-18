import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Radio,
  Sliders,
  Play,
  RotateCcw,
  Layers,
  Activity,
  Copy,
  ExternalLink,
  Volume2,
  Tv,
  Atom,
  RefreshCw,
  Flame,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteRosslerAttractorPage() {
  const [paramA, setParamA] = useState(0.2);
  const [paramB, setParamB] = useState(0.2);
  const [paramC, setParamC] = useState(5.7);
  const [particleCount, setParticleCount] = useState(1200);
  const [colorScheme, setColorScheme] = useState<'neon-saffron' | 'cyber-cyan' | 'chakra-purple' | 'matrix-green'>('neon-saffron');
  const [audioReactive, setAudioReactive] = useState(true);
  const [obsMode, setObsMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    // Initialize Rössler particles
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: Math.random() * 20,
      speed: 0.02 + Math.random() * 0.015,
      history: [] as { x: number; y: number }[],
    }));

    const render = () => {
      t += 0.03;
      // Fade effect for transparent OBS or regular background
      if (obsMode) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 + 20;
      const scale = 14;

      const audioMod = audioReactive ? Math.sin(t * 4) * 0.15 : 0;
      const currentC = paramC + audioMod;

      particles.forEach((p) => {
        // Rössler Attractor Differential Equations
        // dx/dt = -y - z
        // dy/dt = x + a*y
        // dz/dt = b + z*(x - c)
        const dx = (-p.y - p.z) * p.speed;
        const dy = (p.x + paramA * p.y) * p.speed;
        const dz = (paramB + p.z * (p.x - currentC)) * p.speed;

        p.x += dx;
        p.y += dy;
        p.z += dz;

        // Reset if escaped or exploded
        if (isNaN(p.x) || Math.abs(p.x) > 40 || Math.abs(p.y) > 40 || p.z > 50) {
          p.x = (Math.random() - 0.5) * 5;
          p.y = (Math.random() - 0.5) * 5;
          p.z = Math.random() * 10;
        }

        // 3D Isometric projection
        const rotY = t * 0.4;
        const projX = p.x * Math.cos(rotY) - p.y * Math.sin(rotY);
        const projY = (p.x * Math.sin(rotY) + p.y * Math.cos(rotY)) * 0.5 - p.z * 0.8;

        const screenX = centerX + projX * scale;
        const screenY = centerY + projY * scale;

        // Color mapping
        let strokeColor = '#f59e0b';
        if (colorScheme === 'neon-saffron') {
          strokeColor = `hsl(${35 + p.z * 4}, 100%, ${55 + p.z}%)`;
        } else if (colorScheme === 'cyber-cyan') {
          strokeColor = `hsl(${180 + p.z * 3}, 90%, 60%)`;
        } else if (colorScheme === 'chakra-purple') {
          strokeColor = `hsl(${270 + p.z * 4}, 95%, 65%)`;
        } else {
          strokeColor = `hsl(${140 + p.z * 3}, 90%, 55%)`;
        }

        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [paramA, paramB, paramC, particleCount, colorScheme, audioReactive, obsMode]);

  const handleCopyObsUrl = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`${window.location.origin}/emote-rossler-attractor?obs=true`);
    toast.success('🎥 Transparent OBS Browser Source URL copied to clipboard!');
  };

  const handleResetAttractor = () => {
    sounds.playPop();
    setParamA(0.2);
    setParamB(0.2);
    setParamC(5.7);
    toast.info('🌀 Reset Rössler Hyper-Spiral to standard chaotic equilibrium (a=0.2, b=0.2, c=5.7)');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl surface-1 border border-border/40 shadow-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-stone-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Atom className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
                Streamer Emote Rössler Attractor Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Continuous Dynamical Engine
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              60FPS Phase-Space Hyper-Spiral Swarm & Transparent OBS Browser Overlay
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleCopyObsUrl}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-stone-950 font-bold shadow-md shadow-amber-500/20 gap-2"
          >
            <Tv className="w-4 h-4" /> Copy OBS Browser URL
          </Button>
        </div>
      </div>

      {/* Main Canvas Stage & Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface-1 rounded-3xl p-6 border border-border/40 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  Continuous Phase-Space Quantum Trajectory
                </h3>
                <p className="text-xs text-muted-foreground">
                  System Equations: dx/dt = -y-z | dy/dt = x+ay | dz/dt = b+z(x-c)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setObsMode(!obsMode)}
                  className={obsMode ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'border-border/60'}
                >
                  <Tv className="w-3.5 h-3.5 mr-1" /> {obsMode ? 'OBS Mode (Transparent)' : 'Standard Preview'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetAttractor}
                  className="border-border/60 hover:bg-stone-800 text-muted-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="relative rounded-2xl bg-stone-950 border border-amber-500/20 overflow-hidden aspect-[16/9] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={700}
                height={400}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-stone-950/80 border border-amber-500/30 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs flex items-center gap-3">
                <span className="text-amber-400 font-bold">a: {paramA}</span>
                <span className="text-orange-400 font-bold">b: {paramB}</span>
                <span className="text-yellow-400 font-bold">c: {paramC}</span>
                <span className="text-emerald-400 font-bold">{particleCount} Emote Particles</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Quantum Attractor Controls */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-xl space-y-5">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            Dynamical Parameters
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-muted-foreground">Parameter a (Orbit Expansion)</span>
                <span className="text-amber-400">{paramA.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.4"
                step="0.01"
                value={paramA}
                onChange={(e) => setParamA(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-muted-foreground">Parameter b (Spiral Drift)</span>
                <span className="text-orange-400">{paramB.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.01"
                value={paramB}
                onChange={(e) => setParamB(parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-muted-foreground">Parameter c (Chaotic Bifurcation)</span>
                <span className="text-yellow-400">{paramC.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="9.0"
                step="0.1"
                value={paramC}
                onChange={(e) => setParamC(parseFloat(e.target.value))}
                className="w-full accent-yellow-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-muted-foreground">Particle Density</span>
                <span className="text-emerald-400">{particleCount}</span>
              </div>
              <input
                type="range"
                min="400"
                max="2500"
                step="100"
                value={particleCount}
                onChange={(e) => setParticleCount(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 space-y-3">
            <span className="text-xs font-bold text-muted-foreground block">Holographic Plasma Theme</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setColorScheme('neon-saffron')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  colorScheme === 'neon-saffron'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'surface-2 border-border/40 hover:border-amber-500/30'
                }`}
              >
                🔥 Neon Saffron
              </button>
              <button
                onClick={() => setColorScheme('cyber-cyan')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  colorScheme === 'cyber-cyan'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'surface-2 border-border/40 hover:border-cyan-500/30'
                }`}
              >
                💎 Cyber Cyan
              </button>
              <button
                onClick={() => setColorScheme('chakra-purple')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  colorScheme === 'chakra-purple'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                    : 'surface-2 border-border/40 hover:border-purple-500/30'
                }`}
              >
                💜 Chakra Purple
              </button>
              <button
                onClick={() => setColorScheme('matrix-green')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  colorScheme === 'matrix-green'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'surface-2 border-border/40 hover:border-emerald-500/30'
                }`}
              >
                ⚡ Matrix Green
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
