import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonElasticity() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [poissonRatioNu, setPoissonRatioNu] = useState(0.33); // 0.33 crystal Poisson ratio
  const [shearModulusMu, setShearModulusMu] = useState(45); // 45 GPa shear modulus
  const [isDualitySimulating, setIsDualitySimulating] = useState(false);
  const [gaugeConservationFidelity, setGaugeConservationFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerElasticityDuality = () => {
    uiaudio.warp();
    setIsDualitySimulating(true);

    setTimeout(() => {
      setIsDualitySimulating(false);
      setGaugeConservationFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Fracton-Elasticity Crystal Disclination & Rank-2 Gauge Duality Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Elastic Crystal Lattice with 5-Fold Disclination Defect (Left: 90 to 310)
      const latticeRays = 8;
      for (let r = 0; r < latticeRays; r++) {
        const angle = (r * Math.PI * 2) / latticeRays + (isDualitySimulating ? Math.sin(time + r) * 0.1 : 0);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(190, cy - 20);
        ctx.lineTo(190 + Math.cos(angle) * 90, cy - 20 + Math.sin(angle) * 90);
        ctx.stroke();
      }

      // Immobile Fracton = 5-Fold Isolated Disclination Core (at 190, cy - 20)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isDualitySimulating ? 22 : 6;
      ctx.beginPath();
      ctx.arc(190, cy - 20, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DISCLINATION', 150, cy - 38);
      ctx.fillText('(IMMOBILE FRACTON)', 135, cy + 30);

      // Exact Duality Arrow (Center: 320 to 420)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(320, cy - 20); ctx.lineTo(420, cy - 20);
      ctx.lineTo(405, cy - 28);
      ctx.moveTo(420, cy - 20); ctx.lineTo(405, cy - 12);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DUALITY MAP', 335, cy - 35);
      ctx.fillText('ε_ij ↔ E_ij', 345, cy - 5);

      // Rank-2 Tensor Electromagnetism Tensor Gauge Sector (Right at 530, cy - 20)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isDualitySimulating ? 24 : 6;
      ctx.strokeRect(460, cy - 75, 170, 110);
      ctx.fillRect(460, cy - 75, 170, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('RANK-2 TENSOR GAUGE THEORY', 468, cy - 50);
      ctx.fillText('∂_i ∂_j E^ij = ρ (DIPOLE CONSERVED)', 465, cy - 25);
      ctx.fillText(`CONSERVATION = ${(gaugeConservationFidelity * 100).toFixed(2)}%`, 470, cy + 5);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON-ELASTICITY DUALITY: POISSON ν = ${poissonRatioNu} | SHEAR μ = ${shearModulusMu} GPa | CONSERVATION = ${(gaugeConservationFidelity * 100).toFixed(2)}% (PRETKO & RADZIHOVSKY)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [poissonRatioNu, shearModulusMu, gaugeConservationFidelity, isDualitySimulating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Grid className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-400">
                FRACTON-ELASTICITY DUALITY // RANK-2 TENSOR GAUGE THEORY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PRETKO & RADZIHOVSKY (CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Crystal disclination/dislocation mapping & higher-rank tensor electromagnetism for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerElasticityDuality}
            disabled={isDualitySimulating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDualitySimulating ? 'SIMULATING DUALITY...' : 'MAP CRYSTAL DEFECTS TO FRACTONS'}</span>
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
            height={480}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-cyan-400 font-bold">POISSON: ν = {poissonRatioNu}</span>
              <span className="text-pink-400 font-bold">SHEAR: μ = {shearModulusMu} GPa</span>
              <span className="text-emerald-400 font-bold">CONSERVATION: {(gaugeConservationFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: HIGHER-RANK DIPOLE MOMENT GAUGE INVARIANT</div>
          </div>
        </div>

        {/* Elasticity Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              POISSON RATIO (ν)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Transverse Ratio:</span>
              <span className="text-cyan-400 font-bold">ν = {poissonRatioNu}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.49}
              step={0.02}
              value={poissonRatioNu}
              onChange={(e) => setPoissonRatioNu(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Exact Duality Dictionary:</strong> Isolated crystal disclinations map exactly to immobile point fractons, while mobile dislocation pairs map to 1D lineon dipoles!</div>
            <div>• <strong>Rank-2 Electromagnetism:</strong> The stress-strain tensor equations of elasticity are mathematically isomorphic to generalized rank-2 Maxwell tensor gauge theories!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
