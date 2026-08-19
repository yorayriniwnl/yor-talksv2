import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function XenonDetector() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [wimpMassGev, setWimpMassGev] = useState(100); // 100 GeV/c^2 WIMP
  const [driftFieldVcm, setDriftFieldVcm] = useState(200); // 200 V/cm drift field
  const [s1SignalPe, setS1SignalPe] = useState(18); // Prompt scintillation photoelectrons
  const [s2SignalPe, setS2SignalPe] = useState(840); // Electroluminescence photoelectrons
  const [eventTriggered, setEventTriggered] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerWimpRecoil = () => {
    uiaudio.warp();
    setEventTriggered(true);
    setTimeout(() => {
      setEventTriggered(false);
      uiaudio.success();
    }, 1200);
  };

  // Dual-Phase Liquid Xenon TPC Detector Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Underground Laboratory Cavern
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Liquid Xenon (LXe) Target Volume (Cryogenic Blue/Cyan Bottom Tank)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.fillRect(cx - 180, 140, 360, 260);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 180, 140, 360, 260);

      // Gas Xenon (GXe) Top Phase (Lighter Cyan Strip 140-90)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fillRect(cx - 180, 80, 360, 60);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(cx - 180, 80, 360, 60);

      // Top & Bottom Photomultiplier Tube (PMT) Arrays
      ctx.fillStyle = '#f59e0b';
      for (let x = cx - 160; x <= cx + 160; x += 40) {
        // Top PMTs
        ctx.beginPath(); ctx.arc(x, 70, 12, 0, Math.PI * 2); ctx.fill();
        // Bottom PMTs
        ctx.beginPath(); ctx.arc(x, 410, 12, 0, Math.PI * 2); ctx.fill();
      }

      // WIMP Nuclear Recoil Event Location
      const recoilX = cx - 30;
      const recoilY = 300;

      if (eventTriggered) {
        // S1 Prompt Scintillation Light (Direct flash of photons to PMTs)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(recoilX, recoilY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ionization Electron Cloud Drifting Upwards towards Gas Phase
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(recoilX, recoilY);
        ctx.lineTo(recoilX, 110);
        ctx.stroke();
        ctx.setLineDash([]);

        // S2 Gas Electroluminescence Secondary Flash in GXe phase
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(recoilX, 110, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [eventTriggered]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                DARK MATTER TPC // LIQUID XENON WIMP DETECTOR (LUX-ZEPLIN)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                DUAL-PHASE S1/S2 RECOIL
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              10-ton ultra-pure liquid xenon time projection chamber & WIMP nuclear recoil for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerWimpRecoil}
            disabled={eventTriggered}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{eventTriggered ? 'MEASURING S1 PROMPT & S2 ELECTROLUMINESCENCE...' : 'SIMULATE WIMP NUCLEAR RECOIL'}</span>
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
            <div className="flex items-center space-x-3">
              <span className="text-cyan-400 font-bold">WIMP MASS: {wimpMassGev} GeV/c²</span>
              <span className="text-pink-400 font-bold">DRIFT FIELD: {driftFieldVcm} V/cm</span>
            </div>
            <div>STATUS: {eventTriggered ? 'NUCLEAR RECOIL EVENT LOGGED' : 'QUIET UNDERGROUND MONITORING'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            DETECTION PRINCIPLE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>S1 Scintillation:</strong> WIMP collides with Xenon nucleus (^132Xe), generating prompt 178 nm UV photons.</div>
            <div>• <strong>S2 Ionization:</strong> Electrons drift upward under electric field into gas phase, producing amplified electroluminescence proportional to charge.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
