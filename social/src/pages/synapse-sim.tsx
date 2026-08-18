import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, Layers, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Vesicle {
  x: number;
  y: number;
  color: string;
  released: boolean;
}

export default function SynapseSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [neurotransmitter, setNeurotransmitter] = useState<'DOPAMINE' | 'SEROTONIN' | 'GABA'>('DOPAMINE');
  const [calciumLevel, setCalciumLevel] = useState(78);
  const [epspsMillivolts, setEpspsMillivolts] = useState(14.2);

  const vesiclesRef = useRef<Vesicle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const triggerActionPotential = () => {
    uiaudio.warp();
    const colors = neurotransmitter === 'DOPAMINE' ? '#06b6d4' : (neurotransmitter === 'SEROTONIN' ? '#ec4899' : '#10b981');
    const newVesicles: Vesicle[] = [];

    for (let i = 0; i < 35; i++) {
      newVesicles.push({
        x: 100 + Math.random() * 540,
        y: 140 + Math.random() * 40,
        color: colors,
        released: true,
      });
    }
    vesiclesRef.current = newVesicles;
  };

  // Synapse Simulation Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Fluid Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Presynaptic Axon Terminal Membrane (Top Arc)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 120);
      ctx.bezierCurveTo(200, 160, 540, 160, canvas.width, 120);
      ctx.lineTo(canvas.width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Postsynaptic Dendritic Spine Membrane (Bottom Arc - 20nm Synaptic Cleft)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 360);
      ctx.bezierCurveTo(200, 320, 540, 320, canvas.width, 360);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Update & Draw Diffusing Vesicles / Neurotransmitter Molecules
      vesiclesRef.current.forEach((v) => {
        v.y += Math.random() * 2 + 1; // Brownian diffusion downwards
        v.x += (Math.random() - 0.5) * 4;

        ctx.fillStyle = v.color;
        ctx.shadowColor = v.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Filter out reached vesicles
      vesiclesRef.current = vesiclesRef.current.filter(v => v.y < 340);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [neurotransmitter]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-teal-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-400/40">
            <Dna className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '16s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-indigo-300 to-pink-400">
                SYNAPSE // NEUROTRANSMITTER VESICLE DIFFUSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                20NM SYNAPTIC CLEFT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              SNARE complex vesicle exocytosis & ligand-gated postsynaptic potentials for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerActionPotential}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>TRIGGER ACTION POTENTIAL</span>
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
              <span className="text-teal-400 font-bold">CALCIUM INFLUX (Ca²⁺): {calciumLevel}%</span>
              <span className="text-pink-400 font-bold">EPSP: +{epspsMillivolts} mV</span>
            </div>
            <div>POSTSYNAPTIC RECEPTORS ACTIVE</div>
          </div>
        </div>

        {/* Neurotransmitter Selector (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            NEUROTRANSMITTER
          </h3>

          <div className="space-y-2">
            {(['DOPAMINE', 'SEROTONIN', 'GABA'] as const).map((nt) => (
              <button
                key={nt}
                onClick={() => { uiaudio.click(); setNeurotransmitter(nt); }}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl font-bold uppercase transition-all border",
                  neurotransmitter === nt 
                    ? "bg-teal-500 text-black border-teal-400 shadow-md" 
                    : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/15"
                )}
              >
                {nt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
