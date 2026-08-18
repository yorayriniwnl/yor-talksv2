import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Scissors, Zap, Play, RotateCcw, 
  Sparkles, ShieldCheck, Activity, Search, CheckCircle2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const DNA_TEMPLATE = 'ATGCGATCGATCGATCGGCTAGCTAGCTAGCTGATCGATCGATCGATCG';
const SGRNA_TARGET = 'ATCGATCGGCTAGCTAGCTA';

export default function CrisprStudio() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [pamFound, setPamFound] = useState(true);
  const [cleaved, setCleaved] = useState(false);
  const [repairMode, setRepairMode] = useState<'NHEJ (KNOCKOUT)' | 'HDR (PRECISION EDIT)'>('HDR (PRECISION EDIT)');
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerCleavage = () => {
    uiaudio.warp();
    setIsProcessing(true);

    setTimeout(() => {
      setCleaved(true);
      setIsProcessing(false);
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setCleaved(false);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Dna className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '12s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                CRISPR STUDIO // CAS9 TARGET CLEAVAGE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PAM MOTIF 5'-NGG-3'
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Guide sgRNA complementary binding & double-strand break repair for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCleavage}
            disabled={isProcessing || cleaved}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Scissors className="w-4 h-4" />
            <span>{isProcessing ? 'CLEAVING PHOSPHODIESTER BACKBONE...' : (cleaved ? 'CLEAVAGE COMPLETE' : 'TRIGGER CAS9 CLEAVAGE')}</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* DNA Strand Sequence (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">GENOMIC TARGET SEQUENCE (5' → 3')</span>
            <span className="text-emerald-400">PAM SITE: AGG LOCKED</span>
          </div>

          <div className="space-y-4">
            {/* Sense Strand */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-emerald-500/20 space-y-1">
              <div className="text-[11px] text-emerald-400 font-bold">5' TARGET SENSE STRAND:</div>
              <div className="font-mono text-base tracking-widest text-white break-all">
                {cleaved ? (
                  <>
                    <span className="text-zinc-500">ATGCGATCGATC</span>
                    <span className="text-red-400 font-bold px-1 bg-red-950/40 rounded">[DSB BREAK]</span>
                    <span className="text-cyan-300 font-bold underline decoration-cyan-400">GCTAGCTAGCTGATCGATCGATCGATCG</span>
                  </>
                ) : (
                  DNA_TEMPLATE
                )}
              </div>
            </div>

            {/* sgRNA Guide Strand */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-teal-500/20 space-y-1">
              <div className="text-[11px] text-teal-400 font-bold">20-NT SINGLE GUIDE RNA (sgRNA):</div>
              <div className="font-mono text-sm tracking-widest text-teal-300">
                3'- {SGRNA_TARGET} - 5'
              </div>
            </div>
          </div>
        </div>

        {/* Repair Pathway Selection (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            DNA REPAIR MECHANISM
          </h3>

          <div className="space-y-2">
            {(['HDR (PRECISION EDIT)', 'NHEJ (KNOCKOUT)'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { uiaudio.click(); setRepairMode(mode); }}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl font-bold uppercase transition-all border",
                  repairMode === mode 
                    ? "bg-emerald-500 text-black border-emerald-400 shadow-md" 
                    : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/15"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
            {repairMode === 'HDR (PRECISION EDIT)' 
              ? 'Homology-Directed Repair uses a synthetic donor template for base substitution editing.' 
              : 'Non-Homologous End Joining introduces frameshift indel mutations to knock out target gene expression.'}
          </div>
        </div>
      </div>
    </div>
  );
}
