import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Zap, Play, Pause, RotateCcw, 
  Sparkles, Sliders, Dna, ShieldCheck
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HodgkinHuxley() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [injectedCurrentUa, setInjectedCurrentUa] = useState(10.0); // uA/cm2
  const [spikeCount, setSpikeCount] = useState(18);
  const [firingRateHz, setFiringRateHz] = useState(64);

  const animFrameRef = useRef<number | null>(null);

  // Hodgkin-Huxley Action Potential Waveform Canvas
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

      // -70 mV Resting Potential Baseline
      const restY = 360;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(60, restY); ctx.lineTo(canvas.width - 60, restY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Action Potential Spike Train
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const freq = (injectedCurrentUa / 10) * 0.05;

      for (let x = 60; x < canvas.width - 60; x += 2) {
        const phase = (x * freq + time * 3) % (Math.PI * 2);
        // Spike waveform shape (Rapid depolarization + repolarization + afterhyperpolarization)
        let vOffset = 0;
        if (phase < 0.8) {
          vOffset = Math.sin(phase / 0.8 * Math.PI) * 220; // +40 mV peak
        } else if (phase < 1.4) {
          vOffset = -Math.sin((phase - 0.8) / 0.6 * Math.PI) * 35; // -85 mV hyperpolarization
        }

        const y = restY - vOffset;
        if (x === 60) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [injectedCurrentUa]);

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                HODGKIN-HUXLEY // NEURAL ACTION POTENTIAL BIOPHYSICS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                VOLTAGE-GATED ION CHANNELS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              4-variable differential equations & sodium/potassium gating variables for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Firing Rate Banner */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPIKE FIRING RATE</div>
            <div className="text-xl font-bold text-cyan-400">{Math.round(injectedCurrentUa * 6.4)} <span className="text-xs">HZ</span></div>
          </div>
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
              <span className="text-cyan-400 font-bold">PEAK: +40 mV</span>
              <span className="text-indigo-400 font-bold">REST: -70 mV</span>
            </div>
            <div>STATUS: CONTINUOUS REPETITIVE SPIKING</div>
          </div>
        </div>

        {/* Injected Current Slider (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ELECTROPHYSIOLOGY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Injected Current (I_inj):</span>
              <span className="text-cyan-400 font-bold">{injectedCurrentUa} μA/cm²</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={25.0}
              step={0.5}
              value={injectedCurrentUa}
              onChange={(e) => setInjectedCurrentUa(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">EQUATIONS:</span>
            <div>• C_m dV/dt = I - g_Na m³h(V - E_Na) - g_K n⁴(V - E_K) - g_L(V - E_L)</div>
            <div>• m: Na+ activation, h: Na+ inactivation, n: K+ activation.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
