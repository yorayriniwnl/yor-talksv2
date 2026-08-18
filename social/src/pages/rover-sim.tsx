import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Zap, Play, Pause, RotateCcw, 
  Sun, Battery, Camera, ShieldCheck, Flame, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RoverSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [batteryLevel, setBatteryLevel] = useState(94);
  const [solarEff, setSolarEff] = useState(88);
  const [surfaceTemp, setSurfaceTemp] = useState(-52);
  const [roverSpeed, setRoverSpeed] = useState(0);

  const roverPosRef = useRef({ x: 120, y: 340, vx: 0, angle: 0 });
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

  // Mars Surface Terrain & Rocker-Bogie Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const r = roverPosRef.current;
      const keys = keysPressed.current;

      // Drive controls
      if (keys['KeyD'] || keys['ArrowRight']) {
        r.vx = Math.min(3.5, r.vx + 0.15);
      } else if (keys['KeyA'] || keys['ArrowLeft']) {
        r.vx = Math.max(-2.5, r.vx - 0.15);
      } else {
        r.vx *= 0.92;
      }

      r.x += r.vx;
      if (r.x > canvas.width - 60) r.x = canvas.width - 60;
      if (r.x < 60) r.x = 60;

      setRoverSpeed(Math.abs(+(r.vx * 1.8).toFixed(1)));

      // Terrain Elevation Function
      const getTerrainHeight = (x: number) => {
        return canvas.height - 90 + Math.sin(x * 0.015) * 22 + Math.cos(x * 0.04) * 8;
      };

      r.y = getTerrainHeight(r.x) - 16;
      // Terrain slope angle
      const slope = (getTerrainHeight(r.x + 10) - getTerrainHeight(r.x - 10)) / 20;
      r.angle = Math.atan(slope);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Martian Dusty Atmosphere Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#1c0a06');
      skyGrad.addColorStop(1, '#571c0e');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Martian Sun
      ctx.fillStyle = '#ffedd5';
      ctx.beginPath();
      ctx.arc(canvas.width - 120, 80, 20, 0, Math.PI * 2);
      ctx.fill();

      // Draw Red Martian Surface
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);

      for (let x = 0; x <= canvas.width; x += 10) {
        ctx.lineTo(x, getTerrainHeight(x));
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Surface Terrain Ridge Highlight
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 10) {
        if (x === 0) ctx.moveTo(x, getTerrainHeight(x));
        else ctx.lineTo(x, getTerrainHeight(x));
      }
      ctx.stroke();

      // Draw 6-Wheel Rocker-Bogie Rover Body
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.angle);

      // Rover Chassis
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fillRect(-24, -18, 48, 14);

      // Solar Panel Top Deck
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-28, -22, 56, 4);

      // MastCam Camera Turret
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(12, -34, 4, 16);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(10, -38, 8, 6);

      // 6 All-Terrain Wheels
      ctx.fillStyle = '#1e293b';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(-20, 6, 7, 0, Math.PI * 2);
      ctx.arc(0, 6, 7, 0, Math.PI * 2);
      ctx.arc(20, 6, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-orange-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(249,115,22,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30 border border-orange-400/40">
            <Compass className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '30s' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-cyan-400">
              MARS ROVER // ROCKER-BOGIE SURFACE EXPLORER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              6-wheel suspension terrain simulation & MastCam telemetry for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Rover Battery Indicator */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <Battery className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-400">POWER:</span>
            <span className="text-emerald-400 font-bold">{batteryLevel}%</span>
          </div>
        </div>
      </div>

      {/* Surface Exploration Canvas Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={750}
          height={480}
          className="w-full h-auto block"
        />

        {/* Telemetry HUD Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
          <div className="bg-zinc-950/80 backdrop-blur-md p-3.5 rounded-xl border border-white/10 space-y-1">
            <div className="text-[10px] text-zinc-400">SURFACE VELOCITY</div>
            <div className="text-xl font-bold text-orange-400">{roverSpeed} <span className="text-xs">M/S</span></div>
          </div>

          <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-right space-y-1">
            <div className="text-[10px] text-zinc-400">JEZERO CRATER TEMP</div>
            <div className="text-sm font-bold text-cyan-300">{surfaceTemp}°C</div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
          <div>USE [A] / [D] OR LEFT / RIGHT ARROWS TO DRIVE ROVER</div>
          <div>LIDAR: TERRAIN SCAN NOMINAL</div>
        </div>
      </div>
    </div>
  );
}
