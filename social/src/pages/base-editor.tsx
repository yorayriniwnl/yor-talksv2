import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Dna
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function BaseEditor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [editorType, setEditorType] = useState<'CBE' | 'ABE'>('CBE'); // CBE (C->T) or ABE (A->G)
  const [editingEfficiency, setEditingEfficiency] = useState(88.4); // 88.4% precision
  const [isEdited, setIsEdited] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerBaseEdit = () => {
    uiaudio.warp();
    setIsEdited(true);
    setTimeout(() => {
      uiaudio.success();
    }, 900);
  };

  const handleReset = () => {
    uiaudio.click();
    setIsEdited(false);
  };

  // Base Editor Protein Architecture Canvas
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

      // Dark Cellular Nucleus
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Target DNA Strands
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Top Non-Target Strand (Displaced R-Loop Bubble)
      ctx.moveTo(60, cy - 25);
      ctx.lineTo(cx - 100, cy - 25);
      ctx.quadraticCurveTo(cx, cy - 70, cx + 100, cy - 25);
      ctx.lineTo(canvas.width - 60, cy - 25);
      ctx.stroke();

      // Bottom Target Strand
      ctx.beginPath();
      ctx.moveTo(60, cy + 25);
      ctx.lineTo(canvas.width - 60, cy + 25);
      ctx.stroke();

      // Cas9 Nickase (nCas9 D10A) Complex (Emerald Lobe)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 10, 85, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Deaminase Domain (APOBEC1 / TadA-8e) Tethered on top (Magenta Sphere)
      const deamX = cx - 20;
      const deamY = cy - 65;
      ctx.fillStyle = editorType === 'CBE' ? 'rgba(236, 72, 153, 0.6)' : 'rgba(168, 85, 247, 0.6)';
      ctx.strokeStyle = editorType === 'CBE' ? '#ec4899' : '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(deamX, deamY, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Single Nucleotide Edit Flag in Editing Window (Protospacer Pos 4-8)
      const baseLabel = isEdited 
        ? (editorType === 'CBE' ? 'T (Thymine)' : 'G (Guanine)')
        : (editorType === 'CBE' ? 'C (Cytosine)' : 'A (Adenine)');

      ctx.fillStyle = isEdited ? '#22c55e' : '#f59e0b';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(baseLabel, cx - 35, cy - 80);
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isEdited, editorType]);

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
                BASE EDITOR // CBE & ABE TRANSITION MUTATIONS (DAVID LIU LAB)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ZERO DOUBLE-STRAND BREAKS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Precision single-nucleotide deamination without indels or donor DNA templates for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => {
              setEditorType(t => t === 'CBE' ? 'ABE' : 'CBE');
              setIsEdited(false);
            }}
            className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold border border-white/10"
          >
            SWITCH TO {editorType === 'CBE' ? 'ABE (A→G)' : 'CBE (C→T)'}
          </button>

          <button
            onClick={triggerBaseEdit}
            disabled={isEdited}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEdited ? 'BASE DEAMINATED & REPAIRED' : `DEAMINATE ${editorType === 'CBE' ? 'C·G → T·A' : 'A·T → G·C'}`}</span>
          </button>

          {isEdited && (
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
              <span className="text-emerald-400 font-bold">EDITOR: {editorType === 'CBE' ? 'CBE (APOBEC1-nCas9-UGI)' : 'ABE (TadA-8e-nCas9)'}</span>
              <span className="text-cyan-400 font-bold">EFFICIENCY: {editingEfficiency}%</span>
            </div>
            <div>STATUS: {isEdited ? 'CLEAN TRANSITION MUTATION INSTALLED' : 'TARGET BASE EXPOSED IN R-LOOP'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            BASE EDITING CHEMISTRY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>CBE:</strong> Cytidine deaminase converts Cytosine to Uracil; nicking the non-edited strand directs cell repair to create a clean T·A pair.</div>
            <div>• <strong>ABE:</strong> Engineered TadA-8e converts Adenine to Inosine; Inosine is read as Guanine by DNA polymerases, yielding clean G·C pairs!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
