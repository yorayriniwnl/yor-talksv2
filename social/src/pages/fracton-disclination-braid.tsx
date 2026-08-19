import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, GitCommit
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonDisclinationBraid() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [disclinationDeficitAngleTheta, setDisclinationDeficitAngleTheta] = useState(60); // θ = 60° Frank vector deficit
  const [braidExchangeStepsCount, setBraidExchangeStepsCount] = useState(4); // 4 braiding steps
  const [isBraidingDisclinations, setIsBraidingDisclinations] = useState(false);
  const [topologicalGateFidelity, setTopologicalGateFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerDisclinationBraiding = () => {
    uiaudio.warp();
    setIsBraidingDisclinations(true);

    setTimeout(() => {
      setIsBraidingDisclinations(false);
      setTopologicalGateFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton Non-Abelian Disclination Vortex Braiding Canvas
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

      // Hexagonal Lattice with Disclination Defect (Left: 80 to 260)
      const numRings = 3;
      for (let r = 1; r <= numRings; r++) {
        const rad = r * 28;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a / 6) * Math.PI * 2;
          const px = 170 + Math.cos(angle) * rad;
          const py = cy - 5 + Math.sin(angle) * rad;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 2 Braiding Disclination Anyons (Cyan & Pink)
      const braidAngle = isBraidingDisclinations ? time * 4 : 0;
      const d1x = 170 + Math.cos(braidAngle) * 35;
      const d1y = cy - 5 + Math.sin(braidAngle) * 35;
      const d2x = 170 - Math.cos(braidAngle) * 35;
      const d2y = cy - 5 - Math.sin(braidAngle) * 35;

      // Disclination 1
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(d1x, d1y, 7, 0, Math.PI * 2);
      ctx.fill();

      // Disclination 2
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(d2x, d2y, 7, 0, Math.PI * 2);
      ctx.fill();

      // Non-Abelian Holonomy Trajectory
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(170, cy - 5, 35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DISCLINATION ANYON BRAID', 90, cy + 90);

      // Non-Abelian Gate Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isBraidingDisclinations ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('HOLONOMY BRAID', 324, cy - 12);
      ctx.fillText('NON-ABELIAN U(θ)', 320, cy + 8);

      // Topological Gate Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isBraidingDisclinations ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TOPOLOGICAL GATE SYNTHESIS', 484, cy - 35);
      ctx.fillText('CLIFFORD + T-GATE LOGIC', 488, cy - 10);
      ctx.fillText(`GATE FIDELITY = ${(topologicalGateFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DISCLINATION BRAIDING: DEFICIT ANGLE θ = ${disclinationDeficitAngleTheta}° | BRAID STEPS = ${braidExchangeStepsCount} | FIDELITY = ${(topologicalGateFidelity * 100).toFixed(2)}% (BARKESHLI & RADZIHOVSKY)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [disclinationDeficitAngleTheta, braidExchangeStepsCount, topologicalGateFidelity, isBraidingDisclinations]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Orbit className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                DISCLINATION BRAIDING // NON-ABELIAN HOLONOMY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                BARKESHLI, RADZIHOVSKY & PRETKO (UMD & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Elasticity fracton non-abelian disclination anyon braiding for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerDisclinationBraiding}
            disabled={isBraidingDisclinations}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBraidingDisclinations ? 'BRAIDING DISCLINATIONS...' : 'EXECUTE NON-ABELIAN BRAID'}</span>
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
              <span className="text-pink-400 font-bold">DEFICIT ANGLE: θ = {disclinationDeficitAngleTheta}°</span>
              <span className="text-cyan-400 font-bold">EXCHANGES: {braidExchangeStepsCount}</span>
              <span className="text-emerald-400 font-bold">GATE FIDELITY: {(topologicalGateFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-ABELIAN DISCLINATION UNITARY SYNTHESIZED</div>
          </div>
        </div>

        {/* Braiding Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DEFICIT ANGLE (θ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Frank Vector Deficit:</span>
              <span className="text-pink-400 font-bold">{disclinationDeficitAngleTheta}°</span>
            </div>
            <input
              type="range"
              min={30}
              max={120}
              step={30}
              value={disclinationDeficitAngleTheta}
              onChange={(e) => setDisclinationDeficitAngleTheta(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Non-Abelian Disclination Statistics:</strong> In elasticity fracton dualities, disclinations act as non-abelian anyons carrying Frank vector angular deficit charges!</div>
            <div>• <strong>Geometric Holonomy Gates:</strong> Adiabatically exchanging disclinations around dislocations generates non-commutative geometric phase rotations for universal fault-tolerant quantum logic!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
