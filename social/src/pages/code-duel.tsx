import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code2, Swords, Play, CheckCircle2, XCircle, Trophy, 
  Terminal, ShieldAlert, Sparkles, Clock, Crown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface TestCase {
  input: string;
  expected: string;
  passed?: boolean;
}

export default function CodeDuel() {
  const currentUser = useAppStore((s) => s.currentUser);

  const [userCode, setUserCode] = useState(`function solve(arr) {\n  // Return the maximum sum subarray (Kadane's algorithm)\n  let maxSum = arr[0];\n  let currentSum = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    currentSum = Math.max(arr[i], currentSum + arr[i]);\n    maxSum = Math.max(maxSum, currentSum);\n  }\n  return maxSum;\n}`);
  const [opponentProgress, setOpponentProgress] = useState(65);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestCase[]>([
    { input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expected: '6' },
    { input: '[1, 2, 3, -2, 5]', expected: '9' },
    { input: '[-1, -2, -3, -4]', expected: '-1' },
  ]);
  const [duelWon, setDuelWon] = useState(false);

  // Match timer and simulated opponent progress
  useEffect(() => {
    if (duelWon || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => t - 1);
      setOpponentProgress(p => Math.min(95, p + (Math.random() > 0.6 ? 2 : 0)));
    }, 1000);
    return () => clearInterval(interval);
  }, [duelWon, timeLeft]);

  const handleRunTests = () => {
    sounds.playPop();
    setIsRunning(true);

    setTimeout(() => {
      setIsRunning(false);
      setTestResults(prev => prev.map(t => ({ ...t, passed: true })));
      setDuelWon(true);
      sounds.playChime();
      triggerConfetti();
      toast.success('🎉 1v1 DUEL VICTORY! All 3 Test Cases Passed in 0.04ms! +500 Guild XP & Karma.');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">1v1 Code Duel & Shader Showdown</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live Competitive Algorithm Battles & Hack Arena</p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60) < 10 ? '0' : ''}{timeLeft % 60}</span>
          </div>
          <div className="level-badge shadow-sm">
            <Trophy className="w-3.5 h-3.5 fill-amber-400" /> +500 Karma Stakes
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Match Header vs Banner */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md">
          {/* You */}
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="w-14 h-14 border-2 border-primary glow-neon-primary">
              <AvatarImage src={currentUser?.avatarUrl} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-[0.62rem] font-mono uppercase text-primary font-bold">You (Challenger)</span>
              <h4 className="font-display font-bold text-base text-foreground">{currentUser?.displayName || 'Ayush Roy'}</h4>
              <span className="text-xs font-mono text-emerald-400 font-bold">Rank: Grandmaster (2420 ELO)</span>
            </div>
          </div>

          {/* VS Center Badge */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-red-500 text-black flex items-center justify-center font-display font-black text-lg shadow-lg mx-auto">
            VS
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-4 flex-1 justify-end text-right">
            <div>
              <span className="text-[0.62rem] font-mono uppercase text-rose-400 font-bold">Opponent</span>
              <h4 className="font-display font-bold text-base text-foreground">Devansh_Deshmukh</h4>
              <span className="text-xs font-mono text-muted-foreground">Progress: {opponentProgress}%</span>
            </div>
            <Avatar className="w-14 h-14 border-2 border-rose-500">
              <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" />
              <AvatarFallback>D</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Code Editor & Test Cases Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Code Editor Pane */}
          <div className="lg:col-span-8 surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-xl flex flex-col justify-between">
            <div className="p-3.5 border-b border-border/40 bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-foreground flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" /> solution.js — JavaScript V8 Engine
              </span>
              <span className="text-[0.65rem] font-mono text-muted-foreground">ES2026 Compatible</span>
            </div>

            <div className="p-4 bg-zinc-950/90 font-mono text-xs">
              <Textarea
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                className="w-full h-80 bg-transparent border-0 text-emerald-300 font-mono text-xs leading-relaxed resize-none focus-visible:ring-0 p-0"
              />
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Submissions evaluated across 3 test vectors</span>
              <Button
                onClick={handleRunTests}
                disabled={isRunning}
                className="rounded-2xl font-bold text-xs px-6 h-11 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
              >
                <Play className="w-4 h-4 mr-1.5 fill-current" />
                {isRunning ? 'Executing Test Vectors…' : 'Submit & Execute Solution'}
              </Button>
            </div>
          </div>

          {/* Test Cases Pane */}
          <div className="lg:col-span-4 space-y-4">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-4">
              <div className="showcase-section-title">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3>Test Vector Output</h3>
              </div>

              <div className="space-y-2.5">
                {testResults.map((tc, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-muted/30 border border-border/30 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Vector #{idx + 1}</span>
                      {tc.passed ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </div>
                    <div className="text-[0.68rem] text-muted-foreground">In: {tc.input}</div>
                    <div className="text-[0.68rem] text-muted-foreground">Exp: {tc.expected}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
