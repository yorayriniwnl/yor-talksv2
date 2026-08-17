import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trophy, RotateCcw, Sparkles, Flame, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Card {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const SYMBOLS = ['🔱', '🚀', '☕', '🏏', '👑', '⚡', '🪕', '🛕'];

export function CyberMemory() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bestMoves, setBestMoves] = useState(14);

  const initGame = () => {
    sounds.playPop();
    const deck: Card[] = [];
    const pairs = [...SYMBOLS, ...SYMBOLS];
    // Shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    pairs.forEach((sym, idx) => {
      deck.push({
        id: idx,
        symbol: sym,
        isFlipped: false,
        isMatched: false,
      });
    });

    setCards(deck);
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleCardClick = (index: number) => {
    if (!isPlaying) return;
    if (flippedIndices.length >= 2) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    sounds.playPop();
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [idx1, idx2] = newFlipped;

      if (cards[idx1].symbol === newCards[idx2].symbol) {
        // Match
        sounds.playChime();
        newCards[idx1].isMatched = true;
        newCards[idx2].isMatched = true;
        setCards([...newCards]);
        setFlippedIndices([]);
        setMatches((m) => {
          const nm = m + 1;
          if (nm === SYMBOLS.length) {
            triggerConfetti();
            toast.success(`🎉 Memory Matrix Decrypted in ${moves + 1} Moves! +400 Karma Pts`);
            if (moves + 1 < bestMoves) setBestMoves(moves + 1);
          }
          return nm;
        });
      } else {
        // No match - flip back after 800ms
        setTimeout(() => {
          newCards[idx1].isFlipped = false;
          newCards[idx2].isFlipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
        }, 800);
      }
    }
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Memory Matrix
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Match 8 Pairs of Bharat Mythic Glyphs</p>
          </div>
        </div>

        <Button size="sm" variant="ghost" onClick={initGame} className="rounded-xl h-9 px-2 text-xs">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Moves</span>
          <strong className="font-display font-black text-lg text-primary">{moves}</strong>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Matched</span>
          <strong className="font-display font-black text-lg text-emerald-400">{matches} / 8</strong>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Best Run</span>
          <strong className="font-display font-black text-lg text-amber-400">{bestMoves} Moves</strong>
        </div>
      </div>

      {/* 4x4 Grid Cards */}
      <div className="p-3 rounded-3xl bg-zinc-950 border-2 border-zinc-800 shadow-inner grid grid-cols-4 gap-2.5 aspect-square max-w-[320px] mx-auto mb-4 select-none">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(idx)}
            className={cn(
              "rounded-2xl flex items-center justify-center text-3xl font-display font-black transition-all duration-200 shadow-md",
              card.isMatched
                ? "bg-emerald-500/20 border-2 border-emerald-500/60 shadow-emerald-500/20"
                : card.isFlipped
                ? "bg-primary text-primary-foreground border-2 border-primary shadow-primary/40 scale-105"
                : "bg-zinc-900 border border-zinc-800 hover:border-primary/50 text-zinc-600 hover:bg-zinc-800"
            )}
          >
            {card.isFlipped || card.isMatched ? (
              <span className="filter drop-shadow-sm">{card.symbol}</span>
            ) : (
              <span className="text-base opacity-40 font-mono">?</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
