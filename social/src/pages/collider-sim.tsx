import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, Pause, RotateCcw, 
  Activity, Sliders, Sparkles, Trophy, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface CollisionTrack {
  angle: number;
  length: number;
  color: string;
  type: 'muon' | 'electron' | 'hadron' | 'photon';
}

export default function ColliderSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [beamEnergyTev, setBeamEnergyTev] = useState(13.6);
  const [luminosity, setLuminosity] = useState(2.1);
  const [higgsEventsDetected, setHiggsEventsDetected] = useState(14);
  const [isColliding, setIsColliding] = useState(false);

  const tracksRef = useRef<CollisionTrack[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const triggerCollision = () => {
    uiaudio.warp();
    setIsColliding(true);

    const tracks: CollisionTrack[] = [];
    const numTracks = Math.floor(Math.random() * 40) + 30;

    for (let i = 0; i < numTracks; i++) {
      const types: ('muon' | 'electron' | 'hadron' | 'photon')[] = ['muon', 'electron', 'hadron', 'photon'];
      const type = types[Math.floor(Math.random() * types.length)];
      const colors = { muon: '#ef4444', electron: '#38bdf8', hadron: '#eab308', photon: '#10b981' };

      tracks.push({
        angle: Math.random() * Math.PI * 2,
        length: Math.random() * 220 + 80,
        color: colors[type],
        type,
      });
    }

    tracksRef.current = tracks;

    // Check for Higgs discovery event
    if (Math.random() > 0.4) {
      setTimeout(() => {
        uiaudio.success();
        setHiggsEventsDetected(h => h + 1);
      }, 300);
    }
  };

  // Particle Detector Canvas (ATLAS / CMS Cross-section)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Chamber
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Detector Concentric Shells (Tracker, ECAL, HCAL, Muon Chambers)
      const shells = [
        { r: 70, name: 'SILICON PIXEL TRACKER', color: 'rgba(6, 182, 212, 0.3)' },
        { r: 130, name: 'ECAL (ELECTROMAGNETIC)', color: 'rgba(139, 92, 246, 0.25)' },
        { r: 190, name: 'HCAL (HADRONIC)', color: 'rgba(234, 179, 8, 0.2)' },
        { r: 250, name: 'MUON SPECTROMETER', color: 'rgba(239, 68, 68, 0.2)' },
      ];

      shells.forEach((s) => {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, s.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw Superconducting Magnetic Field Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 260, cy + Math.sin(a) * 260);
        ctx.stroke();
      }

      // Draw Collision Tracks (Curved helical trajectories in B-field)
      tracksRef.current.forEach((tr) => {
        ctx.strokeStyle = tr.color;
        ctx.lineWidth = tr.type === 'muon' ? 3 : 1.5;
        ctx.shadowColor = tr.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();

        ctx.moveTo(cx, cy);
        // Helical curve due to Lorentz force: F = q(E + v x B)
        const bend = tr.type === 'photon' ? 0 : 0.25;
        const endX = cx + Math.cos(tr.angle + bend) * tr.length;
        const endY = cy + Math.sin(tr.angle + bend) * tr.length;

        ctx.quadraticCurveTo(
          cx + Math.cos(tr.angle) * (tr.length * 0.5),
          cy + Math.sin(tr.angle) * (tr.length * 0.5),
          endX,
          endY
        );
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                LHC COLLIDER // HIGGS BOSON PARTICLE PHYSICS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                13.6 TEV CENTER-OF-MASS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Superconducting hadron collision tracking & invariant mass analysis for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Higgs Discovery Counter */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-zinc-400">H(125 GeV):</span>
            <span className="text-pink-400 font-bold">{higgsEventsDetected} EVENTS</span>
          </div>
          <button
            onClick={triggerCollision}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>TRIGGER 13.6 TEV PROTON COLLISION</span>
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
            height={520}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-red-400 font-bold">● MUONS</span>
              <span className="text-cyan-400 font-bold">● ELECTRONS</span>
              <span className="text-amber-400 font-bold">● HADRONS</span>
              <span className="text-emerald-400 font-bold">● PHOTONS</span>
            </div>
            <div>MAGNETIC FIELD: 4.0 TESLA SOLENOID</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BEAM TELEMETRY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Center-of-Mass Energy:</span>
              <span className="text-cyan-400 font-bold">{beamEnergyTev} TeV</span>
            </div>
            <input
              type="range"
              min={7.0}
              max={14.0}
              step={0.2}
              value={beamEnergyTev}
              onChange={(e) => setBeamEnergyTev(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">STANDARD MODEL DECAYS:</span>
            <div>• $H \to \gamma\gamma$ (Diphoton clean peak).</div>
            <div>• $H \to ZZ^* \to 4\ell$ (Golden four-lepton channel).</div>
          </div>
        </div>
      </div>
    </div>
  );
}
