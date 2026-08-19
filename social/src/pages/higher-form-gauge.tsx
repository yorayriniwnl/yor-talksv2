import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HigherFormGauge() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gaugeFormOrder, setGaugeFormOrder] = useState<1 | 2>(1); // 1-Form (String operators) or 2-Form (Membrane operators)
  const [symmetryType, setSymmetryType] = useState<'Z2_Symmetry' | 'Non_Invertible_Duality'>('Z2_Symmetry');
  const [isBraiding, setIsBraiding] = useState(false);
  const [transversalCczFidelity, setTransversalCczFidelity] = useState(0.9998);

  const animFrameRef = useRef<number | null>(null);

  const triggerHigherFormBraiding = () => {
    uiaudio.warp();
    setIsBraiding(true);

    setTimeout(() => {
      setIsBraiding(false);
      setTransversalCczFidelity(0.99996);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setTransversalCczFidelity(0.9998);
    setIsBraiding(false);
  };

  // 3D Higher-Form Gauge Symmetry & Non-Invertible Membrane Canvas
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

      // Draw 3D Cubic Foliated Gauge Cells
      const rot = time * 0.25;
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            const px = cx + (x * 45 - y * 45) * Math.cos(rot * 0.3);
            const py = cy + (x * 22 + y * 22) - z * 35;

            // Gauge Node
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw 1-Form (String) or 2-Form (Membrane) Generalized Defect
      if (gaugeFormOrder === 1) {
        // 1-Form Closed String Loop
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = isBraiding ? 24 : 10;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 90, 45, rot, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // 2-Form Transversal Membrane Surface
        ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = isBraiding ? 24 : 10;
        ctx.beginPath();
        ctx.moveTo(cx - 80, cy - 40);
        ctx.lineTo(cx + 80, cy - 40);
        ctx.lineTo(cx + 40, cy + 50);
        ctx.lineTo(cx - 120, cy + 50);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `HIGHER-FORM GAUGE: ${gaugeFormOrder}-FORM ${symmetryType} | TRANSVERSAL CCZ FIDELITY = ${(transversalCczFidelity * 100).toFixed(3)}%`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gaugeFormOrder, symmetryType, transversalCczFidelity, isBraiding]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Layers className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                HIGHER-FORM GAUGE // GENERALIZED TOPOLOGICAL SYMMETRY QC
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                GAIOTTO & SEIBERG (IAS PRINCETON)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              1-form strings, 2-form membranes & non-Clifford transversal CCZ gates for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerHigherFormBraiding}
            disabled={isBraiding}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBraiding ? 'BRAIDING HIGHER-FORM DEFECTS...' : 'BRAID TOPOLOGICAL DEFECTS'}</span>
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
              <span className="text-cyan-400 font-bold">SYMMETRY: {gaugeFormOrder}-Form {symmetryType}</span>
              <span className="text-pink-400 font-bold">OPERATORS: {gaugeFormOrder === 1 ? 'String Loops' : 'Membrane Surfaces'}</span>
              <span className="text-emerald-400 font-bold">CCZ FIDELITY: {(transversalCczFidelity * 100).toFixed(3)}%</span>
            </div>
            <div>STATUS: NON-CLIFFORD TRANSVERSAL GATES ENABLED</div>
          </div>
        </div>

        {/* Higher-Form Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            HIGHER-FORM ORDER
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setGaugeFormOrder(1);
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                gaugeFormOrder === 1 ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">1-Form String Operators</div>
              <div className="text-[10px] text-zinc-400">Closed 1D loop symmetry defects</div>
            </button>

            <button
              onClick={() => {
                setGaugeFormOrder(2);
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                gaugeFormOrder === 2 ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">2-Form Membrane Operators</div>
              <div className="text-[10px] text-zinc-400">2D transversal sheet symmetry defects</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Generalized Symmetries:</strong> Traditional 0-form symmetries act on points, whereas $p$-form symmetries act on $p$-dimensional closed sub-manifolds!</div>
            <div>• <strong>Transversal Non-Clifford CCZ:</strong> 3D foliated higher-form gauge architectures implement universal non-Clifford 3-qubit CCZ gates transversally without state distillation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
