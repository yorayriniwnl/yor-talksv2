import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Zap, Play, RotateCcw, Sliders, 
  ShieldCheck, ShieldAlert, Sparkles, Dna
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PatchClamp() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [clampVoltageMv, setClampVoltageMv] = useState(0); // 0 mV step from -80 mV hold
  const [ttxBlocked, setTtxBlocked] = useState(false);
  const [singleChannelConductancePs, setSingleChannelConductancePs] = useState(20); // 20 pS
  const [channelOpenProb, setChannelOpenProb] = useState(0.85);

  const animFrameRef = useRef<number | null>(null);

  const toggleTtxBlock = () => {
    uiaudio.click();
    setTtxBlocked(!ttxBlocked);
  };

  // Patch-Clamp Current Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Electrophysiology Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Zero Current Baseline Line
      const baseY = 160;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(50, baseY); ctx.lineTo(canvas.width - 50, baseY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Voltage Step Inward Sodium Current (Fast inward transient + inactivation)
      ctx.strokeStyle = ttxBlocked ? '#64748b' : '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = ttxBlocked ? 0 : 10;
      ctx.beginPath();

      for (let x = 50; x < canvas.width - 50; x += 2) {
        let currentNa = 0;

        if (!ttxBlocked && x >= 120) {
          const t = (x - 120) * 0.05;
          // Inward current transient: I_Na(t) = -I_max * (1 - exp(-t/tau_m))^3 * exp(-t/tau_h)
          currentNa = -220 * Math.pow(1 - Math.exp(-t / 0.4), 3) * Math.exp(-t / 1.6);
        }

        const y = baseY - currentNa;
        if (x === 50) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Single-Channel Patch Trace at bottom (Square wave stochastic openings)
      const patchY = 360;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let isLocalOpen = false;

      for (let x = 50; x < canvas.width - 50; x += 6) {
        if (!ttxBlocked && Math.random() > 0.88) isLocalOpen = !isLocalOpen;
        if (ttxBlocked) isLocalOpen = false;

        const py = patchY + (isLocalOpen ? 30 : 0);
        if (x === 50) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [clampVoltageMv, ttxBlocked]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                PATCH CLAMP // VOLTAGE-GATED SODIUM CHANNEL CURRENTS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                NEHER & SAKMANN NOBEL 1991
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Gigaseal micropipette recording & S4 voltage-sensor gating kinetics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleTtxBlock}
            className={cn(
              "px-6 py-3 rounded-xl font-bold shadow-lg flex items-center space-x-2 transition-all",
              ttxBlocked 
                ? "bg-zinc-800 text-zinc-400 border border-white/10" 
                : "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-rose-500/30"
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{ttxBlocked ? 'TTX APPLIED (CHANNELS BLOCKED)' : 'APPLY TETRODOTOXIN (TTX)'}</span>
          </button>
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
              <span className="text-cyan-400 font-bold">CLAMP VOLTAGE: {clampVoltageMv} mV</span>
              <span className="text-purple-400 font-bold">SINGLE CHANNEL: {singleChannelConductancePs} pS</span>
            </div>
            <div>STATUS: {ttxBlocked ? 'VOLTAGE-GATED CURRENTS INHIBITED' : 'INWARD SODIUM TRANSIENT ACTIVE'}</div>
          </div>
        </div>

        {/* Electrophysiology Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              VOLTAGE PROTOCOL
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Step Voltage (V_cmd):</span>
              <span className="text-cyan-400 font-bold">{clampVoltageMv} mV</span>
            </div>
            <input
              type="range"
              min={-40}
              max={40}
              step={5}
              value={clampVoltageMv}
              onChange={(e) => setClampVoltageMv(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">S4 GATING CHARGE:</span>
            <div>• Positively charged arginine residues in the S4 transmembrane helix slide outward upon membrane depolarization.</div>
            <div>• Tetrodotoxin (TTX) from pufferfish physically plugs the outer selectivity filter pore with nanomolar affinity.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
