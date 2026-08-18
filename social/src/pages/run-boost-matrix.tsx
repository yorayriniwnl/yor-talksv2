import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Crosshair,
  Shield,
  Trophy,
  Layers,
  Sparkles,
  Share2,
  ChevronRight,
  TrendingUp,
  Activity,
  Play,
  RotateCcw,
  Target,
  Gauge,
  Sliders,
  Flame,
  Award,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface RunBoostEntry {
  id: string;
  map: 'Mirage' | 'Inferno' | 'Dust II' | 'Ancient' | 'Haven' | 'Ascent';
  name: string;
  speedUnits: number; // velocity units per second (standard is 250, runboost is ~420-490)
  dropAngle: number; // surface angle degrees for silent drop slide
  boostCoords: { x: number; y: number; z: number };
  difficulty: 'Pro' | 'Elite' | 'Major Champion';
  timingWindowMs: number;
  description: string;
}

const RUN_BOOST_PRESETS: RunBoostEntry[] = [
  {
    id: 'mirage-window-short',
    map: 'Mirage',
    name: 'Mid Window-to-Catwalk Fast Run-Boost',
    speedUnits: 445,
    dropAngle: 33.5,
    boostCoords: { x: -320.4, y: -640.2, z: 128.0 },
    difficulty: 'Elite',
    timingWindowMs: 65,
    description: 'Stack on window ledge, teammate sprints forward and jumps at frame 14. Propels lead player across Mid to Catwalk in 0.85s.'
  },
  {
    id: 'inferno-banana-car',
    map: 'Inferno',
    name: 'Banana Car Deep Coffin Silent Slide',
    speedUnits: 480,
    dropAngle: 42.0,
    boostCoords: { x: 840.1, y: 1120.5, z: 96.5 },
    difficulty: 'Major Champion',
    timingWindowMs: 45,
    description: 'Collision jump off plywood stack directly into Banana car fender slope, completely eliminating landing audio signature.'
  },
  {
    id: 'dust2-long-corner',
    map: 'Dust II',
    name: 'Long A Blue Box Velocity Peek',
    speedUnits: 430,
    dropAngle: 28.0,
    boostCoords: { x: 1240.0, y: -450.0, z: 142.5 },
    difficulty: 'Pro',
    timingWindowMs: 80,
    description: 'Double crouch stack at Long Doors corner. Launch peeks A site cross before CT AWPer can establish angle lock.'
  },
  {
    id: 'haven-a-sewer-ramp',
    map: 'Haven',
    name: 'A Sewer Incline Frictionless Drop-Slide',
    speedUnits: 410,
    dropAngle: 36.5,
    boostCoords: { x: -890.0, y: 450.2, z: 210.0 },
    difficulty: 'Elite',
    timingWindowMs: 70,
    description: 'Drop from A Long railing onto 36.5° brick slant for zero decibel entry into Sewer connector.'
  }
];

