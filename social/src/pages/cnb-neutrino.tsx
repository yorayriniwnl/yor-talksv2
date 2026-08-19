import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CnbNeutrino() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [neutrinoMassEv, setNeutrinoMassEv] = useState(0.45); // 0.45 eV effective mass
  const [retardingVoltageKv, setRetardingVoltageKv] = useState(18.57); // 18.57 kV (near 18.574 keV tritium endpoint Q)
  const [cnbCaptureEvent, setCnbCaptureEvent] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCnbCapture = () => {
    uiaudio.warp();
    setCnbCaptureEvent(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1100);
  };

  const handleReset = () => {
    uiaudio.click();
    setCnbCaptureEvent(false);
  };

  // KATRIN MAC-E Filter & Tritium Beta Decay Spectrum Canvas
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

      // Dark Cryogenic Vacuum
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // KATRIN Main Spectrometer Vessel (Giant 24m long Stainless Steel Chamber)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 240, 100, 480, 280);

      // Superconducting Solenoid Coils at Entrance and Exit
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(cx - 250, 120, 20, 240);
      ctx.fillRect(cx + 230, 120, 20, 240);

      // Retarding Electric Potential Barrier (Parabolic Saddle in Center)
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(cx, 100); ctx.lineTo(cx, 380);
      ctx.stroke();
      ctx.setLineDash([]);

      // Beta Decay Electrons Spiral along Magnetic Guidance Field Lines
      for (let i = 0; i < 15; i++) {
        const ey = cy + (i - 7) * 16;
        const passedFilter = cnbCaptureEvent || (i % 3 === 0);

        ctx.strokeStyle = passedFilter ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = cx - 230; x <= (passedFilter ? cx + 220 : cx - 10); x += 6) {
          const sy = ey + Math.sin(x * 0.15 + time * 3) * 6;
          if (x === cx - 230) ctx.moveTo(x, sy);
          else ctx.lineTo(x, sy);
        }
        ctx.stroke();
      }

      // CNB Relic Neutrino Capture Monoenergetic Peak (2*m_nu above endpoint Q)
      if (cnbCaptureEvent) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(cx + 220, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cnbCaptureEvent]);

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
                COSMIC NEUTRINO BACKGROUND // KATRIN TRITIUM ENDPOINT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                1.95K RELIC CNB & m_ν &lt; 0.8 eV
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              MAC-E electrostatic retarding filter & thresholdless relic neutrino capture for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCnbCapture}
            disabled={cnbCaptureEvent}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{cnbCaptureEvent ? 'RELIC NEUTRINO CAPTURE LOGGED (Q + 2m_ν)' : 'SEARCH CNB CAPTURE PEAK'}</span>
          </button>

          {cnbCaptureEvent && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
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
              <span className="text-cyan-400 font-bold">NEUTRINO MASS: m_ν = {neutrinoMassEv} eV</span>
              <span className="text-pink-400 font-bold">RETARDING VOLTAGE: {retardingVoltageKv} kV</span>
            </div>
            <div>STATUS: {cnbCaptureEvent ? 'PTOLEMY MONOENERGETIC CNB PEAK' : 'CONTINUOUS BETA SPECTRUM SCAN'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CNB PHYSICS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Cosmic Neutrino Decoupling:</strong> Relic neutrinos decoupled 1 second after the Big Bang at T ~ 1 MeV (~10¹⁰ K), cooled to 1.95 K today with 336 neutrinos/cm³.</div>
            <div>• <strong>Tritium Capture (PTOLEMY):</strong> Relic neutrinos induce thresholdless capture ^3H + ν_e → ^3He^+ + e^-, producing a sharp peak 2m_ν beyond the beta endpoint!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
