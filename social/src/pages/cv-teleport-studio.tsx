import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Waves, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CvTeleportStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [squeezingDb, setSqueezingDb] = useState(10.0); // 10 dB EPR entanglement squeezing
  const [teleportFidelity, setTeleportFidelity] = useState(0.89); // F = 0.89 > 0.5 classical limit
  const [isTeleporting, setIsTeleporting] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCvTeleportation = () => {
    uiaudio.warp();
    setIsTeleporting(true);

    setTimeout(() => {
      setIsTeleporting(false);
      uiaudio.success();
    }, 900);
  };

  // Continuous-Variable Phase Space (x, p) Wigner Function Teleportation Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Quantum Optical Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Alice Station (Left 140, cy)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(60, cy - 80, 160, 160);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('ALICE (HOMODYNE BSM)', 70, cy - 90);

      // Bob Station (Right 540, cy)
      ctx.strokeStyle = '#ec4899';
      ctx.strokeRect(520, cy - 80, 160, 160);
      ctx.fillStyle = '#ec4899';
      ctx.fillText('BOB (DISPLACEMENT D(β))', 530, cy - 90);

      // Squeezed EPR Entangled Source in Center (370, cy)
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(370, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TMSV EPR', 345, cy + 30);

      // Entanglement EPR Links (Dotted Purple Lines)
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(370, cy); ctx.lineTo(220, cy);
      ctx.moveTo(370, cy); ctx.lineTo(520, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Alice Phase Space Wigner Contour (Original State in Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(140, cy, 35, 18, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();

      // Bob Reconstructed Wavepacket (Teleported State)
      if (isTeleporting) {
        ctx.strokeStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(600, cy, 35, 18, Math.PI / 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('FIDELITY F = 0.89 > 0.5 (QUANTUM BENCHMARK EXCEEDED)', 200, cy + 120);
      } else {
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(600, cy, 35, 18, Math.PI / 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isTeleporting, squeezingDb]);

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
                CONTINUOUS-VARIABLE TELEPORTATION // BRAUNSTEIN-KIMBLE (BK98)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                INFINITE-DIMENSIONAL EPR ENTANGLEMENT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Quadrature phase space (x, p) wavepacket teleportation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCvTeleportation}
            disabled={isTeleporting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTeleporting ? 'TELEPORTING CONTINUOUS WAVEPACKET...' : 'TELEPORT QUANTUM STATE (F > 0.5)'}</span>
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
              <span className="text-cyan-400 font-bold">EPR SQUEEZING: {squeezingDb} dB</span>
              <span className="text-pink-400 font-bold">FIDELITY F: {teleportFidelity}</span>
            </div>
            <div>STATUS: {teleportFidelity > 0.5 ? 'GENUINE QUANTUM TELEPORTATION (NO CLONING LIMIT EXCEEDED)' : 'CLASSICAL BOUND'}</div>
          </div>
        </div>

        {/* CV Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              EPR SQUEEZING
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Squeezing Level:</span>
              <span className="text-cyan-400 font-bold">{squeezingDb} dB</span>
            </div>
            <input
              type="range"
              min={3.0}
              max={15.0}
              step={0.5}
              value={squeezingDb}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSqueezingDb(val);
                setTeleportFidelity(+(0.5 + (val / 30) * 0.45).toFixed(2));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Infinite Dimensions:</strong> Unlike discrete qubit teleportation, continuous-variable teleportation transfers the entire infinite-dimensional continuous quadrature wavefunction (position x and momentum p) simultaneously!</div>
            <div>• <strong>Classical Benchmark:</strong> The classical teleportation limit without entanglement is F = 0.5. Reaching {'F > 0.5'} unconditionally proves genuine quantum information transfer!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
