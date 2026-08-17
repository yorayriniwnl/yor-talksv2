import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Trophy, RotateCcw, Sparkles, Zap, Flame, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Board = number[][];

const TILE_COLORS: { [key: number]: { bg: string; text: string; shadow: string } } = {
  2: { bg: 'bg-zinc-900', text: 'text-zinc-300', shadow: 'shadow-none' },
  4: { bg: 'bg-zinc-800', text: 'text-amber-300', shadow: 'shadow-sm' },
  8: { bg: 'bg-amber-600', text: 'text-white', shadow: 'shadow-amber-500/30' },
  16: { bg: 'bg-orange-600', text: 'text-white', shadow: 'shadow-orange-500/40' },
  32: { bg: 'bg-red-600', text: 'text-white', shadow: 'shadow-red-500/50' },
  64: { bg: 'bg-rose-600', text: 'text-white', shadow: 'shadow-rose-500/50' },
  128: { bg: 'bg-cyan-600', text: 'text-white', shadow: 'shadow-cyan-500/60' },
  256: { bg: 'bg-blue-600', text: 'text-white', shadow: 'shadow-blue-500/60' },
  512: { bg: 'bg-purple-600', text: 'text-white', shadow: 'shadow-purple-500/70' },
  1024: { bg: 'bg-pink-600', text: 'text-white', shadow: 'shadow-pink-500/80' },
  2048: { bg: 'bg-gradient-to-tr from-amber-400 to-yellow-500', text: 'text-black font-black', shadow: 'shadow-yellow-400/90' },
};

export function Cyber2048() {
  const [board, setBoard] = useState<Board>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(8640);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const addRandomTile = (currentBoard: Board): Board => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return currentBoard;
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newBoard = currentBoard.map(row => [...row]);
    newBoard[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  };

  const restartGame = () => {
    sounds.playPop();
    let newBoard: Board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    newBoard = addRandomTile(newBoard);
    newBoard = addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setWon(false);
    setGameOver(false);
  };

  useEffect(() => {
    restartGame();
  }, []);

  const slideRow = (row: number[]): { newRow: number[]; gainedScore: number } => {
    let arr = row.filter(val => val !== 0);
    let gainedScore = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        gainedScore += arr[i];
        arr[i + 1] = 0;
        if (arr[i] === 2048) {
          triggerConfetti();
          sounds.playChime();
          setWon(true);
        }
      }
    }
    arr = arr.filter(val => val !== 0);
    while (arr.length < 4) {
      arr.push(0);
    }
    return { newRow: arr, gainedScore };
  };

  const moveLeft = useCallback(() => {
    let moved = false;
    let addedScore = 0;
    const newBoard = board.map(row => {
      const { newRow, gainedScore } = slideRow(row);
      if (JSON.stringify(newRow) !== JSON.stringify(row)) moved = true;
      addedScore += gainedScore;
      return newRow;
    });

    if (moved) {
      sounds.playPop();
      const finalBoard = addRandomTile(newBoard);
      setBoard(finalBoard);
      setScore(s => {
        const ns = s + addedScore;
        if (ns > highScore) setHighScore(ns);
        return ns;
      });
    }
  }, [board, highScore]);

  const rotateBoard = (b: Board): Board => {
    const res: Board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        res[c][3 - r] = b[r][c];
      }
    }
    return res;
  };

  const moveRight = useCallback(() => {
    let r = board.map(row => [...row].reverse());
    let moved = false;
    let addedScore = 0;
    const newBoard = r.map(row => {
      const { newRow, gainedScore } = slideRow(row);
      if (JSON.stringify(newRow) !== JSON.stringify(row)) moved = true;
      addedScore += gainedScore;
      return newRow.reverse();
    });
    if (moved) {
      sounds.playPop();
      setBoard(addRandomTile(newBoard));
      setScore(s => {
        const ns = s + addedScore;
        if (ns > highScore) setHighScore(ns);
        return ns;
      });
    }
  }, [board, highScore]);

  const moveUp = useCallback(() => {
    let rotated = rotateBoard(rotateBoard(rotateBoard(board)));
    let moved = false;
    let addedScore = 0;
    let newBoard = rotated.map(row => {
      const { newRow, gainedScore } = slideRow(row);
      if (JSON.stringify(newRow) !== JSON.stringify(row)) moved = true;
      addedScore += gainedScore;
      return newRow;
    });
    newBoard = rotateBoard(newBoard);
    if (moved) {
      sounds.playPop();
      setBoard(addRandomTile(newBoard));
      setScore(s => {
        const ns = s + addedScore;
        if (ns > highScore) setHighScore(ns);
        return ns;
      });
    }
  }, [board, highScore]);

  const moveDown = useCallback(() => {
    let rotated = rotateBoard(board);
    let moved = false;
    let addedScore = 0;
    let newBoard = rotated.map(row => {
      const { newRow, gainedScore } = slideRow(row);
      if (JSON.stringify(newRow) !== JSON.stringify(row)) moved = true;
      addedScore += gainedScore;
      return newRow;
    });
    newBoard = rotateBoard(rotateBoard(rotateBoard(newBoard)));
    if (moved) {
      sounds.playPop();
      setBoard(addRandomTile(newBoard));
      setScore(s => {
        const ns = s + addedScore;
        if (ns > highScore) setHighScore(ns);
        return ns;
      });
    }
  }, [board, highScore]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLeft();
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveRight();
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') moveUp();
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') moveDown();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, moveUp, moveDown]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber 2048 Bharat Diya Puzzle
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Slide Matrix Tiles to Forge 2048 Golden Diya</p>
          </div>
        </div>

        <Button size="sm" variant="ghost" onClick={restartGame} className="rounded-xl h-9 px-2 text-xs">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Score Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Best Matrix</span>
          <span className="font-display font-black text-xl text-amber-400">{highScore}</span>
        </div>
      </div>

      {/* 4x4 Grid Board */}
      <div className="p-3 rounded-3xl bg-zinc-950 border-2 border-zinc-800 shadow-inner grid grid-cols-4 gap-2.5 aspect-square max-w-[320px] mx-auto mb-4 select-none">
        {board.map((row, r) =>
          row.map((val, c) => {
            const style = TILE_COLORS[val] || { bg: 'bg-pink-700', text: 'text-white', shadow: 'shadow-lg' };

            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "rounded-2xl flex items-center justify-center font-display font-black text-base sm:text-lg transition-all duration-100 shadow-md",
                  val === 0 ? "bg-zinc-900/60 border border-zinc-800/40" : `${style.bg} ${style.text} ${style.shadow}`
                )}
              >
                {val !== 0 && (val === 2048 ? '🔱 2048' : val)}
              </div>
            );
          })
        )}
      </div>

      {/* Touch Arrow Controls */}
      <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto font-mono text-xs">
        <div />
        <Button size="sm" onClick={moveUp} className="rounded-xl h-10 bg-muted/60 hover:bg-muted text-foreground">▲</Button>
        <div />
        <Button size="sm" onClick={moveLeft} className="rounded-xl h-10 bg-muted/60 hover:bg-muted text-foreground">◀</Button>
        <Button size="sm" onClick={moveDown} className="rounded-xl h-10 bg-muted/60 hover:bg-muted text-foreground">▼</Button>
        <Button size="sm" onClick={moveRight} className="rounded-xl h-10 bg-muted/60 hover:bg-muted text-foreground">▶</Button>
      </div>
    </div>
  );
}
