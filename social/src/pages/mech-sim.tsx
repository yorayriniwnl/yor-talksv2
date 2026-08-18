import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Sliders, Play, Pause, RotateCcw, Zap, 
  Activity, ShieldCheck, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MechSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mechMassKg, setMechMassKg] = useState(4500); // 4.5 tons
  const [zmpOffsetMm, setZmpOffsetMm] = useState(12); // mm
  const [stabilityMargin, setStabilityMargin] = useState(98.2); // %
  const [isWalking, setIsWalking] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  const applyPerturbation = () => {
    uiaudio.warp();
    setZmpOffsetMm(Math.floor((Math.random() - 0.5) * 80));
    setStabilityMargin(82.4);
    setTimeout(() => {
      setZmpOffsetMm(12);
      setStabilityMargin(98.2);
    }, 1200);
  };

  // Mech Inverse Kinematics & ZMP Balance Canvas
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
      const groundY = 400;

      // Dark Hangar Grid
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Floor Line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, groundY); ctx.lineTo(canvas.width - 60, groundY);
      ctx.stroke();

      // Zero Moment Point (ZMP) Stability Footprint on Floor
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx + zmpOffsetMm, groundY, 45, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center of Mass Sway (LIPM Inverted Pendulum)
      const swayX = Math.sin(time * 2) * 15;
      const hipY = 220 + Math.abs(Math.sin(time * 4)) * 6;

      // Draw 2 Bipedal Robotic Legs
      // Left Leg
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 25 + swayX, hipY);
      ctx.lineTo(cx - 35 + Math.sin(time * 2) * 20, 310);
      ctx.lineTo(cx - 40, groundY);
      ctx.stroke();

      // Right Leg
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx + 25 + swayX, hipY);
      ctx.lineTo(cx + 35 - Math.sin(time * 2) * 20, 310);
      ctx.lineTo(cx + 40, groundY);
      ctx.stroke();

      // Mech Armored Torso / Cockpit
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(cx - 45 + swayX, hipY - 90, 90, 90, 12);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pilot Visor
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(cx - 25 + swayX, hipY - 70, 50, 15);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [zmpOffsetMm]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Bot className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                CYBER MECH // BIPEDAL LIPM BALANCE KINEMATICS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ZERO MOMENT POINT (ZMP)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              4.5-Ton humanoid bipedal gait trajectory generation & push recovery for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={applyPerturbation}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>APPLY LATERAL PUSH IMPULSE</span>
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
              <span className="text-cyan-400 font-bold">MECH MASS: {mechMassKg} KG</span>
              <span className="text-purple-400 font-bold">STABILITY MARGIN: {stabilityMargin}%</span>
            </div>
            <div>STATUS: ZMP STABILITY ENVELOPE LOCKED</div>
          </div>
        </div>

        {/* Balance Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ROBOTIC GAIT CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Center of Mass Height:</span>
              <span className="text-cyan-400 font-bold">2.4 m</span>
            </div>
            <input
              type="range"
              min={1.5}
              max={3.5}
              step={0.1}
              defaultValue={2.4}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">ZMP CRITERION:</span>
            <div>• Vulobratović 1968: The mech will not tip over as long as the Zero Moment Point remains inside the support polygon of the feet.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
