import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MuonTomography() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [muonFluxPcm2, setMuonFluxPcm2] = useState(1.0); // 1 muon / cm^2 / min at sea level
  const [targetDensityGcm3, setTargetDensityGcm3] = useState(2.6); // 2.6 g/cm^3 limestone
  const [voidDetected, setVoidDetected] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const muonsRef = useRef<{ x: number; y: number; angle: number; energy: number; stopped: boolean }[]>([]);

  const triggerRadiographyScan = () => {
    uiaudio.warp();
    setVoidDetected(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1200);
  };

  const handleReset = () => {
    uiaudio.click();
    setVoidDetected(false);
  };

  // Cosmic Ray Muon Radiography Canvas
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

      // Dark Sky & Stratosphere Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Great Pyramid / Mountain Silhouette (Solid Dark Gold/Bronze Triangle)
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, 120);
      ctx.lineTo(cx - 240, 420);
      ctx.lineTo(cx + 240, 420);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hidden Internal Void / King's Chamber (Cyan Glowing Pocket inside Pyramid)
      ctx.fillStyle = voidDetected ? 'rgba(6, 182, 212, 0.45)' : 'rgba(0, 0, 0, 0.3)';
      ctx.strokeStyle = voidDetected ? '#06b6d4' : '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 50, 240, 100, 50);
      ctx.fillRect(cx - 50, 240, 100, 50);

      // Bottom Scintillator & Nuclear Emulsion Detector Array (Base plane)
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(cx - 160, 425, 320, 15);

      // Spawn Relativistic Muons entering from Sky
      if (Math.random() < 0.8) {
        muonsRef.current.push({
          x: cx + (Math.random() - 0.5) * 360,
          y: 0,
          angle: (Math.random() - 0.5) * 0.4 + Math.PI / 2,
          energy: Math.random() * 80 + 20, // 20-100 GeV
          stopped: false,
        });
      }

      // Trace Muons through Matter
      muonsRef.current.forEach((m) => {
        m.x += Math.cos(m.angle) * 12;
        m.y += Math.sin(m.angle) * 12;

        // Check if muon inside solid stone vs void
        const inVoid = m.x > cx - 50 && m.x < cx + 50 && m.y > 240 && m.y < 290;
        const inStone = m.y > 120 && m.y < 420 && !inVoid;

        if (inStone) {
          m.energy -= 4.5 * (targetDensityGcm3 / 2.6); // Bethe-Bloch dE/dx stopping
          if (m.energy <= 0) m.stopped = true;
        }

        // Draw Muon Trail
        if (!m.stopped && m.y < 430) {
          ctx.strokeStyle = inVoid ? '#06b6d4' : '#38bdf8';
          ctx.lineWidth = inVoid ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.moveTo(m.x - Math.cos(m.angle) * 12, m.y - Math.sin(m.angle) * 12);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      });

      muonsRef.current = muonsRef.current.filter(m => !m.stopped && m.y < 440);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [voidDetected, targetDensityGcm3]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Eye className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                COSMIC MUON TOMOGRAPHY // 3D VOID RADIOGRAPHY (ScanPyramids)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ATMOSPHERIC μ RADIOMETRY
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Bethe-Bloch dE/dx absorption & non-destructive void discovery for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerRadiographyScan}
            disabled={voidDetected}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{voidDetected ? 'SCANNING DETECTOR PLANES (SCANPYRAMIDS VOID RESOLVED)...' : 'INTEGRATE MUON EXPOSURE'}</span>
          </button>

          {voidDetected && (
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
              <span className="text-cyan-400 font-bold">FLUX: {muonFluxPcm2} μ / cm² / min</span>
              <span className="text-amber-400 font-bold">DENSITY: {targetDensityGcm3} g/cm³</span>
            </div>
            <div>STATUS: {voidDetected ? 'INTERNAL VOID CONFIRMED (30M CAVITY)' : 'CONTINUOUS COSMIC EXPOSURE'}</div>
          </div>
        </div>

        {/* Radiography Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              GEOLOGICAL DENSITY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Rock Density (ρ):</span>
              <span className="text-amber-400 font-bold">{targetDensityGcm3} g/cm³</span>
            </div>
            <input
              type="range"
              min={1.5}
              max={3.5}
              step={0.1}
              value={targetDensityGcm3}
              onChange={(e) => setTargetDensityGcm3(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Natural X-Ray of Nature:</strong> Cosmic ray protons hitting the upper atmosphere produce pions which decay into penetrating relativistic muons.</div>
            <div>• <strong>ScanPyramids Discovery:</strong> 2017 Nature paper used emulsion plates to discover the 30-meter Big Void inside Khufu's pyramid!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
