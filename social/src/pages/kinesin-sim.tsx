import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, Layers, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function KinesinSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stepsTaken, setStepsTaken] = useState(24);
  const [stallForcePn, setStallForcePn] = useState(6.0); // 6 pN stall force
  const [stepSizeNm, setStepSizeNm] = useState(8.0); // 8 nm hand-over-hand step
  const [isWalking, setIsWalking] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  // Kinesin Hand-Over-Hand Walk Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let stepPhase = 0;

    const render = () => {
      if (isWalking) stepPhase += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const trackY = 360;

      // Dark Cytoplasmic Matrix
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Microtubule Protofilament Track (Beta-Tubulin Binding Sites)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(40, trackY); ctx.lineTo(canvas.width - 40, trackY);
      ctx.stroke();

      // Tubulin Dimer Subunits (Alternating Alpha/Beta Beads)
      for (let x = 60; x < canvas.width - 60; x += 32) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, trackY, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // Kinesin Dual Motor Head Hand-Over-Hand Stepping
      const baseFootX = 320 + Math.floor(stepPhase) * 32;
      const walkCycle = stepPhase % 1;

      // Trailing Head (Fixed to tubulin)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(baseFootX, trackY - 10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Leading Stepping Head (Swinging 180° through air)
      const swingAngle = walkCycle * Math.PI;
      const swingX = baseFootX + 32 * walkCycle;
      const swingY = trackY - 10 - Math.sin(swingAngle) * 35;

      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(swingX, swingY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Coiled-Coil Stalk connecting to Cargo Vesicle
      const stalkTopX = baseFootX + 16;
      const stalkTopY = trackY - 140;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(baseFootX, trackY - 10);
      ctx.lineTo(stalkTopX, stalkTopY);
      ctx.moveTo(swingX, swingY);
      ctx.lineTo(stalkTopX, stalkTopY);
      ctx.stroke();

      // Giant Cellular Cargo Vesicle (Top Bubble)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(stalkTopX, stalkTopY - 60, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isWalking]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-teal-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-400/40">
            <Dna className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '18s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-300 to-purple-400">
                KINESIN // HAND-OVER-HAND MOLECULAR WALKING MOTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                8 NM STEP SIZE (1 ATP / STEP)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Single-molecule kinesin neck linker docking & vesicle cargo transport for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => { uiaudio.click(); setIsWalking(!isWalking); }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-black font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isWalking ? 'PAUSE MOTOR STEPPING' : 'RESUME HAND-OVER-HAND WALK'}</span>
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
              <span className="text-teal-400 font-bold">STEP SIZE: {stepSizeNm} nm</span>
              <span className="text-pink-400 font-bold">STALL FORCE: {stallForcePn} pN</span>
            </div>
            <div>STATUS: PROCESSIVE UNIDIRECTIONAL TRANSPORT</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            MOTOR BIOMECHANICS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Processivity:</strong> Takes hundreds of steps without detaching from the microtubule track.</div>
            <div>• <strong>Power Stroke:</strong> ATP binding drives neck linker zippering to swing the partner head forward by exactly 16 nm (8 nm center-of-mass translation).</div>
          </div>
        </div>
      </div>
    </div>
  );
}
