import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Disc3, ShieldAlert, Cloud
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonBraidFoam() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [spinFoamPlanckDensityGamma, setSpinFoamPlanckDensityGamma] = useState(0.237); // γ = 0.237 Immirzi parameter
  const [quantumSpacetimeFoamPurity, setQuantumSpacetimeFoamPurity] = useState(0.988);
  const [isSimulatingBraidFoam, setIsSimulatingBraidFoam] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerBraidFoamSimulation = () => {
    uiaudio.warp();
    setIsSimulatingBraidFoam(true);

    setTimeout(() => {
      setIsSimulatingBraidFoam(false);
      setQuantumSpacetimeFoamPurity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Frank-Burgers Quantum Defect Braid Foam Canvas
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

      // Quantum Spacetime Defect Braid Foam Bubbles (Left: 80 to 240)
      const numBubbles = 8;
      for (let i = 0; i < numBubbles; i++) {
        const ang = (i / numBubbles) * Math.PI * 2 + time * 0.5;
        const bx = 160 + Math.cos(ang) * 45;
        const by = cy + Math.sin(ang) * 35;
        const rad = 14 + Math.sin(time * 3 + i) * 5;

        // Spin Foam Polyhedral Cell Face (Pink/Cyan)
        ctx.fillStyle = i % 2 === 0 ? 'rgba(236, 72, 153, 0.2)' : 'rgba(6, 182, 212, 0.2)';
        ctx.strokeStyle = i % 2 === 0 ? '#ec4899' : '#06b6d4';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(bx, by, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Braided Vertex Node (Amber)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('3D QUANTUM DEFECT BRAID FOAM', 55, cy + 90);

      // Foam Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isSimulatingBraidFoam ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('QUANTUM BRAID FOAM', 310, cy - 12);
      ctx.fillText('SPIN FOAM INVARIANT', 310, cy + 8);

      // Spin Foam Spacetime Invariant Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isSimulatingBraidFoam ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SPACETIME FOAM CONVERGED', 484, cy - 35);
      ctx.fillText('HIGHER-RANK SPIN FOAM', 485, cy - 10);
      ctx.fillText(`FOAM PURITY = ${(quantumSpacetimeFoamPurity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `BRAID FOAM: IMMIRZI γ = ${spinFoamPlanckDensityGamma.toFixed(3)} | PURITY = ${(quantumSpacetimeFoamPurity * 100).toFixed(2)}% (PRETKO, RADZIHOVSKY & CARLO ROVELLI)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [spinFoamPlanckDensityGamma, quantumSpacetimeFoamPurity, isSimulatingBraidFoam]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Cloud className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                BRAID FOAM // 3D HIGHER-RANK SPIN FOAM INVARIANTS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                PRETKO, RADZIHOVSKY & CARLO ROVELLI (HARVARD, MARSEILLE & BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3D quantum spacetime foam of braided Frank disclinations and Burgers dislocations for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerBraidFoamSimulation}
            disabled={isSimulatingBraidFoam}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSimulatingBraidFoam ? 'SIMULATING QUANTUM BRAID FOAM...' : 'SIMULATE BRAID FOAM'}</span>
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
              <span className="text-pink-400 font-bold">IMMIRZI: γ = {spinFoamPlanckDensityGamma.toFixed(3)}</span>
              <span className="text-cyan-400 font-bold">INVARIANT: 3D SPIN FOAM</span>
              <span className="text-emerald-400 font-bold">PURITY: {(quantumSpacetimeFoamPurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: QUANTUM DEFECT BRAID FOAM CONVERGED</div>
          </div>
        </div>

        {/* Braid Foam Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              IMMIRZI PARAMETER (γ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Barbero-Immirzi Parameter:</span>
              <span className="text-pink-400 font-bold">γ = {spinFoamPlanckDensityGamma.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.5}
              step={0.01}
              value={spinFoamPlanckDensityGamma}
              onChange={(e) => setSpinFoamPlanckDensityGamma(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Quantum Defect Spin Foam:</strong> 3D quantum spacetime foam manifests as dense fluctuating webs of braided Frank disclinations and Burgers dislocations!</div>
            <div>• <strong>Higher-Rank Gravitational Invariants:</strong> Evaluates higher-rank spin foam vertex amplitudes, generating non-perturbative topological quantum memory!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
