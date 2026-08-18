import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Play, Pause, RotateCcw, Zap, Compass, 
  Activity, Sliders, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type DeliveryType = 'inswinger' | 'outswinger' | 'reverse_yorker' | 'legspin_googly' | 'bouncer';

interface BallPoint {
  x: number;
  y: number;
  z: number;
}

export default function HawkEyeSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('inswinger');
  const [releaseSpeedKmh, setReleaseSpeedKmh] = useState(145.2);
  const [spinRpm, setSpinRpm] = useState(2400);
  const [isSimulating, setIsSimulating] = useState(false);
  const [impactDecision, setImpactDecision] = useState<'HITTING (OUT)' | 'MISSING (NOT OUT)' | 'UMPIRES CALL'>('HITTING (OUT)');

  const trajectoryRef = useRef<BallPoint[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const generateTrajectory = () => {
    const points: BallPoint[] = [];
    const steps = 60;
    const pitchLength = 22; // 22 yards / meters

    let curX = 0; // Lateral deviation
    let curY = 2.2; // Height in meters
    let curZ = 0; // Distance towards stumps

    const bounceZ = deliveryType === 'reverse_yorker' ? 19.5 : (deliveryType === 'bouncer' ? 10.5 : 15.0);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      curZ = t * pitchLength;

      // Parabolic flight before bounce
      if (curZ < bounceZ) {
        const flightT = curZ / bounceZ;
        curY = 2.2 - (flightT * flightT) * 2.1;

        // Swing deviation
        if (deliveryType === 'inswinger') curX = Math.sin(flightT * Math.PI) * 0.35;
        if (deliveryType === 'outswinger') curX = -Math.sin(flightT * Math.PI) * 0.35;
      } else {
        // After pitch bounce: Seam / Spin deviation + Height rebound
        const reboundT = (curZ - bounceZ) / (pitchLength - bounceZ);
        curY = 0.1 + (reboundT * (deliveryType === 'bouncer' ? 1.4 : 0.65)) - (reboundT * reboundT * 0.1);

        if (deliveryType === 'legspin_googly') curX -= reboundT * 0.55;
        if (deliveryType === 'reverse_yorker') curX += reboundT * 0.25;
        if (deliveryType === 'inswinger') curX += reboundT * 0.45;
        if (deliveryType === 'outswinger') curX -= reboundT * 0.45;
      }

      points.push({ x: curX, y: curY, z: curZ });
    }

    trajectoryRef.current = points;

    // Determine wicket impact
    const lastP = points[points.length - 1];
    if (Math.abs(lastP.x) < 0.22 && lastP.y > 0.1 && lastP.y < 0.72) {
      setImpactDecision('HITTING (OUT)');
    } else if (Math.abs(lastP.x) < 0.35) {
      setImpactDecision('UMPIRES CALL');
    } else {
      setImpactDecision('MISSING (NOT OUT)');
    }
  };

  useEffect(() => {
    generateTrajectory();
  }, [deliveryType, releaseSpeedKmh, spinRpm]);

  // Hawk-Eye 3D Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let progress = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Pitch Perspective Blueprint (3D View from Bowler's End)
      ctx.fillStyle = '#06130b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height - 40;

      // Draw Green Pitch Turf
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.moveTo(cx - 240, cy);
      ctx.lineTo(cx + 240, cy);
      ctx.lineTo(cx + 70, 140);
      ctx.lineTo(cx - 70, 140);
      ctx.closePath();
      ctx.fill();

      // Pitch Crease Lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 100, 160);
      ctx.lineTo(cx + 100, 160);
      ctx.stroke();

      // Draw 3 Stumps & Bails at Batter's End
      const stumpX = cx;
      const stumpY = 160;
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 10;

      // Off, Middle, Leg stumps
      for (let s = -1; s <= 1; s++) {
        ctx.fillRect(stumpX + s * 8 - 2, stumpY - 45, 4, 45);
      }
      // Bails
      ctx.fillRect(stumpX - 12, stumpY - 48, 24, 3);
      ctx.shadowBlur = 0;

      // Draw Hawk-Eye Virtual Mat
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(stumpX - 25, stumpY - 60, 50, 60);
      ctx.setLineDash([]);

      // Draw Ball Trajectory
      const points = trajectoryRef.current;
      if (points.length > 0) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.beginPath();

        points.forEach((pt, idx) => {
          const zFrac = pt.z / 22;
          const px = cx + (pt.x * 240 * (1 - zFrac * 0.7));
          const py = cy - (zFrac * (cy - 160)) - (pt.y * 50);

          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Bounce Marker Ring
        const bouncePt = points[Math.floor(points.length * 0.65)];
        if (bouncePt) {
          const zFrac = bouncePt.z / 22;
          const bx = cx + (bouncePt.x * 240 * (1 - zFrac * 0.7));
          const by = cy - (zFrac * (cy - 160));

          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(bx, by, 16, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Target className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                HAWK-EYE 3D // BALL TRAJECTORY & RADAR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                AERODYNAMIC MAGNUS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-millimeter ball-tracking & DRS wicket projection engine for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Impact Decision Banner */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">DECISION PROJECTION</div>
            <div className={cn("text-base font-bold", impactDecision.includes('OUT') ? "text-red-400" : "text-emerald-400")}>
              {impactDecision}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={720}
            height={500}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-emerald-400 font-bold">RADAR: {releaseSpeedKmh} KM/H</span>
              <span className="text-cyan-400 font-bold">SEAM REVS: {spinRpm} RPM</span>
            </div>
            <div>STATUS: HAWK-EYE 3D OPTICAL TRACKING LOCKED</div>
          </div>
        </div>

        {/* Delivery Aerodynamics Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DELIVERY PHYSICS
            </h3>
          </div>

          {/* Delivery Type */}
          <div className="space-y-1.5">
            <span className="text-zinc-400">Ball Archetype:</span>
            <div className="space-y-1.5">
              {(['inswinger', 'outswinger', 'reverse_yorker', 'legspin_googly', 'bouncer'] as DeliveryType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    uiaudio.click();
                    setDeliveryType(t);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold uppercase transition-all border",
                    deliveryType === t
                      ? "bg-emerald-500 text-black border-emerald-400 shadow-sm"
                      : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/10"
                  )}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Release Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Velocity (KM/H):</span>
              <span className="text-emerald-400 font-bold">{releaseSpeedKmh} KM/H</span>
            </div>
            <input
              type="range"
              min={110}
              max={160}
              step={0.5}
              value={releaseSpeedKmh}
              onChange={(e) => setReleaseSpeedKmh(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Spin RPM */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Magnus Spin RPM:</span>
              <span className="text-cyan-400 font-bold">{spinRpm} RPM</span>
            </div>
            <input
              type="range"
              min={1200}
              max={3200}
              step={50}
              value={spinRpm}
              onChange={(e) => setSpinRpm(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
