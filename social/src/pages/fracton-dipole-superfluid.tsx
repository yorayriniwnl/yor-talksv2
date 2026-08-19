import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonDipoleSuperfluid() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [condensedDipoleDensityRho, setCondensedDipoleDensityRho] = useState(4.2); // ρ_d = 4.2 dipole density
  const [quadrupoleStiffnessK, setQuadrupoleStiffnessK] = useState(1.8); // K = 1.8 quadrupole stiffness
  const [isCondensingDipoles, setIsCondensingDipoles] = useState(false);
  const [superfluidCondensateFidelity, setSuperfluidCondensateFidelity] = useState(0.987);

  const animFrameRef = useRef<number | null>(null);

  const triggerDipoleCondensation = () => {
    uiaudio.warp();
    setIsCondensingDipoles(true);

    setTimeout(() => {
      setIsCondensingDipoles(false);
      setSuperfluidCondensateFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton Dipole Condensation & Higher-Rank Tensor Superfluid Canvas
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

      // Mobile Fracton Dipoles (Left: 80 to 260)
      const numDipoles = 5;
      for (let d = 0; d < numDipoles; d++) {
        const dx = 100 + d * 32 + (isCondensingDipoles ? Math.sin(time + d) * 4 : Math.sin(time * 2 + d) * 12);
        const dy = cy - 45 + d * 18 + (isCondensingDipoles ? Math.cos(time - d) * 4 : Math.cos(time * 2 - d) * 12);

        // Positive Fracton Charge (+) (Cyan)
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(dx - 8, dy, 5, 0, Math.PI * 2);
        ctx.fill();

        // Negative Fracton Charge (-) (Pink)
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(dx + 8, dy, 5, 0, Math.PI * 2);
        ctx.fill();

        // Dipole Rigid Bond
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(dx - 8, dy); ctx.lineTo(dx + 8, dy);
        ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isCondensingDipoles ? 'CONDENSED DIPOLE SUPERFLUID' : 'UNBOUND FRACTON DIPOLE GAS', 80, cy + 90);

      // Higher-Rank Superfluid Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isCondensingDipoles ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DIPOLE CONDENSATE', 320, cy - 12);
      ctx.fillText('ω ~ k² GOLDSTONE', 322, cy + 8);

      // Superfluid Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isCondensingDipoles ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TENSOR SUPERFLUID', 492, cy - 35);
      ctx.fillText('QUADRUPOLE CONSERVED', 484, cy - 10);
      ctx.fillText(`CONDENSATE FIDELITY = ${(superfluidCondensateFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON DIPOLE SUPERFLUID: DENSITY ρ_d = ${condensedDipoleDensityRho} | QUADRUPOLE K = ${quadrupoleStiffnessK} | FIDELITY = ${(superfluidCondensateFidelity * 100).toFixed(2)}% (PRETKO & SON)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [condensedDipoleDensityRho, quadrupoleStiffnessK, superfluidCondensateFidelity, isCondensingDipoles]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Waves className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-indigo-400">
                FRACTON DIPOLE SUPERFLUID // TENSOR GOLDSTONE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PRETKO, RADZIHOVSKY & SON (CU BOULDER & CHICAGO)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rank-2 tensor Bose-Einstein condensation & quadratic Goldstone modes for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerDipoleCondensation}
            disabled={isCondensingDipoles}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCondensingDipoles ? 'CONDENSING DIPOLE GAS...' : 'CONDENSE INTO TENSOR SUPERFLUID'}</span>
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
              <span className="text-emerald-400 font-bold">DIPOLE DENSITY: ρ_d = {condensedDipoleDensityRho}</span>
              <span className="text-cyan-400 font-bold">QUADRUPOLE STIFFNESS: K = {quadrupoleStiffnessK}</span>
              <span className="text-pink-400 font-bold">FIDELITY: {(superfluidCondensateFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: QUADRUPOLE CONSERVATION & TENSOR CONDENSATION CONFINED</div>
          </div>
        </div>

        {/* Superfluid Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DIPOLE DENSITY (ρ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Condensate Density:</span>
              <span className="text-emerald-400 font-bold">ρ_d = {condensedDipoleDensityRho}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={8.0}
              step={0.2}
              value={condensedDipoleDensityRho}
              onChange={(e) => setCondensedDipoleDensityRho(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dipole Superfluid Condensation:</strong> While isolated 0D fractons cannot move, mobile fracton dipoles condense into a macroscopic superfluid order parameter!</div>
            <div>• <strong>Quadratic Goldstone Mode:</strong> Quadrupole conservation enforces an exotic quadratic Goldstone dispersion ($\omega \sim k^2$) rather than standard acoustic linear sound waves!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
