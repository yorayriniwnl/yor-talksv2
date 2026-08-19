import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Disc3, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonDislocationMembranes() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [membraneTensionSigma, setMembraneTensionSigma] = useState(4.2); // σ = 4.2 membrane tension
  const [nonAbelianBraidingPurity, setNonAbelianBraidingPurity] = useState(0.988);
  const [isBraidingMembranes, setIsBraidingMembranes] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerMembraneBraiding = () => {
    uiaudio.warp();
    setIsBraidingMembranes(true);

    setTimeout(() => {
      setIsBraidingMembranes(false);
      setNonAbelianBraidingPurity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton Dislocation Membrane Braiding Canvas
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

      // 2D Dislocation-Vortex Membrane Sheets (Left: 80 to 240)
      const numSheets = 3;
      for (let s = 0; s < numSheets; s++) {
        const sx = 95 + s * 45;
        const wave = Math.sin(time * 3 + s) * 12;

        // 2D Membrane Surface (Cyan/Pink gradient mesh)
        ctx.fillStyle = s % 2 === 0 ? 'rgba(6, 182, 212, 0.25)' : 'rgba(236, 72, 153, 0.25)';
        ctx.strokeStyle = s % 2 === 0 ? '#06b6d4' : '#ec4899';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(sx - 15 + wave, cy - 50);
        ctx.lineTo(sx + 25 + wave, cy - 35);
        ctx.lineTo(sx + 15 - wave, cy + 45);
        ctx.lineTo(sx - 25 - wave, cy + 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 1D Lineon Flux Core Loop penetrating through membrane
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(sx + wave, cy, 8, 28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DISLOCATION BRAIDING MEMBRANES', 65, cy + 90);

      // Braiding Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isBraidingMembranes ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('MEMBRANE BRAID', 320, cy - 12);
      ctx.fillText('NON-ABELIAN STATISTICS', 302, cy + 8);

      // Non-Abelian Braiding Phase Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isBraidingMembranes ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TOPOLOGICAL QUANTUM GATE', 484, cy - 35);
      ctx.fillText('SURFACE-LOOP LINKING', 485, cy - 10);
      ctx.fillText(`BRAID PURITY = ${(nonAbelianBraidingPurity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DISLOCATION MEMBRANES: TENSION σ = ${membraneTensionSigma.toFixed(1)} | BRAID PURITY = ${(nonAbelianBraidingPurity * 100).toFixed(2)}% (PRETKO, RADZIHOVSKY & LEVIN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [membraneTensionSigma, nonAbelianBraidingPurity, isBraidingMembranes]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Layers className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                DISLOCATION MEMBRANES // NON-ABELIAN BRAIDING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                PRETKO, RADZIHOVSKY & MICHAEL LEVIN (HARVARD & CHICAGO)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3D dislocation-vortex membrane sheet braiding around 1D lineon flux loops for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMembraneBraiding}
            disabled={isBraidingMembranes}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBraidingMembranes ? 'BRAIDING MEMBRANES...' : 'BRAID MEMBRANES'}</span>
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
              <span className="text-pink-400 font-bold">TENSION: σ = {membraneTensionSigma.toFixed(1)}</span>
              <span className="text-cyan-400 font-bold">BRAIDING: NON-ABELIAN</span>
              <span className="text-emerald-400 font-bold">PURITY: {(nonAbelianBraidingPurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: 3D MEMBRANE-LOOP TOPOLOGICAL BRAIDING CONVERGED</div>
          </div>
        </div>

        {/* Membrane Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              MEMBRANE TENSION (σ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Surface Tension:</span>
              <span className="text-pink-400 font-bold">σ = {membraneTensionSigma.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={8.0}
              step={0.5}
              value={membraneTensionSigma}
              onChange={(e) => setMembraneTensionSigma(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>2D Membrane Braiding Statistics:</strong> In 3D fracton elasticity, 2D dislocation sheets exhibit non-trivial non-Abelian braiding phases when wound around 1D lineon loop excitations!</div>
            <div>• <strong>Fault-Tolerant Quantum Gates:</strong> Executes universal topological quantum operations via geometric surface-loop linking invariants!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
