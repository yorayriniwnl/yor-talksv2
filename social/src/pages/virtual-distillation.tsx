import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function VirtualDistillation() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [copyNumberM, setCopyNumberM] = useState(2); // M = 2 copies (rho^2)
  const [hardwareIncoherentNoise, setHardwareIncoherentNoise] = useState(0.12); // 12% mixed noise
  const [isDistilling, setIsDistilling] = useState(false);
  const [purifiedPurity, setPurifiedPurity] = useState(0.982); // Virtual state purity

  const animFrameRef = useRef<number | null>(null);

  // Virtual Purity: P_M = Tr(rho^M) / [Tr(rho)]^M
  const rawPurity = +(1 - hardwareIncoherentNoise).toFixed(3);

  const runVirtualDistillation = () => {
    uiaudio.warp();
    setIsDistilling(true);

    setTimeout(() => {
      setIsDistilling(false);
      setPurifiedPurity(0.996);
      uiaudio.success();
    }, 750);
  };

  // Virtual Distillation (Permutation / Swap Test on M State Copies) Canvas
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

      // Draw M State Copies (rho_1, rho_2 ... rho_M)
      for (let m = 0; m < copyNumberM; m++) {
        const copyY = cy - 60 + m * 120;

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(100, copyY - 35, 180, 70);
        ctx.fillRect(100, copyY - 35, 180, 70);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`NOISY COPY ρ_${m + 1}`, 135, copyY - 5);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(`Raw Purity: ${rawPurity}`, 145, copyY + 18);

        // Cyclic Permutation Network Lines to Central Swap Test
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(280, copyY);
        ctx.lineTo(380, cy);
        ctx.stroke();
      }

      // Central Cyclic Derangement Permutation Box S_M
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isDistilling ? 20 : 6;
      ctx.strokeRect(380, cy - 45, 90, 90);
      ctx.fillRect(380, cy - 45, 90, 90);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`DERANGE`, 392, cy - 8);
      ctx.fillText(`S_${copyNumberM}`, 412, cy + 18);

      // Output Purified State Wire
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(470, cy);
      ctx.lineTo(580, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Purified State Node
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(620, cy, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`ρ_eff = ρ^${copyNumberM}`, 588, cy + 4);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `VIRTUAL PURITY: Tr(ρ^${copyNumberM}) / [Tr(ρ)]^${copyNumberM} = ${purifiedPurity.toFixed(3)} (EXPONENTIALLY FILTERED)`,
        90,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [copyNumberM, hardwareIncoherentNoise, rawPurity, purifiedPurity, isDistilling]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Filter className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                VIRTUAL DISTILLATION // ERROR SUPPRESSION BY DERANGEMENT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                HUGGINS & MCARDLE (GOOGLE QUANTUM AI)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Multi-copy state purification & non-linear expectation values for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runVirtualDistillation}
            disabled={isDistilling}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDistilling ? 'EVALUATING CYCLIC DERANGEMENT...' : 'EXECUTE VIRTUAL DISTILLATION'}</span>
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
              <span className="text-cyan-400 font-bold">COPIES M: {copyNumberM}</span>
              <span className="text-pink-400 font-bold">RAW PURITY: {rawPurity}</span>
              <span className="text-emerald-400 font-bold">PURIFIED PURITY: {purifiedPurity.toFixed(3)}</span>
            </div>
            <div>STATUS: EXPONENTIAL INCOHERENT NOISE PURIFICATION</div>
          </div>
        </div>

        {/* VD Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              STATE COPIES (M)
            </h3>
          </div>

          <div className="space-y-2">
            {[2, 3, 4].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setCopyNumberM(m);
                  uiaudio.click();
                }}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  copyNumberM === m ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">M = {m} Independent Copies</div>
                <div className="text-[10px] text-zinc-400">Error suppressed as O(epsilon^{m})</div>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Virtual Eigenstate Filtering:</strong> By measuring the expectation value on the power of the density matrix ρ^M, the dominant pure eigenstate is exponentially amplified!</div>
            <div>• <strong>No Real State Preparation:</strong> Purification is executed virtually via multi-copy swap networks without physically synthesizing the purified density matrix!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
