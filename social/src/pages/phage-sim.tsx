import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, Eye, Layers
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PhageSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [injected, setInjected] = useState(false);
  const [sheathContracted, setSheathContracted] = useState(false);
  const [ejectionPressureAtm, setEjectionPressureAtm] = useState(60); // 60 atmospheres of internal capsid pressure
  const [genomeKb, setGenomeKb] = useState(168.9); // 168.9 kb dsDNA

  const animFrameRef = useRef<number | null>(null);

  const triggerInjection = () => {
    uiaudio.warp();
    setSheathContracted(true);

    setTimeout(() => {
      setInjected(true);
      uiaudio.success();
    }, 800);
  };

  const handleReset = () => {
    uiaudio.click();
    setSheathContracted(false);
    setInjected(false);
  };

  // Phage T4 Nanomachine Canvas
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
      const membraneY = 380;

      // Dark Cytoplasmic Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Bacterial Outer Membrane Lipid Bilayer (Floor)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, membraneY, canvas.width, canvas.height - membraneY);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, membraneY); ctx.lineTo(canvas.width, membraneY);
      ctx.stroke();

      // Icosahedral Capsid Head (Top)
      const headY = sheathContracted ? 170 : 120;
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(cx, headY - 60);
      ctx.lineTo(cx + 45, headY - 20);
      ctx.lineTo(cx + 45, headY + 30);
      ctx.lineTo(cx, headY + 50);
      ctx.lineTo(cx - 45, headY + 30);
      ctx.lineTo(cx - 45, headY - 20);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Helical Contractile Sheath Tail (Middle)
      const sheathH = sheathContracted ? 70 : 150;
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.fillRect(cx - 12, headY + 50, 24, sheathH);
      ctx.shadowBlur = 0;

      // Baseplate & Tail Pins
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(cx - 25, headY + 50 + sheathH, 50, 15);

      // 6 Long Tail Fibers Landing on Membrane
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      // Left Fiber
      ctx.beginPath();
      ctx.moveTo(cx - 25, headY + 50 + sheathH + 10);
      ctx.lineTo(cx - 70, headY + 50 + sheathH + 40);
      ctx.lineTo(cx - 110, membraneY);
      ctx.stroke();

      // Right Fiber
      ctx.beginPath();
      ctx.moveTo(cx + 25, headY + 50 + sheathH + 10);
      ctx.lineTo(cx + 70, headY + 50 + sheathH + 40);
      ctx.lineTo(cx + 110, membraneY);
      ctx.stroke();

      // Injected Viral DNA Stream into Host Cytoplasm
      if (injected) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        for (let y = membraneY; y < canvas.height; y += 4) {
          const x = cx + Math.sin(y * 0.08 + time * 4) * 8;
          if (y === membraneY) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sheathContracted, injected]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-teal-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-400/40">
            <Dna className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '18s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-300 to-purple-400">
                BACTERIOPHAGE T4 // VIRAL GENOMIC INJECTION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                60 ATM INTERNAL PRESSURE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Contractile tail sheath spring mechanics & high-pressure DNA ejection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerInjection}
            disabled={sheathContracted}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{injected ? 'GENOME TRANSFERRED' : (sheathContracted ? 'CONTRACTING SHEATH...' : 'CONTRACT SHEATH & INJECT DNA')}</span>
          </button>

          {sheathContracted && (
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
            height={500}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-teal-400 font-bold">GENOME: {genomeKb} KB</span>
              <span className="text-pink-400 font-bold">CAPSID PRESSURE: {ejectionPressureAtm} ATM</span>
            </div>
            <div>STATUS: {injected ? 'HOST GENOMIC TRANSFECTION SUCCESS' : 'BASEPLATE ATTACHED'}</div>
          </div>
        </div>

        {/* Structural Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            NANOMACHINE MECHANICS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Icosahedral Capsid:</strong> T=13 symmetry containing 168,903 base pairs of tightly packed double-stranded DNA.</div>
            <div>• <strong>Tail Sheath:</strong> Contracts by 60% upon baseplate conformational trigger, driving rigid inner tube through the cell wall.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
