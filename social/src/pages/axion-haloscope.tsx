import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Sun, ShieldCheck
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AxionHaloscope() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cavityFreqMhz, setCavityFreqMhz] = useState(650); // 650 MHz (approx 2.7 micro-eV axion mass)
  const [bFieldTesla, setBFieldTesla] = useState(8.5); // 8.5 Tesla superconducting magnet
  const [qFactor, setQFactor] = useState(85000); // Q = 85,000 cryogenic copper/superconducting cavity
  const [axionDetected, setAxionDetected] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerFrequencyScan = () => {
    uiaudio.warp();
    setAxionDetected(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setAxionDetected(false);
  };

  // ADMX Resonant Microwave Cavity Primakoff Conversion Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Cryostat Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Superconducting Solenoid Magnet 8.5T Field Lines (Vertical Purple/Cyan Lines)
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.lineWidth = 2;
      for (let x = cx - 180; x <= cx + 180; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 40); ctx.lineTo(x, canvas.height - 40);
        ctx.stroke();
      }

      // Cylindrical Copper Microwave Cavity (TM010 mode resonator)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(cx - 140, 100, 280, 280);

      // Central Tuning Rods (Alumina / Copper rods adjusting frequency)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cx - 60, 110, 20, 260);
      ctx.fillRect(cx + 40, 110, 20, 260);

      // TM010 Resonant Standing Wave E-Field (Electric field maxima along cavity axis)
      const waveGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 120);
      waveGrad.addColorStop(0, axionDetected ? '#ffffff' : '#06b6d4');
      waveGrad.addColorStop(0.5, axionDetected ? 'rgba(236, 72, 153, 0.6)' : 'rgba(6, 182, 212, 0.3)');
      waveGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = waveGrad;
      ctx.shadowColor = axionDetected ? '#ec4899' : '#06b6d4';
      ctx.shadowBlur = axionDetected ? 30 : 12;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 130, 130, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Primakoff Microwave Photons Flash (a + B_0 -> gamma)
      if (axionDetected) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        for (let i = 0; i < 8; i++) {
          const px = cx + (Math.random() - 0.5) * 160;
          const py = cy + (Math.random() - 0.5) * 160;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [axionDetected]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                AXION HALOSCOPE // PRIMAKOFF MICROWAVE CONVERSION (ADMX)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                8.5T MAGNET & SQUID AMPLIFIER
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Resonant cavity axion-to-photon conversion & QCD strong CP problem solver for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFrequencyScan}
            disabled={axionDetected}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{axionDetected ? 'RESONANT TM010 PRIMAKOFF CONVERSION...' : 'SCAN AXION FREQUENCY'}</span>
          </button>

          {axionDetected && (
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
              <span className="text-purple-400 font-bold">CAVITY FREQ: {cavityFreqMhz} MHz</span>
              <span className="text-cyan-400 font-bold">B-FIELD: {bFieldTesla} T</span>
              <span className="text-amber-400 font-bold">Q-FACTOR: {qFactor.toLocaleString()}</span>
            </div>
            <div>STATUS: {axionDetected ? 'RESONANT SIGNAL PEAK (10⁻²⁴ W)' : 'TUNING ROD DISPLACEMENT'}</div>
          </div>
        </div>

        {/* Haloscope Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CAVITY TUNING
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Cavity Resonance (f₀):</span>
              <span className="text-purple-400 font-bold">{cavityFreqMhz} MHz</span>
            </div>
            <input
              type="range"
              min={400}
              max={1000}
              step={10}
              value={cavityFreqMhz}
              onChange={(e) => setCavityFreqMhz(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Peccei-Quinn Axion:</strong> Hypothetical ultra-light Goldstone boson solving the Strong CP problem and explaining dark matter halo mass.</div>
            <div>• <strong>Primakoff Effect:</strong> Axions convert into detectable microwave RF photons when traversing a strong static magnetic field.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
