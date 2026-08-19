import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Network, Share2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function GraphWalk() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [graphType, setGraphType] = useState<'hypercube' | 'lattice' | 'tree'>('hypercube');
  const [isQuantum, setIsQuantum] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  const toggleQuantumWalk = () => {
    uiaudio.warp();
    setIsQuantum(prev => !prev);
    setTimeout(() => {
      uiaudio.success();
    }, 700);
  };

  // Quantum vs Classical Walk on Graph Topology Canvas
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

      // Dark Quantum Graph Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw 3D Hypercube (Tesseract / Q3 graph) Nodes & Edges
      const nodes = [
        { x: cx - 120, y: cy - 90 }, { x: cx + 40, y: cy - 90 },
        { x: cx + 120, y: cy + 10 }, { x: cx - 40, y: cy + 10 },
        { x: cx - 80, y: cy - 30 }, { x: cx + 80, y: cy - 30 },
        { x: cx + 160, y: cy + 70 }, { x: cx, y: cy + 70 },
      ];

      // Draw Graph Edges (Cyan/Purple Matrix Lines)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      // Outer square
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(nodes[1].x, nodes[1].y);
      ctx.lineTo(nodes[2].x, nodes[2].y); ctx.lineTo(nodes[3].x, nodes[3].y);
      ctx.closePath();
      ctx.stroke();

      // Inner square
      ctx.beginPath();
      ctx.moveTo(nodes[4].x, nodes[4].y); ctx.lineTo(nodes[5].x, nodes[5].y);
      ctx.lineTo(nodes[6].x, nodes[6].y); ctx.lineTo(nodes[7].x, nodes[7].y);
      ctx.closePath();
      ctx.stroke();

      // Connecting ribs
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[i + 4].x, nodes[i + 4].y);
        ctx.stroke();
      }

      // Draw Quantum Amplitude Superposition (All nodes lit up quadratically faster) vs Classical
      nodes.forEach((n, idx) => {
        let prob = 0;
        if (isQuantum) {
          // Ballistic Quantum Wave Interference Superposition
          prob = 0.5 + 0.5 * Math.sin(time * 3 + idx * 0.8);
        } else {
          // Classical Diffusive Markov Walk (Slow Gaussian spreading)
          prob = idx === 0 ? 0.8 : 0.15;
        }

        ctx.fillStyle = isQuantum ? '#38bdf8' : '#f59e0b';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = prob * 20;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 8 + prob * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`v${idx}`, n.x - 6, n.y - 14);
      });

      ctx.fillStyle = isQuantum ? '#06b6d4' : '#f59e0b';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        isQuantum ? 'QUANTUM BALLISTIC WALK: O(√N) QUADRATIC SPEEDUP (GROVER SEARCH)' : 'CLASSICAL MARKOV RANDOM WALK: DIFFUSIVE O(N) SPREADING',
        100,
        cy + 130
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isQuantum, graphType]);

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
                QUANTUM GRAPH WALK // BALLISTIC SPEEDUP & SPATIAL SEARCH
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                O(√N) GROVER TOPOLOGY SEARCH
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Continuous & discrete-time quantum walk on hypercube graphs for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleQuantumWalk}
            className={cn(
              "px-6 py-3 rounded-xl font-bold shadow-lg flex items-center space-x-2 transition-all",
              isQuantum ? "bg-cyan-600 text-white shadow-cyan-500/30" : "bg-gradient-to-r from-amber-500 to-yellow-600 text-black"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>{isQuantum ? 'QUANTUM BALLISTIC WALK (SPEEDUP ON)' : 'SWITCH TO QUANTUM SPEEDUP'}</span>
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
              <span className="text-cyan-400 font-bold">GRAPH: 3D HYPERCUBE Q3</span>
              <span className="text-pink-400 font-bold">PROPAGATION: {isQuantum ? 'BALLISTIC (σ ∝ t)' : 'DIFFUSIVE (σ ∝ √t)'}</span>
            </div>
            <div>STATUS: {isQuantum ? 'GROVER SPATIAL AMPLIFICATION ACTIVE' : 'MARKOV CHAIN DIFFUSION'}</div>
          </div>
        </div>

        {/* Quantum Graph Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            GRAPH ALGORITHMS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Ballistic vs Diffusive:</strong> Classical random walks spread like √t due to random collisions. Quantum walks spread linearly with time (t) due to coherent wave interference!</div>
            <div>• <strong>Spatial Database Search:</strong> Quantum walks on graph topologies achieve optimal O(√N) speedup to find marked vertices across unsorted networks!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
