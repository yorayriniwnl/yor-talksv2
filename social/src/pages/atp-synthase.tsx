import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Sparkles, Play, RotateCcw, Activity, 
  Sliders, ShieldCheck, Layers, Dna, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AtpSynthase() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [atpGenerated, setAtpGenerated] = useState(1480);
  const [protonMotiveForceMv, setProtonMotiveForceMv] = useState(180); // 180 mV PMF
  const [rotationSpeedRpm, setRotationSpeedRpm] = useState(6000); // 6,000 RPM rotary nanomotor

  const animFrameRef = useRef<number | null>(null);

  // ATP Synthase Rotary Nanomotor Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;

    const render = () => {
      angle += (rotationSpeedRpm / 6000) * 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const memY = 160;

      // Dark Mitochondrial Matrix
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Inner Mitochondrial Membrane Lipid Bilayer (Horizontal Bar)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, memY - 25, canvas.width, 50);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, memY - 25); ctx.lineTo(canvas.width, memY - 25);
      ctx.moveTo(0, memY + 25); ctx.lineTo(canvas.width, memY + 25);
      ctx.stroke();

      // Fo Base: Membrane-Embedded c-Ring Rotor (Top rotating ring)
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(cx, memY, 45, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Rotating Central Asymmetric Gamma-Stalk (Middle Shaft)
      ctx.save();
      ctx.translate(cx, 260);
      ctx.rotate(angle);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, -90);
      ctx.lineTo(0, 40);
      ctx.stroke();
      ctx.restore();

      // F1 Headpiece: Hexameric Alpha3-Beta3 Catalytic Ring (Bottom Dome)
      ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, 310, 65, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Catalytic Subunits (3 Alpha, 3 Beta)
      for (let i = 0; i < 6; i++) {
        const subAngle = (i * Math.PI) / 3;
        const sx = cx + Math.cos(subAngle) * 45;
        const sy = 310 + Math.sin(subAngle) * 45;

        ctx.fillStyle = i % 2 === 0 ? '#ec4899' : '#06b6d4';
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rotationSpeedRpm]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Zap className="w-8 h-8 text-black animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                ATP SYNTHASE // ROTARY BIOMOLECULAR MOTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                100% THERMODYNAMIC EFFICIENCY
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Proton motive force driving 6,000 RPM FoF1 rotary catalytic synthesis for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">ROTARY MOTOR VELOCITY</div>
            <div className="text-xl font-bold text-emerald-400">{rotationSpeedRpm.toLocaleString()} <span className="text-xs">RPM</span></div>
          </div>
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
              <span className="text-emerald-400 font-bold">PMF: {protonMotiveForceMv} mV</span>
              <span className="text-purple-400 font-bold">OUTPUT: 3 ATP / 360° TURN</span>
            </div>
            <div>STATUS: ROTARY CATALYTIC PHOSPHORYLATION</div>
          </div>
        </div>

        {/* Bio-Motor Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PROTON GRADIENT
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Proton Motive Force (PMF):</span>
              <span className="text-emerald-400 font-bold">{protonMotiveForceMv} mV</span>
            </div>
            <input
              type="range"
              min={100}
              max={240}
              step={10}
              value={protonMotiveForceMv}
              onChange={(e) => {
                const val = Number(e.target.value);
                setProtonMotiveForceMv(val);
                setRotationSpeedRpm(Math.round((val / 180) * 6000));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">PAUL BOYER 1997:</span>
            <div>• Proton flow across Fo rotor turns the gamma-stalk inside the static F1 hexamer.</div>
            <div>• Each 120° step forces a beta subunit through Open, Loose, and Tight states to synthesize ATP from ADP + Pi.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
