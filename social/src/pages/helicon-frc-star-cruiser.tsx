import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HeliconFrcStarCruiser() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [counterInjectionVelocityKmS, setCounterInjectionVelocityKmS] = useState(900); // 900 km/s counter-injection
  const [rfHeliconPowerMw, setRfHeliconPowerMw] = useState(140); // 140 MW RF Helicon
  const [specificImpulseSec, setSpecificImpulseSec] = useState(860000); // 860,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(44000); // 44,000 kN star-cruiser thrust

  const animFrameRef = useRef<number | null>(null);
  const starCruiserPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Helicon-FRC Relativistic Star-Cruiser Fusion Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dual High-Power RF Helicon Preionization Tubes (Left: 60 to 110)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 3; i++) {
        const x = 70 + i * 16;
        ctx.beginPath();
        ctx.ellipse(x, cy - 14, 5, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(x, cy + 14, 5, 20, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Counter-Injected Supersonic 900 km/s FRC Toroids (Amber & Cyan)
      const phase = Math.sin(time * 6);
      const leftFrcX = 90 + Math.abs(phase) * 40;
      const rightFrcX = 190 - Math.abs(phase) * 40;

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.ellipse(leftFrcX, cy, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath(); ctx.ellipse(rightFrcX, cy, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Central Relativistic Direct Ignition Core (at 140, cy)
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 34;
      ctx.beginPath();
      ctx.arc(140, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 6.5px monospace';
      ctx.fillText('150keV', 129, cy + 2.5);

      // Dynamic Cusp Expansion Nozzle (190 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(190, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(190, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        starCruiserPlasmaJetsRef.current.push({
          x: 190,
          y: cy + (Math.random() - 0.5) * 14,
          vx: 72 + (counterInjectionVelocityKmS / 900) * 10,
        });
      }

      starCruiserPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      starCruiserPlasmaJetsRef.current = starCruiserPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `HELICON-FRC STAR-CRUISER: INJECTION = ${counterInjectionVelocityKmS} km/s | RF HELICON = ${rfHeliconPowerMw} MW | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [counterInjectionVelocityKmS, rfHeliconPowerMw, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-amber-400">
                HELICON-FRC STAR-CRUISER // 860,000s Isp FLAGSHIP
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                HOFFMAN, THOMASSEN & SLOUGH (HELION & MSNW)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              900 km/s counter-injected Helicon-FRC plasmoid relativistic fusion star-cruiser for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">FLAGSHIP THRUST</div>
            <div className="text-xl font-bold text-emerald-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={740}
            height={480}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-cyan-400 font-bold">INJECTION: {counterInjectionVelocityKmS} km/s</span>
              <span className="text-pink-400 font-bold">RF POWER: {rfHeliconPowerMw} MW</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: RELATIVISTIC FRC PLASMOID MERGER CONVERGED</div>
          </div>
        </div>

        {/* Cruiser Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              COUNTER-INJECTION (km/s)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Counter-Velocity:</span>
              <span className="text-emerald-400 font-bold">{counterInjectionVelocityKmS} km/s</span>
            </div>
            <input
              type="range"
              min={500}
              max={1300}
              step={50}
              value={counterInjectionVelocityKmS}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCounterInjectionVelocityKmS(val);
                setRfHeliconPowerMw(Math.floor(val * 0.155));
                setThrustKiloNewtons(Math.floor(val * 48.88));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>900 km/s Counter-Injection:</strong> Twin supersonic FRC plasmoids undergo head-on thermalization in a 50 T magnetic cusp throat, igniting 150 keV aneutronic reactions!</div>
            <div>• <strong>140 MW RF Helicon Pre-Heating:</strong> Generates high-density, fully stripped ion streams prior to compression, achieving 44,000 kN thrust at 860,000s Isp!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
