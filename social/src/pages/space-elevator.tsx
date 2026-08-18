import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Compass, Sun, ShieldCheck
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SpaceElevator() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [climberAltitudeKm, setClimberAltitudeKm] = useState(1240);
  const [ascentSpeedKmh, setAscentSpeedKmh] = useState(850);
  const [tetherTensionGpa, setTetherTensionGpa] = useState(64.5); // GPa
  const [isAscending, setIsAscending] = useState(true);

  const climberRef = useRef({ altKm: 1240, speed: 850 });
  const animFrameRef = useRef<number | null>(null);

  // Space Elevator Canvas Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      const c = climberRef.current;

      if (isAscending) {
        c.altKm += (c.speed / 3600) * 8;
        if (c.altKm > 36000) c.altKm = 0; // Geostationary loop
        setClimberAltitudeKm(Math.round(c.altKm));
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;

      // Vertical Atmosphere to Deep Space Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#010309'); // Deep Space
      skyGrad.addColorStop(0.5, '#0c1a30'); // Exosphere
      skyGrad.addColorStop(0.85, '#0284c7'); // Stratosphere
      skyGrad.addColorStop(1, '#38bdf8'); // Ocean Surface
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Carbon Nanotube Tether Ribbon (Vertical Line)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      // Slight Coriolis lateral deflection
      const coriolisX = Math.sin(time) * 4;
      ctx.moveTo(cx, canvas.height);
      ctx.lineTo(cx + coriolisX, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Ocean Platform Anchor Base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 50, canvas.height - 30, 100, 30);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(cx - 60, canvas.height - 8, 120, 8);

      // Geostationary Counterweight Asteroid at Top
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(cx, 20, 25, 0, Math.PI * 2);
      ctx.fill();

      // Draw Climber Maglev Car
      const altFraction = c.altKm / 36000;
      const climberY = canvas.height - 40 - (altFraction * (canvas.height - 70));

      ctx.save();
      ctx.translate(cx + coriolisX * (1 - altFraction), climberY);

      // Climber Pod Body
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.fillRect(-12, -18, 24, 36);

      // Laser Power Receiver Panels
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-22, -10, 10, 20);
      ctx.fillRect(12, -10, 10, 20);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAscending]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-sky-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(14,165,233,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-400">
                SPACE ELEVATOR // GEOSTATIONARY TETHER 36,000KM
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                CARBON NANOTUBE RIBBON
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Equatorial laser-powered maglev climber & Coriolis dynamics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => {
              uiaudio.click();
              setIsAscending(!isAscending);
            }}
            className={cn(
              "px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg",
              isAscending ? "bg-amber-500 text-black shadow-amber-500/30 animate-pulse" : "bg-zinc-800 text-zinc-300"
            )}
          >
            {isAscending ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isAscending ? 'ASCENT IN PROGRESS' : 'ASCENT PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={740}
            height={520}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-amber-400 font-bold">ALTITUDE: {climberAltitudeKm.toLocaleString()} KM</span>
              <span className="text-cyan-400 font-bold">SPEED: {ascentSpeedKmh} KM/H</span>
            </div>
            <div>GEOSTATIONARY SYNC: 35,786 KM TARGET</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TETHER DYNAMICS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Ascent Velocity:</span>
              <span className="text-sky-400 font-bold">{ascentSpeedKmh} KM/H</span>
            </div>
            <input
              type="range"
              min={300}
              max={2000}
              step={50}
              value={ascentSpeedKmh}
              onChange={(e) => setAscentSpeedKmh(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">ORBITAL MECHANICS:</span>
            <div>• Centrifugal force exceeds Earth's gravity above 35,786 km GEO altitude.</div>
            <div>• Climber is powered by ground-based infrared phased-array laser beams.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
