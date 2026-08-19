import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MagneticCuspDestroyer() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cuspRingStages, setCuspRingStages] = useState(8); // 8 periodic point-cusp magnetic stages
  const [sheathPotentialKv, setSheathPotentialKv] = useState(120); // 120 kV electrostatic sheath barrier
  const [specificImpulseSec, setSpecificImpulseSec] = useState(660000); // 660,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(24000); // 24,000 kN star-destroyer thrust

  const animFrameRef = useRef<number | null>(null);
  const destroyerPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Periodic Magnetic Cusp Star-Destroyer Canvas
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

      // Periodic Point-Cusp Magnetic Ring Cascade (Left: 60 to 220, cy)
      const numStages = cuspRingStages;
      for (let s = 0; s < numStages; s++) {
        const sx = 70 + s * 18;
        const cuspPhase = Math.sin(time * 3 + s * 0.8) * 3;
        const ringRad = 48 + cuspPhase;

        // Opposing Magnetic Polarity (Alternating Cyan & Pink)
        ctx.strokeStyle = s % 2 === 0 ? '#38bdf8' : '#ec4899';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(sx, cy, 5, ringRad, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Point-Cusp Electrostatic Sheath Nodes (Top & Bottom)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sx, cy - ringRad, 3, 0, Math.PI * 2);
        ctx.arc(sx, cy + ringRad, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // High-Beta Confined Core Plasmoid (at 135, cy)
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(135, cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('120 kV', 121, cy + 2.5);

      // Magnetic Aerospike Divertor Expansion Bell (210 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(210, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(210, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        destroyerPlasmaJetsRef.current.push({
          x: 210,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 54 + (cuspRingStages / 8) * 10,
        });
      }

      destroyerPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      destroyerPlasmaJetsRef.current = destroyerPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `MAGNETIC CUSP DESTROYER: STAGES = ${cuspRingStages} | SHEATH POTENTIAL = ${sheathPotentialKv} kV | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cuspRingStages, sheathPotentialKv, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-amber-400">
                MAGNETIC CUSP // 660,000s Isp STAR-DESTROYER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                BUSSARD & DOLAN (NASA MARSHALL & EMC2)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Staged periodic point-cusp electrostatic sheath confinement fusion drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">STAR-DESTROYER THRUST</div>
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
              <span className="text-cyan-400 font-bold">CUSP STAGES: {cuspRingStages} RINGS</span>
              <span className="text-amber-400 font-bold">SHEATH: {sheathPotentialKv} kV</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: PERIODIC POINT-CUSP ELECTROSTATIC REFLECTION CONVERGED</div>
          </div>
        </div>

        {/* Cusp Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CUSP STAGES
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Periodic Stages:</span>
              <span className="text-emerald-400 font-bold">{cuspRingStages} Stages</span>
            </div>
            <input
              type="range"
              min={4}
              max={16}
              step={2}
              value={cuspRingStages}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCuspRingStages(val);
                setSheathPotentialKv(val * 15);
                setThrustKiloNewtons(Math.floor(val * 3000));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Periodic Magnetic Cusp Sheaths:</strong> Alternating magnetic rings create narrow line-cusps plugged by electrostatic sheath potentials, reducing plasma particle loss by 99.4%!</div>
            <div>• <strong>Megawatt Aneutronic Burn:</strong> Stabilizes p-11B thermonuclear plasmoids at extreme beta values, discharging relativistic alpha jets at 660,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
