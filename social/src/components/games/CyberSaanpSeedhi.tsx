import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Trophy, Play, RotateCcw, Sparkles, Volume2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Ladder {
  start: number;
  end: number;
}

interface Snake {
  head: number;
  tail: number;
}

const LADDERS: Ladder[] = [
  { start: 4, end: 25 },
  { start: 13, end: 46 },
  { start: 33, end: 68 },
  { start: 50, end: 89 },
  { start: 62, end: 95 },
];

const SNAKES: Snake[] = [
  { head: 27, tail: 5 },
  { head: 40, tail: 18 },
  { head: 66, tail: 22 },
  { head: 87, tail: 36 },
  { head: 99, tail: 10 },
];

export function CyberSaanpSeedhi() {
  const [playerPosition, setPlayerPosition] = useState(1);
  const [botPosition, setBotPosition] = useState(1);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [turn, setTurn] = useState<'player' | 'bot'>('player');
  const [winner, setWinner] = useState<string | null>(null);

  const rollDice = () => {
    if (isRolling || winner || turn !== 'player') return;
    sounds.playPop();
    setIsRolling(true);

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceRoll(roll);
      setIsRolling(false);

      // Move Player
      setPlayerPosition((prev) => {
        let nextPos = prev + roll;
        if (nextPos > 100) nextPos = prev; // exact 100 needed

        // Check Ladders
        const ladder = LADDERS.find((l) => l.start === nextPos);
        if (ladder) {
          sounds.playChime();
          toast.success(`🚀 JET LADDER CLIMBED! Jumped from ${nextPos} to ${ladder.end}!`);
          nextPos = ladder.end;
        }

        // Check Snakes
        const snake = SNAKES.find((s) => s.head === nextPos);
        if (snake) {
          sounds.playGlitch();
          toast.error(`🐍 MALWARE SNAKE BITE! Slid down from ${nextPos} to ${snake.tail}!`);
          nextPos = snake.tail;
        }

        if (nextPos === 100) {
          sounds.playChime();
          triggerConfetti();
          setWinner('Player');
          toast.success('👑 MOKSHA ACHIEVED! You won Cyber Saanp Seedhi (+500 Karma)!');
        }

        return nextPos;
      });

      // Bot Turn
      if (!winner) {
        setTurn('bot');
        setTimeout(() => {
          const botRoll = Math.floor(Math.random() * 6) + 1;
          setBotPosition((prevBot) => {
            let nextBot = prevBot + botRoll;
            if (nextBot > 100) nextBot = prevBot;

            const ladder = LADDERS.find((l) => l.start === nextBot);
            if (ladder) nextBot = ladder.end;
            const snake = SNAKES.find((s) => s.head === nextBot);
            if (snake) nextBot = snake.tail;

            if (nextBot === 100) {
              setWinner('Cyber Bot');
              toast.error('🤖 Cyber Bot reached 100 first!');
            }
            return nextBot;
          });
          setTurn('player');
        }, 1000);
      }
    }, 400);
  };

  const resetGame = () => {
    sounds.playPop();
    setPlayerPosition(1);
    setBotPosition(1);
    setDiceRoll(null);
    setWinner(null);
    setTurn('player');
    toast.info('🔄 Board reset! Ancient Moksha Patam matrix ready.');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-indigo-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Dices className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Saanp Seedhi (Moksha Patam)
            </h3>
            <p className="text-xs text-muted-foreground font-mono">100-Square Ancient Indian Board with Cyber Ladders & Snakes</p>
          </div>
        </div>

        <Button onClick={resetGame} variant="outline" size="sm" className="rounded-xl font-mono text-xs">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
        </Button>
      </div>

      {/* Position Telemetry Bar */}
      <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Your Position</span>
          <span className="font-display font-black text-xl text-primary">Tile {playerPosition}/100</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Dice Roll</span>
          <span className="font-display font-black text-xl text-amber-400">{diceRoll ? `🎲 ${diceRoll}` : '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Cyber Bot</span>
          <span className="font-display font-black text-xl text-rose-400">Tile {botPosition}/100</span>
        </div>
      </div>

      {/* 10x10 Micro Grid Visualizer */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-border/40 mb-4">
        <div className="grid grid-cols-10 gap-1 text-[0.6rem] font-mono text-center select-none">
          {Array.from({ length: 100 }, (_, i) => {
            const tileNum = 100 - i;
            const isPlayerHere = playerPosition === tileNum;
            const isBotHere = botPosition === tileNum;
            const isLadder = LADDERS.some((l) => l.start === tileNum);
            const isSnake = SNAKES.some((s) => s.head === tileNum);

            return (
              <div
                key={tileNum}
                className={cn(
                  "h-7 rounded-md flex items-center justify-center font-bold transition-all relative border",
                  isPlayerHere ? "bg-primary text-primary-foreground border-primary glow-neon-primary z-10 scale-110" :
                  isBotHere ? "bg-rose-500 text-white border-rose-500 z-10 scale-110" :
                  isLadder ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40" :
                  isSnake ? "bg-red-950/80 text-red-400 border-red-500/40" :
                  "bg-zinc-900/60 text-zinc-500 border-border/20"
                )}
              >
                {isPlayerHere ? '👤' : isBotHere ? '🤖' : isLadder ? '🚀' : isSnake ? '🐍' : tileNum}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Control */}
      <Button
        onClick={rollDice}
        disabled={isRolling || !!winner || turn !== 'player'}
        className="w-full rounded-2xl font-bold text-xs h-12 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white shadow-lg glow-neon-primary"
      >
        {isRolling ? '🎲 Rolling Dice...' : turn === 'player' ? '🎲 Roll Cyber Dice (1-6)' : '🤖 Cyber Bot Thinking...'}
      </Button>
    </div>
  );
}
