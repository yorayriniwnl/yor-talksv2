import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Sliders, Play, Pause, RotateCcw, Zap, 
  Activity, ShieldCheck, Compass, Radio, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DroneSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [kp, setKp] = useState(2.4);
  const [ki, setKi] = useState(0.05);
  const [kd, setKd] = useState(1.2);
  const [targetAltM, setTargetAltM] = useState(15.0);
  const [currentAltM, setCurrentAltM] = useState(15.0);
  const [batteryPct, setBatteryPct] = useState(94);

  const droneRef = useRef({ y: 240, vy: 0, targetY: 240, integral: 0, lastError: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Drone PID Flight Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      const d = droneRef.current;

      // Target Altitude Y mapping
      const targetCanvasY = canvas.height - 60 - (targetAltM / 30) * (canvas.height - 120);
      d.targetY = targetCanvasY;

      // PID Calculation
      const error = d.targetY - d.y;
      d.integral += error * 0.016;
      const derivative = (error - d.lastError) / 0.016;
      d.lastError = error;

      const thrust = kp * error + ki * d.integral + kd * derivative;
      d.vy += thrust * 0.005;
      d.vy *= 0.92; // Drag damping
      d.y += d.vy;

      // Calculate current altitude from Y
      const calculatedAlt = Math.max(0, ((canvas.height - 60 - d.y) / (canvas.height - 120)) * 30);
      setCurrentAltM(+calculatedAlt.toFixed(1));

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Sky Floor
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground Line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 40); ctx.lineTo(canvas.width, canvas.height - 40);
      ctx.stroke();

      // Target Altitude Dotted Line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, targetCanvasY); ctx.lineTo(canvas.width, targetCanvasY);
      ctx.stroke();
      ctx.setLineDash([]);

      const cx = canvas.width / 2;

      // Draw Drone Frame
      ctx.save();
      ctx.translate(cx, d.y);

      // Drone Central Carbon Hub
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(-24, -12, 48, 24, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4 Carbon Arms
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-60, -10); ctx.lineTo(60, -10);
      ctx.stroke();

      // Spinning Propellers
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      const propW = Math.sin(time * 12) * 24;
      ctx.beginPath();
      ctx.moveTo(-60 - propW, -14); ctx.lineTo(-60 + propW, -14);
      ctx.moveTo(60 - propW, -14); ctx.lineTo(60 + propW, -14);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [kp, ki, kd, targetAltM]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Plane className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
                DRONE // 6-DOF QUADCOPTER PID FLIGHT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CLOSED-LOOP PID CONTROLLER
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Multirotor brushless motor dynamics & closed-loop PID altitude hold for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Altitude Telemetry */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">ALTITUDE HOLD</div>
            <div className="text-lg font-bold text-cyan-400">{currentAltM} <span className="text-xs">METERS</span></div>
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
              <span className="text-emerald-400 font-bold">TARGET: {targetAltM}M</span>
              <span className="text-cyan-400 font-bold">BATTERY: {batteryPct}%</span>
            </div>
            <div>STATUS: PID AUTO-STABILIZATION ENGAGED</div>
          </div>
        </div>

        {/* PID Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PID GAIN VALUES
            </h3>
          </div>

          {/* Target Altitude */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Target Altitude:</span>
              <span className="text-emerald-400 font-bold">{targetAltM} m</span>
            </div>
            <input
              type="range"
              min={2}
              max={28}
              step={0.5}
              value={targetAltM}
              onChange={(e) => setTargetAltM(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Kp */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Proportional (Kp):</span>
              <span className="text-cyan-400 font-bold">{kp}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={6.0}
              step={0.1}
              value={kp}
              onChange={(e) => setKp(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Kd */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Derivative (Kd):</span>
              <span className="text-purple-400 font-bold">{kd}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={3.0}
              step={0.1}
              value={kd}
              onChange={(e) => setKd(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
