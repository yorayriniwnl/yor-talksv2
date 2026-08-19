import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, GitFork
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TtnPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [treeBondDimensionChi, setTreeBondDimensionChi] = useState(16); // chi = 16 Tree bond dimension
  const [hierarchicalTreeDepth, setHierarchicalTreeDepth] = useState(3); // depth = 3 binary tree
  const [isPurifyingTree, setIsPurifyingTree] = useState(false);
  const [purifiedTreeFidelity, setPurifiedTreeFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerTreePurification = () => {
    uiaudio.warp();
    setIsPurifyingTree(true);

    setTimeout(() => {
      setIsPurifyingTree(false);
      setPurifiedTreeFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Hierarchical Tree Tensor Network (TTN) Disentangling Canvas
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

      // Hierarchical Binary Tree Network (Left: 70 to 270)
      // Level 0: Root at (170, cy - 60)
      // Level 1: Left (120, cy), Right (220, cy)
      // Level 2: Leaves (95, cy + 50), (145, cy + 50), (195, cy + 50), (245, cy + 50)
      const root = { x: 170, y: cy - 60 };
      const l1 = [
        { x: 120, y: cy - 5 },
        { x: 220, y: cy - 5 },
      ];
      const l2 = [
        { x: 95, y: cy + 50 },
        { x: 145, y: cy + 50 },
        { x: 195, y: cy + 50 },
        { x: 245, y: cy + 50 },
      ];

      // Draw Tree Isometry Branches
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;

      // Root to Level 1
      l1.forEach(child => {
        ctx.beginPath();
        ctx.moveTo(root.x, root.y); ctx.lineTo(child.x, child.y);
        ctx.stroke();
      });

      // Level 1 to Level 2
      ctx.beginPath();
      ctx.moveTo(l1[0].x, l1[0].y); ctx.lineTo(l2[0].x, l2[0].y);
      ctx.moveTo(l1[0].x, l1[0].y); ctx.lineTo(l2[1].x, l2[1].y);
      ctx.moveTo(l1[1].x, l1[1].y); ctx.lineTo(l2[2].x, l2[2].y);
      ctx.moveTo(l1[1].x, l1[1].y); ctx.lineTo(l2[3].x, l2[3].y);
      ctx.stroke();

      // Physical Legs extending from leaves
      l2.forEach(leaf => {
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leaf.x, leaf.y); ctx.lineTo(leaf.x, leaf.y + 20);
        ctx.stroke();

        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(leaf.x, leaf.y + 20, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Tree Isometry Nodes
      [root, ...l1, ...l2].forEach((node, idx) => {
        ctx.fillStyle = idx === 0 ? '#f59e0b' : '#1e1b4b';
        ctx.strokeStyle = idx === 0 ? '#f59e0b' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, idx === 0 ? 10 : 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TREE TENSOR NETWORK (TTN)', 90, cy + 90);

      // Hierarchical Disentangler Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isPurifyingTree ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TTN DISENTANGLER', 324, cy - 12);
      ctx.fillText('O(log N) DEPTH', 330, cy + 8);

      // Purified Tree State Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingTree ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('HIERARCHICAL ISOMETRY', 492, cy - 35);
      ctx.fillText('LOG-DEPTH ENTANGLEMENT', 488, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedTreeFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `TTN PURIFIER QEM: BOND DIMENSION χ = ${treeBondDimensionChi} | DEPTH = ${hierarchicalTreeDepth} | FIDELITY = ${(purifiedTreeFidelity * 100).toFixed(2)}% (TAGLIACOZZO & VIDAL)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [treeBondDimensionChi, hierarchicalTreeDepth, purifiedTreeFidelity, isPurifyingTree]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <GitFork className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-sky-300 to-pink-400">
                TTN PURIFIER QEM // TREE TENSOR DISENTANGLER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                TAGLIACOZZO, ORÚS & VIDAL (BARCELONA & PERIMETER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Hierarchical tree tensor networks & logarithmic depth entanglement purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerTreePurification}
            disabled={isPurifyingTree}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingTree ? 'DISENTANGLING HIERARCHICAL TREE...' : 'PURIFY VIA TTN ISOMETRIES'}</span>
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
              <span className="text-purple-400 font-bold">TREE BOND DIMENSION: χ = {treeBondDimensionChi}</span>
              <span className="text-cyan-400 font-bold">HIERARCHY DEPTH: {hierarchicalTreeDepth}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedTreeFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: HIERARCHICAL TREE ISOMETRY CANONICALIZED</div>
          </div>
        </div>

        {/* TTN Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TREE BOND (χ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Virtual Tree Bond:</span>
              <span className="text-purple-400 font-bold">χ = {treeBondDimensionChi}</span>
            </div>
            <input
              type="range"
              min={4}
              max={32}
              step={4}
              value={treeBondDimensionChi}
              onChange={(e) => setTreeBondDimensionChi(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Logarithmic Scaling:</strong> Tree Tensor Networks (TTN) capture long-range multipartite entanglement with $O(\log N)$ contraction depth, circumventing MPS linear entanglement bottlenecks!</div>
            <div>• <strong>Multi-Scale Density Filtering:</strong> Isometries across hierarchical tree layers filter local dephasing channels while preserving scale-invariant critical correlations!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
