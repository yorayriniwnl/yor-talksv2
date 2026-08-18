import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gauge, Play, Pause, RotateCcw, Trophy, Zap, 
  Flame, Sparkles, Award, Compass, Volume2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Segment {
  index: number;
  p1: { x: number; y: number; z: number; camera: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number } };
  p2: { x: number; y: number; z: number; camera: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number } };
  curve: number;
  color: { road: string; grass: string; rumble: string };
}

const ROAD_WIDTH = 2000;
const SEGMENT_LENGTH = 200;
const RUMBLE_LENGTH = 3;
const LANES = 3;
const FIELD_OF_VIEW = 100;
const CAMERA_HEIGHT = 1000;
const CAMERA_DEPTH = 1 / Math.tan((FIELD_OF_VIEW / 2) * Math.PI / 180);

export default function CyberDrift3D() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [speedKmh, setSpeedKmh] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(62800);
  const [driftAngle, setDriftAngle] = useState(0);
  const [gear, setGear] = useState(1);
  const [lapTimeSec, setLapTimeSec] = useState(0);

  const playerPosRef = useRef({ x: 0, z: 0, speed: 0, maxSpeed: 12000, accel: 180, breaking: -300, decel: -100 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const segmentsRef = useRef<Segment[]>([]);

  // Build Road Geometry
  useEffect(() => {
    const segs: Segment[] = [];
    const numSegments = 500;

    for (let n = 0; n < numSegments; n++) {
      const isAlt = Math.floor(n / RUMBLE_LENGTH) % 2 === 0;
      let curve = 0;
      if (n > 50 && n < 150) curve = 2.5; // Right turn
      if (n > 200 && n < 300) curve = -3.2; // Sharp Left turn
      if (n > 350 && n < 450) curve = 4.0; // Cyber Chicane

      segs.push({
        index: n,
        p1: { x: 0, y: 0, z: n * SEGMENT_LENGTH, camera: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0 } },
        p2: { x: 0, y: 0, z: (n + 1) * SEGMENT_LENGTH, camera: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0 } },
        curve,
        color: {
          road: isAlt ? '#090d16' : '#030712',
          grass: isAlt ? '#050a14' : '#020408',
          rumble: isAlt ? '#06b6d4' : '#ec4899',
        }
      });
    }
    segmentsRef.current = segs;
  }, []);

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

  const project = (p: { x: number; y: number; z: number; camera: any; screen: any }, cameraX: number, cameraY: number, cameraZ: number, width: number, height: number) => {
    p.camera.x = p.x - cameraX;
    p.camera.y = p.y - cameraY;
    p.camera.z = p.z - cameraZ;
    const scale = CAMERA_DEPTH / p.camera.z;
    p.screen.scale = scale;
    p.screen.x = Math.round((width / 2) + (scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (scale * p.camera.y * height / 2));
    p.screen.w = Math.round((scale * ROAD_WIDTH * width / 2));
  };

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setLapTimeSec(0);
    playerPosRef.current = { x: 0, z: 0, speed: 0, maxSpeed: 14000, accel: 220, breaking: -400, decel: -120 };
  };

  // Main Render Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const p = playerPosRef.current;
      const keys = keysPressed.current;
      const trackLength = segmentsRef.current.length * SEGMENT_LENGTH;

      // Accelerate / Brake
      if (keys['KeyW'] || keys['ArrowUp']) p.speed = Math.min(p.maxSpeed, p.speed + p.accel);
      else if (keys['KeyS'] || keys['ArrowDown']) p.speed = Math.max(0, p.speed + p.breaking);
      else p.speed = Math.max(0, p.speed + p.decel);

      // Steering
      const dx = (p.speed / p.maxSpeed) * 0.04;
      if (keys['KeyA'] || keys['ArrowLeft']) { p.x -= dx; setDriftAngle(-15); }
      else if (keys['KeyD'] || keys['ArrowRight']) { p.x += dx; setDriftAngle(15); }
      else setDriftAngle(0);

      p.z += p.speed;
      while (p.z >= trackLength) p.z -= trackLength;

      const currentKmH = Math.round((p.speed / p.maxSpeed) * 320);
      setSpeedKmh(currentKmH);
      setGear(Math.max(1, Math.min(6, Math.floor(currentKmH / 55) + 1)));
      setScore(s => s + Math.round(currentKmH * 0.1));

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
      skyGrad.addColorStop(0, '#030712');
      skyGrad.addColorStop(1, '#3b0764');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

      // Neon Synth Sun
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 20, 60, Math.PI, 0);
      ctx.fill();

      // Render 3D Pseudo-Road Segments
      const baseSegment = segmentsRef.current[Math.floor(p.z / SEGMENT_LENGTH) % segmentsRef.current.length];
      let maxy = canvas.height;

      for (let n = 0; n < 120; n++) {
        const seg = segmentsRef.current[(baseSegment.index + n) % segmentsRef.current.length];
        const loopZ = (baseSegment.index + n >= segmentsRef.current.length) ? trackLength : 0;

        project(seg.p1, p.x * ROAD_WIDTH, CAMERA_HEIGHT, p.z - loopZ, canvas.width, canvas.height);
        project(seg.p2, p.x * ROAD_WIDTH, CAMERA_HEIGHT, p.z - loopZ, canvas.width, canvas.height);

        if (seg.p1.camera.z <= CAMERA_DEPTH || seg.p2.screen.y >= maxy) continue;

        // Render Grass / Road Quad
        ctx.fillStyle = seg.color.grass;
        ctx.fillRect(0, seg.p2.screen.y, canvas.width, seg.p1.screen.y - seg.p2.screen.y);

        // Road Quad
        ctx.fillStyle = seg.color.road;
        ctx.beginPath();
        ctx.moveTo(seg.p1.screen.x - seg.p1.screen.w, seg.p1.screen.y);
        ctx.lineTo(seg.p1.screen.x + seg.p1.screen.w, seg.p1.screen.y);
        ctx.lineTo(seg.p2.screen.x + seg.p2.screen.w, seg.p2.screen.y);
        ctx.lineTo(seg.p2.screen.x - seg.p2.screen.w, seg.p2.screen.y);
        ctx.closePath();
        ctx.fill();

        // Rumble Strips
        ctx.fillStyle = seg.color.rumble;
        ctx.fillRect(seg.p1.screen.x - seg.p1.screen.w - 12, seg.p2.screen.y, 12, seg.p1.screen.y - seg.p2.screen.y);
        ctx.fillRect(seg.p1.screen.x + seg.p1.screen.w, seg.p2.screen.y, 12, seg.p1.screen.y - seg.p2.screen.y);

        maxy = seg.p2.screen.y;
      }

      // Draw Player 2JZ Cyber Supra Car Sprite
      const carX = canvas.width / 2;
      const carY = canvas.height - 70;

      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate((driftAngle * Math.PI) / 180);

      // Car Body
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.roundRect(-42, -24, 84, 48, 8);
      ctx.fill();

      // Rear Neon Tail Lights
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.fillRect(-36, 12, 20, 6);
      ctx.fillRect(16, 12, 20, 6);

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, driftAngle]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Gauge className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-300 to-amber-400">
              CYBER DRIFT 3D // TOKYO UNDERGROUND
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Pseudo-3D raycasted OutRun arcade racing engine for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* HUD */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3 py-2 rounded-xl border border-white/10 flex items-center space-x-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">RECORD:</span>
            <span className="text-amber-300 font-bold">{highScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 3D Canvas Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={750}
          height={500}
          className="w-full h-auto block"
        />

        {/* Real-time In-Game Telemetry HUD */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            {/* Speedometer */}
            <div className="bg-zinc-950/80 backdrop-blur-md p-3.5 rounded-xl border border-white/10 space-y-1">
              <div className="text-[10px] text-zinc-400">SPEED (KM/H)</div>
              <div className="text-2xl font-black text-cyan-400">{speedKmh} <span className="text-xs">KM/H</span></div>
              <div className="text-[10px] text-amber-400 font-bold">GEAR: {gear} (SEQUENTIAL)</div>
            </div>

            {/* Score */}
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-right">
              <div className="text-[10px] text-zinc-400">DRIFT SCORE</div>
              <div className="text-xl font-bold text-white">{score.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Start Overlay */}
        <AnimatePresence>
          {gameState !== 'playing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400">
                  CYBER DRIFT 3D
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  W, S to accelerate and brake. A, D to initiate high-angle counter-steer drifts!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START HIGH-SPEED RUN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
