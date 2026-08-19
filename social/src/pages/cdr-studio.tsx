import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Brain
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CdrStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [trainingCircuitsCount, setTrainingCircuitsCount] = useState(32); // 32 near-Clifford training circuits
  const [isTraining, setIsTraining] = useState(false);
  const [targetMitigatedExpectation, setTargetMitigatedExpectation] = useState(0.988); // Mitigated non-Clifford result

  const animFrameRef = useRef<number | null>(null);

  const runCdrCalibration = () => {
    uiaudio.warp();
    setIsTraining(true);

    setTimeout(() => {
      setIsTraining(false);
      setTargetMitigatedExpectation(0.994);
      uiaudio.success();
    }, 800);
  };

  // Clifford Data Regression (CDR) Machine Learning Calibration Canvas
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

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Coordinate System: X = Noisy Hardware Value (0 to 1), Y = Exact Classical Clifford Value (0 to 1)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Y-axis
      ctx.moveTo(120, 60); ctx.lineTo(120, 380);
      // X-axis
      ctx.moveTo(120, 380); ctx.lineTo(canvas.width - 60, 380);
      ctx.stroke();

      // Ideal Noiseless Diagonal (y = x reference line)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(120, 380); ctx.lineTo(120 + 300, 380 - 300);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Trained Linear ML Regression Fit Line: y = a*x + b
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isTraining ? 15 : 4;
      ctx.beginPath();
      ctx.moveTo(120, 380 - 0.12 * 300);
      ctx.lineTo(120 + 320, 380 - (0.12 + 1.25 * 0.8) * 300);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Scatter Plot of Near-Clifford Training Points (Gottesman-Knill Exact vs Hardware Noisy)
      for (let i = 0; i < trainingCircuitsCount; i++) {
        const trueVal = 0.2 + (i / trainingCircuitsCount) * 0.75;
        // Hardware attenuation due to noise: noisyVal = 0.75 * trueVal - 0.05
        const noisyVal = (trueVal - 0.1) / 1.2 + (Math.sin(i * 3.7) * 0.03);

        const px = 120 + noisyVal * 300;
        const py = 380 - trueVal * 300;

        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Highlight Non-Clifford Target State Point (Green Star Point after ML regression)
      const targetNoisy = 0.68;
      const targetMitigated = targetMitigatedExpectation;
      const tX = 120 + targetNoisy * 300;
      const tY = 380 - targetMitigated * 300;

      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(tX, tY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CDR MITIGATED TARGET VALUE: ⟨O⟩_mit = ${targetMitigatedExpectation.toFixed(3)} (NOISY HARDWARE = 0.680)`,
        90,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [trainingCircuitsCount, targetMitigatedExpectation, isTraining]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                CLIFFORD DATA REGRESSION // MACHINE LEARNING ERROR MITIGATION (CDR)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CZARNIK & COLES (LOS ALAMOS)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Near-Clifford Gottesman-Knill training dataset & ML hardware calibration for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runCdrCalibration}
            disabled={isTraining}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTraining ? 'TRAINING ML REGRESSOR ON CLIFFORD CIRCUITS...' : 'CALIBRATE & MITIGATE TARGET STATE'}</span>
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
              <span className="text-cyan-400 font-bold">TRAINING CIRCUITS: {trainingCircuitsCount}</span>
              <span className="text-pink-400 font-bold">RAW NOISY: 0.680</span>
              <span className="text-emerald-400 font-bold">CDR PREDICTION: {targetMitigatedExpectation.toFixed(3)}</span>
            </div>
            <div>STATUS: ZERO ANCILLA HARDWARE OVERHEAD</div>
          </div>
        </div>

        {/* CDR Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TRAINING SAMPLES
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Clifford Circuits (M):</span>
              <span className="text-cyan-400 font-bold">{trainingCircuitsCount}</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              step={8}
              value={trainingCircuitsCount}
              onChange={(e) => setTrainingCircuitsCount(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Gottesman-Knill Simulatability:</strong> By replacing non-Clifford T gates with Clifford rotations, exact ideal expectation values are calculated classically in polynomial time!</div>
            <div>• <strong>Ansatz Regression:</strong> A linear regression model learns the device's specific multi-qubit error response from the Clifford dataset and generalises to the non-Clifford circuit!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
