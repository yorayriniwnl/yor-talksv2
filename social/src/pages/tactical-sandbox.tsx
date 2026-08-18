import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Crosshair, Play, Pause, RotateCcw, MapPin, Eye, 
  Flame, Wind, Target, Users, Zap, Layers, Sliders, ChevronRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface TacticalNode {
  id: string;
  x: number;
  y: number;
  team: 'attackers' | 'defenders';
  role: 'duelist' | 'initiator' | 'controller' | 'sentinel';
  name: string;
  angle: number;
  fovDeg: number;
  hasSpike?: boolean;
}

interface UtilityDrop {
  id: string;
  x: number;
  y: number;
  type: 'smoke' | 'flash' | 'molly' | 'recon';
  radius: number;
  color: string;
  durationSec: number;
}

const MAP_PRESETS = ['Cyber-Kashi A-Site', 'Neo-Bengaluru Mid', 'Indus Delta Haven', 'Ascent Courtyard'];

export default function TacticalSandbox() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeMap, setActiveMap] = useState(MAP_PRESETS[0]);
  const [activeTool, setActiveTool] = useState<'select' | 'smoke' | 'flash' | 'molly' | 'waypoint'>('select');
  const [isPlayingRound, setIsPlayingRound] = useState(false);
  const [spikePlanted, setSpikePlanted] = useState(false);
  const [defusalProgress, setDefusalProgress] = useState(0);

  const [nodes, setNodes] = useState<TacticalNode[]>([
    { id: '1', x: 180, y: 380, team: 'attackers', role: 'duelist', name: 'Anya (Entry)', angle: -0.6, fovDeg: 80, hasSpike: true },
    { id: '2', x: 120, y: 440, team: 'attackers', role: 'controller', name: 'Tariq (Smoker)', angle: -0.8, fovDeg: 80 },
    { id: '3', x: 220, y: 460, team: 'attackers', role: 'initiator', name: 'Soraya (Flash)', angle: -0.4, fovDeg: 80 },
    { id: '4', x: 520, y: 160, team: 'defenders', role: 'sentinel', name: 'Kazuki (Anchor)', angle: 2.6, fovDeg: 80 },
    { id: '5', x: 620, y: 220, team: 'defenders', role: 'duelist', name: 'Elena (Retake)', angle: 3.1, fovDeg: 80 },
  ]);

  const [utilities, setUtilities] = useState<UtilityDrop[]>([
    { id: 'u1', x: 440, y: 240, type: 'smoke', radius: 45, color: '#38bdf8', durationSec: 15 },
    { id: 'u2', x: 510, y: 280, type: 'molly', radius: 35, color: '#f97316', durationSec: 8 },
  ]);

  const selectedNodeId = useRef<string | null>(null);

  // Tactical Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Map Architectural Blueprints
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Matrix
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Map Walls & Obstacles (Cyber Site Blueprints)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;

    // Site Box 1
    ctx.fillRect(360, 140, 110, 80);
    ctx.strokeRect(360, 140, 110, 80);

    // Site Box 2 (Pillar)
    ctx.fillRect(480, 260, 60, 60);
    ctx.strokeRect(480, 260, 60, 60);

    // Heaven Balcony
    ctx.fillRect(580, 80, 140, 40);
    ctx.strokeRect(580, 80, 140, 40);

    // Plant Site Outline Zone (A-Site)
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(330, 110, 240, 240);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(234, 179, 8, 0.05)';
    ctx.fillRect(330, 110, 240, 240);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('A-SITE PLANT ZONE', 345, 130);

    // 2. Draw Active Utilities (Smokes, Mollies, etc.)
    utilities.forEach(util => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(util.x, util.y, util.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${util.color}33`;
      ctx.fill();
      ctx.strokeStyle = util.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = util.color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();
    });

    // 3. Draw Player Nodes & Field of View (FOV) Cones
    nodes.forEach(node => {
      // Draw FOV Cone
      const fovHalfRad = (node.fovDeg * Math.PI) / 360;
      const fovDist = 180;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.arc(node.x, node.y, fovDist, node.angle - fovHalfRad, node.angle + fovHalfRad);
      ctx.closePath();
      ctx.fillStyle = node.team === 'attackers' ? 'rgba(236, 72, 153, 0.08)' : 'rgba(6, 182, 212, 0.08)';
      ctx.fill();
      ctx.restore();

      // Node Circle
      const isAttacker = node.team === 'attackers';
      const nodeColor = isAttacker ? '#ec4899' : '#06b6d4';

      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.shadowColor = nodeColor;
      ctx.shadowBlur = 12;
      ctx.fill();

      // Inner icon or dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Facing line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(node.x + Math.cos(node.angle) * 22, node.y + Math.sin(node.angle) * 22);
      ctx.stroke();

      // Name label
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(node.name, node.x - 25, node.y - 20);
      ctx.restore();
    });
  }, [nodes, utilities, activeMap]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'smoke') {
      uiaudio.hover();
      setUtilities(prev => [...prev, { id: Math.random().toString(), x, y, type: 'smoke', radius: 45, color: '#38bdf8', durationSec: 15 }]);
    } else if (activeTool === 'molly') {
      uiaudio.warp();
      setUtilities(prev => [...prev, { id: Math.random().toString(), x, y, type: 'molly', radius: 35, color: '#f97316', durationSec: 8 }]);
    } else if (activeTool === 'flash') {
      uiaudio.success();
      setUtilities(prev => [...prev, { id: Math.random().toString(), x, y, type: 'flash', radius: 25, color: '#fde047', durationSec: 3 }]);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Crosshair className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
                TACTICAL SANDBOX // ESPORTS SCRIM WAR ROOM
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                RAYTRACED FOV
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Tactical 2.5D top-down map analyzer, smoke lineups, and execute planner for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Map Switcher */}
        <div className="flex items-center space-x-2 bg-zinc-950/80 p-1.5 rounded-xl border border-white/10 font-mono text-xs">
          {MAP_PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => {
                uiaudio.click();
                setActiveMap(m);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors font-bold",
                activeMap === m ? "bg-pink-500 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tactical Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Map (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={750}
            height={550}
            onClick={handleCanvasClick}
            className="w-full h-auto block cursor-crosshair"
          />

          {/* Quick Toolbar */}
          <div className="absolute top-4 left-4 flex items-center space-x-2 font-mono text-xs bg-zinc-950/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
            {(['select', 'smoke', 'flash', 'molly'] as const).map((tool) => (
              <button
                key={tool}
                onClick={() => {
                  uiaudio.hover();
                  setActiveTool(tool);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg uppercase transition-colors font-bold",
                  activeTool === tool ? "bg-cyan-500 text-black shadow-sm" : "text-zinc-400 hover:text-white"
                )}
              >
                {tool}
              </button>
            ))}
          </div>

          {/* Bottom HUD */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div>ATTACKERS (PINK) vs DEFENDERS (CYAN)</div>
            <div>CLICK MAP TO DEPLOY SELECTED UTILITY GRENADE</div>
          </div>
        </div>

        {/* Tactical Command & Callouts (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Users className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ROSTER & CALLOUTS
            </h3>
          </div>

          <div className="space-y-2">
            {nodes.map(n => (
              <div 
                key={n.id}
                className="p-3 bg-zinc-950/60 rounded-xl border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: n.team === 'attackers' ? '#ec4899' : '#06b6d4' }} />
                  <span className="font-bold text-white">{n.name}</span>
                </div>
                <span className="text-[10px] text-zinc-400 uppercase">{n.role}</span>
              </div>
            ))}
          </div>

          {/* Execute Button */}
          <button
            onClick={() => {
              uiaudio.success();
              setSpikePlanted(true);
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold tracking-wider text-xs shadow-lg hover:brightness-110 flex items-center justify-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>TRIGGER A-SITE EXECUTE LINEUP</span>
          </button>
        </div>
      </div>
    </div>
  );
}
