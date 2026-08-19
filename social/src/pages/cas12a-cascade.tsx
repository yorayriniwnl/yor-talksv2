import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Layers
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12aCascade() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [biosyntheticPathway, setBiosyntheticPathway] = useState<'Taxol_Precursor' | 'Artemisinic_Acid'>('Taxol_Precursor');
  const [arrayTargetsCount, setArrayTargetsCount] = useState(6); // 6 simultaneous crRNAs
  const [isProcessing, setIsProcessing] = useState(false);
  const [pathwayYieldMgL, setPathwayYieldMgL] = useState(480);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12aArrayActivation = () => {
    uiaudio.warp();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setPathwayYieldMgL(1850);
      uiaudio.success();
    }, 850);
  };

  const handleReset = () => {
    uiaudio.click();
    setPathwayYieldMgL(480);
    setIsProcessing(false);
  };

  // CRISPR-Cas12a (Cpf1) Self-Processing crRNA Array Canvas
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

      // Polycistronic crRNA Precursor Strand (Top Horizontal Strand at cy - 80)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy - 80); ctx.lineTo(canvas.width - 80, cy - 80);
      ctx.stroke();

      // Draw 6 Direct Repeats (DR) and Spacers
      for (let i = 0; i < arrayTargetsCount; i++) {
        const x = 110 + i * 85;

        // Direct Repeat Hairpin (Cpf1 Intrinsic Cleavage Site)
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = isProcessing ? 12 : 3;
        ctx.beginPath();
        ctx.arc(x, cy - 80, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Target Specific Guide Spacer
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(x + 12, cy - 86, 55, 12);

        // Released Mature crRNA Guided to Gene Promoter (Bottom)
        const promX = x + 35;
        const promY = cy + 50;

        // dCas12a-VPR Activator Complex at Promoter
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(promX, promY - 20, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`GENE_${i + 1}`, promX - 14, promY + 15);
      }

      // Target Metabolic Gene Promoters Backbone (Bottom Line at cy + 50)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy + 50); ctx.lineTo(canvas.width - 80, cy + 50);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CAS12a MULTIPLEX ACTIVATION: 6 GENES CO-EXPRESSED | ${biosyntheticPathway.toUpperCase()} YIELD = ${pathwayYieldMgL} mg/L`,
        70,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [biosyntheticPathway, arrayTargetsCount, pathwayYieldMgL, isProcessing]);

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-indigo-300 to-cyan-400">
                CRISPR-CAS12A // POLYCISTRONIC MULTI-GENE ACTIVATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                CPF1 SELF-PROCESSING (FENG ZHANG / BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Autonomous crRNA array maturation & 6-enzyme pathway co-regulation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12aArrayActivation}
            disabled={isProcessing || pathwayYieldMgL > 1000}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isProcessing ? 'SELF-PROCESSING crRNA ARRAY...' : 'TRIGGER 6-GENE CASCADE ACTIVATION'}</span>
          </button>

          {pathwayYieldMgL > 1000 && (
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
              <span className="text-pink-400 font-bold">PATHWAY: {biosyntheticPathway}</span>
              <span className="text-cyan-400 font-bold">crRNAs: {arrayTargetsCount} MULTIPLEXED</span>
              <span className="text-emerald-400 font-bold">YIELD: {pathwayYieldMgL} mg/L</span>
            </div>
            <div>STATUS: AUTONOMOUS RNase ENDORIBONUCLEASE CLEAVAGE</div>
          </div>
        </div>

        {/* Cas12a Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            METABOLIC TARGET
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setBiosyntheticPathway('Taxol_Precursor');
                setPathwayYieldMgL(480);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                biosyntheticPathway === 'Taxol_Precursor' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Taxol (Paclitaxel) Precursor</div>
              <div className="text-[10px] text-zinc-400">6-Enzyme Terpenoid Pathway</div>
            </button>

            <button
              onClick={() => {
                setBiosyntheticPathway('Artemisinic_Acid');
                setPathwayYieldMgL(520);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                biosyntheticPathway === 'Artemisinic_Acid' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Artemisinic Acid (Antimalarial)</div>
              <div className="text-[10px] text-zinc-400">4-Enzyme Sesquiterpene Cascade</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dual Endonuclease & RNase:</strong> Cas12a uniquely processes its own polycistronic crRNA array into individual functional guides without requiring tracrRNA or host RNase III!</div>
            <div>• <strong>Stoichiometric Tuning:</strong> Allows single-plasmid coordinated overexpression of complete metabolic routes in microbial cell factories!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
