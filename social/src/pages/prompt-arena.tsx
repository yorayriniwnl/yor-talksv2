import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Brain, Sparkles, Send, Play, RotateCcw, Cpu, Layers, 
  Share2, CheckCircle2, ShieldAlert, Zap, Compass, Terminal, Code
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Agent {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  model: string;
  temperature: number;
  tokenVelocity: number;
  cognitiveLoad: number;
  specialty: string;
}

const AGENTS: Agent[] = [
  { id: '1', name: 'Quantum Architect', role: 'Hardware & Quantum Physics Specialist', avatarColor: '#06b6d4', model: 'Gemini 2.5 Quantum-Pro', temperature: 0.2, tokenVelocity: 142, cognitiveLoad: 88, specialty: 'Superconductivity & Topological Qubits' },
  { id: '2', name: 'Cyberpunk Hacker', role: 'Kernel & Distributed Systems Security', avatarColor: '#ec4899', model: 'DeepSeek-V3 ZeroDay', temperature: 0.7, tokenVelocity: 185, cognitiveLoad: 94, specialty: 'eBPF, Memory Sandboxing & Zero-Knowledge' },
  { id: '3', name: 'Classical Maestro', role: 'Acoustics & Algorithmic Polyrhythms', avatarColor: '#f59e0b', model: 'Claude 3.7 Sonnet-Audio', temperature: 0.5, tokenVelocity: 120, cognitiveLoad: 76, specialty: '22-Shruti Microtonal Matrices & Just Intonation' },
  { id: '4', name: 'Polymath Philosopher', role: 'Epistemology & Systems Dynamics', avatarColor: '#8b5cf6', model: 'GPT-5 Omni-Reasoning', temperature: 0.8, tokenVelocity: 160, cognitiveLoad: 82, specialty: 'Emergent Complexity & Game Theory' },
];

interface DebateMessage {
  id: string;
  agentId: string;
  text: string;
  consensusScore: number;
  timestamp: string;
  codeSnippet?: string;
}

const PROMPT_SUGGESTIONS = [
  "How can we engineer a 10,000 qubit quantum computing cluster with liquid helium thermal dissipation?",
  "Design a zero-latency WebRTC mesh network with decentralized zk-SNARK cryptographic state proofs.",
  "How can we mathematically synthesize Carnatic 7-speed Tala korvais into a generative MIDI neural network?",
  "What is the optimal aerodynamic boundary layer for a Mach 7 scramjet inlet using carbon-carbon composites?",
];

