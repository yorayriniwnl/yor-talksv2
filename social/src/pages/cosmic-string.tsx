import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CosmicString() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stringTensionGmu, setStringTensionGmu] = useState('1.0e-7'); // G*mu ~ 10^-7
  const [loopOscillationFreq, setLoopOscillationFreq] = useState(1.4);
  const [cuspBurstFired, setCuspBurstFired] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCuspBurst = () => {
    uiaudio.warp();
    setCuspBurstFired(true);
    setTimeout(() => {
      setCuspBurstFired(false);
      uiaudio.success();
    }, 1200);
  };

  // Cosmic String Loop Oscillation Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05 * loopOscillationFreq;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Cosmic Spacetime
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Oscillating 1D Topological Defect Loop (Kibble-Turok Harmonic String Loop)
      ctx.strokeStyle = cuspBurstFired ? '#ffffff' : '#06b6d4';
      ctx.lineWidth = cuspBurstFired ? 4 : 2.5;
      ctx.shadowColor = cuspBurstFired ? '#ffffff' : '#06b6d4';
      ctx.shadowBlur = cuspBurstFired ? 25 : 12;

      ctx.beginPath();
      const points = 120;
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        // Vachaspati-Vilenkin loop equations: x = r * cos(theta), y = r * sin(theta) * cos(omega*t)
        const r = 110 + 35 * Math.sin(theta * 3 + time * 2);
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r * Math.cos(time);

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Relativistic Cusp Gravitational Wave Beaming Cone (Fires when cusp velocity approaches c)
      if (cuspBurstFired) {
        const cuspGrad = ctx.createRadialGradient(cx + 120, cy, 2, cx + 120, cy, 240);
        cuspGrad.addColorStop(0, '#ffffff');
        cuspGrad.addColorStop(0.3, '#ec4899');
        cuspGrad.addColorStop(0.7, '#8b5cf6');
        cuspGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.fillStyle = cuspGrad;
        ctx.beginPath();
        ctx.arc(cx + 120, cy, 240, -Math.PI / 4, Math.PI / 4);
        ctx.lineTo(cx + 120, cy);
        ctx.closePath();
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [loopOscillationFreq, cuspBurstFired]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Waves className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                COSMIC STRINGS // 1D TOPOLOGICAL DEFECT CUSP BURSTS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                GUT SCALE Gμ ~ 10⁻⁷
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Relativistic string loop oscillations & beamed gravitational wave bursts for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCuspBurst}
            disabled={cuspBurstFired}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{cuspBurstFired ? 'RELATIVISTIC CUSP BEAMING (v ≈ c)...' : 'TRIGGER CUSP GRAV BURST'}</span>
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
              <span className="text-cyan-400 font-bold">STRING TENSION: Gμ = {stringTensionGmu}</span>
              <span className="text-pink-400 font-bold">OSCILLATION: {loopOscillationFreq} Hz</span>
            </div>
            <div>STATUS: {cuspBurstFired ? 'BEAMED GRAVITATIONAL WAVE BURST' : 'HARMONIC LOOP OSCILLATION'}</div>
          </div>
        </div>

        {/* String Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            COSMOLOGICAL DEFECTS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Kibble Mechanism:</strong> 1D gauge strings formed during early universe grand unified theory (GUT) phase transitions.</div>
            <div>• <strong>Relativistic Cusps:</strong> Points on oscillating loops reach light speed (v = c), emitting ultra-intense collimated gravitational wave bursts detectable by LIGO/LISA.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
