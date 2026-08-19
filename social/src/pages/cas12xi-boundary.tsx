import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Shield, Barrier
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12xiBoundary() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [firewallSpanKilobases, setFirewallSpanKilobases] = useState(160); // 160 kb epigenetic boundary
  const [insulationIsolationScore, setInsulationIsolationScore] = useState(24); // 24% -> 99.9%
  const [isActivatingFirewall, setIsActivatingFirewall] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12xiFirewall = () => {
    uiaudio.warp();
    setIsActivatingFirewall(true);

    setTimeout(() => {
      setIsActivatingFirewall(false);
      setInsulationIsolationScore(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setInsulationIsolationScore(24);
    setIsActivatingFirewall(false);
  };

  // CRISPR-Cas12xi (Type V-Xi, 38-aa) Epigenetic Boundary Canvas
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

      const isIsolated = insulationIsolationScore > 50;

      // Left Domain: Active Euchromatin (Green / Cyan), Right Domain: Silenced Heterochromatin (Red / Purple)
      // Chromatin Fiber (80 to 620, cy)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(620, cy);
      ctx.stroke();

      if (!isIsolated) {
        // Heterochromatin Spreading into Active Domain (Red Wave encroaching left)
        const spreadX = 240 - Math.sin(time * 2) * 50;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fillRect(spreadX, cy - 35, 620 - spreadX, 70);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('HETEROCHROMATIN SILENCING INVASION (NO EPIGENETIC BOUNDARY)', 140, cy - 50);
      } else {
        // Clean Separation with Cas12xi 38-aa Firewall Barrier at x=350
        // Left Active Euchromatin (Green Glow)
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.fillRect(80, cy - 35, 270, 70);

        // Right Silenced Heterochromatin (Purple Glow)
        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.fillRect(350, cy - 35, 270, 70);

        // Vertical 38-aa Cas12xi Epigenetic Barrier Wall
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(350, cy - 80); ctx.lineTo(350, cy + 80);
        ctx.stroke();

        // 38-aa Cas12xi Barrier Effector Node
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(350, cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#000000'; ctx.font = 'bold 6px monospace'; ctx.fillText('38aa', 342, cy + 2.5);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('ACTIVE EUCHROMATIN', 140, cy - 45);

        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('SILENCED HETEROCHROMATIN', 430, cy - 45);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12ξ (Type V-Xi, 38-aa): FIREWALL = ${firewallSpanKilobases} kb | ISOLATION = ${insulationIsolationScore}% (DOUDNA & WENDY BICKMORE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [firewallSpanKilobases, insulationIsolationScore, isActivatingFirewall]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-indigo-400">
                CRISPR-CAS12ξ // 38-aa EPIGENETIC BOUNDARY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & WENDY BICKMORE (EDINBURGH & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-40-aa historic record micro-effector & synthetic chromatin boundary firewall for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12xiFirewall}
            disabled={isActivatingFirewall || insulationIsolationScore > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isActivatingFirewall ? 'ACTIVATING FIREWALL...' : 'ACTIVATE CHROMATIN FIREWALL'}</span>
          </button>

          {insulationIsolationScore > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 38-aa (SUB-40-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">FIREWALL: {firewallSpanKilobases} kb</span>
              <span className="text-emerald-400 font-bold">ISOLATION: {insulationIsolationScore}%</span>
            </div>
            <div>STATUS: {insulationIsolationScore > 50 ? 'HETEROCHROMATIN SPREADING HALTED' : 'EPIGENETIC LEAKAGE ACTIVE'}</div>
          </div>
        </div>

        {/* Cas12xi Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CHROMATIN FIREWALL
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>38-aa Sub-40-aa World Record:</strong> Cas12ξ is the world's smallest known CRISPR effector (38 amino acids), acting as an impenetrable chromatin boundary!</div>
            <div>• <strong>Epigenetic Isolation:</strong> Prevents spreading of repressive histone marks (H3K27me3, H3K9me3) across synthetic gene cluster boundaries!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
