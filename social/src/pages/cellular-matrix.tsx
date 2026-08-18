import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, Play, Pause, RotateCcw, Zap, 
  Sparkles, Sliders, Layers, RefreshCw
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const COLS = 60;
const ROWS = 40;

export default function CellularMatrix() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isRunning, setIsRunning] = useState(true);
  const [generation, setGeneration] = useState(0);
  const [population, setPopulation] = useState(0);

  const gridRef = useRef<number[][]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Random Seed Grid
  const initGrid = () => {
    const g: number[][] = [];
    let pop = 0;
    for (let r = 0; r < ROWS; r++) {
      const row: number[] = [];
      for (let c = 0; c < COLS; c++) {
        const val = Math.random() > 0.8 ? 1 : 0;
        if (val === 1) pop++;
        row.push(val);
      }
      g.push(row);
    }
    gridRef.current = g;
    setPopulation(pop);
    setGeneration(0);
  };

  useEffect(() => {
    initGrid();
  }, []);

  // Cellular Automata Evolution Step (B3/S23 Conway's Game of Life)
  const stepEvolution = () => {
    const current = gridRef.current;
    if (current.length === 0) return;

    const next: number[][] = [];
    let pop = 0;

    for (let r = 0; r < ROWS; r++) {
      const nextRow: number[] = [];
      for (let c = 0; c < COLS; c++) {
        // Count 8-Moore Neighbors
        let neighbors = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const nr = (r + i + ROWS) % ROWS;
            const nc = (c + j + COLS) % COLS;
            if (current[nr][nc] === 1) neighbors++;
          }
        }

        // B3/S23 Rules
        let cellState = 0;
        if (current[r][c] === 1 && (neighbors === 2 || neighbors === 3)) {
          cellState = 1;
        } else if (current[r][c] === 0 && neighbors === 3) {
          cellState = 1;
        }

        if (cellState === 1) pop++;
        nextRow.push(cellState);
      }
      next.push(nextRow);
    }

    gridRef.current = next;
    setPopulation(pop);
    setGeneration(g => g + 1);
  };

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;

    let timer = 0;

    const loop = () => {
      timer++;
      if (isRunning && timer % 4 === 0) {
        stepEvolution();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const g = gridRef.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (g[r] && g[r][c] === 1) {
            ctx.fillStyle = '#06b6d4';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 8;
            ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
            ctx.shadowBlur = 0;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Grid className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
              CELLULAR MATRIX // CONWAY'S LIFE (B3/S23)
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Turing-complete emergent cellular automata & glider dynamics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => { uiaudio.click(); setIsRunning(!isRunning); }}
            className={cn(
              "px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-md",
              isRunning ? "bg-cyan-500 text-black shadow-cyan-500/30" : "bg-zinc-800 text-zinc-300"
            )}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isRunning ? 'EVOLVING' : 'PAUSED'}</span>
          </button>
          <button
            onClick={() => { uiaudio.warp(); initGrid(); }}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Randomize Matrix"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Matrix Canvas Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
          <div className="bg-zinc-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-cyan-300">
            GENERATION: {generation}
          </div>

          <div className="bg-zinc-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-emerald-400">
            POPULATION: {population} LIVE CELLS
          </div>
        </div>
      </div>
    </div>
  );
}
