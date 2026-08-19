import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MtfHeavyCarrier() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [acousticPistonsCount, setAcousticPistonsCount] = useState(14); // 14 pneumatic acoustic ram pistons
  const [peakCavitationPressureGigabar, setPeakCavitationPressureGigabar] = useState(1.8); // 1.8 Gbar acoustic shock pressure
  const [specificImpulseSec, setSpecificImpulseSec] = useState(600000); // 600,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(18000); // 18,000 kN heavy carrier thrust

  const animFrameRef = useRef<number | null>(null);
  const carrierPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Acoustic Cavitation MTF Fusion Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spherical Liquid Pb-Li Chamber (at 140, cy)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(140, cy, 70, 0, Math.PI * 2);
      ctx.stroke();

      // Synchronized Acoustic Ram Pistons (14 Radial Pistons)
      const numPistons = acousticPistonsCount;
      for (let p = 0; p < numPistons; p++) {
        const angle = (p * Math.PI * 2) / numPistons;
        const x1 = 140 + Math.cos(angle) * 70;
        const y1 = cy + Math.sin(angle) * 70;
        const pistonPulse = Math.sin(time * 4) * 6;
        const x2 = 140 + Math.cos(angle) * (88 + pistonPulse);
        const y2 = cy + Math.sin(angle) * (88 + pistonPulse);

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central Acoustic Cavitation Thermonuclear Core (at 140, cy)
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(140, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('1.8 Gbar', 123, cy + 2.5);

      // Magnetic Aerospike Expansion Divertor Nozzle (210 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(210, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(210, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        carrierPlasmaJetsRef.current.push({
          x: 210,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 48 + (peakCavitationPressureGigabar / 1.8) * 10,
        });
      }

      carrierPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      carrierPlasmaJetsRef.current = carrierPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ACOUSTIC MTF CARRIER: PISTONS = ${acousticPistonsCount} | PRESSURE = ${peakCavitationPressureGigabar.toFixed(1)} Gbar | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [acousticPistonsCount, peakCavitationPressureGigabar, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                ACOUSTIC MTF // 600,000s Isp HEAVY CARRIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                SIEMON, SCHOENBERG & LABERGE (LANL & GENERAL FUSION)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              14-piston synchronized acoustic cavitation MTF fusion carrier for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CARRIER THRUST</div>
            <div className="text-xl font-bold text-emerald-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-cyan-400 font-bold">PISTONS: {acousticPistonsCount} RAMS</span>
              <span className="text-pink-400 font-bold">PRESSURE: {peakCavitationPressureGigabar.toFixed(1)} Gbar</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: SYNCHRONIZED ACOUSTIC SHOCK COMPRESSION COMPLETE</div>
          </div>
        </div>

        {/* MTF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ACOUSTIC PISTONS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Synchronized Pistons:</span>
              <span className="text-emerald-400 font-bold">{acousticPistonsCount} Rams</span>
            </div>
            <input
              type="range"
              min={8}
              max={24}
              step={2}
              value={acousticPistonsCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAcousticPistonsCount(val);
                setPeakCavitationPressureGigabar(val * 0.128);
                setThrustKiloNewtons(Math.floor(val * 1285.7));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Acoustic Cavitation Implosion:</strong> 14 pneumatic ram pistons strike the exterior of a rotating liquid lead-lithium sphere simultaneously, sending a converging acoustic shockwave that compresses an injected FRC plasmoid!</div>
            <div>• <strong>Gigabar Thermonuclear Burn:</strong> Reaches 1.8 Gbar peak pressures at the acoustic focal point, igniting aneutronic p-11B fuel at 600,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
