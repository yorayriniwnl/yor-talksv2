import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, HeartPulse
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CasphiTherapy() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [aavDeliveryTiter, setAavDeliveryTiter] = useState(1.5); // 1.5e13 vg/mL AAV vector titer
  const [dmdGeneExcisionRate, setDmdGeneExcisionRate] = useState(22); // 22% -> 96.4%
  const [isEditing, setIsEditing] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCasphiTherapy = () => {
    uiaudio.warp();
    setIsEditing(true);

    setTimeout(() => {
      setIsEditing(false);
      setDmdGeneExcisionRate(96.8);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setDmdGeneExcisionRate(22);
    setIsEditing(false);
  };

  // CRISPR-CasΦ (Cas12j) Single-AAV In Vivo Muscle Excision Canvas
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

      // Mutated Dystrophin (DMD) Target DNA Strand (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // Mutated Exon 51 Locus (Targeted for Excision: 310 to 430)
      const isRepaired = dmdGeneExcisionRate > 50;
      ctx.fillStyle = isRepaired ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(310, cy - 58, 120, 36);
      ctx.strokeRect(310, cy - 58, 120, 36);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isRepaired ? 'RESTORED READING FRAME' : 'MUTATED EXON 51 (DMD)', 315, cy - 36);

      // Hyper-Compact CasΦ (Cas12j, 700-aa) Effector at cleavage site (370, cy + 35)
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isEditing ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy + 35, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('CasΦ', 352, cy + 39);

      // Single-AAV Viral Capsid Envelope (Left: 120, cy + 35)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(140, cy + 35, 30, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('SINGLE AAV9', 110, cy + 32);
      ctx.fillText('4.7 kb CAPAC', 110, cy + 46);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-CasΦ (Cas12j): TITER = ${aavDeliveryTiter}e13 vg/mL | 700-aa MONOMER | DYSTROPHIN RESTORATION = ${dmdGeneExcisionRate}% (DOUDNA & SAVAGE)`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [aavDeliveryTiter, dmdGeneExcisionRate, isEditing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <HeartPulse className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-300 to-emerald-400">
                CRISPR-CASΦ (CAS12J) // 700-aa BACTERIOPHAGE GENE THERAPY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                DOUDNA & SAVAGE (UC BERKELEY & IGI)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Single-AAV vector packaging & in vivo dystrophin frame restoration for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCasphiTherapy}
            disabled={isEditing || dmdGeneExcisionRate > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEditing ? 'EXCISING MUTATED EXON...' : 'DELIVER SINGLE-AAV CASΦ'}</span>
          </button>

          {dmdGeneExcisionRate > 50 && (
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
              <span className="text-cyan-400 font-bold">SIZE: 700-aa (HALF OF CAS9)</span>
              <span className="text-pink-400 font-bold">VECTOR: SINGLE AAV9</span>
              <span className="text-emerald-400 font-bold">RESTORATION: {dmdGeneExcisionRate}%</span>
            </div>
            <div>STATUS: {dmdGeneExcisionRate > 50 ? 'FUNCTIONAL DYSTROPHIN EXPRESSED' : 'MUTANT PHENOTYPE'}</div>
          </div>
        </div>

        {/* Casphi Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PHAGE GENE THERAPY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Bacteriophage Origin:</strong> Discovered in huge 'Biggiephage' genomes, CasΦ is half the size of SpCas9 (700-aa vs 1368-aa), yet autonomously processes its own guide RNAs!</div>
            <div>• <strong>Seamless Single-AAV Delivery:</strong> Easily fits within the tight 4.7 kb AAV capsid with ample room for muscle-specific promoters and dual sgRNAs!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
