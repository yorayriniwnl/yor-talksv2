import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HeliconSpheromakMerger() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [counterHelicityFluxWebers, setCounterHelicityFluxWebers] = useState(14); // 14 mWb reconnecting flux
  const [reconnectionIonTempGigaKelvin, setReconnectionIonTempGigaKelvin] = useState(2.5); // 2.5 GK ion temp
  const [specificImpulseSec, setSpecificImpulseSec] = useState(560000); // 560,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(15000); // 15,000 kN dreadnought thrust

  const animFrameRef = useRef<number | null>(null);
  const dreadnoughtPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Coaxial Helicon Spheromak Counter-Helicity Merger Canvas
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

      // Upper Helicon Spheromak Gun (at 100, cy - 60)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(50, cy - 85, 90, 50);

      // Lower Helicon Spheromak Gun (at 100, cy + 60)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.strokeRect(50, cy + 35, 90, 50);

      // Counter-Rotating Magnetic Plasmoids Colliding into Merger Point (at 210, cy)
      const mergeProgress = (Math.sin(time * 3) + 1) / 2;

      // Upper Right-Handed Spheromak (Cyan)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(140 + mergeProgress * 60, cy - 35 + mergeProgress * 35, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Lower Left-Handed Spheromak (Pink)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(140 + mergeProgress * 60, cy + 35 - mergeProgress * 35, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Central Counter-Helicity Magnetic Reconnection Ignition Core (at 210, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(210, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('RECONNECTION', 184, cy + 2.5);

      // Magnetic Aerospike Expansion Divertor Nozzle (210 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(210, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(210, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        dreadnoughtPlasmaJetsRef.current.push({
          x: 210,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 45 + (reconnectionIonTempGigaKelvin / 2.5) * 10,
        });
      }

      dreadnoughtPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      dreadnoughtPlasmaJetsRef.current = dreadnoughtPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `HELICON SPHEROMAK MERGER: FLUX = ${counterHelicityFluxWebers} mWb | T_i = ${reconnectionIonTempGigaKelvin.toFixed(1)} GK | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [counterHelicityFluxWebers, reconnectionIonTempGigaKelvin, specificImpulseSec, thrustKiloNewtons]);

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-yellow-400">
                HELICON SPHEROMAK MERGER // 560,000s Isp DREADNOUGHT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                YAMADA, ONO & INOMOTO (UNIV. OF TOKYO & PPPL)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Counter-helicity colliding spheromak magnetic reconnection fusion drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">DREADNOUGHT THRUST</div>
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
              <span className="text-cyan-400 font-bold">FLUX: {counterHelicityFluxWebers} mWb</span>
              <span className="text-pink-400 font-bold">ION TEMP: {reconnectionIonTempGigaKelvin.toFixed(1)} GK</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: COUNTER-HELICITY MAGNETIC RECONNECTION FUSION IGNITED</div>
          </div>
        </div>

        {/* Spheromak Merger Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              RECONNECTION FLUX (mWb)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Magnetic Flux:</span>
              <span className="text-emerald-400 font-bold">{counterHelicityFluxWebers} mWb</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={counterHelicityFluxWebers}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCounterHelicityFluxWebers(val);
                setReconnectionIonTempGigaKelvin(val * 0.178);
                setThrustKiloNewtons(Math.floor(val * 1071.4));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Counter-Helicity Reconnection Heating:</strong> Merging right-handed and left-handed spheromaks converts 80% of opposing toroidal magnetic energy into direct ion thermal energy (T_i &gt; 2.5 GK) within microseconds!</div>
            <div>• <strong>Self-Organized FRC State:</strong> The merged plasmoid relaxes into a high-beta Field-Reversed Configuration, expelling aneutronic alpha particles at 560,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
