import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldAlert, CheckCircle2, Lock, Unlock, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export function NeonHackerGame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetCode, setTargetCode] = useState('7429');
  const [currentGuess, setCurrentGuess] = useState('');
  const [attempts, setAttempts] = useState<{ guess: string; correctPos: number; correctDigits: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(45);
  const [won, setWon] = useState(false);
  const [matrixLines, setMatrixLines] = useState<string[]>([]);

  const startHack = () => {
    sounds.playPop();
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    // generate 4 unique digits
    const shuffled = digits.sort(() => 0.5 - Math.random()).slice(0, 4).join('');
    setTargetCode(shuffled);
    setCurrentGuess('');
    setAttempts([]);
    setTimeLeft(45);
    setWon(false);
    setIsPlaying(true);
    setMatrixLines(['INITIALIZING CYBER VAULT INTRUSION...', 'BYPASSING BHARAT NETWORK FIREWALL...']);
  };

  // Timer countdown
  useEffect(() => {
    if (!isPlaying || won || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsPlaying(false);
          sounds.playGlitch();
          toast.error('ACCESS DENIED: Firewall lock-out activated!');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, won, timeLeft]);

  const handleKeyPress = (num: string) => {
    if (!isPlaying || won || currentGuess.length >= 4) return;
    sounds.playPop();
    setCurrentGuess(g => g + num);
  };

  const handleBackspace = () => {
    sounds.playPop();
    setCurrentGuess(g => g.slice(0, -1));
  };

  const handleSubmitGuess = () => {
    if (currentGuess.length !== 4) {
      toast.error('Enter a 4-digit security code');
      return;
    }

    let correctPos = 0;
    let correctDigits = 0;

    for (let i = 0; i < 4; i++) {
      if (currentGuess[i] === targetCode[i]) {
        correctPos++;
      } else if (targetCode.includes(currentGuess[i])) {
        correctDigits++;
      }
    }

    const newAttempt = { guess: currentGuess, correctPos, correctDigits };
    setAttempts(prev => [newAttempt, ...prev]);
    setCurrentGuess('');

    if (correctPos === 4) {
      // VICTORY!
      sounds.playChime();
      triggerConfetti();
      setWon(true);
      setIsPlaying(false);
      toast.success('ACCESS GRANTED: Vault decrypted! +500 Karma Points & Hologram Matrix Frame Unlocked!');
    } else {
      sounds.playPop();
    }
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-emerald-500/30 font-mono text-emerald-400 shadow-2xl max-w-xl mx-auto bg-black/90 relative overflow-hidden">
      {/* Scanline CRT overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-60" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10 border-b border-emerald-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm tracking-widest uppercase">Cyber Vault Decryption Console</h3>
        </div>
        <div className="text-xs">
          TIME: <span className={timeLeft < 15 ? 'text-red-400 font-black animate-pulse' : 'text-emerald-400 font-bold'}>{timeLeft}s</span>
        </div>
      </div>

      {/* Main Terminal Screen */}
      <div className="bg-black/80 rounded-2xl p-4 border border-emerald-500/20 mb-4 min-h-[140px] text-xs space-y-1.5 overflow-y-auto max-h-40 hide-scrollbar relative z-10">
        <p className="text-emerald-500/70 text-[0.68rem]">&gt; TARGET: 4-DIGIT UNIQUE CIPHER SEQUENCE</p>
        {attempts.map((att, i) => (
          <div key={i} className="flex items-center justify-between text-xs font-bold border-b border-emerald-950/40 pb-1">
            <span>TRY #{attempts.length - i}: [{att.guess}]</span>
            <span>
              <span className="text-emerald-300">🎯 {att.correctPos} EXACT</span>
              <span className="text-amber-400 ml-2">⚡ {att.correctDigits} WRONG POS</span>
            </span>
          </div>
        ))}
        {attempts.length === 0 && isPlaying && (
          <p className="text-emerald-400/50 italic text-[0.7rem]">&gt; Enter your 4-digit code guess on the keypad below...</p>
        )}
      </div>

      {/* Code Input Display */}
      <div className="flex items-center justify-center gap-3 mb-4 relative z-10">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="w-12 h-14 rounded-xl border-2 border-emerald-500/40 bg-emerald-950/20 flex items-center justify-center font-black text-2xl text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            {currentGuess[idx] || '_'}
          </div>
        ))}
      </div>

      {/* Controls / Keypad */}
      {!isPlaying ? (
        <div className="text-center relative z-10 pt-2">
          {won ? (
            <div className="mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-1 animate-bounce" />
              <p className="text-sm font-bold text-white">FIREWALL BYPASSED & DATA EXTRACTED!</p>
            </div>
          ) : timeLeft <= 0 ? (
            <div className="mb-4">
              <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-red-400">INTRUSION DETECTED — CIPHER RESET</p>
            </div>
          ) : null}

          <Button
            onClick={startHack}
            className="w-full rounded-2xl font-bold text-xs h-12 bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg glow-neon-primary"
          >
            <Play className="w-4 h-4 mr-1.5 fill-black" /> {won || timeLeft <= 0 ? 'Re-Initiate Intrusion' : 'Start Code Decryption'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 relative z-10">
          <div className="grid grid-cols-5 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                onClick={() => handleKeyPress(digit)}
                className="h-10 rounded-xl font-bold text-sm border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
              >
                {digit}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleBackspace}
              className="h-11 rounded-xl font-bold text-xs border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              Clear
            </Button>
            <Button
              onClick={handleSubmitGuess}
              className="h-11 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-black shadow"
            >
              <Unlock className="w-3.5 h-3.5 mr-1" /> Transmit Decrypt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
