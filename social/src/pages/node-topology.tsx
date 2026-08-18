import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, Globe, Radio, Activity, ShieldCheck, Zap, 
  Server, Cpu, Layers, Sliders, RefreshCw, Terminal
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface NodeHub {
  id: string;
  name: string;
  country: string;
  x: number;
  y: number;
  latencyMs: number;
  bandwidthTbps: number;
  status: 'optimal' | 'congested' | 'rebalancing';
  peersCount: number;
  color: string;
}

const GLOBAL_HUBS: NodeHub[] = [
  { id: 'hub-1', name: 'Bengaluru Core-1', country: 'India', x: 520, y: 310, latencyMs: 2.4, bandwidthTbps: 42.5, status: 'optimal', peersCount: 840, color: '#06b6d4' },
  { id: 'hub-2', name: 'Tokyo Tachyon-East', country: 'Japan', x: 650, y: 220, latencyMs: 14.8, bandwidthTbps: 38.0, status: 'optimal', peersCount: 720, color: '#ec4899' },
  { id: 'hub-3', name: 'Frankfurt DE-CIX', country: 'Germany', x: 380, y: 190, latencyMs: 28.1, bandwidthTbps: 56.4, status: 'optimal', peersCount: 1120, color: '#10b981' },
  { id: 'hub-4', name: 'Silicon Valley Equinix', country: 'USA', x: 180, y: 210, latencyMs: 64.2, bandwidthTbps: 68.2, status: 'optimal', peersCount: 1450, color: '#f59e0b' },
  { id: 'hub-5', name: 'Singapore Equinix-SG', country: 'Singapore', x: 560, y: 340, latencyMs: 8.9, bandwidthTbps: 31.0, status: 'optimal', peersCount: 560, color: '#a855f7' },
  { id: 'hub-6', name: 'Dubai DCOM Gate', country: 'UAE', x: 440, y: 260, latencyMs: 19.5, bandwidthTbps: 24.8, status: 'optimal', peersCount: 410, color: '#38bdf8' },
  { id: 'hub-7', name: 'São Paulo NAP', country: 'Brazil', x: 280, y: 410, latencyMs: 88.0, bandwidthTbps: 18.2, status: 'rebalancing', peersCount: 320, color: '#f43f5e' },
];

interface Packet {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  color: string;
}

export default function NodeTopology() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hubs, setHubs] = useState<NodeHub[]>(GLOBAL_HUBS);
  const [selectedHubId, setSelectedHubId] = useState<string>(GLOBAL_HUBS[0].id);
  const [totalBandwidth, setTotalBandwidth] = useState(279.1);
  const [ddosSimActive, setDdosSimActive] = useState(false);

  const selectedHub = hubs.find(h => h.id === selectedHubId) || hubs[0];
  const packetsRef = useRef<Packet[]>([]);

  // Topology Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let spawnTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Matrix Mesh Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Inter-Hub Fiber Trunk Lines
      for (let i = 0; i < hubs.length; i++) {
        for (let j = i + 1; j < hubs.length; j++) {
          const h1 = hubs[i];
          const h2 = hubs[j];

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(h1.x, h1.y);
          ctx.lineTo(h2.x, h2.y);
          ctx.stroke();
        }
      }

      // Spawn Routing Packets
      spawnTimer++;
      if (spawnTimer > 8) {
        spawnTimer = 0;
        const fromH = hubs[Math.floor(Math.random() * hubs.length)];
        const toH = hubs[Math.floor(Math.random() * hubs.length)];
        if (fromH.id !== toH.id) {
          packetsRef.current.push({
            x: fromH.x,
            y: fromH.y,
            targetX: toH.x,
            targetY: toH.y,
            progress: 0,
            color: fromH.color,
          });
        }
      }

      // Update & Draw Packets
      for (let i = packetsRef.current.length - 1; i >= 0; i--) {
        const p = packetsRef.current[i];
        p.progress += 0.03;

        const curX = p.x + (p.targetX - p.x) * p.progress;
        const curY = p.y + (p.targetY - p.y) * p.progress;

        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(curX, curY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.progress >= 1) packetsRef.current.splice(i, 1);
      }

      // Draw Node Hubs
      hubs.forEach(hub => {
        const isSelected = hub.id === selectedHubId;

        // Pulsating outer ring
        ctx.strokeStyle = hub.color;
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.shadowColor = hub.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, isSelected ? 18 : 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = hub.color;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, isSelected ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Hub Name Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(hub.name, hub.x - 30, hub.y - 20);
      });

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [hubs, selectedHubId]);

  const handleSimulateDDoS = () => {
    uiaudio.warp();
    setDdosSimActive(true);

    setTimeout(() => {
      uiaudio.success();
      setDdosSimActive(false);
      setTotalBandwidth(312.4);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Network className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-teal-400">
                NODE TOPOLOGY // GLOBAL MESH ROUTING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                40-HUB DECENTRALIZED
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Live fiber optic trunk packet flow and latency telemetry for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">GLOBAL THROUGHPUT</div>
            <div className="text-lg font-bold text-cyan-300">{totalBandwidth} Tbps</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas World Topology Map (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={750}
            height={520}
            className="w-full h-auto block cursor-pointer"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>CONSENSUS STATE: BYZANTINE FAULT TOLERANT (BFT)</span>
            </div>
            <div>STATUS: {ddosSimActive ? 'DEFLECTING DDoS VIA ANYCAST' : 'ALL TRUNK LINES CLEAR'}</div>
          </div>
        </div>

        {/* Selected Hub Inspector (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Server className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              HUB TELEMETRY
            </h3>
          </div>

          {/* Hubs Roster */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {hubs.map((hub) => (
              <div
                key={hub.id}
                onClick={() => {
                  uiaudio.click();
                  setSelectedHubId(hub.id);
                }}
                className={cn(
                  "p-2.5 rounded-xl cursor-pointer transition-all border flex items-center justify-between",
                  selectedHubId === hub.id 
                    ? "bg-zinc-800/80 border-cyan-500/40 shadow-md text-white" 
                    : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:border-white/10"
                )}
              >
                <div className="flex items-center space-x-2 truncate">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hub.color }} />
                  <span className="font-bold truncate">{hub.name}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-bold">{hub.latencyMs}ms</span>
              </div>
            ))}
          </div>

          {/* Detailed Readouts */}
          {selectedHub && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="p-3 bg-zinc-950 rounded-xl border border-white/10 space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Trunk Latency:</span>
                  <span className="text-cyan-300 font-bold">{selectedHub.latencyMs} ms</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Local Bandwidth:</span>
                  <span className="text-emerald-300 font-bold">{selectedHub.bandwidthTbps} Tbps</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Active Peer Relays:</span>
                  <span className="text-purple-300 font-bold">{selectedHub.peersCount} nodes</span>
                </div>
              </div>

              <button
                onClick={handleSimulateDDoS}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold tracking-wider text-xs shadow-lg hover:brightness-110 flex items-center justify-center space-x-2 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>TEST ANYCAST DDoS DEFLECTION</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
