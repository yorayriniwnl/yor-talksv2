import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Zap, Play, Pause, RotateCcw, 
  Wind, Gauge, Compass, ShieldCheck, Flame
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SupersonicSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [machNumber, setMachNumber] = useState(2.4);
  const [altitudeFeet, setAltitudeFeet] = useState(48000);
  const [gForce, setGForce] = useState(3.2);
  const [afterburnerActive, setAfterburnerActive] = useState(true);

  const jetPosRef = useRef({ x: 300, y: 240, vy: 0, angle: 0 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const toggleAfterburner = () => {
    if (!afterburnerActive) {
      uiaudio.warp();
      setAfterburnerActive(true);
      setMachNumber(3.1);
      setGForce(5.4);
    } else {
      uiaudio.click();
      setAfterburnerActive(false);
      setMachNumber(1.8);
      setGForce(2.1);
    }
  };

  // Supersonic Flight Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      const j = jetPosRef.current;
      const keys = keysPressed.current;

      // Pitch controls
      if (keys['KeyW'] || keys['ArrowUp']) j.angle = Math.max(-0.4, j.angle - 0.02);
      else if (keys['KeyS'] || keys['ArrowDown']) j.angle = Math.min(0.4, j.angle + 0.02);
      else j.angle *= 0.95;

      j.y += j.angle * 6;
      if (j.y < 80) j.y = 80;
      if (j.y > canvas.height - 80) j.y = canvas.height - 80;

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Stratosphere Horizon Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Supersonic Prandtl-Glauert Vapor Shockwave Cone (Transonic Boom)
      if (machNumber >= 1.0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        // Mach angle: sin(mu) = 1 / Mach
        const machAngle = Math.asin(1 / machNumber);
        const coneLength = 160;

        ctx.moveTo(j.x + 30, j.y);
        ctx.lineTo(j.x - Math.cos(machAngle) * coneLength, j.y - Math.sin(machAngle) * coneLength);
        ctx.moveTo(j.x + 30, j.y);
        ctx.lineTo(j.x - Math.cos(machAngle) * coneLength, j.y + Math.sin(machAngle) * coneLength);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw Mach 3 Fighter Jet Silhouette
      ctx.save();
      ctx.translate(j.x, j.y);
      ctx.rotate(j.angle);

      // Fuselage & Delta Wings
      ctx.fillStyle = '#cbd5e1';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(50, 0); // Nose cone
      ctx.lineTo(-40, -32); // Left wingtip
      ctx.lineTo(-25, 0);
      ctx.lineTo(-40, 32); // Right wingtip
      ctx.closePath();
      ctx.fill();

      // Cockpit Canopy Glass
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(5, -4, 20, 8);

      // Twin Afterburner Exhaust Plumes
      if (afterburnerActive) {
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(-25, -6);
        ctx.lineTo(-25 - (Math.random() * 40 + 35), 0);
        ctx.lineTo(-25, 6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [machNumber, afterburnerActive]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-sky-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(14,165,233,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400/40">
            <Plane className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-400">
              SUPERSONIC // MACH 3 FLIGHT DYNAMICS
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Prandtl-Glauert shockwave cone & afterburner flight simulator for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Afterburner Toggle */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleAfterburner}
            className={cn(
              "px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center space-x-2",
              afterburnerActive 
                ? "bg-amber-500 text-black shadow-amber-500/30 animate-pulse" 
                : "bg-zinc-800 text-zinc-300"
            )}
          >
            <Flame className="w-4 h-4" />
            <span>AFTERBURNER: {afterburnerActive ? 'STAGE 2 ENGAGED' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Flight Canvas Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        {/* Telemetry HUD */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
          <div className="bg-zinc-950/80 backdrop-blur-md p-3.5 rounded-xl border border-white/10 space-y-1">
            <div className="text-[10px] text-zinc-400">AIRSPEED VELOCITY</div>
            <div className="text-2xl font-black text-cyan-400">MACH {machNumber}</div>
            <div className="text-[10px] text-amber-400">G-LOAD: {gForce} G</div>
          </div>

          <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-right space-y-1">
            <div className="text-[10px] text-zinc-400">BAROMETRIC ALTITUDE</div>
            <div className="text-xl font-bold text-white">{altitudeFeet.toLocaleString()} <span className="text-xs">FT</span></div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
          <div>USE [W] / [S] OR UP / DOWN ARROWS TO CONTROL FLIGHT PITCH</div>
          <div>SHOCKWAVE: PRANDTL-GLAUERT SINGULARITY FORMED</div>
        </div>
      </div>
    </div>
  );
}
