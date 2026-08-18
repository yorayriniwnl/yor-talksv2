import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, Sliders, Play, Pause, RotateCcw, Zap, 
  Activity, ShieldCheck, Compass, Eye, Sparkles
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface TrafficCar {
  id: number;
  x: number;
  lane: number;
  speed: number;
  desiredSpeed: number;
  color: string;
  isAutopilot: boolean;
}

export default function TrafficAi() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [carCount, setCarCount] = useState(28);
  const [trafficDensity, setTrafficDensity] = useState(1.0);
  const [avgSpeedKmh, setAvgSpeedKmh] = useState(105);
  const [isSimulating, setIsSimulating] = useState(true);

  const carsRef = useRef<TrafficCar[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const initTraffic = () => {
    const cars: TrafficCar[] = [];
    const colors = ['#06b6d4', '#ec4899', '#8b5cf6', '#eab308', '#10b981', '#ffffff'];

    for (let i = 0; i < carCount; i++) {
      cars.push({
        id: i,
        x: Math.random() * 700,
        lane: Math.floor(Math.random() * 4), // 4 lanes
        speed: Math.random() * 3 + 4,
        desiredSpeed: Math.random() * 2 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        isAutopilot: i === 0, // Player car is lead autopilot
      });
    }
    carsRef.current = cars;
  };

  useEffect(() => {
    initTraffic();
  }, [carCount]);

  // Traffic Simulation Loop (IDM - Intelligent Driver Model)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Highway Ground
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const numLanes = 4;
      const laneHeight = canvas.height / numLanes;

      // Draw Highway Lanes & Dashed Markings
      for (let l = 0; l < numLanes; l++) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 12]);
        ctx.beginPath();
        ctx.moveTo(0, laneHeight * (l + 1));
        ctx.lineTo(canvas.width, laneHeight * (l + 1));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Update Cars
      if (isSimulating) {
        carsRef.current.forEach((car) => {
          // IDM Follow Distance Check
          const leadCar = carsRef.current.find(other => 
            other.id !== car.id && other.lane === car.lane && other.x > car.x && other.x - car.x < 70
          );

          if (leadCar) {
            // Decelerate to avoid collision
            car.speed = Math.max(1, car.speed * 0.96);
          } else {
            // Accelerate to desired speed
            car.speed = Math.min(car.desiredSpeed, car.speed + 0.05);
          }

          car.x += car.speed * trafficDensity;
          if (car.x > canvas.width + 40) {
            car.x = -40;
            car.lane = Math.floor(Math.random() * 4);
          }
        });
      }

      // Render Cars
      carsRef.current.forEach((car) => {
        const cy = car.lane * laneHeight + laneHeight / 2;

        // Lidar Vision Cone on Autopilot Car
        if (car.isAutopilot) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
          ctx.beginPath();
          ctx.moveTo(car.x + 20, cy);
          ctx.lineTo(car.x + 120, cy - 35);
          ctx.lineTo(car.x + 120, cy + 35);
          ctx.closePath();
          ctx.fill();
        }

        // Car Body
        ctx.fillStyle = car.isAutopilot ? '#06b6d4' : car.color;
        ctx.shadowColor = car.isAutopilot ? '#06b6d4' : car.color;
        ctx.shadowBlur = car.isAutopilot ? 15 : 6;
        ctx.beginPath();
        ctx.roundRect(car.x - 18, cy - 9, 36, 18, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Headlights
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(car.x + 18, cy - 7, 3, 4);
        ctx.fillRect(car.x + 18, cy + 3, 3, 4);
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating, trafficDensity]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Car className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                TRAFFIC AI // AUTONOMOUS HIGHWAY SIMULATOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                IDM ACCELERATION MODEL
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Multi-agent autonomous driving & phantom jam shockwave simulator for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => {
              uiaudio.click();
              setIsSimulating(!isSimulating);
            }}
            className={cn(
              "px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-md",
              isSimulating ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "bg-zinc-800 text-zinc-300"
            )}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isSimulating ? 'SIMULATING TRAFFIC' : 'PAUSED'}</span>
          </button>
          <button
            onClick={() => {
              uiaudio.warp();
              initTraffic();
            }}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Reset Traffic Grid"
          >
            <RotateCcw className="w-4 h-4" />
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
            <div>4-LANE EXPRESSWAY MULTI-AGENT AUTONOMOUS NETWORK</div>
            <div>VEHICLES: {carsRef.current.length} ACTIVE AGENTS</div>
          </div>
        </div>

        {/* Traffic Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SIM PARAMETERS
            </h3>
          </div>

          {/* Vehicle Count */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Vehicle Fleet Density:</span>
              <span className="text-cyan-400 font-bold">{carCount} Cars</span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              value={carCount}
              onChange={(e) => setCarCount(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Traffic Speed Flow */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Flow Multiplier:</span>
              <span className="text-pink-400 font-bold">{trafficDensity}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={trafficDensity}
              onChange={(e) => setTrafficDensity(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
