import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, RefreshCw
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonDefectCondensation() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [condensationFugacityK, setCondensationFugacityK] = useState(2.5); // K = 2.5 defect condensation fugacity
  const [deconfinedGaugePurity, setDeconfinedGaugePurity] = useState(0.988);
  const [isCondensingDefects, setIsCondensingDefects] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerDefectCondensation = () => {
    uiaudio.warp();
    setIsCondensingDefects(true);

    setTimeout(() => {
      setIsCondensingDefects(false);
      setDeconfinedGaugePurity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton Defect Condensation Canvas
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

      // Condensed Defect Network (Left: 80 to 240)
      const numLines = 6;
      for (let i = 0; i < numLines; i++) {
        const angle = (i * Math.PI) / 3 + time * 0.4;
        const x1 = 160 + Math.cos(angle) * 15;
        const y1 = cy + Math.sin(angle) * 15;
        const x2 = 160 + Math.cos(angle) * 55;
        const y2 = cy + Math.sin(angle) * 55;

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();

        // Condensate Droplet
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central Condensation Core
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isCondensingDefects ? 24 : 10;
      ctx.beginPath();
      ctx.arc(160, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('<b_ij>', 148, cy + 2.5);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CONDENSED DEFECT NETWORK', 75, cy + 90);

      // Transition Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isCondensingDefects ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DEFECT CONDENSATION', 308, cy - 12);
      ctx.fillText('HIGHER-RANK HIGGS', 315, cy + 8);

      // Deconfined Higher-Rank Tensor Gauge Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isCondensingDefects ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DECONFINED TENSOR GAUGE', 484, cy - 35);
      ctx.fillText('RANK-2 U(1) PHOTONS', 488, cy - 10);
      ctx.fillText(`GAUGE PURITY = ${(deconfinedGaugePurity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DEFECT CONDENSATION: FUGACITY K = ${condensationFugacityK.toFixed(1)} | GAUGE PURITY = ${(deconfinedGaugePurity * 100).toFixed(2)}% (PRETKO, WILLIAMSON & WEN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [condensationFugacityK, deconfinedGaugePurity, isCondensingDefects]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <RefreshCw className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                DEFECT CONDENSATION // HIGHER-RANK GAUGE PHASES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                PRETKO, WILLIAMSON, CHENG & WEN (YALE, PERIMETER & MIT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Condensation of dislocation loops & disclinations into deconfined rank-2 tensor gauge theories for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerDefectCondensation}
            disabled={isCondensingDefects}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCondensingDefects ? 'DRIVING PHASE TRANSITION...' : 'CONDENSE FRACTON DEFECTS'}</span>
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
              <span className="text-pink-400 font-bold">FUGACITY: K = {condensationFugacityK.toFixed(1)}</span>
              <span className="text-cyan-400 font-bold">PHASE: DECONFINED RANK-2 U(1)</span>
              <span className="text-emerald-400 font-bold">PURITY: {(deconfinedGaugePurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: DEFECT CONDENSATION PHASE TRANSITION COMPLETE</div>
          </div>
        </div>

        {/* Condensation Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              FUGACITY (K)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Defect Proliferation:</span>
              <span className="text-pink-400 font-bold">K = {condensationFugacityK.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.1}
              value={condensationFugacityK}
              onChange={(e) => setCondensationFugacityK(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Higher-Rank Defect Duality:</strong> Proliferating dislocation loops condenses translational defects, driving the system into a deconfined rank-2 tensor gauge phase!</div>
            <div>• <strong>Emergent Tensor Electrodynamics:</strong> The condensate phase supports gapless tensor photons with sub-dimensional charge conservation and quadrupolar Gauss laws!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
