import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Package
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CasminiStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [aavPackagingCargoSizeKb, setAavPackagingCargoSizeKb] = useState(3.4); // 3.4 kb CasMINI + gRNA + NLS (< 4.7 kb AAV limit!)
  const [inVivoIndelEfficiency, setInVivoIndelEfficiency] = useState(25); // 25% -> 94.5%
  const [isEditing, setIsEditing] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCasminiEditing = () => {
    uiaudio.warp();
    setIsEditing(true);

    setTimeout(() => {
      setIsEditing(false);
      setInVivoIndelEfficiency(94.8);
      uiaudio.success();
    }, 850);
  };

  const handleReset = () => {
    uiaudio.click();
    setInVivoIndelEfficiency(25);
    setIsEditing(false);
  };

  // Compact CasMINI (529-aa) DNA Target Cleavage & Single AAV Packaging Canvas
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

      // Dark Cellular Nucleus Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Single AAV Vector Capsid Capsule (Top Left at 100, cy - 80)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(100, cy - 100, 200, 50);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('ALL-IN-ONE AAV VECTOR (< 4.7 kb)', 110, cy - 80);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('CasMINI (1.6kb) + gRNA + VP64', 115, cy - 62);

      // DNA Double Helix Backbone (Center Horizontal Strand)
      ctx.strokeStyle = inVivoIndelEfficiency > 80 ? '#22c55e' : '#64748b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(80, cy + 30);
      if (inVivoIndelEfficiency > 80) {
        // Staggered Cleaved Double Strand Break
        ctx.lineTo(360, cy + 30);
        ctx.moveTo(375, cy + 30);
        ctx.lineTo(canvas.width - 80, cy + 30);
      } else {
        ctx.lineTo(canvas.width - 80, cy + 30);
      }
      ctx.stroke();

      // Compact Engineered CasMINI Nuclease (at 370, cy + 30)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isEditing ? 22 : 6;
      ctx.beginPath();
      ctx.arc(370, cy + 10, 18, 0, Math.PI * 2); // 42% smaller than SpCas9!
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('CasMINI', 354, cy + 13);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ENGINEERED CasMINI (529-aa): IN VIVO INDEL EFFICIENCY = ${inVivoIndelEfficiency}% | ZERO DETECTED OFF-TARGETS`,
        70,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [aavPackagingCargoSizeKb, inVivoIndelEfficiency, isEditing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Package className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-indigo-300 to-cyan-400">
                CRISPR-CASMINI // ULTRA-COMPACT 529-AA IN VIVO GENE THERAPY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                STANLEY QI LAB (STANFORD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Engineered Cas12j (CasΦ) single-AAV in vivo genomic delivery for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCasminiEditing}
            disabled={isEditing || inVivoIndelEfficiency > 80}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEditing ? 'PACKAGING SINGLE AAV & CLEAVING...' : 'EXECUTE CASMINI IN VIVO CLEAVAGE'}</span>
          </button>

          {inVivoIndelEfficiency > 80 && (
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
              <span className="text-pink-400 font-bold">SIZE: 529 aa (1.6 kb)</span>
              <span className="text-cyan-400 font-bold">AAV CARGO: {aavPackagingCargoSizeKb} / 4.7 kb</span>
              <span className="text-emerald-400 font-bold">INDEL EFFICIENCY: {inVivoIndelEfficiency}%</span>
            </div>
            <div>STATUS: {inVivoIndelEfficiency > 80 ? 'ALL-IN-ONE AAV IN VIVO THERAPEUTIC CLEAVAGE' : 'PACKAGED'}</div>
          </div>
        </div>

        {/* CasMINI Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            AAV VECTOR PACKAGING
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>42% Size of SpCas9:</strong> SpCas9 (1,368 aa) exceeds the packaging limit of single AAV vectors when fused to activators or base editors, requiring split-AAV systems!</div>
            <div>• <strong>CasMINI Breakthrough:</strong> Engineered from big bacteriophage CasΦ (Cas12j), CasMINI fits inside a single AAV along with guide RNA and transcriptional effectors!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
