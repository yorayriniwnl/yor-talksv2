import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Sliders, Play, RotateCcw, Zap, 
  Layers, Download, Palette, RefreshCw, ZoomIn, ZoomOut
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type FractalType = 'mandelbrot' | 'julia' | 'burningship';

export default function FractalStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');
  const [maxIterations, setMaxIterations] = useState(80);
  const [zoom, setZoom] = useState(1);
  const [centerX, setCenterX] = useState(-0.5);
  const [centerY, setCenterY] = useState(0);
  const [colorOffset, setColorOffset] = useState(0);
  const [isRendering, setIsRendering] = useState(false);

  const renderFractal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const scale = 3.0 / (zoom * width);
    const juliaCr = -0.7;
    const juliaCi = 0.27015;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let zx = (x - width / 2) * scale + centerX;
        let zy = (y - height / 2) * scale + centerY;

        let cx = zx;
        let cy = zy;

        if (fractalType === 'julia') {
          cx = juliaCr;
          cy = juliaCi;
        }

        let iter = 0;

        while (zx * zx + zy * zy < 4 && iter < maxIterations) {
          if (fractalType === 'burningship') {
            const xtemp = zx * zx - zy * zy + cx;
            zy = Math.abs(2 * zx * zy) + cy;
            zx = Math.abs(xtemp);
          } else {
            const xtemp = zx * zx - zy * zy + cx;
            zy = 2 * zx * zy + cy;
            zx = xtemp;
          }
          iter++;
        }

        const pIdx = (y * width + x) * 4;

        if (iter === maxIterations) {
          data[pIdx] = 0;     // R
          data[pIdx + 1] = 0; // G
          data[pIdx + 2] = 0; // B
          data[pIdx + 3] = 255;
        } else {
          const hue = (iter * 8 + colorOffset) % 360;
          // Fast HSL to RGB approximation
          data[pIdx] = Math.floor(Math.sin((hue * Math.PI) / 180) * 127 + 128);
          data[pIdx + 1] = Math.floor(Math.sin(((hue + 120) * Math.PI) / 180) * 127 + 128);
          data[pIdx + 2] = Math.floor(Math.sin(((hue + 240) * Math.PI) / 180) * 127 + 128);
          data[pIdx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    setIsRendering(false);
  };

  useEffect(() => {
    renderFractal();
  }, [fractalType, maxIterations, zoom, centerX, centerY, colorOffset]);

  const handleZoomIn = () => {
    uiaudio.hover();
    setZoom(z => z * 1.6);
  };

  const handleZoomOut = () => {
    uiaudio.hover();
    setZoom(z => Math.max(0.5, z / 1.6));
  };

  const handleReset = () => {
    uiaudio.click();
    setZoom(1);
    setCenterX(fractalType === 'mandelbrot' ? -0.5 : 0);
    setCenterY(0);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '12s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                FRACTAL STUDIO // MATHEMATICAL SHADER ENGINE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                COMPLEX PLANE ℂ
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Infinite deep-zoom Mandelbrot, Julia, and Burning Ship shader visualizer for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={handleZoomIn}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Reset Coordinates"
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
            width={720}
            height={520}
            className="w-full h-auto block"
          />

          {/* Quick HUD Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div>MAGNIFICATION: {zoom.toFixed(1)}X</div>
            <div>COORDINATES: Re({centerX.toFixed(4)}), Im({centerY.toFixed(4)})</div>
          </div>
        </div>

        {/* Shader Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              FRACTAL PARAMETERS
            </h3>
          </div>

          {/* Fractal Type */}
          <div className="space-y-1.5">
            <span className="text-zinc-400">Equation Model:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['mandelbrot', 'julia', 'burningship'] as FractalType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    uiaudio.click();
                    setFractalType(t);
                    setZoom(1);
                    setCenterX(t === 'mandelbrot' ? -0.5 : 0);
                  }}
                  className={cn(
                    "py-2 rounded-xl text-[10px] uppercase font-bold transition-all border",
                    fractalType === t
                      ? "bg-purple-500 text-white border-purple-400 shadow-sm"
                      : "bg-zinc-950 text-zinc-400 border-white/5"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Iteration Depth */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Max Iteration Depth:</span>
              <span className="text-purple-400 font-bold">{maxIterations} iters</span>
            </div>
            <input
              type="range"
              min={20}
              max={250}
              value={maxIterations}
              onChange={(e) => setMaxIterations(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Color Phase Shift */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Palette Phase Shift:</span>
              <span className="text-pink-400 font-bold">{colorOffset}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={colorOffset}
              onChange={(e) => setColorOffset(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <button
            onClick={() => {
              uiaudio.warp();
              setColorOffset(Math.floor(Math.random() * 360));
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 text-white font-bold tracking-wider text-xs shadow-lg hover:brightness-110 flex items-center justify-center space-x-2 transition-all"
          >
            <Palette className="w-4 h-4" />
            <span>RANDOMIZE CHROMATIC SHIFT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
