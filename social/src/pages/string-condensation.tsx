import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Network
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function StringCondensation() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [condensateTensionH, setCondensateTensionH] = useState(0.45); // String tension h (transition at h_c = 1.0)
  const [gaugeCouplingJ, setGaugeCouplingJ] = useState(1.0); // Z_2 gauge coupling
  const [isCondensing, setIsCondensing] = useState(false);
  const [topologicalOrderPhase, setTopologicalOrderPhase] = useState<'Z2_Deconfined_Toric' | 'Confined_Insulator'>('Z2_Deconfined_Toric');

  const animFrameRef = useRef<number | null>(null);

  const triggerStringCondensation = () => {
    uiaudio.warp();
    setIsCondensing(true);

    setTimeout(() => {
      setIsCondensing(false);
      setCondensateTensionH(1.4);
      setTopologicalOrderPhase('Confined_Insulator');
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setCondensateTensionH(0.45);
    setTopologicalOrderPhase('Z2_Deconfined_Toric');
    setIsCondensing(false);
  };

  // 3D Anyonic String-Net Condensation Canvas
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

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw 3D Isometric Gauge Lattice Net
      const rot = time * 0.25;
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            const px = cx + (x * 45 - y * 45) * Math.cos(rot * 0.3);
            const py = cy + (x * 22 + y * 22) - z * 35;

            // Gauge Vertex
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw Condensing Magnetic Flux Loops (String-Net)
      const isDeconfined = condensateTensionH < 1.0;
      ctx.strokeStyle = isDeconfined ? '#38bdf8' : '#ef4444';
      ctx.lineWidth = isDeconfined ? 3 : 5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = isCondensing ? 25 : 12;

      // Closed Loop String Excitations
      for (let l = 0; l < 3; l++) {
        ctx.beginPath();
        ctx.ellipse(cx + (l - 1) * 60, cy, 45, 25, rot + l * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `STRING CONDENSATION: PHASE = ${isDeconfined ? 'Z₂ DECONFINED TOPOLOGICAL' : 'TRIVIAL CONFINED INSULATOR'} (TENSION h = ${condensateTensionH.toFixed(2)})`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [condensateTensionH, gaugeCouplingJ, isCondensing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Network className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                STRING CONDENSATION // 3D TOPOLOGICAL PHASE TRANSITION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LEVIN & WEN / KITAEV (MIT & CALTECH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Gauge flux loop condensation & topological quantum order breakdown for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerStringCondensation}
            disabled={isCondensing || condensateTensionH > 1.0}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCondensing ? 'CONDENSING FLUX LOOPS...' : 'DRIVE STRING CONDENSATION'}</span>
          </button>

          {condensateTensionH > 1.0 && (
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
              <span className="text-cyan-400 font-bold">TENSION: h = {condensateTensionH.toFixed(2)}</span>
              <span className="text-pink-400 font-bold">PHASE: {topologicalOrderPhase}</span>
              <span className="text-emerald-400 font-bold">GAUGE: Z₂ GAUGE FIELD</span>
            </div>
            <div>STATUS: {condensateTensionH < 1.0 ? 'TOPOLOGICAL DECONFINED MEMORY PRESERVED' : 'CONFINED INSULATOR PHASE'}</div>
          </div>
        </div>

        {/* String Condensation Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              STRING TENSION (h)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Magnetic String Tension:</span>
              <span className="text-cyan-400 font-bold">h = {condensateTensionH.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={2.0}
              step={0.05}
              value={condensateTensionH}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCondensateTensionH(val);
                setTopologicalOrderPhase(val < 1.0 ? 'Z2_Deconfined_Toric' : 'Confined_Insulator');
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Anyonic String-Net Mechanism:</strong> Topological order in gauge models arises from fluctuating closed loop strings of magnetic flux!</div>
            <div>• <strong>Phase Breakdown at Criticality:</strong> Increasing transverse magnetic fields drives a phase transition where flux loops condense, destroying ground state topological degeneracy!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
