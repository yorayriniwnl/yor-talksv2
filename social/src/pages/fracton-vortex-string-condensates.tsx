import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, GitCommit
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonVortexStringCondensates() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [vortexStringTensionJ, setVortexStringTensionJ] = useState(3.2); // J = 3.2 string tension
  const [dualInsulatorPurity, setDualInsulatorPurity] = useState(0.988);
  const [isCondensingVortexStrings, setIsCondensingVortexStrings] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerVortexStringCondensation = () => {
    uiaudio.warp();
    setIsCondensingVortexStrings(true);

    setTimeout(() => {
      setIsCondensingVortexStrings(false);
      setDualInsulatorPurity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton Lineon Vortex String Condensate Canvas
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

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Lineon 1D Vortex String Lines (Left: 80 to 240)
      const numStrings = 4;
      for (let s = 0; s < numStrings; s++) {
        const sx = 95 + s * 35;
        const stringPhase = Math.sin(time * 3 + s) * 8;

        // Vertical 1D Lineon Vortex Tube (Cyan Glow)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx + stringPhase, cy - 60);
        ctx.lineTo(sx - stringPhase, cy + 60);
        ctx.stroke();

        // Sub-Dimensional Lineon Quasiparticle Node moving along string
        const nodeY = cy + Math.sin(time * 4 + s * 1.5) * 45;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sx, nodeY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('1D LINEON VORTEX STRINGS', 70, cy + 90);

      // Condensation Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isCondensingVortexStrings ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('STRING CONDENSATE', 320, cy - 12);
      ctx.fillText('DUAL RANK-2 INSULATOR', 302, cy + 8);

      // Dual Rank-2 Topological Phase Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isCondensingVortexStrings ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DUAL TOPOLOGICAL INSULATOR', 482, cy - 35);
      ctx.fillText('GAPLESS 2D BOUNDARY MODES', 480, cy - 10);
      ctx.fillText(`DUAL PURITY = ${(dualInsulatorPurity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `VORTEX STRING CONDENSATE: TENSION J = ${vortexStringTensionJ.toFixed(1)} | DUAL PURITY = ${(dualInsulatorPurity * 100).toFixed(2)}% (PRETKO, RADZIHOVSKY & SENTHIL)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [vortexStringTensionJ, dualInsulatorPurity, isCondensingVortexStrings]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <GitCommit className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                VORTEX STRINGS // DUAL RANK-2 SUPERFLUID CONDENSATES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PRETKO, RADZIHOVSKY & SENTHIL (HARVARD, MIT & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              1D lineon vortex string loop condensation into dual rank-2 topological insulators for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerVortexStringCondensation}
            disabled={isCondensingVortexStrings}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCondensingVortexStrings ? 'CONDENSING VORTEX LOOPS...' : 'CONDENSE VORTEX STRINGS'}</span>
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
              <span className="text-cyan-400 font-bold">STRING TENSION: J = {vortexStringTensionJ.toFixed(1)}</span>
              <span className="text-pink-400 font-bold">STATE: DUAL TOPOLOGICAL</span>
              <span className="text-emerald-400 font-bold">PURITY: {(dualInsulatorPurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: 1D LINEON VORTEX STRING CONDENSATION CONVERGED</div>
          </div>
        </div>

        {/* Condensation Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              STRING TENSION (J)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Vortex Line Tension:</span>
              <span className="text-cyan-400 font-bold">J = {vortexStringTensionJ.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={6.0}
              step={0.2}
              value={vortexStringTensionJ}
              onChange={(e) => setVortexStringTensionJ(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>1D Lineon Vortex Condensation:</strong> Proliferating 1D lineon vortex strings destroys the tensor superfluid phase, driving a transition to a dual rank-2 topological insulator!</div>
            <div>• <strong>Gapless Planon Surface States:</strong> Gapped in the 3D bulk, the dual insulator exhibits protected 2D gapless boundary modes with sub-dimensional mobility!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
