import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Trophy, Play, RotateCcw, Sparkles, Flame, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CODE_WORDS = [
  'shader', 'matrix', 'bengaluru', 'conqueror', 'esports', 'canvas', 
  'latency', 'vector', 'spatial', 'hologram', 'supernova', 'mumbai', 
  'cyberpunk', 'polygon', 'telemetry', 'webrtc', 'audio', 'karma', 
  'hydra', 'radiant', 'tactical', 'framerate', 'volumetric', 'pipeline'
];

export function CyberTyper() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [score, setScore] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [wordsList, setWordsList] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const startSprint = () => {
    sounds.playPop();
    const shuffled = [...CODE_WORDS].sort(() => 0.5 - Math.random());
    setWordsList(shuffled);
    setCurrentWordIndex(0);
    setInputValue('');
    setScore(0);
    setWordsCompleted(0);
    setStreak(0);
    setTimeLeft(30);
    setGameOver(false);
    setIsPlaying(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Timer countdown
  useEffect(() => {
    if (!isPlaying || gameOver || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsPlaying(false);
          setGameOver(true);
          sounds.playChime();
          triggerConfetti();
          toast.success(`Sprint Complete! Words Per Minute: ${Math.round(wordsCompleted * 2)} WPM. +200 Karma Earned.`);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, gameOver, timeLeft, wordsCompleted]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toLowerCase();
    setInputValue(e.target.value);

    const targetWord = wordsList[currentWordIndex]?.toLowerCase();
    if (val === targetWord) {
      // Word Typed Correctly!
      sounds.playPop();
      setInputValue('');
      setWordsCompleted(w => w + 1);
      setStreak(s => {
        const ns = s + 1;
        if (ns > maxStreak) setMaxStreak(ns);
        return ns;
      });
      setScore(sc => sc + 100 + streak * 20);
      setCurrentWordIndex(idx => (idx + 1) % wordsList.length);
    }
  };

  const currentWord = wordsList[currentWordIndex] || 'Ready';

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Typer Word Sprint (30s)
            </h3>
            <p className="text-xs text-muted-foreground font-mono">High-Speed Developer & Gaming Keystroke Sprint</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[0.62rem]">Time Remaining</div>
          <div className={cn("font-bold text-base", timeLeft < 10 ? "text-rose-500 animate-pulse" : "text-emerald-400")}>
            {timeLeft}s
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">WPM Speed</span>
          <span className="font-display font-black text-xl text-primary">{Math.round(wordsCompleted * (60 / (30 - timeLeft || 1)))}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Streak</span>
          <span className="font-display font-black text-xl text-amber-400">🔥 {streak}x</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Sprint Score</span>
          <span className="font-display font-black text-xl text-emerald-400">{score}</span>
        </div>
      </div>

      {/* Main Target Word Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950/90 p-8 text-center mb-4 min-h-[160px] flex flex-col items-center justify-center">
        {isPlaying && !gameOver ? (
          <div>
            <span className="text-[0.68rem] font-mono uppercase text-muted-foreground tracking-widest block mb-1">Type Target Word:</span>
            <div className="font-display font-black text-4xl text-shimmer tracking-wider">
              {currentWord}
            </div>
            <div className="mt-4 w-full max-w-xs mx-auto">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Type here..."
                className="text-center font-mono font-bold text-lg h-12 rounded-xl bg-muted/40 border-primary"
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {gameOver ? (
              <>
                <Trophy className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white">Sprint Completed!</h4>
                <p className="text-xs text-zinc-400 font-mono">You typed {wordsCompleted} words with a max streak of {maxStreak}x!</p>
              </>
            ) : (
              <>
                <Zap className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-display font-bold text-lg text-white">Ready for the 30s Sprint?</h4>
                <p className="text-xs text-zinc-400 font-mono">Test your coding keystroke speed and accuracy!</p>
              </>
            )}

            <Button
              onClick={startSprint}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-black" /> {gameOver ? 'Sprint Again' : 'Start Keystroke Sprint'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