export default function PromptArena() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [topic, setTopic] = useState(PROMPT_SUGGESTIONS[0]);
  const [isDebating, setIsDebating] = useState(false);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState<number | null>(null);
  const [consensusPercentage, setConsensusPercentage] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const runDebateStep = (step: number) => {
    if (step >= 6) {
      setIsDebating(false);
      setActiveSpeakerIndex(null);
      setConsensusPercentage(96);
      uiaudio.success();
      return;
    }

    const agent = AGENTS[step % AGENTS.length];
    setActiveSpeakerIndex(step % AGENTS.length);

    setTimeout(() => {
      uiaudio.hover();

      const responses: { text: string; code?: string }[] = [
        {
          text: `Analyzing the foundational state space for: "${topic}". We must first isolate the thermal flux. Superconducting niobium cavities require dilution refrigeration below 15 millikelvin to suppress thermal decoherence.`,
          code: `const QubitState = new TopologicalBraidingMatrix({\n  coherenceTimeMs: 420,\n  fidelity: 0.9998,\n  fluxPumpingFreqGhz: 6.42\n});`
        },
        {
          text: `Concurring on hardware isolation, but kernel-level execution requires zero-trust memory sandboxing. If side-channel microwave leakage occurs, malicious quantum state reads can compromise RSA keys before quantum supremacy is verified.`,
          code: `fn verify_zk_qubit_gate(state: &QuantumTensor) -> bool {\n    let proof = generate_stark_proof(state.density_matrix());\n    proof.verify_topological_invariance()\n}`
        },
        {
          text: `Notice the harmonic resonance here! Microwave resonator frequencies follow microtonal intervals similar to the 22-shruti Indian scale. By tuning pulse envelopes using Gaussian S-curves, we eliminate parasitic frequency leakage!`,
        },
        {
          text: `Synthesizing the three vectors: hardware cryogenic stabilization + cryptographic zero-leakage sandboxing + harmonic pulse modulation yields a self-regulating quantum ecosystem. Consensus is rapidly converging!`,
          code: `export const UnifiedQuantumEngine = {\n  thermalLimitKelvin: 0.015,\n  cryptographicIntegrity: "ZK-STARK-V2",\n  pulseHarmonicSymmetry: "22-Shruti-Gaussian"\n};`
        },
      ];

      const res = responses[step % responses.length];
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          agentId: agent.id,
          text: res.text,
          consensusScore: Math.min(100, (step + 1) * 24),
          timestamp: timeStr,
          codeSnippet: res.code
        }
      ]);

      setConsensusPercentage(Math.min(100, Math.round(((step + 1) / 6) * 100)));
      runDebateStep(step + 1);
    }, 2400);
  };

  const handleStartDebate = () => {
    if (!topic.trim() || isDebating) return;
    uiaudio.warp();
    setMessages([]);
    setIsDebating(true);
    setConsensusPercentage(15);
    runDebateStep(0);
  };

  const handleReset = () => {
    uiaudio.click();
    setIsDebating(false);
    setActiveSpeakerIndex(null);
    setMessages([]);
    setConsensusPercentage(0);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                PROMPT ARENA // MULTI-AGENT LLM FORUM
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                4-AGENT CONSENSUS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Simulated real-time multi-agent debate with token velocity & cognitive telemetry
            </p>
          </div>
        </div>

        {/* Global Consensus Gauge */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left w-48 space-y-1">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>CONSENSUS</span>
              <span className="font-bold text-purple-300">{consensusPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${consensusPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Agents Roster Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {AGENTS.map((agent, idx) => {
          const isActive = activeSpeakerIndex === idx;

          return (
            <div
              key={agent.id}
              className={cn(
                "p-4 rounded-2xl border transition-all backdrop-blur-xl relative overflow-hidden",
                isActive 
                  ? "bg-zinc-800/80 shadow-[0_0_30px_rgba(168,85,247,0.25)] border-purple-400" 
                  : "bg-zinc-900/40 border-white/5"
              )}
            >
              {isActive && (
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-400 animate-pulse" />
              )}

              <div className="flex items-center space-x-3 mb-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
                  style={{ backgroundColor: agent.avatarColor }}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{agent.name}</h3>
                  <p className="text-[10px] font-mono text-zinc-400">{agent.model}</p>
                </div>
              </div>

              <div className="space-y-2 text-[10px] font-mono text-zinc-400 bg-zinc-950/60 p-2.5 rounded-xl border border-white/5">
                <div className="flex justify-between">
                  <span>VELOCITY:</span>
                  <span className="text-cyan-300 font-bold">{agent.tokenVelocity} tok/s</span>
                </div>
                <div className="flex justify-between">
                  <span>LOAD:</span>
                  <span className="text-purple-300 font-bold">{agent.cognitiveLoad}%</span>
                </div>
                <div className="truncate text-zinc-500 pt-1 border-t border-white/5">
                  {agent.specialty}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Debate Stage & Input */}
      <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
        {/* Prompt Input Controls */}
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isDebating}
            placeholder="Enter research prompt for multi-agent synthesis..."
            className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
          />

          <div className="flex items-center space-x-2">
            <button
              onClick={handleStartDebate}
              disabled={isDebating || !topic.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-sm text-white shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>{isDebating ? 'SYNTHESIZING...' : 'START DEBATE'}</span>
            </button>
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prompt Suggestions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-mono text-zinc-500">SUGGESTED VECTORS:</span>
          {PROMPT_SUGGESTIONS.map((sug, i) => (
            <button
              key={i}
              onClick={() => {
                uiaudio.hover();
                setTopic(sug);
              }}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-purple-300 border border-white/5 transition-colors truncate max-w-xs"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Live Conversation Stream */}
        <div className="mt-4 min-h-[350px] max-h-[500px] overflow-y-auto space-y-4 p-4 rounded-xl bg-zinc-950/60 border border-white/5">
          {messages.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-zinc-500 font-mono text-xs space-y-2">
              <Compass className="w-8 h-8 opacity-40 animate-spin" />
              <span>Awaiting prompt deployment to initialize multi-agent debate stream...</span>
            </div>
          ) : (
            messages.map((msg) => {
              const agent = AGENTS.find(a => a.id === msg.agentId) || AGENTS[0];

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: agent.avatarColor }}
                      />
                      <span className="font-bold text-white text-xs">{agent.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500">• {msg.timestamp}</span>
                    </div>

                    <div className="flex items-center space-x-1 text-[10px] font-mono text-purple-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{msg.consensusScore}% Consensus Weight</span>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                    {msg.text}
                  </p>

                  {msg.codeSnippet && (
                    <div className="mt-2 p-3 rounded-lg bg-zinc-950 border border-white/10 font-mono text-xs text-cyan-300 overflow-x-auto">
                      <div className="flex items-center space-x-1 text-[10px] text-zinc-500 mb-1">
                        <Code className="w-3 h-3 text-purple-400" />
                        <span>SYNTHESIZED CODE ARTIFACT</span>
                      </div>
                      <pre>{msg.codeSnippet}</pre>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
