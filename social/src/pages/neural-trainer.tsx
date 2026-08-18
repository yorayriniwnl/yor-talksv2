import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface LayerNode {
  x: number;
  y: number;
  val: number;
  activation: number;
}

export default function NeuralTrainer() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState(0.842);
  const [accuracy, setAccuracy] = useState(62.4);
  const [isTraining, setIsTraining] = useState(false);
  const [learningRate, setLearningRate] = useState(0.01);
  const [activationFunc, setActivationFunc] = useState<'ReLU' | 'Sigmoid' | 'GELU'>('GELU');

  const animFrameRef = useRef<number | null>(null);

  // Train Epoch Interval
  useEffect(() => {
    if (!isTraining) return;

    const interval = window.setInterval(() => {
      setEpoch(e => e + 1);
      setLoss(l => Math.max(0.012, +(l * 0.985).toFixed(4)));
      setAccuracy(a => Math.min(99.4, +(a + (100 - a) * 0.03).toFixed(1)));
    }, 150);

    return () => clearInterval(interval);
  }, [isTraining]);

  // Neural Network Architecture Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const layers = [3, 5, 5, 2]; // 3 Input, 5 Hidden 1, 5 Hidden 2, 2 Output

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const layerNodes: LayerNode[][] = [];
      const layerSpacing = canvas.width / (layers.length + 1);

      // Build Node Positions
      layers.forEach((numNodes, lIdx) => {
        const nodes: LayerNode[] = [];
        const x = layerSpacing * (lIdx + 1);
        const nodeSpacing = canvas.height / (numNodes + 1);

        for (let n = 0; n < numNodes; n++) {
          const y = nodeSpacing * (n + 1);
          const act = Math.sin(time + lIdx * 1.5 + n) * 0.5 + 0.5;
          nodes.push({ x, y, val: act, activation: act });
        }
        layerNodes.push(nodes);
      });

      // Draw Synaptic Weight Connections
      for (let l = 0; l < layerNodes.length - 1; l++) {
        const fromNodes = layerNodes[l];
        const toNodes = layerNodes[l + 1];

        fromNodes.forEach(fn => {
          toNodes.forEach(tn => {
            const weightVal = Math.sin(fn.x + tn.y + time);
            ctx.strokeStyle = weightVal > 0 ? 'rgba(6, 182, 212, 0.25)' : 'rgba(236, 72, 153, 0.25)';
            ctx.lineWidth = Math.abs(weightVal) * 2;
            ctx.beginPath();
            ctx.moveTo(fn.x, fn.y);
            ctx.lineTo(tn.x, tn.y);
            ctx.stroke();
          });
        });
      }

      // Draw Artificial Neurons
      layerNodes.forEach((nodes, lIdx) => {
        nodes.forEach(node => {
          const color = lIdx === 0 ? '#38bdf8' : (lIdx === layerNodes.length - 1 ? '#10b981' : '#a855f7');

          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const toggleTraining = () => {
    if (!isTraining) {
      uiaudio.warp();
      setIsTraining(true);
    } else {
      uiaudio.click();
      setIsTraining(false);
    }
  };

  const handleReset = () => {
    uiaudio.click();
    setIsTraining(false);
    setEpoch(0);
    setLoss(0.842);
    setAccuracy(62.4);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
                NEURAL TRAINER // BACKPROPAGATION SANDBOX
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ADAM OPTIMIZER
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Multi-layer perceptron gradient descent & synapse weight visualizer for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">LOSS (CROSS-ENTROPY)</div>
            <div className="text-lg font-bold text-pink-400">{loss}</div>
          </div>
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">TEST ACCURACY</div>
            <div className="text-lg font-bold text-emerald-400">{accuracy}%</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Architecture (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={740}
            height={500}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-cyan-400 font-bold">INPUT LAYER [3]</span>
              <span className="text-purple-400 font-bold">HIDDEN LAYERS [5, 5]</span>
              <span className="text-emerald-400 font-bold">OUTPUT [2]</span>
            </div>
            <div>EPOCH: {epoch} COMPLETED</div>
          </div>
        </div>

        {/* Hyperparameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              HYPERPARAMETERS
            </h3>
          </div>

          {/* Activation Function */}
          <div className="space-y-1.5">
            <span className="text-zinc-400">Non-Linear Activation:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['GELU', 'ReLU', 'Sigmoid'] as const).map((func) => (
                <button
                  key={func}
                  onClick={() => { uiaudio.hover(); setActivationFunc(func); }}
                  className={cn(
                    "py-1.5 rounded-lg text-[10px] uppercase font-bold",
                    activationFunc === func ? "bg-purple-500 text-white shadow-sm" : "bg-zinc-950 text-zinc-400"
                  )}
                >
                  {func}
                </button>
              ))}
            </div>
          </div>

          {/* Learning Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Learning Rate (η):</span>
              <span className="text-purple-400 font-bold">{learningRate}</span>
            </div>
            <input
              type="range"
              min={0.001}
              max={0.05}
              step={0.002}
              value={learningRate}
              onChange={(e) => setLearningRate(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <button
            onClick={toggleTraining}
            className={cn(
              "w-full py-3.5 rounded-xl font-bold tracking-wider text-xs shadow-lg transition-all flex items-center justify-center space-x-2",
              isTraining
                ? "bg-amber-500 text-black shadow-amber-500/30 animate-pulse"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>{isTraining ? 'PAUSE TRAINING' : 'TRAIN NEURAL NETWORK'}</span>
          </button>

          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET WEIGHT MATRICES</span>
          </button>
        </div>
      </div>
    </div>
  );
}
