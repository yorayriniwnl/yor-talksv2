import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Binary, Cpu
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12cLogic() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [logicGateMode, setLogicGateMode] = useState<'NAND_KillSwitch' | 'NOR_Logic' | 'Dual_AND_Biosensor'>('NAND_KillSwitch');
  const [transcriptInputA, setTranscriptInputA] = useState(true);
  const [transcriptInputB, setTranscriptInputB] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [collateralDegradationRate, setCollateralDegradationRate] = useState(99.4); // 99.4% collateral destruction

  const animFrameRef = useRef<number | null>(null);

  const triggerLogicEvaluation = () => {
    uiaudio.warp();
    setIsEvaluating(true);

    setTimeout(() => {
      setIsEvaluating(false);
      uiaudio.success();
    }, 750);
  };

  // Dual-Action Cas12c RNA-Targeted DNA Trans-Cleavage Logic Canvas
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

      // Dark Cellular Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Input RNA Transcripts A and B (Left Nodes at 120, cy - 60 & cy + 60)
      ctx.fillStyle = transcriptInputA ? '#22c55e' : '#64748b';
      ctx.beginPath();
      ctx.arc(120, cy - 50, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`RNA A [${transcriptInputA ? 1 : 0}]`, 85, cy - 75);

      ctx.fillStyle = transcriptInputB ? '#22c55e' : '#64748b';
      ctx.beginPath();
      ctx.arc(120, cy + 50, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`RNA B [${transcriptInputB ? 1 : 0}]`, 85, cy + 85);

      // Central Allosteric Cas12c Dual-Endonuclease Complex (at 370, cy)
      const isActive = logicGateMode === 'NAND_KillSwitch' ? !(transcriptInputA && transcriptInputB) : (logicGateMode === 'NOR_Logic' ? !(transcriptInputA || transcriptInputB) : (transcriptInputA && transcriptInputB));

      ctx.fillStyle = isActive ? '#ec4899' : '#334155';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = isActive ? '#ec4899' : 'transparent';
      ctx.shadowBlur = isActive ? 22 : 0;
      ctx.beginPath();
      ctx.arc(370, cy, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('Cas12c', 345, cy + 4);

      // Logic Gate Channel Connecting Wires
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(136, cy - 50); ctx.lineTo(338, cy - 10);
      ctx.moveTo(136, cy + 50); ctx.lineTo(338, cy + 10);
      ctx.stroke();

      // Output Cell Fate Beacon (Right Node at 600, cy)
      ctx.fillStyle = isActive ? '#ef4444' : '#22c55e';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(600, cy, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isActive ? 'APOPTOSIS' : 'SURVIVAL', 565, cy + 3);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12c LOGIC: ${logicGateMode} [${transcriptInputA ? 1 : 0}, ${transcriptInputB ? 1 : 0}] → OUTPUT: ${isActive ? 'KILL ACTIVATED' : 'DORMANT'}`,
        70,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [logicGateMode, transcriptInputA, transcriptInputB, collateralDegradationRate, isEvaluating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Cpu className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-300 to-amber-400">
                CRISPR-CAS12C // DUAL RNA-TARGETED DNA CLEAVAGE LOGIC
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                MARRAFFINI (ROCKEFELLER) & FENG ZHANG (BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Allosteric non-specific trans-cleavage activation & cellular logic gates for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerLogicEvaluation}
            disabled={isEvaluating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEvaluating ? 'EVALUATING CELLULAR GATE...' : 'EVALUATE TRANSCRIPT GATE'}</span>
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
              <span className="text-cyan-400 font-bold">GATE: {logicGateMode}</span>
              <span className="text-pink-400 font-bold">COLLATERAL DESTRUCTION: {collateralDegradationRate}%</span>
            </div>
            <div>STATUS: SYNTHETIC CELLULAR KILL-SWITCH ARMED</div>
          </div>
        </div>

        {/* Cas12c Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            LOGIC GATE INPUTS
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setTranscriptInputA(!transcriptInputA);
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                transcriptInputA ? "bg-emerald-500/20 border-emerald-400 text-emerald-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Transcript A: {transcriptInputA ? 'EXPRESSED (1)' : 'REPRESSED (0)'}</div>
            </button>

            <button
              onClick={() => {
                setTranscriptInputB(!transcriptInputB);
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                transcriptInputB ? "bg-emerald-500/20 border-emerald-400 text-emerald-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Transcript B: {transcriptInputB ? 'EXPRESSED (1)' : 'REPRESSED (0)'}</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dual-Action RNA/DNA Cleavage:</strong> Binding to specific target RNA triggers an allosteric conformational shift in Cas12c, opening its RuvC catalytic pocket to shred nonspecific bystander DNA!</div>
            <div>• <strong>Synthetic Biology Logic:</strong> Enables autonomous biological circuits where specific disease expression patterns trigger programmable apoptotic cell death!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
