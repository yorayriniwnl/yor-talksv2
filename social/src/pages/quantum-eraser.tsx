import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, EyeOff, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function QuantumEraser() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [whichWayMarked, setWhichWayMarked] = useState(true);
  const [eraserActivated, setEraserActivated] = useState(false);

  const toggleQuantumEraser = () => {
    uiaudio.warp();
    setEraserActivated(prev => !prev);
    if (!eraserActivated) {
      setTimeout(() => uiaudio.success(), 800);
    }
  };

  // Quantum Eraser & Delayed-Choice Double-Slit Interference Canvas
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

      // Dark Quantum Optical Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // SPDC Laser Source (Left 60, cy)
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 15;
      ctx.fillRect(40, cy - 20, 30, 40);
      ctx.shadowBlur = 0;

      // Double-Slit Barrier with Orthogonal Quarter-Wave Plate (QWP) Markers (180)
      ctx.fillStyle = '#334155';
      ctx.fillRect(180, 40, 10, cy - 35);
      ctx.fillRect(180, cy - 15, 10, 30);
      ctx.fillRect(180, cy + 20, 10, canvas.height - 60);

      // Slit 1 (Upper) & Slit 2 (Lower)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(180, cy - 30, 10, 15); // Slit 1 (|H> polarization)
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(180, cy + 5, 10, 15); // Slit 2 (|V> polarization)

      // Quantum Eraser 45° Diagonal Polarizer (360)
      if (eraserActivated) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.strokeRect(360, 60, 12, 360);
        ctx.fillRect(360, 60, 12, 360);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('45° QUANTUM ERASER POLARIZER', 380, 80);
      }

      // Detection Screen (Right 680)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(680, 40, 12, 400);

      // Draw Wave Propagation or Clump Pattern
      if (eraserActivated) {
        // Interference Restored! (High Contrast Sinusoidal Wave Fringes in Cyan)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let y = 60; y <= 420; y += 3) {
          const normY = (y - cy) / 60;
          // Sinc^2 * Cos^2 double-slit interference pattern
          const intensity = Math.pow(Math.cos(normY * 4.5), 2) * Math.exp(-(normY * normY) / 6);
          const px = 680 - intensity * 140;

          if (y === 60) ctx.moveTo(px, y); else ctx.lineTo(px, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('WAVE INTERFERENCE FRINGES RESTORED!', 430, cy + 80);
      } else {
        // Which-Way Information Known -> Decoherence into Particle Clumps (No Fringes)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let y = 60; y <= 420; y += 3) {
          const normY1 = (y - (cy - 22)) / 40;
          const normY2 = (y - (cy + 12)) / 40;
          const intensity = 0.5 * Math.exp(-(normY1 * normY1)) + 0.5 * Math.exp(-(normY2 * normY2));
          const px = 680 - intensity * 120;

          if (y === 60) ctx.moveTo(px, y); else ctx.lineTo(px, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('WHICH-WAY PATH KNOWN: CORPUSCULAR PARTICLE CLUMP (NO FRINGES)', 220, cy + 80);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [eraserActivated, whichWayMarked]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                QUANTUM ERASER // WHEELER DELAYED-CHOICE INTERFEROMETRY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SCULLY-DRÜHL EXPERIMENT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Which-way path marking & delayed quantum entanglement wave-particle duality for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleQuantumEraser}
            className={cn(
              "px-6 py-3 rounded-xl font-bold shadow-lg flex items-center space-x-2 transition-all",
              eraserActivated ? "bg-cyan-600 text-white shadow-cyan-500/30" : "bg-gradient-to-r from-amber-500 to-yellow-600 text-black"
            )}
          >
            {eraserActivated ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{eraserActivated ? 'ERASE PATH INFORMATION (INTERFERENCE ON)' : 'ACTIVATE 45° QUANTUM ERASER'}</span>
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
              <span className="text-cyan-400 font-bold">WHICH-WAY: {eraserActivated ? 'ERASED (|D⟩ = (|H⟩+|V⟩)/√2)' : 'MARKED (|H⟩ vs |V⟩)'}</span>
              <span className="text-pink-400 font-bold">PATTERN: {eraserActivated ? 'WAVE INTERFERENCE FRINGES' : 'PARTICLE CLUMPS'}</span>
            </div>
            <div>STATUS: {eraserActivated ? 'COMPLEMENTARITY WAVE DUALITY RESTORED' : 'PATH DETERMINISM ENFORCED'}</div>
          </div>
        </div>

        {/* Quantum Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            QUANTUM FOUNDATIONS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Bohr's Complementarity:</strong> If path information (which slit the photon traversed) is knowable in principle, wave interference vanishes instantly!</div>
            <div>• <strong>Delayed Erasure:</strong> Placing a 45° diagonal polarizer erases the distinguishability between |H⟩ and |V⟩ states even after the photon has already passed the slits, magically restoring interference!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
