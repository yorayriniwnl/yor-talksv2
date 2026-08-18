import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, Layers, Dna
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function BacteriorhodopsinSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [photocycleState, setPhotocycleState] = useState<'bR570' | 'K590' | 'L550' | 'M412' | 'N560' | 'O640'>('bR570');
  const [retinalIsomer, setRetinalIsomer] = useState<'all-trans' | '13-cis'>('all-trans');
  const [protonsPumped, setProtonsPumped] = useState(1340);
  const [isPhotoexcited, setIsPhotoexcited] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerPhotonFlash = () => {
    uiaudio.warp();
    setIsPhotoexcited(true);
    setRetinalIsomer('13-cis');
    setPhotocycleState('K590');

    // Step through the photochemical photocycle: bR570 -> K -> L -> M -> N -> O -> bR570
    setTimeout(() => setPhotocycleState('L550'), 300);
    setTimeout(() => {
      setPhotocycleState('M412');
      setProtonsPumped(p => p + 1);
    }, 600);
    setTimeout(() => setPhotocycleState('N560'), 900);
    setTimeout(() => setPhotocycleState('O640'), 1200);
    setTimeout(() => {
      setPhotocycleState('bR570');
      setRetinalIsomer('all-trans');
      setIsPhotoexcited(false);
      uiaudio.success();
    }, 1500);
  };

  // Bacteriorhodopsin 7-TM Helix & Retinal Schiff Base Canvas
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
      const memY = 240;

      // Dark Matrix Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Lipid Bilayer Purple Membrane
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, memY - 60, canvas.width, 120);
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, memY - 60); ctx.lineTo(canvas.width, memY - 60);
      ctx.moveTo(0, memY + 60); ctx.lineTo(canvas.width, memY + 60);
      ctx.stroke();

      // 7 Transmembrane Alpha-Helices (Magenta/Purple Columns)
      for (let i = 0; i < 7; i++) {
        const hx = cx - 180 + i * 60;
        ctx.fillStyle = 'rgba(192, 132, 252, 0.4)';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(hx, memY - 70, 36, 140, 8);
        ctx.fill();
        ctx.stroke();
      }

      // Covalently Bound Retinal Chromophore Polyene Chain (Center Helix C)
      ctx.strokeStyle = retinalIsomer === 'all-trans' ? '#ec4899' : '#eab308';
      ctx.lineWidth = 6;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 15;
      ctx.beginPath();

      if (retinalIsomer === 'all-trans') {
        // Linear zig-zag all-trans
        ctx.moveTo(cx - 50, memY - 10);
        ctx.lineTo(cx - 20, memY + 10);
        ctx.lineTo(cx + 10, memY - 10);
        ctx.lineTo(cx + 40, memY + 10);
      } else {
        // Bent 13-cis isomer
        ctx.moveTo(cx - 50, memY - 10);
        ctx.lineTo(cx - 10, memY + 30);
        ctx.lineTo(cx + 30, memY + 5);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Lys216 Schiff Base Nitrogen
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx + 40, memY + 10, 8, 0, Math.PI * 2);
      ctx.fill();

      // Pumping Proton (H+) escaping to Extracellular side (Top)
      if (photocycleState === 'M412') {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, memY - 90, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [retinalIsomer, photocycleState]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Sun className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '14s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-amber-400">
                BACTERIORHODOPSIN // LIGHT-DRIVEN PROTON PUMP
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                570 NM GREEN PHOTON ABSORPTION
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Femtosecond all-trans to 13-cis retinal photoisomerization & bR photocycle for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerPhotonFlash}
            disabled={isPhotoexcited}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPhotoexcited ? 'PHOTOCYCLE IN PROGRESS...' : 'FLASH 570 NM PHOTON'}</span>
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
              <span className="text-purple-400 font-bold">STATE: {photocycleState}</span>
              <span className="text-pink-400 font-bold">ISOMER: {retinalIsomer}</span>
            </div>
            <div>STATUS: {photocycleState === 'M412' ? 'SCHIFF BASE DEPROTONATION (H+ EJECTION)' : 'RESTING STATE bR570'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PHOTOBIOLOGY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Ultrafast Photoisomerization:</strong> Retinal isomerizes in 500 femtoseconds, one of the fastest reactions in biology.</div>
            <div>• <strong>Proton Motive Force:</strong> Pumping generates electrochemical gradient driving ATP synthesis without chlorophyll!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
