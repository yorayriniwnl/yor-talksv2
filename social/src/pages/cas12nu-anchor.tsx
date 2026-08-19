import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Anchor, Network
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12nuAnchor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loopAnchorSpanKb, setLoopAnchorSpanKb] = useState(140); // 140 kb anchored loop extrusion domain
  const [extrusionArrestFidelity, setExtrusionArrestFidelity] = useState(25); // 25% -> 99.9%
  const [isAnchoringLoops, setIsAnchoringLoops] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12nuAnchoring = () => {
    uiaudio.warp();
    setIsAnchoringLoops(true);

    setTimeout(() => {
      setIsAnchoringLoops(false);
      setExtrusionArrestFidelity(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setExtrusionArrestFidelity(25);
    setIsAnchoringLoops(false);
  };

  // CRISPR-Cas12nu (Type V-Nu, 42-aa) Loop Anchor Canvas
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

      const isAnchored = extrusionArrestFidelity > 50;

      if (!isAnchored) {
        // Continuous unarrested cohesin loop extrusion sliding without boundaries
        const slipX = (time * 40) % 200;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, cy); ctx.lineTo(620, cy);
        ctx.stroke();

        // Sliding ring
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(200 + slipX, cy, 20, 35, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('UNANCHORED COHESIN SLIPPAGE (NO TOPOLOGICAL BOUNDARY)', 160, cy - 45);
      } else {
        // Firmly Anchored Stable Chromatin Loop between two Cas12nu 42-aa nodes
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 40, 140, 80, 0, 0, Math.PI);
        ctx.stroke();

        // Flanking DNA arms
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, cy); ctx.lineTo(cx - 140, cy);
        ctx.moveTo(cx + 140, cy); ctx.lineTo(620, cy);
        ctx.stroke();

        // Left Cas12nu Anchor (42-aa)
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx - 140, cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000000'; ctx.font = 'bold 6px monospace'; ctx.fillText('42aa', cx - 149, cy + 2.5);

        // Right Cas12nu Anchor (42-aa)
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx + 140, cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000000'; ctx.font = 'bold 6px monospace'; ctx.fillText('42aa', cx + 131, cy + 2.5);

        // Cohesin Ring locked at the base
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 40, 24, 40, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`SYNTHETIC LOOP EXTRUSION ANCHORED (${loopAnchorSpanKb} kb DOMAIN)`, 180, cy - 130);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12ν (Type V-Nu, 42-aa): LOOP SPAN = ${loopAnchorSpanKb} kb | ARREST FIDELITY = ${extrusionArrestFidelity}% (DOUDNA & LEONID MIRNY)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [loopAnchorSpanKb, extrusionArrestFidelity, isAnchoringLoops]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Anchor className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12ν // 42-aa CHROMATIN LOOP ANCHOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & LEONID MIRNY (BROAD & MIT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-45-aa historic record micro-effector & synthetic chromatin loop extrusion anchor for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12nuAnchoring}
            disabled={isAnchoringLoops || extrusionArrestFidelity > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isAnchoringLoops ? 'ANCHORING COHESIN RING...' : 'ANCHOR CHROMATIN LOOP'}</span>
          </button>

          {extrusionArrestFidelity > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 42-aa (SUB-45-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">LOOP: {loopAnchorSpanKb} kb</span>
              <span className="text-emerald-400 font-bold">ARREST: {extrusionArrestFidelity}%</span>
            </div>
            <div>STATUS: {extrusionArrestFidelity > 50 ? 'COHESIN EXTRUSION ARRESTED AT ANCHORS' : 'CHROMATIN UNANCHORED'}</div>
          </div>
        </div>

        {/* Cas12nu Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            LOOP ANCHOR SUITE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>42-aa Sub-45-aa Historic Record:</strong> Cas12ν is the smallest known programmable DNA binding effector (42 amino acids), acting as a physical loop anchor!</div>
            <div>• <strong>Loop Extrusion Arrest:</strong> Forms a non-cleaving roadblock that arrests moving cohesin rings at specific genomic loci, creating stable 140 kb chromatin domains!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
