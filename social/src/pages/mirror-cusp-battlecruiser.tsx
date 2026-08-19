import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MirrorCuspBattlecruiser() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mirrorRatioRm, setMirrorRatioRm] = useState(14); // Rm = 14 mirror ratio
  const [cuspEndPlugFieldTesla, setCuspEndPlugFieldTesla] = useState(65); // 65 Tesla cusp end plug field
  const [specificImpulseSec, setSpecificImpulseSec] = useState(740000); // 740,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(32000); // 32,000 kN battlecruiser thrust

  const animFrameRef = useRef<number | null>(null);
  const battlecruiserPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Tandem Mirror-Cusp Battlecruiser Fusion Canvas
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

      // Tandem Mirror Central Solenoid Cell (Left: 60 to 200, cy)
      // Solenoid Coil Loops (Top & Bottom)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const x = 70 + i * 25;
        ctx.beginPath();
        ctx.ellipse(x, cy, 6, 42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // High-Field Quad-Cusp End Plugs (At x=60 and x=195)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.ellipse(60, cy, 5, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(195, cy, 5, 20, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Confined Mirror Plasma Column (Amber Glow inside Central Cell)
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.beginPath();
      ctx.ellipse(130, cy, 58, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      // High-Density Ambipolar Potential Core (at 130, cy)
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(130, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('65 T', 121, cy + 2.5);

      // Magnetic Aerospike Divertor Expansion Nozzle (195 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(195, cy - 20); ctx.lineTo(520, cy - 90);
      ctx.moveTo(195, cy + 20); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        battlecruiserPlasmaJetsRef.current.push({
          x: 195,
          y: cy + (Math.random() - 0.5) * 14,
          vx: 60 + (mirrorRatioRm / 14) * 10,
        });
      }

      battlecruiserPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      battlecruiserPlasmaJetsRef.current = battlecruiserPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `MIRROR-CUSP BATTLECRUISER: MIRROR RATIO R_m = ${mirrorRatioRm} | END PLUG = ${cuspEndPlugFieldTesla} T | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mirrorRatioRm, cuspEndPlugFieldTesla, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-amber-300 to-cyan-400">
                TANDEM MIRROR-CUSP // 740,000s Isp BATTLECRUISER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                POST, THOMASSEN & LLNL (LIVERMORE NATIONAL LAB)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Multi-cell tandem magnetic mirror with 65 Tesla cusp end-plug fusion drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">BATTLECRUISER THRUST</div>
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
              <span className="text-cyan-400 font-bold">MIRROR RATIO: R_m = {mirrorRatioRm}</span>
              <span className="text-pink-400 font-bold">END PLUG: {cuspEndPlugFieldTesla} T</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: TANDEM AMBIPOLAR CONFINEMENT CONVERGED</div>
          </div>
        </div>

        {/* Mirror Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              MIRROR RATIO (R_m)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Magnetic Mirror Ratio:</span>
              <span className="text-emerald-400 font-bold">R_m = {mirrorRatioRm}</span>
            </div>
            <input
              type="range"
              min={6}
              max={24}
              step={2}
              value={mirrorRatioRm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMirrorRatioRm(val);
                setCuspEndPlugFieldTesla(Math.floor(val * 4.64));
                setThrustKiloNewtons(Math.floor(val * 2285.7));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Tandem Ambipolar Mirror Plugs:</strong> High-field quad-cusp end cells generate electrostatic ambipolar potentials, plugging mirror loss cones by 99.7%!</div>
            <div>• <strong>Relativistic Alpha Rocket Divertor:</strong> Unconfined high-energy fusion products leak symmetrically into magnetic aerospike nozzles, generating 740,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
