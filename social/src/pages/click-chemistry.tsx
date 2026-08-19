import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Link
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ClickChemistry() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [reactionType, setReactionType] = useState<'SPAAC_DBCO' | 'Staudinger_Ligation'>('SPAAC_DBCO');
  const [isReacting, setIsReacting] = useState(false);
  const [clicked, setClicked] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerClickReaction = () => {
    uiaudio.warp();
    setIsReacting(true);

    setTimeout(() => {
      setIsReacting(false);
      setClicked(true);
      uiaudio.success();
    }, 850);
  };

  const handleReset = () => {
    uiaudio.click();
    setClicked(false);
    setIsReacting(false);
  };

  // Bio-Orthogonal Click Chemistry (Azide-DBCO Cycloaddition) Canvas
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

      // Dark Cellular Cytosol Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Target Protein Backbone Ribbon (Left to Right cyan wavy strand)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy);
      ctx.bezierCurveTo(cx - 100, cy - 60, cx + 100, cy + 60, canvas.width - 80, cy);
      ctx.stroke();

      // Site-Specific Azido-Lysine ncAA Sidechain (at cx, cy)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 60);
      ctx.stroke();

      // Azide Functional Group (-N3)
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy - 60, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('-N₃ (Azide)', cx - 24, cy - 80);

      // DBCO / Cy5 Fluorophore Probe (Magenta Molecule incoming or clicked)
      const probeX = clicked ? cx : cx + (isReacting ? Math.sin(time * 12) * 20 : 140);
      const probeY = clicked ? cy - 60 : cy - 120 + Math.sin(time * 3) * 15;

      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = clicked ? 25 : 8;
      ctx.beginPath();
      ctx.arc(probeX, probeY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(clicked ? 'TRIAZOLE LINKAGE' : 'DBCO-Fluorophore', probeX - 45, probeY - 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (clicked) {
        ctx.fillText('COPPER-FREE SPAAC CLICK COMPLETE: 1,2,3-TRIAZOLE CONJUGATE FORMED (100% BIO-COMPATIBLE)', 80, cy + 130);
      } else {
        ctx.fillText('BIO-ORTHOGONAL AZIDE-TAGGED PROTEIN AWAITING DBCO CYCLOADDITION', 120, cy + 130);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [reactionType, isReacting, clicked]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Link className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                BIO-ORTHOGONAL CLICK CHEMISTRY // SPAAC & STAUDINGER LIGATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                NOBEL PRIZE 2022 (BERTOZZI / SHARPLESS)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Copper-free strain-promoted azide-alkyne cycloaddition inside living cells for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerClickReaction}
            disabled={isReacting || clicked}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-amber-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isReacting ? 'CYCLOADDITION PROGRESSING...' : 'TRIGGER SPAAC CLICK CONJUGATION'}</span>
          </button>

          {clicked && (
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
              <span className="text-pink-400 font-bold">REACTION: {reactionType}</span>
              <span className="text-cyan-400 font-bold">COPPER: 0.0 µM (ZERO TOXICITY)</span>
            </div>
            <div>STATUS: {clicked ? 'FLUOROPHORE STABLY ANCHORED IN VIVO' : 'UNREACTED AZIDE PROBE'}</div>
          </div>
        </div>

        {/* Click Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            BIO-ORTHOGONAL MODES
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => setReactionType('SPAAC_DBCO')}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                reactionType === 'SPAAC_DBCO' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Strain-Promoted SPAAC (DBCO)</div>
              <div className="text-[10px] text-zinc-400">Ring-strain driven // No Cu(I) required</div>
            </button>

            <button
              onClick={() => setReactionType('Staudinger_Ligation')}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                reactionType === 'Staudinger_Ligation' ? "bg-amber-500/20 border-amber-400 text-amber-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Staudinger Ligation</div>
              <div className="text-[10px] text-zinc-400">Triarylphosphine + Azide coupling</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Bio-Orthogonality:</strong> Neither the azide nor the DBCO alkyne reacts with native cellular amines, thiols, or carbohydrates, operating with 100% chemical selectivity!</div>
            <div>• <strong>Living Cell Imaging:</strong> Allows precise fluorescent labeling of glycan coats, cell-surface receptors, and viral capsids in real-time inside living organisms!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
