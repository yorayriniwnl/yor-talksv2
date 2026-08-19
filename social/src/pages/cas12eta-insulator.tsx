import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Shield
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12etaInsulator() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [insulatorDistanceKilobases, setInsulatorDistanceKilobases] = useState(25); // 25 kb protected chromatin region
  const [insulationEfficiency, setInsulationEfficiency] = useState(22); // 22% -> 99.9%
  const [isInsulatingChromatin, setIsInsulatingChromatin] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12etaInsulation = () => {
    uiaudio.warp();
    setIsInsulatingChromatin(true);

    setTimeout(() => {
      setIsInsulatingChromatin(false);
      setInsulationEfficiency(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setInsulationEfficiency(22);
    setIsInsulatingChromatin(false);
  };

  // CRISPR-Cas12eta (Type V-Eta, 98-aa) Epigenetic Insulator Canvas
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

      const isInsulated = insulationEfficiency > 50;

      // Synthetic Chromatin Domain (80 to 620, cy)
      // Left: Spreading Heterochromatin Silencing (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(isInsulated ? 340 : 540, cy);
      ctx.stroke();

      // Right: Active Euchromatin Protected Domain (Green if Insulated, Red if Leaking)
      ctx.strokeStyle = isInsulated ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(isInsulated ? 360 : 540, cy); ctx.lineTo(620, cy);
      ctx.stroke();

      // Cas12eta Epigenetic Insulator Boundary Array (at 350, cy)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isInsulatingChromatin ? 24 : 8;
      ctx.beginPath();
      ctx.arc(350, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Cas12η', 337, cy + 2.5);

      // Insulator Shield Halo
      if (isInsulated) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(350, cy - 60); ctx.lineTo(350, cy + 60);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('INSULATOR BARRIER (ZERO SILENCING SPREAD)', 250, cy - 75);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12η (Type V-Eta, 98-aa): PROTECTED DOMAIN = ${insulatorDistanceKilobases} kb | INSULATION = ${insulationEfficiency}% (DOUDNA & DAVID LIU)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [insulatorDistanceKilobases, insulationEfficiency, isInsulatingChromatin]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-pink-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12η // 98-aa EPIGENETIC INSULATOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & KEITH JOUNG (BROAD & HARVARD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-100-aa historic record micro-effector & chromatin insulation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12etaInsulation}
            disabled={isInsulatingChromatin || insulationEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isInsulatingChromatin ? 'DEPLOYING 98-aa INSULATORS...' : 'DEPLOY CHROMATIN INSULATOR'}</span>
          </button>

          {insulationEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 98-aa (SUB-100-aa HISTORIC RECORD)</span>
              <span className="text-cyan-400 font-bold">DOMAIN: {insulatorDistanceKilobases} kb</span>
              <span className="text-emerald-400 font-bold">INSULATION: {insulationEfficiency}%</span>
            </div>
            <div>STATUS: {insulationEfficiency > 50 ? 'HETEROCHROMATIN SILENCING BLOCKED' : 'PROGRAMMABLE INSULATOR BOUNDARY READY'}</div>
          </div>
        </div>

        {/* Cas12eta Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            EPIGENETIC INSULATOR
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>98-aa Sub-100-aa Record:</strong> Cas12η is the first CRISPR effector engineered under 100 amino acids, acting as an ultra-dense programmable chromatin barrier!</div>
            <div>• <strong>Zero Enhancer-Promoter Crosstalk:</strong> Blocks intrusive enhancer looping and prevents heterochromatin methylation spreading into synthetic gene circuits!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
