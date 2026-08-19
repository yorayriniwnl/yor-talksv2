import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Dna
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TalenStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [rvdCount, setRvdCount] = useState(16); // 16 TALE repeats per arm
  const [cleaved, setCleaved] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerTalenCleave = () => {
    uiaudio.warp();
    setCleaved(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setCleaved(false);
  };

  // TALEN Helical Repeat & FokI Dimerization Canvas
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

      // Target Double-Stranded DNA
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(40, cy);
      if (cleaved) {
        ctx.lineTo(cx - 20, cy);
        ctx.moveTo(cx + 20, cy);
        ctx.lineTo(canvas.width - 40, cy);
      } else {
        ctx.lineTo(canvas.width - 40, cy);
      }
      ctx.stroke();

      // Left TALE Repeat Array (16 Modular repeats spiraling along DNA in Cyan/Teal)
      for (let i = 0; i < rvdCount; i++) {
        const tx = cx - 220 + i * 12;
        const ty = cy - 25 + Math.sin(i * 0.4 + time) * 8;

        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(tx, ty, 5, 14, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Right TALE Repeat Array (16 Modular repeats in Cyan/Teal)
      for (let i = 0; i < rvdCount; i++) {
        const tx = cx + 40 + i * 12;
        const ty = cy + 25 + Math.sin(i * 0.4 - time) * 8;

        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(tx, ty, 5, 14, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Dimerized FokI Cleavage Domains in Center
      ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = cleaved ? 25 : 10;

      // Left FokI
      ctx.beginPath(); ctx.arc(cx - 20, cy - 20, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Right FokI
      ctx.beginPath(); ctx.arc(cx + 20, cy + 20, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      // Cleavage Spark
      if (cleaved) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cleaved, rvdCount]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-teal-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-400/40">
            <Scissors className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400">
                TALEN STUDIO // TRANSCRIPTION ACTIVATOR-LIKE EFFECTOR NUCLEASE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                RVD ONE-TO-ONE CODE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Modular 34-aa repeat arrays & high-fidelity FokI dimerization for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerTalenCleave}
            disabled={cleaved}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{cleaved ? 'TALEN TARGET SITE CLEAVED' : 'TRIGGER FokI DIMER CLEAVAGE'}</span>
          </button>

          {cleaved && (
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
              <span className="text-teal-400 font-bold">RVD REPEATS: {rvdCount} per arm</span>
              <span className="text-cyan-400 font-bold">TARGET RECOGNITION: {rvdCount * 2} bp</span>
            </div>
            <div>STATUS: {cleaved ? 'TARGET SITE CUT (FokI DIMER)' : 'TALE WRAPPED AROUND MAJOR GROOVE'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TALE RVD CIPHER
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Simple 1:1 Code:</strong> HD binds Cytosine, NG binds Thymine, NI binds Adenine, NN binds Guanine.</div>
            <div>• <strong>Plant Pathogen Origin:</strong> Discovered from Xanthomonas bacteria which inject TALEs into plant cells to activate host genes!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
