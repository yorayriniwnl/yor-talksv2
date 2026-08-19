import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Edit3, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12mBaseEditor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [editorType, setEditorType] = useState<'C_to_T_CBE' | 'A_to_G_ABE'>('C_to_T_CBE');
  const [baseConversionEfficiency, setBaseConversionEfficiency] = useState(15); // 15% -> 88.5%
  const [isDeaminating, setIsDeaminating] = useState(false);
  const [targetSequence, setTargetSequence] = useState('5\'-G A T T [C] G C A T-3\'');

  const animFrameRef = useRef<number | null>(null);

  const triggerBaseDeamination = () => {
    uiaudio.warp();
    setIsDeaminating(true);

    setTimeout(() => {
      setIsDeaminating(false);
      setBaseConversionEfficiency(89.4);
      setTargetSequence(editorType === 'C_to_T_CBE' ? '5\'-G A T T [T] G C A T-3\'' : '5\'-G A T T [G] G C A T-3\'');
      uiaudio.success();
    }, 800);
  };

  const handleReset = () => {
    uiaudio.click();
    setBaseConversionEfficiency(15);
    setTargetSequence(editorType === 'C_to_T_CBE' ? '5\'-G A T T [C] G C A T-3\'' : '5\'-G A T T [A] G C A T-3\'');
    setIsDeaminating(false);
  };

  // Ultra-Compact Cas12m (380-aa) Base Editing Deaminase Canvas
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

      // DNA Target Duplex Strand (Center Horizontal Strand)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(canvas.width - 80, cy);
      ctx.stroke();

      // R-Loop Unwound Target Bubble (300 to 440)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(370, cy - 15, 45, Math.PI, 0);
      ctx.stroke();

      // Miniaturized Cas12m Nuclease (380-aa) + Deaminase Domain at (370, cy - 20)
      ctx.fillStyle = '#a855f7';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isDeaminating ? 25 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 25, 18, 0, Math.PI * 2); // 380-aa ultra-mini
      ctx.fill();
      ctx.stroke();

      // Fused Deaminase Bead (eA3A / TadA-8e)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(390, cy - 35, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Cas12m', 355, cy - 22);

      // Target Base Glow Bubble
      ctx.fillStyle = baseConversionEfficiency > 80 ? '#22c55e' : '#ec4899';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(370, cy + 25, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(baseConversionEfficiency > 80 ? (editorType === 'C_to_T_CBE' ? 'T' : 'G') : (editorType === 'C_to_T_CBE' ? 'C' : 'A'), 366, cy + 29);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ULTRA-COMPACT Cas12m (380-aa) BASE EDITOR: ${targetSequence} | CONVERSION = ${baseConversionEfficiency}% (INDEL < 0.2%)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [editorType, baseConversionEfficiency, targetSequence, isDeaminating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Edit3 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                CRISPR-CAS12M // 380-AA ULTRA-COMPACT BASE EDITOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                OSAMU NUREKI (TOKYO) & DAVID LIU (BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Hyper-miniaturized Cas12m deaminase fusion & precision transition conversion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerBaseDeamination}
            disabled={isDeaminating || baseConversionEfficiency > 80}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDeaminating ? 'DEAMINATING TARGET NUCLEOTIDE...' : 'PERFORM CAS12M BASE EDIT'}</span>
          </button>

          {baseConversionEfficiency > 80 && (
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
              <span className="text-purple-400 font-bold">NUCLEASE: Cas12m (380 aa)</span>
              <span className="text-cyan-400 font-bold">TYPE: {editorType}</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {baseConversionEfficiency}%</span>
            </div>
            <div>STATUS: {baseConversionEfficiency > 80 ? 'PRECISION TRANSITION CONVERSION COMPLETE' : 'AAV PACKAGED'}</div>
          </div>
        </div>

        {/* Cas12m Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            BASE EDITOR MODE
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setEditorType('C_to_T_CBE');
                setBaseConversionEfficiency(15);
                setTargetSequence('5\'-G A T T [C] G C A T-3\'');
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                editorType === 'C_to_T_CBE' ? "bg-purple-500/20 border-purple-400 text-purple-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Cas12m-CBE (Cytosine → Thymine)</div>
              <div className="text-[10px] text-zinc-400">eA3A deaminase domain fusion</div>
            </button>

            <button
              onClick={() => {
                setEditorType('A_to_G_ABE');
                setBaseConversionEfficiency(12);
                setTargetSequence('5\'-G A T T [A] G C A T-3\'');
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                editorType === 'A_to_G_ABE' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Cas12m-ABE (Adenine → Guanine)</div>
              <div className="text-[10px] text-zinc-400">TadA-8e deaminase domain fusion</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hyper-Compact 380-aa Engine:</strong> Cas12m represents the smallest known functional CRISPR nuclease, effortlessly accommodating deaminases within standard AAV payload limits!</div>
            <div>• <strong>No Double-Strand Breaks:</strong> Precision hydrolytic deamination converts specific target bases without generating mutagenic DSBs or chromosomal translocations!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
