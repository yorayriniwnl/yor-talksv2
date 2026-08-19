import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DynamicMirrorCruiser() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mirrorRatioR, setMirrorRatioR] = useState(12); // R = 12 dynamic magnetic mirror ratio
  const [directRecoveryKv, setDirectRecoveryKv] = useState(250); // 250 kV direct electrostatic recovery grid
  const [specificImpulseSec, setSpecificImpulseSec] = useState(620000); // 620,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(20000); // 20,000 kN super-cruiser thrust

  const animFrameRef = useRef<number | null>(null);
  const cruiserPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Dynamic Helical Magnetic Mirror Fusion Canvas
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

      // Dynamic Helical Mirror Solenoid Coils (Left: 60 to 220, cy)
      const numCoils = 6;
      for (let c = 0; c < numCoils; c++) {
        const cxPos = 70 + c * 26;
        const coilPhase = Math.sin(time * 3 + c * 0.8) * 4;
        const coilHeight = (c === 0 || c === numCoils - 1) ? 35 : 55 + coilPhase;

        ctx.strokeStyle = (c === 0 || c === numCoils - 1) ? '#ef4444' : '#a855f7';
        ctx.lineWidth = (c === 0 || c === numCoils - 1) ? 4.5 : 3;
        ctx.beginPath();
        ctx.ellipse(cxPos, cy, 8, coilHeight, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Traveling Magnetic Wave Envelope (Connecting Throat to Throat)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(70, cy - 35);
      ctx.bezierCurveTo(120, cy - 65, 170, cy - 65, 200, cy - 35);
      ctx.moveTo(70, cy + 35);
      ctx.bezierCurveTo(120, cy + 65, 170, cy + 65, 200, cy + 35);
      ctx.stroke();

      // Confined Dynamic D-3He / p-11B Core (at 135, cy)
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.ellipse(135, cy, 45, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7.5px monospace';
      ctx.fillText('DYNAMIC MIRROR', 105, cy + 2.5);

      // Direct Electrostatic Recovery & Magnetic Expansion Divertor (200 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(200, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(200, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // Direct Energy Recovery Grid Lines (at 240, 260)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(240, cy - 35); ctx.lineTo(240, cy + 35);
      ctx.moveTo(260, cy - 42); ctx.lineTo(260, cy + 42);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        cruiserPlasmaJetsRef.current.push({
          x: 200,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 50 + (mirrorRatioR / 12) * 10,
        });
      }

      cruiserPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      cruiserPlasmaJetsRef.current = cruiserPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DYNAMIC MIRROR CRUISER: MIRROR RATIO R = ${mirrorRatioR} | DIRECT RECOVERY = ${directRecoveryKv} kV | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mirrorRatioR, directRecoveryKv, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-sky-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-sky-300 to-pink-400">
                DYNAMIC HELICAL MIRROR // 620,000s Isp SUPER-CRUISER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                POST, FOWLER & LOGAN (LLNL MIRROR FUSION PROGRAM)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Traveling magnetic wave mirror & direct electrostatic energy recovery drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SUPER-CRUISER THRUST</div>
            <div className="text-xl font-bold text-purple-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-purple-400 font-bold">MIRROR RATIO: R = {mirrorRatioR}</span>
              <span className="text-amber-400 font-bold">DIRECT RECOVERY: {directRecoveryKv} kV</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: TRAVELING WAVE MIRROR EXPULSION STABILIZED</div>
          </div>
        </div>

        {/* Mirror Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              MIRROR RATIO (R)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Magnetic Throat Ratio:</span>
              <span className="text-purple-400 font-bold">R = {mirrorRatioR}</span>
            </div>
            <input
              type="range"
              min={6}
              max={24}
              step={1}
              value={mirrorRatioR}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMirrorRatioR(val);
                setDirectRecoveryKv(Math.floor(val * 20.8));
                setThrustKiloNewtons(Math.floor(val * 1666.6));
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Traveling Magnetic Wave Mirror:</strong> Dynamically pulses sequential solenoid coils, creating a traveling magnetic potential well that propels ions unidirectionally out the exhaust throat!</div>
            <div>• <strong>90% Direct Energy Recovery:</strong> Electrostatic grids decelerate escaping fusion charged ions directly into high-voltage DC electricity to power the ship's main deflector shields!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
