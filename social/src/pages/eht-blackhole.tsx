import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, Camera
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function EhtBlackHole() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [blackHoleMassSolar, setBlackHoleMassSolar] = useState('6.5e9'); // M87* 6.5 Billion Solar Masses
  const [accretionSpinA, setAccretionSpinA] = useState(0.94); // Kerr spin a* = 0.94
  const [vlbiFrequencyGhz, setVlbiFrequencyGhz] = useState(230); // 230 GHz (1.3 mm)
  const [ehtReconstructed, setEhtReconstructed] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  // EHT Synchrotron Doppler Crescent Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Cosmic Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Accretion Flow Plasma Glow (Golden/Orange)
      const outerGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 210);
      outerGrad.addColorStop(0, '#f97316');
      outerGrad.addColorStop(0.5, '#c2410c');
      outerGrad.addColorStop(1, 'rgba(194, 65, 12, 0)');

      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 210, 0, Math.PI * 2);
      ctx.fill();

      // Doppler Boosted Asymmetric Crescent Ring (Bottom left brighter due to relativistic approach)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.3);

      const crescentGrad = ctx.createRadialGradient(-30, 30, 45, 0, 0, 110);
      crescentGrad.addColorStop(0, '#ffffff');
      crescentGrad.addColorStop(0.3, '#f59e0b');
      crescentGrad.addColorStop(0.7, '#ea580c');
      crescentGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');

      ctx.fillStyle = crescentGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(0, 0, 105, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Photon Ring (Critical curve at r = sqrt(27) M = 2.6 Rs)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Event Horizon Black Hole Shadow (Pure Black Core)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx, cy, 65, 0, Math.PI * 2);
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [accretionSpinA]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Camera className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                EVENT HORIZON TELESCOPE // M87* BLACK HOLE SHADOW
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                1.3 MM VLBI INTERFEROMETRY
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Earth-sized aperture synthesis & relativistic Doppler crescent for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">BLACK HOLE MASS</div>
            <div className="text-xl font-bold text-amber-400">{blackHoleMassSolar} <span className="text-xs">M☉</span></div>
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
              <span className="text-amber-400 font-bold">SPIN: a* = {accretionSpinA}</span>
              <span className="text-cyan-400 font-bold">FREQUENCY: {vlbiFrequencyGhz} GHz</span>
            </div>
            <div>STATUS: PHOTON RING & SHADOW RESOLVED (42 μas)</div>
          </div>
        </div>

        {/* EHT Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              GRMHD RAYTRACING
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Dimensionless Spin (a*):</span>
              <span className="text-amber-400 font-bold">a* = {accretionSpinA}</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={0.99}
              step={0.01}
              value={accretionSpinA}
              onChange={(e) => setAccretionSpinA(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">EHT DISCOVERY:</span>
            <div>• Shadow diameter is 5.2 Schwarzschild radii, confirming Einstein's General Relativity predictions with unprecedented precision.</div>
            <div>• Asymmetric brightness reflects relativistic beaming of matter orbiting at near light-speed toward the observer.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
