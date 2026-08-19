import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Repeat
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FloquetMajorana() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [driveFrequencyGhz, setDriveFrequencyGhz] = useState(12.5); // 12.5 GHz microwave periodic drive
  const [driveAmplitudeV, setDriveAmplitudeV] = useState(1.4); // 1.4 V/m drive amplitude
  const [isDriving, setIsDriving] = useState(false);
  const [floquetMajoranaFidelity, setFloquetMajoranaFidelity] = useState(0.9995);

  const animFrameRef = useRef<number | null>(null);

  const triggerFloquetDrive = () => {
    uiaudio.warp();
    setIsDriving(true);

    setTimeout(() => {
      setIsDriving(false);
      setFloquetMajoranaFidelity(0.99996);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setFloquetMajoranaFidelity(0.9995);
    setIsDriving(false);
  };

  // Non-Equilibrium Floquet Topological Majorana Nanowire Canvas
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

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Semiconductor InAs / Al Superconducting Nanowire (Center: 120 to 620)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(120, cy); ctx.lineTo(620, cy);
      ctx.stroke();

      // Time-Periodic Microwave Drive AC Potential Oscillations
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 120; x <= 620; x += 5) {
        const py = cy + Math.sin((x - 120) * 0.05 + time * 4) * 35;
        if (x === 120) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();

      // Left Floquet Majorana Zero Mode γ_1 (Quasienergy ε = 0) at x = 120
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isDriving ? 25 : 12;
      ctx.beginPath();
      ctx.arc(120, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('γ_1 (ε=0)', 95, cy - 25);

      // Right Floquet Majorana Zero Mode γ_2 (Quasienergy ε = 0) at x = 620
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isDriving ? 25 : 12;
      ctx.beginPath();
      ctx.arc(620, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.fillText('γ_2 (ε=0)', 595, cy - 25);

      // Center Floquet π-Mode γ_π (Quasienergy ε = π/T) at x = 370
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isDriving ? 25 : 12;
      ctx.beginPath();
      ctx.arc(370, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.fillText('γ_π (ε=π/T)', 340, cy - 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FLOQUET MAJORANA MEMORY: ${driveFrequencyGhz} GHz DRIVE | TOPOLOGICAL MEMORY FIDELITY = ${(floquetMajoranaFidelity * 100).toFixed(3)}%`,
        70,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [driveFrequencyGhz, driveAmplitudeV, floquetMajoranaFidelity, isDriving]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Repeat className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                FLOQUET MAJORANA // DYNAMICAL NON-EQUILIBRIUM QUANTUM MEMORY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                KITAGAWA & DEMLER (HARVARD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Microwave time-periodic drive & anomalous 0- and π-Majorana boundary modes for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFloquetDrive}
            disabled={isDriving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDriving ? 'PUMPING FLOQUET DRIVING FIELD...' : 'ACTIVATE FLOQUET PERIODIC DRIVE'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
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
              <span className="text-cyan-400 font-bold">DRIVE: {driveFrequencyGhz} GHz</span>
              <span className="text-pink-400 font-bold">MODES: 0-MODE + π-MODE</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(floquetMajoranaFidelity * 100).toFixed(3)}%</span>
            </div>
            <div>STATUS: DYNAMICAL TOPOLOGICAL PROTECTION IMMUNE TO STATIC NOISE</div>
          </div>
        </div>

        {/* Floquet Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              MICROWAVE DRIVE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Drive Frequency:</span>
              <span className="text-cyan-400 font-bold">{driveFrequencyGhz} GHz</span>
            </div>
            <input
              type="range"
              min={5.0}
              max={25.0}
              step={0.5}
              value={driveFrequencyGhz}
              onChange={(e) => setDriveFrequencyGhz(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dual Majorana Bound States:</strong> Floquet periodic driving synthesizes both standard 0-energy Majoranas and anomalous π-quasienergy Majoranas simultaneously!</div>
            <div>• <strong>Dynamical Decoherence Suppression:</strong> Fast periodic driving dynamically averages out low-frequency charge noise and nuclear spin fluctuations in the substrate!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
