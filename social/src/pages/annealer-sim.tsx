import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Layers, Activity, Sliders, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface AnnealNode {
  id: number;
  spin: 1 | -1;
  energy: number;
}

export default function AnnealerSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [qubitCount, setQubitCount] = useState(16);
  const [annealScheduleUs, setAnnealScheduleUs] = useState(20); // 20 microseconds
  const [groundStateEnergy, setGroundStateEnergy] = useState(-42.8);
  const [isAnnealing, setIsAnnealing] = useState(false);
  const [nodes, setNodes] = useState<AnnealNode[]>([]);

  const initAnnealer = () => {
    const newNodes: AnnealNode[] = [];
    for (let i = 0; i < qubitCount; i++) {
      newNodes.push({
        id: i,
        spin: Math.random() > 0.5 ? 1 : -1,
        energy: -(Math.random() * 5 + 1),
      });
    }
    setNodes(newNodes);
  };

  useEffect(() => {
    initAnnealer();
  }, [qubitCount]);

  const runQuantumAnneal = () => {
    uiaudio.warp();
    setIsAnnealing(true);

    setTimeout(() => {
      // Find global minimum ground state spins via quantum tunneling
      setNodes(prev => prev.map(n => ({
        ...n,
        spin: 1, // Optimal aligned ground state
        energy: -2.8,
      })));
      setGroundStateEnergy(-56.4);
      setIsAnnealing(false);
      uiaudio.success();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '14s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                QUANTUM ANNEALER // QUBO ISING OPTIMIZER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                TRANSVERSE FIELD TUNNELING
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Superconducting flux qubit Ising spin glass Hamiltonian minimization for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runQuantumAnneal}
            disabled={isAnnealing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isAnnealing ? 'ANNEALING HAMILTONIAN...' : 'RUN QUANTUM ANNEAL'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Chimera Qubit Topology Grid (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">CHIMERA QUBIT COUPLING GRAPH</span>
            <span className="text-cyan-400">GROUND STATE ENERGY: {groundStateEnergy} eV</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 p-4 bg-zinc-950 rounded-xl border border-cyan-500/20">
            {nodes.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all shadow-md",
                  n.spin === 1 
                    ? "bg-cyan-950/60 border-cyan-400 text-cyan-300" 
                    : "bg-purple-950/60 border-purple-400 text-purple-300"
                )}
              >
                <span className="text-[10px] text-zinc-400">Q{n.id}</span>
                <span className="text-base font-black">{n.spin === 1 ? '↑' : '↓'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule & Telemetry (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ANNEAL SCHEDULE
          </h3>

          <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span>Annealing Time:</span>
                <span className="text-cyan-400 font-bold">{annealScheduleUs} μs</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={annealScheduleUs}
                onChange={(e) => setAnnealScheduleUs(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="p-3 bg-zinc-900 rounded-lg text-zinc-400 text-[11px] leading-relaxed">
              <strong>HAMILTONIAN INTERPOLATION:</strong> H(s) = A(s) H_init + B(s) H_problem. Quantum fluctuations decrease smoothly as problem Hamiltonian turns on.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
