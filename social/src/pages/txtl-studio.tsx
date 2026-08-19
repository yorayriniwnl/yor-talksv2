import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Beaker
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TxtlStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [plasmidConcNm, setPlasmidConcNm] = useState(10); // 10 nM DNA template
  const [proteinYieldUgm, setProteinYieldUgm] = useState(1.4); // 1.4 mg/mL protein yield
  const [reactionActive, setReactionActive] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const proteinsRef = useRef<{ x: number; y: number; r: number; color: string }[]>([]);

  const startTxTlReaction = () => {
    uiaudio.warp();
    setReactionActive(true);

    setTimeout(() => {
      uiaudio.success();
    }, 1200);
  };

  const handleReset = () => {
    uiaudio.click();
    setReactionActive(false);
    proteinsRef.current = [];
  };

  // In Vitro TX-TL Transcription-Translation Canvas
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

      // Dark Test-Tube Reaction Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cell-Free Crude Extract Reaction Droplet Vessel (Glass Tube Contour)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 170, 0, Math.PI * 2);
      ctx.stroke();

      // DNA Plasmid Template in Center (Circular Double-Stranded Vector in Magenta)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 45, 0, Math.PI * 2);
      ctx.stroke();

      // T7 RNA Polymerase (Transcription Engine Moving along DNA)
      const polAngle = time * 1.5;
      const polX = cx + Math.cos(polAngle) * 45;
      const polY = cy + Math.sin(polAngle) * 45;

      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(polX, polY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Nascent mRNA Transcript Ribbon Spooling Out
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(polX, polY);
      ctx.quadraticCurveTo(polX + 40, polY - 30, polX + 70, polY + 20);
      ctx.stroke();

      // Active Ribosome Translating mRNA (Emerald Bead on mRNA)
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(polX + 50, polY - 10, 8, 0, Math.PI * 2);
      ctx.fill();

      // Spawn Folded Functional Proteins (GFP Green Fluorescent Spheres)
      if (reactionActive && Math.random() < 0.3) {
        proteinsRef.current.push({
          x: cx + (Math.random() - 0.5) * 260,
          y: cy + (Math.random() - 0.5) * 260,
          r: 5,
          color: '#22c55e',
        });
      }

      // Draw Synthesized Proteins Floating in Cell-Free Extract
      proteinsRef.current.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      if (proteinsRef.current.length > 80) proteinsRef.current.shift();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [reactionActive]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Beaker className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                IN VITRO TX-TL // CELL-FREE PROTEIN SYNTHESIS & BIOMANUFACTURING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                CELL-FREE CRUDE EXTRACT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              T7 RNA polymerase transcription & ribosome polysome biomanufacturing for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={startTxTlReaction}
            disabled={reactionActive}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{reactionActive ? 'TX-TL TRANSCRIPTION & TRANSLATION ACTIVE' : 'ADD PLASMID DNA TO TX-TL EXTRACT'}</span>
          </button>

          {reactionActive && (
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
              <span className="text-emerald-400 font-bold">DNA TEMPLATE: {plasmidConcNm} nM</span>
              <span className="text-cyan-400 font-bold">YIELD: {proteinYieldUgm} mg/mL</span>
            </div>
            <div>STATUS: {reactionActive ? 'COUPLED IN VITRO TRANSCRIPTION-TRANSLATION' : 'LYOPHILIZED EXTRACT READY'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CELL-FREE BIOTECH
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No Living Cells Required:</strong> TX-TL extracts the molecular machinery (RNA polymerases, ribosomes, tRNAs, amino acids) into a cell-free reaction tube.</div>
            <div>• <strong>Rapid Prototyping:</strong> Tests synthetic gene circuits and produces customized therapeutics on paper strips in hours instead of weeks of cell culture!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
