import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ZringStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gtpConcentrationMm, setGtpConcentrationMm] = useState(2.0); // 2.0 mM GTP nucleotide
  const [constrictionPercent, setConstrictionPercent] = useState(65); // 65% membrane furrow constriction
  const [isDivided, setIsDivided] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCytokinesis = () => {
    uiaudio.warp();
    setIsDivided(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1100);
  };

  const handleReset = () => {
    uiaudio.click();
    setIsDivided(false);
  };

  // MinCDE Pole-to-Pole Oscillation & FtsZ Z-Ring Cytokinesis Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Microfluidic Chamber Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Synthetic Rod-Shaped Cell Membrane (GUV Giant Unilamellar Vesicle)
      const furrow = isDivided ? 45 : 0;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Upper membrane contour with center pinch
      ctx.moveTo(cx - 180, cy - 65);
      ctx.quadraticCurveTo(cx - 90, cy - 65, cx, cy - 65 + furrow);
      ctx.quadraticCurveTo(cx + 90, cy - 65, cx + 180, cy - 65);
      // Right cap
      ctx.arc(cx + 180, cy, 65, -Math.PI / 2, Math.PI / 2);
      // Lower membrane contour with center pinch
      ctx.quadraticCurveTo(cx + 90, cy + 65, cx, cy + 65 - furrow);
      ctx.quadraticCurveTo(cx - 90, cy + 65, cx - 180, cy + 65);
      // Left cap
      ctx.arc(cx - 180, cy, 65, Math.PI / 2, -Math.PI / 2);
      ctx.stroke();

      // MinD/MinE Reaction-Diffusion Protein Waves (Oscillating pole to pole in Magenta/Cyan)
      const minOsc = Math.sin(time * 1.5);
      const minPoleX = cx + minOsc * 130;

      const minGrad = ctx.createRadialGradient(minPoleX, cy, 5, minPoleX, cy, 70);
      minGrad.addColorStop(0, 'rgba(236, 72, 153, 0.4)');
      minGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');
      ctx.fillStyle = minGrad;
      ctx.beginPath();
      ctx.arc(minPoleX, cy, 70, 0, Math.PI * 2);
      ctx.fill();

      // FtsZ Z-Ring Cytoskeletal Belt in Mid-Cell (Golden Constricting Ring)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = isDivided ? 8 : 4;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 65 + furrow);
      ctx.lineTo(cx, cy + 65 - furrow);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('FtsZ Z-RING (MID-CELL)', cx - 60, cy - 75 + furrow);

      if (isDivided) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('SYNTHETIC CYTOKINESIS COMPLETE: DAUGHTER VESICLES SEPARATED', cx - 190, cy + 115);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDivided]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Dna className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                SYNTHETIC CELL DIVISION // FtsZ Z-RING & MinCDE OSCILLATOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                MEMBRANE CYTOKINESIS (SCHWILLE LAB)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              GTPase mechanical constriction & Turing wave spatial symmetry breaking for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCytokinesis}
            disabled={isDivided}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDivided ? 'SYNTHETIC CELL DIVISION ACCOMPLISHED' : 'TRIGGER GTP-DRIVEN Z-RING CONSTRICTION'}</span>
          </button>

          {isDivided && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
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
              <span className="text-emerald-400 font-bold">GTP: {gtpConcentrationMm} mM</span>
              <span className="text-cyan-400 font-bold">MEMBRANE PINCH: {isDivided ? '100%' : '0%'}</span>
            </div>
            <div>STATUS: {isDivided ? 'SELF-REPLICATING SYNTHETIC PROTOCELL' : 'MinCDE TURING WAVE OSCILLATING'}</div>
          </div>
        </div>

        {/* Division Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CYTOSKELETAL DYNAMICS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Tubulin Ancestor:</strong> FtsZ forms dynamic contractile filaments that assemble into a ring at the exact mid-point of the cell to generate mechanical pinching forces!</div>
            <div>• <strong>MinCDE Reaction-Diffusion:</strong> MinD and MinE proteins oscillate between cell poles, creating a spatial time-averaged minimum at the center that directs the Z-ring to assemble only at mid-cell!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
