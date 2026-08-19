import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Box, Layers
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function GaugeColorCode() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [codeDistanceD, setCodeDistanceD] = useState(5); // d = 5 3D gauge color code
  const [gaugeMode, setGaugeMode] = useState<'3D_Gauge_Fixed' | 'Transversal_T_Gate' | 'Clifford_Hadamard'>('Transversal_T_Gate');
  const [isFixingGauge, setIsFixingGauge] = useState(false);
  const [logicalErrorRate, setLogicalErrorRate] = useState(0.00012); // 1.2e-4 logical error rate

  const animFrameRef = useRef<number | null>(null);

  const triggerTransversalTGate = () => {
    uiaudio.warp();
    setIsFixingGauge(true);

    setTimeout(() => {
      setIsFixingGauge(false);
      setLogicalErrorRate(0.000004);
      uiaudio.success();
    }, 750);
  };

  // 3D Gauge Color Code 3D Octahedral/Tetrahedral Cell Canvas
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

      // Rotating 3D Gauge Color Code Polyhedral Cell
      const angle = time * 0.4;

      // 4-Colorable Faces (Red, Green, Blue, Yellow)
      const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b'];

      for (let f = 0; f < 4; f++) {
        const faceAngle = angle + (f * Math.PI) / 2;
        const x1 = cx + Math.cos(faceAngle) * 90;
        const y1 = cy + Math.sin(faceAngle) * 45 - 30;
        const x2 = cx + Math.cos(faceAngle + Math.PI / 2) * 90;
        const y2 = cy + Math.sin(faceAngle + Math.PI / 2) * 45 - 30;
        const x3 = cx;
        const y3 = cy + 70;

        ctx.fillStyle = colors[f];
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = colors[f];
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Qubits at Vertices (Glowing Cyan)
      for (let v = 0; v < 4; v++) {
        const vAngle = angle + (v * Math.PI) / 2;
        const vx = cx + Math.cos(vAngle) * 90;
        const vy = cy + Math.sin(vAngle) * 45 - 30;

        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = isFixingGauge ? 22 : 8;
        ctx.beginPath();
        ctx.arc(vx, vy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `3D GAUGE COLOR CODE: DISTANCE d = ${codeDistanceD} | MODE: ${gaugeMode} | LOGICAL ERROR P_L = ${(logicalErrorRate * 100).toFixed(5)}% (TRANSVERSAL T-GATE)`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [codeDistanceD, gaugeMode, logicalErrorRate, isFixingGauge]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Box className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">
                3D GAUGE COLOR CODE // FAULT-TOLERANT TRANSVERSAL T-GATES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                BOMBIN & KUBICA (PERIMETER INSTITUTE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Transversal non-Clifford T-gates & gauge fixing without distillation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerTransversalTGate}
            disabled={isFixingGauge}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isFixingGauge ? 'APPLYING TRANSVERSAL T-ROTATION...' : 'EXECUTE TRANSVERSAL T-GATE (π/8)'}</span>
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
              <span className="text-emerald-400 font-bold">DISTANCE: d = {codeDistanceD}</span>
              <span className="text-cyan-400 font-bold">MODE: {gaugeMode}</span>
              <span className="text-pink-400 font-bold">P_L: {(logicalErrorRate * 100).toFixed(5)}%</span>
            </div>
            <div>STATUS: ZERO DISTILLATION OVERHEAD FAULT-TOLERANCE</div>
          </div>
        </div>

        {/* Gauge Color Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CODE DISTANCE (d)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Code Distance:</span>
              <span className="text-emerald-400 font-bold">d = {codeDistanceD}</span>
            </div>
            <input
              type="range"
              min={3}
              max={11}
              step={2}
              value={codeDistanceD}
              onChange={(e) => {
                const d = Number(e.target.value);
                setCodeDistanceD(d);
                setLogicalErrorRate(+(0.01 ** (d / 2)).toFixed(6));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Transversal Non-Clifford T-Gates:</strong> The 3D gauge color code evades the Eastin-Knill theorem by using gauge fixing to dynamically switch stabilizer branches, enabling 100% transversal T-gates!</div>
            <div>• <strong>Eliminates Distillation Factories:</strong> Completely bypasses costly 15-to-1 magic state distillation factories, reducing physical qubit counts by over 90%!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
