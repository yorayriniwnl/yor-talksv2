import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Vote, Sparkles, Copy, 
  CheckCircle2, Plus, Users, Zap, Shield, Trophy 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function PollOverlayStudio() {
  const [question, setQuestion] = useState('Will SOUL clutch this 1v3 Grand Finals clutch?');
  const [option1, setOption1] = useState('YES • Easy 1v3 (+2.4x)');
  const [option2, setOption2] = useState('NO • Tough Retake (+1.3x)');
  const [votes1, setVotes1] = useState(1420);
  const [votes2, setVotes2] = useState(480);

  const totalVotes = votes1 + votes2;
  const pct1 = totalVotes > 0 ? Math.round((votes1 / totalVotes) * 100) : 50;
  const pct2 = totalVotes > 0 ? (100 - pct1) : 50;

  const handleCopyOBSPoll = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/poll-overlay?q=${encodeURIComponent(question)}&o1=${encodeURIComponent(option1)}&o2=${encodeURIComponent(option2)}`);
    toast.success('📋 OBS Studio Transparent 60FPS Live Chat Poll Overlay URL copied!');
  };

  const handleVote1 = () => {
    sounds.playPop();
    setVotes1(v => v + 50);
  };

  const handleVote2 = () => {
    sounds.playPop();
    setVotes2(v => v + 50);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Live Chat Poll Overlay Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-Time Chat Audience Voting, Karma Odds & Transparent OBS Browser Source</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSPoll}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Poll Source
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Live Poll Widget */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Users className="w-3.5 h-3.5" /> LIVE STREAM CHAT PREDICTION • {totalVotes.toLocaleString()} VOTES
          </div>

          <h2 className="font-display font-black text-2xl md:text-3xl text-foreground max-w-xl mx-auto">{question}</h2>

          {/* Progress Bars */}
          <div className="space-y-4 max-w-xl mx-auto font-mono text-xs text-left">
            <div className="space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-cyan-400">{option1}</span>
                <span className="text-cyan-400">{pct1}% ({votes1})</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden border border-cyan-500/30">
                <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-300" style={{ width: `${pct1}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-pink-400">{option2}</span>
                <span className="text-pink-400">{pct2}% ({votes2})</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden border border-pink-500/30">
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all duration-300" style={{ width: `${pct2}%` }} />
              </div>
            </div>
          </div>

          {/* Test Votes */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button onClick={handleVote1} className="rounded-2xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-md">
              +50 Option 1 Votes
            </Button>
            <Button onClick={handleVote2} className="rounded-2xl font-bold text-xs bg-pink-600 hover:bg-pink-500 text-white shadow-md">
              +50 Option 2 Votes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
