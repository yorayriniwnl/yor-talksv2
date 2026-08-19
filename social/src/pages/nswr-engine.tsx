import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Radiation
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function NswrEngine() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [uraniumEnrichment, setUraniumEnrichment] = useState(20); // 20% U-235 or Pu-239 salt solution
  const [specificImpulseSec, setSpecificImpulseSec] = useState(473000); // 473,000 s Isp
  const [thrustMeganewtons, setThrustMeganewtons] = useState(13.0); // 13 MN thrust
  const [exhaustVelocityKms, setExhaustVelocityKms] = useState(66.4); // 66.4 km/s

  const animFrameRef = useRef<number | null>(null);
  const fissionPlasmaRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string }[]>([]);

  // Continuous Prompt-Critical Nuclear Fission Vortex Canvas
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

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Boron Carbide Poison Control Tubes & Injection Vortex (Left 60 to 220)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.fillRect(60, cy - 40, 160, 80);
      ctx.strokeRect(60, cy - 40, 160, 80);

      // Magnetic / Water-Film Rocket Divergent Nozzle (220 to 380)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(220, cy - 40); ctx.lineTo(380, cy - 110);
      ctx.moveTo(220, cy + 40); ctx.lineTo(380, cy + 110);
      ctx.stroke();

      // Prompt Critical Fission Detonation Core (220, cy)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(220, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CRITICAL CORE', 185, cy + 4);

      // Spawn Prompt Fission Plasma Ions & Relativistic Free-Radical Exhaust
      if (Math.random() < 0.6) {
        for (let i = 0; i < 4; i++) {
          fissionPlasmaRef.current.push({
            x: 220,
            y: cy + (Math.random() - 0.5) * 30,
            vx: Math.random() * 6 + 14,
            vy: (Math.random() - 0.5) * 4,
            color: i % 2 === 0 ? '#22c55e' : '#38bdf8',
          });
        }
      }

      // Propagate Fission Plume
      fissionPlasmaRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      fissionPlasmaRef.current = fissionPlasmaRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CONTINUOUS FISSION DETONATION: EXHAUST VELOCITY v_e = ${exhaustVelocityKms} km/s (I_sp = ${specificImpulseSec.toLocaleString()} s)`,
        100,
        cy + 160
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [uraniumEnrichment, specificImpulseSec, exhaustVelocityKms]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(34,197,94,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Radiation className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-400">
                NUCLEAR SALT-WATER ROCKET // PROMPT-CRITICAL FISSION (NSWR)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                473,000s Isp (ROBERT ZUBRIN)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Continuous open nuclear fission detonation & free-radical plasma exhaust for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-emerald-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-emerald-400 font-bold">ENRICHMENT: {uraniumEnrichment}% U-235</span>
              <span className="text-cyan-400 font-bold">THRUST: {thrustMeganewtons} MN</span>
              <span className="text-amber-400 font-bold">EXHAUST: {exhaustVelocityKms} km/s</span>
            </div>
            <div>STATUS: CONTINUOUS PROMPT CRITICAL DETONATION CONFINED BY WATER VORTEX</div>
          </div>
        </div>

        {/* NSWR Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              URANIUM ENRICHMENT
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Fuel Salt Concentration:</span>
              <span className="text-emerald-400 font-bold">{uraniumEnrichment}% UBr4</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={uraniumEnrichment}
              onChange={(e) => {
                const val = Number(e.target.value);
                setUraniumEnrichment(val);
                setSpecificImpulseSec(Math.round(val * 23650));
                setExhaustVelocityKms(+(val * 3.32).toFixed(1));
                setThrustMeganewtons(+(val * 0.65).toFixed(1));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No Solid Core Thermal Limits:</strong> Because the nuclear reaction occurs inside a continuous free-flowing fluid stream outside the feed pipes, temperatures reach millions of degrees without melting structural walls!</div>
            <div>• <strong>Interplanetary Transit:</strong> NSWR can deliver crew to Jupiter in under 3 weeks with continuous 1-g burn trajectories!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
