import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, Layers, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const CODONS = ['AUG (Met)', 'GAG (Glu)', 'UUC (Phe)', 'GCA (Ala)', 'UGG (Trp)', 'UAA (Stop)'];

export default function RibosomeSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [translatedAAs, setTranslatedAAs] = useState<string[]>(['Met', 'Glu', 'Phe']);
  const [elongationRateAaSec, setElongationRateAaSec] = useState(15.2);
  const [currentCodonIdx, setCurrentCodonIdx] = useState(3);

  const animFrameRef = useRef<number | null>(null);

  const translateNextCodon = () => {
    if (currentCodonIdx < CODONS.length) {
      uiaudio.warp();
      const nextAA = CODONS[currentCodonIdx].split(' ')[1].replace(/[()]/g, '');
      setTranslatedAAs(prev => [...prev, nextAA]);
      setCurrentCodonIdx(i => i + 1);
      uiaudio.success();
    }
  };

  const handleReset = () => {
    uiaudio.click();
    setTranslatedAAs(['Met']);
    setCurrentCodonIdx(1);
  };

  // Ribosome 70S Translation Canvas
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

      // Dark Cytoplasm
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // mRNA Strand Passing Through Subunit Groove (Horizontal line)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(60, cy + 30);
      ctx.lineTo(canvas.width - 60, cy + 30);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Large 50S Ribosomal Subunit (Top dome)
      ctx.fillStyle = '#3b82f6';
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 50, 160, 100, 0, Math.PI, 0); // Upper dome
      ctx.fill();
      ctx.shadowBlur = 0;

      // Small 30S Ribosomal Subunit (Bottom base)
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 70, 140, 50, 0, 0, Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 3 tRNA Binding Sites (E, P, A)
      const sites = [
        { name: 'E-Site', x: cx - 70, color: '#f59e0b' },
        { name: 'P-Site', x: cx, color: '#ec4899' },
        { name: 'A-Site', x: cx + 70, color: '#06b6d4' },
      ];

      sites.forEach((site) => {
        ctx.fillStyle = site.color;
        ctx.shadowColor = site.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(site.x - 15, cy - 20, 30, 45);
        ctx.shadowBlur = 0;
      });

      // Nascent Growing Polypeptide Chain exiting top tunnel
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 100);
      translatedAAs.forEach((_, idx) => {
        const py = cy - 100 - (idx + 1) * 20;
        const px = cx + Math.sin(idx + time * 2) * 12;
        ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [translatedAAs]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Dna className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '14s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                RIBOSOME // 70S mRNA TRANSLATION & ELONGATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PEPTIDYL TRANSFERASE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              A-site/P-site/E-site tRNA translocation & peptide bond catalysis for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={translateNextCodon}
            disabled={currentCodonIdx >= CODONS.length}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{currentCodonIdx >= CODONS.length ? 'TRANSLATION COMPLETE (STOP)' : 'TRANSLOCATE NEXT tRNA'}</span>
          </button>

          {currentCodonIdx > 1 && (
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
              <span className="text-emerald-400 font-bold">PEPTIDE CHAIN: {translatedAAs.join(' - ')}</span>
              <span className="text-cyan-400 font-bold">RATE: {elongationRateAaSec} AA/s</span>
            </div>
            <div>STATUS: EF-G GTP HYDROLIZATION CYCLE</div>
          </div>
        </div>

        {/* Translation Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            mRNA CODONS
          </h3>

          <div className="space-y-1.5">
            {CODONS.map((c, idx) => (
              <div
                key={c}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-between transition-all",
                  idx < currentCodonIdx ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300" : "bg-zinc-950 border-white/5 text-zinc-500"
                )}
              >
                <span>{c}</span>
                <span className="text-[10px]">{idx < currentCodonIdx ? 'TRANSLATED' : 'QUEUED'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
