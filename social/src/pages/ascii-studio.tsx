import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Terminal, Copy, Download, RefreshCw, Palette, 
  Layers, Sliders, Play, Pause, Camera, Eye, Zap
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const CHAR_SETS = {
  matrix: 'ｦｱｳｴｵｶｷｹｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789:・."=*+-<>',
  standard: '@%#*+=-:. ',
  blocks: '█▓▒░ ',
  cyber: '▲▼◄►■□◆◇○●★☆10',
  runes: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚻᚼᚽᚾᚿᛁᛂᛃᛄᛅᛆᛇᛈᛉᛊᛋᛌᛍᛎ',
};

const COLOR_PALETTES = [
  { name: 'Matrix Cyberpunk', color: '#10b981', bg: '#030712' },
  { name: 'Tokyo Neon Pink', color: '#ec4899', bg: '#030712' },
  { name: 'Cyan Hologram', color: '#06b6d4', bg: '#020617' },
  { name: 'Solar Amber', color: '#f59e0b', bg: '#0c0a09' },
  { name: 'Deep Space Violet', color: '#a855f7', bg: '#05020c' },
];

export default function AsciiStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeSetKey, setActiveSetKey] = useState<keyof typeof CHAR_SETS>('matrix');
  const [activePalette, setActivePalette] = useState(COLOR_PALETTES[0]);
  const [fontSize, setFontSize] = useState(14);
  const [speed, setSpeed] = useState(1);
  const [density, setDensity] = useState(0.85);
  const [isGlitching, setIsGlitching] = useState(true);
  const [fps, setFps] = useState(60);

  const animFrameRef = useRef<number | null>(null);

  // Matrix Rain Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 550);

    const charString = CHAR_SETS[activeSetKey];
    const columns = Math.floor(width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    let lastTime = performance.now();
    let frameCount = 0;

    const render = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = time;
      }

      // Fade canvas slightly to create trailing glow
      ctx.fillStyle = `${activePalette.bg}22`;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = activePalette.color;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        if (Math.random() > density) continue;

        const char = charString[Math.floor(Math.random() * charString.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Draw bright head character
        if (Math.random() > 0.85) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = activePalette.color;
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = activePalette.color;
          ctx.shadowBlur = 0;
        }

        ctx.fillText(char, x, y);

        // Reset drop to top with random delay
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i] += speed;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 550;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeSetKey, activePalette, fontSize, speed, density]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Terminal className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                ASCII STUDIO // MATRIX RAIN & SHADER ENGINE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                GLSL REALTIME
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Generative Unicode & Katakana particle rain synthesizer for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Real-time FPS & Buffer HUD */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">RENDER FPS</div>
            <div className="text-lg font-bold text-emerald-400">{fps} FPS</div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-[550px] block"
          />

          {/* Quick HUD Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none font-mono text-[11px] text-zinc-500 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10">
            <div className="flex items-center space-x-2 text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>ACTIVE CHAR BUFFER: {CHAR_SETS[activeSetKey].length} SYMBOLS</span>
            </div>
            <div>PALETTE: {activePalette.name.toUpperCase()}</div>
          </div>
        </div>

        {/* Controls Inspector (1 Col) */}
        <div className="space-y-5 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SHADER CONTROLS
            </h3>
          </div>

          {/* Character Set Select */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-zinc-400">Character Encoding</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(CHAR_SETS).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    uiaudio.click();
                    setActiveSetKey(key as keyof typeof CHAR_SETS);
                  }}
                  className={cn(
                    "p-2 rounded-xl text-xs font-mono uppercase transition-all border",
                    activeSetKey === key
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm"
                      : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/10"
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palettes */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-zinc-400">Color Spectrum</label>
            <div className="space-y-1.5">
              {COLOR_PALETTES.map((pal) => (
                <button
                  key={pal.name}
                  onClick={() => {
                    uiaudio.warp();
                    setActivePalette(pal);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-mono transition-all border",
                    activePalette.name === pal.name
                      ? "bg-zinc-800 border-white/20 shadow-md text-white"
                      : "bg-zinc-950/60 text-zinc-400 border-white/5 hover:border-white/10"
                  )}
                >
                  <span>{pal.name}</span>
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: pal.color }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Slider */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Font Size</span>
              <span className="text-emerald-400 font-bold">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={8}
              max={28}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Rain Velocity Slider */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Rain Velocity</span>
              <span className="text-cyan-400 font-bold">{speed}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Density Slider */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Matrix Stream Density</span>
              <span className="text-amber-400 font-bold">{Math.round(density * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
