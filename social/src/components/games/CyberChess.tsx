import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Trophy, Play, RotateCcw, Sparkles, Swords, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Initial Chess Board Setup
const INITIAL_BOARD = [
  ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
  ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
  ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
];

export function CyberChess() {
  const [board, setBoard] = useState<string[][]>(INITIAL_BOARD);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'white' | 'black'>('white');
  const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<string[]>([]);
  const [score, setScore] = useState(1200);
  const [movesCount, setMovesCount] = useState(0);

  const isWhitePiece = (piece: string) => ['♙', '♖', '♘', '♗', '♕', '♔'].includes(piece);
  const isBlackPiece = (piece: string) => ['♟', '♜', '♞', '♝', '♛', '♚'].includes(piece);

  const handleCellClick = (r: number, c: number) => {
    const piece = board[r][c];

    if (selectedCell) {
      const [sr, sc] = selectedCell;

      if (sr === r && sc === c) {
        // Deselect
        setSelectedCell(null);
        return;
      }

      const selectedPiece = board[sr][sc];
      const targetPiece = board[r][c];

      // Prevent friendly capture
      if (turn === 'white' && isWhitePiece(targetPiece)) {
        setSelectedCell([r, c]);
        return;
      }
      if (turn === 'black' && isBlackPiece(targetPiece)) {
        setSelectedCell([r, c]);
        return;
      }

      // Execute Move
      const newBoard = board.map(row => [...row]);
      newBoard[sr][sc] = '';
      newBoard[r][c] = selectedPiece;

      if (targetPiece) {
        // Capture Sound
        sounds.playPop();
        if (turn === 'white') {
          setCapturedBlack(prev => [...prev, targetPiece]);
          setScore(s => s + 50);
        } else {
          setCapturedWhite(prev => [...prev, targetPiece]);
        }
      } else {
        sounds.playPop();
      }

      setBoard(newBoard);
      setSelectedCell(null);
      setMovesCount(m => m + 1);
      setTurn(t => (t === 'white' ? 'black' : 'white'));

      if (targetPiece === '♚' || targetPiece === '♔') {
        sounds.playChime();
        triggerConfetti();
        toast.success(`👑 CHECKMATE! ${turn.toUpperCase()} is Victorious! +300 Guild Karma.`);
      }
    } else {
      // Select Piece
      if (!piece) return;
      if (turn === 'white' && !isWhitePiece(piece)) return;
      if (turn === 'black' && !isBlackPiece(piece)) return;

      sounds.playPop();
      setSelectedCell([r, c]);
    }
  };

  const resetGame = () => {
    sounds.playPop();
    setBoard(INITIAL_BOARD);
    setSelectedCell(null);
    setTurn('white');
    setCapturedWhite([]);
    setCapturedBlack([]);
    setMovesCount(0);
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Bharat Grandmaster Chess Blitz
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Inspired by Indian Chess Prodigies · 3-Min Blitz</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={resetGame}
          className="rounded-xl font-bold text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
        </Button>
      </div>

      {/* Match HUD */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-muted-foreground uppercase text-[0.62rem]">Turn:</span>
          <strong className="text-primary font-bold">{turn.toUpperCase()}</strong>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground text-[0.62rem] uppercase">Moves: </span>
            <strong className="text-foreground">{movesCount}</strong>
          </div>
          <div>
            <span className="text-muted-foreground text-[0.62rem] uppercase">ELO: </span>
            <strong className="text-amber-400">{score}</strong>
          </div>
        </div>
      </div>

      {/* Captured Trays */}
      <div className="flex justify-between text-lg px-2 mb-2 font-serif select-none min-h-[28px]">
        <div className="text-rose-400">{capturedBlack.join(' ')}</div>
        <div className="text-cyan-400">{capturedWhite.join(' ')}</div>
      </div>

      {/* 8x8 Chess Grid */}
      <div className="grid grid-cols-8 gap-0.5 rounded-2xl overflow-hidden border-2 border-border/60 bg-zinc-950 p-1 select-none shadow-2xl">
        {board.map((row, r) =>
          row.map((piece, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={cn(
                  "aspect-square flex items-center justify-center text-2xl sm:text-3xl font-serif transition-all duration-150 relative",
                  isDark ? "bg-zinc-800/80 text-zinc-100" : "bg-zinc-700/50 text-zinc-200",
                  isSelected && "bg-amber-500/80 text-black scale-95 shadow-inner rounded-md",
                  !isSelected && "hover:bg-primary/30"
                )}
              >
                {piece}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