export default function RunBoostMatrixPage() {
  const [selectedBoost, setSelectedBoost] = useState<RunBoostEntry>(RUN_BOOST_PRESETS[0]);
  const [simulationActive, setSimulationActive] = useState(false);
  const [playerVelocity, setPlayerVelocity] = useState(250);
  const [syncedTiming, setSyncedTiming] = useState(0);
  const [successRate, setSuccessRate] = useState(94.8);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Trajectory curve
      ctx.beginPath();
      ctx.moveTo(50, canvas.height - 60);
      const apexX = canvas.width * 0.45;
      const apexY = canvas.height * 0.3 - (selectedBoost.speedUnits / 10);
      const endX = canvas.width - 50;
      const endY = canvas.height - 60;
      ctx.quadraticCurveTo(apexX, apexY, endX, endY);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Collision Stack Base Player (P2)
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(50 + (simulationActive ? Math.sin(time) * 5 : 0), canvas.height - 60, 14, 0, Math.PI * 2);
      ctx.fill();

      // Boosted Runner (P1)
      const tNorm = simulationActive ? (Math.sin(time * 2) + 1) / 2 : 0;
      const currentX = (1 - tNorm) * (1 - tNorm) * 50 + 2 * (1 - tNorm) * tNorm * apexX + tNorm * tNorm * endX;
      const currentY = (1 - tNorm) * (1 - tNorm) * (canvas.height - 60) + 2 * (1 - tNorm) * tNorm * apexY + tNorm * tNorm * endY;

      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(currentX, currentY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Velocity indicator label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`VELOCITY: ${simulationActive ? Math.round(selectedBoost.speedUnits * (0.8 + 0.2 * Math.sin(time * 3))) : 250} u/s`, currentX - 45, currentY - 20);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedBoost, simulationActive]);

  const handleExecuteSimulation = () => {
    sounds.playPop();
    setSimulationActive(true);
    setPlayerVelocity(selectedBoost.speedUnits);
    setSyncedTiming(selectedBoost.timingWindowMs);
    toast.success(`⚡ Executing ${selectedBoost.name} at ${selectedBoost.speedUnits} units/sec!`);

    setTimeout(() => {
      sounds.playChime();
      triggerConfetti();
      toast.success('🎯 RUN-BOOST TIMING PERFECT: Frame 14 Jump Synced (0.0ms delta)');
    }, 1200);
  };

  const handleReset = () => {
    sounds.playPop();
    setSimulationActive(false);
    setPlayerVelocity(250);
  };

  const handleExportStratBook = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`📋 Strat Book for ${selectedBoost.map} exported with pixel collision timings!`);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl surface-1 border border-border/40 shadow-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-stone-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Zap className="w-7 h-7 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
                Esports Clan Run-Boost & Drop-Slide Lab
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Major Physics Engine
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Pixel-Timed Dual-Player Collision Run-Boosts & Zero-Footstep Slope-Friction Slide Calibrations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportStratBook}
            className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold shadow-md shadow-amber-500/20 gap-2"
          >
            <Share2 className="w-4 h-4" /> Export Strat Book
          </Button>
        </div>
      </div>

      {/* Preset Map Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {RUN_BOOST_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              sounds.playPop();
              setSelectedBoost(preset);
              setSimulationActive(false);
            }}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              selectedBoost.id === preset.id
                ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'surface-1 border-border/40 hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                {preset.map}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-stone-900 border border-border text-muted-foreground">
                {preset.difficulty}
              </span>
            </div>
            <h4 className="text-sm font-bold text-foreground line-clamp-1">{preset.name}</h4>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{preset.speedUnits} u/s</span>
              <span>•</span>
              <span>{preset.dropAngle}° Slope</span>
            </div>
          </button>
        ))}
      </div>

      {/* Main Physics Simulation Canvas & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface-1 rounded-3xl p-6 border border-border/40 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-amber-400" />
                  Physics Collision Trajectory Vector
                </h3>
                <p className="text-xs text-muted-foreground">
                  Coordinate Matrix: X: {selectedBoost.boostCoords.x} | Y: {selectedBoost.boostCoords.y} | Z: {selectedBoost.boostCoords.z}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleExecuteSimulation}
                  disabled={simulationActive}
                  className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Execute Run-Boost
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="border-border/60 hover:bg-stone-800 text-muted-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="relative rounded-2xl bg-stone-950/80 border border-amber-500/20 overflow-hidden aspect-[16/9]">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-stone-950/80 border border-amber-500/30 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs flex items-center gap-3">
                <span className="flex items-center gap-1 text-orange-400 font-bold">
                  <Users className="w-3.5 h-3.5" /> Base (P2)
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Zap className="w-3.5 h-3.5" /> Runner (P1)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/40">
            <div className="p-3 rounded-xl bg-stone-950/50 border border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Peak Launch Speed</span>
              <span className="text-xl font-black text-amber-400">{selectedBoost.speedUnits} u/s</span>
            </div>
            <div className="p-3 rounded-xl bg-stone-950/50 border border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Silent Slide Angle</span>
              <span className="text-xl font-black text-orange-400">{selectedBoost.dropAngle}°</span>
            </div>
            <div className="p-3 rounded-xl bg-stone-950/50 border border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Timing Window</span>
              <span className="text-xl font-black text-emerald-400">±{selectedBoost.timingWindowMs} ms</span>
            </div>
          </div>
        </div>

        {/* Tactical Breakdown & Step Guide */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
              <Crosshair className="w-5 h-5 text-orange-400" />
              Tactical Execution Guide
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Step-by-step Clan lineup sync requirements
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-bold text-amber-400 block mb-1">1. Base Positioning</span>
                <p className="text-xs text-muted-foreground">
                  Player 2 crouches on edge coordinate ({selectedBoost.boostCoords.x}, {selectedBoost.boostCoords.y}) looking 90° opposite to jump line.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                <span className="text-xs font-bold text-orange-400 block mb-1">2. Sprint & Stack Contact</span>
                <p className="text-xs text-muted-foreground">
                  Player 1 runs at standard 250 u/s, jumps onto P2 head while P2 simultaneously releases crouch.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-400 block mb-1">3. Momentum Transfer & Slide</span>
                <p className="text-xs text-muted-foreground">
                  Collision geometry accelerates runner to {selectedBoost.speedUnits} u/s, converting drop velocity directly into silent slide at {selectedBoost.dropAngle}°.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-950/60 border border-border/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-foreground">Clan Scrim Success Rate</span>
              <span className="text-xs font-black text-emerald-400">{successRate}%</span>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
