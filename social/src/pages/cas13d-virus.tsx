import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, ShieldAlert, Bug
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas13dVirus() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [viralTarget, setViralTarget] = useState<'SARS_CoV_2' | 'Influenza_A' | 'Dengue_Flavivirus'>('SARS_CoV_2');
  const [cas13dConcentrationNm, setCas13dConcentrationNm] = useState(50); // 50 nM Cas13d RNP
  const [isCleaving, setIsCleaving] = useState(false);
  const [viralTiterSuppressionPercent, setViralTiterSuppressionPercent] = useState(25); // 25% -> 99.9%

  const animFrameRef = useRef<number | null>(null);

  const triggerCas13dDegradation = () => {
    uiaudio.warp();
    setIsCleaving(true);

    setTimeout(() => {
      setIsCleaving(false);
      setViralTiterSuppressionPercent(99.9);
      uiaudio.success();
    }, 850);
  };

  const handleReset = () => {
    uiaudio.click();
    setViralTiterSuppressionPercent(25);
    setIsCleaving(false);
  };

  // CRISPR-Cas13d Viral ssRNA Target Recognition & Collateral Cleavage Canvas
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

      // Dark Host Cell Cytoplasm Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Viral Positive-Sense ssRNA Strand (Center Horizontal Strand)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(80, cy);
      if (viralTiterSuppressionPercent > 90) {
        // Cleaved Fragmented Viral RNA
        for (let x = 80; x < canvas.width - 80; x += 40) {
          ctx.lineTo(x + 25, cy + (Math.sin(x) * 15));
          ctx.moveTo(x + 35, cy);
        }
      } else {
        // Intact Viral Genomic RNA
        ctx.lineTo(canvas.width - 80, cy);
      }
      ctx.stroke();

      // Cas13d HEPN Catalytic Ribonuclease Domain (at 370, cy)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isCleaving ? 25 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 25, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cas13d', 354, cy - 22);

      // Guide crRNA Hybridized to Viral RNA
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(330, cy - 5); ctx.lineTo(410, cy - 5);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (viralTiterSuppressionPercent > 90) {
        ctx.fillText(`Cas13d PAC-MAN: ${viralTarget.toUpperCase()} VIRAL GENOME CLEAVED & DEGRADED (99.9% SUPPRESSION)`, 60, cy + 120);
      } else {
        ctx.fillText(`Cas13d TARGET SCAN: HYBRIDIZING crRNA TO CONSERVED ${viralTarget.toUpperCase()} REGIONS`, 80, cy + 120);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [viralTarget, cas13dConcentrationNm, viralTiterSuppressionPercent, isCleaving]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Bug className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-indigo-300 to-cyan-400">
                CRISPR-CAS13D // VIRAL RNA DEGRADATION & PAC-MAN THERAPEUTICS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                STANLEY QI (STANFORD) & HSU (SALK)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Targeted ssRNA viral cleavage & collateral ribonuclease degradation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas13dDegradation}
            disabled={isCleaving || viralTiterSuppressionPercent > 90}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCleaving ? 'CLEAVING VIRAL RNA GENOME...' : 'EXECUTE CAS13d PAC-MAN DEGRADATION'}</span>
          </button>

          {viralTiterSuppressionPercent > 90 && (
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
              <span className="text-pink-400 font-bold">VIRUS: {viralTarget}</span>
              <span className="text-cyan-400 font-bold">Cas13d: {cas13dConcentrationNm} nM</span>
              <span className="text-emerald-400 font-bold">TITER SUPPRESSION: {viralTiterSuppressionPercent}%</span>
            </div>
            <div>STATUS: {viralTiterSuppressionPercent > 90 ? 'VIRAL RNA CLEAVED & DESTROYED' : 'TARGETING'}</div>
          </div>
        </div>

        {/* Cas13d Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            VIRAL RNA TARGET
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setViralTarget('SARS_CoV_2');
                setViralTiterSuppressionPercent(25);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                viralTarget === 'SARS_CoV_2' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">SARS-CoV-2 (RdRp & Nucleocapsid)</div>
              <div className="text-[10px] text-zinc-400">Conserved coronaviral RNA motifs</div>
            </button>

            <button
              onClick={() => {
                setViralTarget('Influenza_A');
                setViralTiterSuppressionPercent(30);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                viralTarget === 'Influenza_A' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Influenza A (PB2 / PA Genes)</div>
              <div className="text-[10px] text-zinc-400">Polymerase complex ssRNA degradation</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Compact RfxCas13d:</strong> At only ~930 amino acids, Cas13d easily packages into AAV vectors for in vivo delivery to pulmonary epithelia!</div>
            <div>• <strong>PAC-MAN Mechanism:</strong> Prophylactic Antiviral CRISPR in huMAN cells digests incoming viral genomes before replicative packaging occurs!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
