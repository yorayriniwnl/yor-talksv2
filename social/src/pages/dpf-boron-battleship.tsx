import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Crosshair
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DpfBoronBattleship() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pinchCurrentMegaAmperes, setPinchCurrentMegaAmperes] = useState(5.0); // 5.0 MA pinch current
  const [plasmoidIonTempGigakelvin, setPlasmoidIonTempGigakelvin] = useState(1.8); // 1.8 GK (150 keV) ion temp
  const [specificImpulseSec, setSpecificImpulseSec] = useState(380000); // 380,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(8500); // 8,500 kN battleship thrust

  const animFrameRef = useRef<number | null>(null);
  const battleshipPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Dense Plasma Focus (DPF) p-11B Aneutronic Plasmoid Canvas
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

      // Coaxial Mather-Type Anode & Cathode Array (Left: 60 to 200)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;

      // Central Solid Anode Rod
      ctx.fillRect(60, cy - 12, 140, 24);
      ctx.strokeRect(60, cy - 12, 140, 24);

      // Outer Cage Cathode Rods (Top & Bottom)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, cy - 50); ctx.lineTo(190, cy - 50);
      ctx.moveTo(60, cy + 50); ctx.lineTo(190, cy + 50);
      ctx.stroke();

      // Current Sheath Running Down Electrodes
      const sheathX = 80 + ((time * 30) % 110);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(sheathX, cy - 50);
      ctx.lineTo(sheathX + 15, cy - 12);
      ctx.moveTo(sheathX, cy + 50);
      ctx.lineTo(sheathX + 15, cy + 12);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pinched Aneutronic p-11B Plasmoid Stagnation Point (at 210, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 32;
      ctx.beginPath();
      ctx.arc(210, cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Heavy Magnetic Divertor Expansion Bell (220 to 520)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(220, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(220, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // Relativistic Alpha Plasmoid Exhaust Jet Streams (He-4 Ions)
      if (Math.random() < 0.8) {
        battleshipPlasmaJetsRef.current.push({
          x: 220,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 32 + (pinchCurrentMegaAmperes / 5.0) * 10,
        });
      }

      battleshipPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      battleshipPlasmaJetsRef.current = battleshipPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DPF BORON BATTLESHIP: PINCH CURRENT = ${pinchCurrentMegaAmperes} MA | ION TEMP = ${plasmoidIonTempGigakelvin} GK | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pinchCurrentMegaAmperes, plasmoidIonTempGigakelvin, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                DPF BORON BATTLESHIP // 380,000s Isp ANEUTRONIC PINCH
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                LERNER & FOCUS FUSION (LPPFUSION)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              5.0 MA Dense Plasma Focus & 1.8 GK p-11B aneutronic plasmoid battleship for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">BATTLESHIP THRUST</div>
            <div className="text-xl font-bold text-amber-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-amber-400 font-bold">PINCH CURRENT: {pinchCurrentMegaAmperes} MA</span>
              <span className="text-red-400 font-bold">ION TEMP: {plasmoidIonTempGigakelvin} GK</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: ANEUTRONIC FOCUSED PLASMOID PINCH NOMINAL</div>
          </div>
        </div>

        {/* DPF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PINCH CURRENT (MA)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Pinch Current:</span>
              <span className="text-amber-400 font-bold">{pinchCurrentMegaAmperes} MA</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={10.0}
              step={0.5}
              value={pinchCurrentMegaAmperes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPinchCurrentMegaAmperes(val);
                setThrustKiloNewtons(Math.floor(val * 1700));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Aneutronic p-11B Reaction:</strong> Proton-boron fusion produces three energetic alpha particles without dangerous neutron activation, enabling lightweight starship shielding!</div>
            <div>• <strong>Natural Magnetic Pinch:</strong> Self-generated helical magnetic vortex filaments compress the plasmoid to 1.8 billion Kelvin, directly converting kinetic energy into thrust!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
