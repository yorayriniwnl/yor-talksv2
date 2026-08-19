import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Zap, Play, Pause, RotateCcw, 
  ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TriAlphaFusion() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [nbiPowerMw, setNbiPowerMw] = useState(30); // 30 MW Neutral Beam Injection
  const [plasmaTempKev, setPlasmaTempKev] = useState(65); // 65 keV (~750 Million K for p-B11)
  const [fusionReactionRate, setFusionReactionRate] = useState('1.2e18');
  const [isFiring, setIsFiring] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerFrcMerge = () => {
    uiaudio.warp();
    setIsFiring(true);
    setTimeout(() => {
      uiaudio.success();
    }, 800);
  };

  // Dual FRC Collision & Merging Confinement Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Chamber
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Vacuum Chamber Cylinder Outer Walls (Blue/Slate)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, cy - 90, canvas.width - 80, 180);

      // Tangential Neutral Beam Injectors (NBI 8 Beams entering at angle)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Upper Left NBI
      ctx.moveTo(80, cy - 130); ctx.lineTo(cx - 30, cy - 30);
      // Upper Right NBI
      ctx.moveTo(canvas.width - 80, cy - 130); ctx.lineTo(cx + 30, cy - 30);
      // Lower Left NBI
      ctx.moveTo(80, cy + 130); ctx.lineTo(cx - 30, cy + 30);
      // Lower Right NBI
      ctx.moveTo(canvas.width - 80, cy + 130); ctx.lineTo(cx + 30, cy + 30);
      ctx.stroke();

      // High-Beta Field-Reversed Configuration (FRC) Merged Plasmoid (Central Cyan/Purple Cigar)
      const plasmoidGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 140);
      plasmoidGrad.addColorStop(0, '#ffffff');
      plasmoidGrad.addColorStop(0.3, '#06b6d4');
      plasmoidGrad.addColorStop(0.7, '#a855f7');
      plasmoidGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = plasmoidGrad;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isFiring ? 30 : 12;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 170, 65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Clean Aneutronic Alpha Particles (He-4 Charged Ions exiting direct to collectors)
      if (isFiring) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        for (let i = 0; i < 12; i++) {
          const px = cx + (Math.random() - 0.5) * 280;
          const py = cy + (Math.random() - 0.5) * 90;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isFiring]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Atom className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '14s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                TRI-ALPHA FUSION // p-¹¹B ANEUTRONIC FRC REACTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ZERO NEUTRON DAMAGE (3 α PARTICLES)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Dual plasmoid collision, NBI stabilization & clean proton-boron fusion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFrcMerge}
            disabled={isFiring}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isFiring ? 'NBI FAST-ION STEADY STATE...' : 'MERGE DUAL FRC PLASMOIDS'}</span>
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
              <span className="text-amber-400 font-bold">NBI POWER: {nbiPowerMw} MW</span>
              <span className="text-cyan-400 font-bold">ION TEMP: {plasmaTempKev} keV (750M K)</span>
            </div>
            <div>STATUS: HIGH-BETA MERGED FRC CONFINEMENT</div>
          </div>
        </div>

        {/* Fusion Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BEAM INJECTION
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Neutral Beam Power (NBI):</span>
              <span className="text-amber-400 font-bold">{nbiPowerMw} MW</span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={nbiPowerMw}
              onChange={(e) => setNbiPowerMw(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">HOLY GRAIL FUSION:</span>
            <div>• Reaction: p + ^11B → 3 ^4He + 8.7 MeV.</div>
            <div>• All energy is released as charged alpha particles with 0 neutrons, enabling direct electrostatic power extraction without steam turbines!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
