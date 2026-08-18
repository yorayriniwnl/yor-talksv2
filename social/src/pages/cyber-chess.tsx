import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, RotateCcw, Bot, User, Sparkles, Shield, 
  Flame, Zap, Cpu, Swords, ChevronRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
type PieceColor = 'w' | 'b';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type BoardState = (Piece | null)[][];

const INITIAL_BOARD: BoardState = [
  [
    { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' },
    { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' }
  ],
  Array(8).fill(null).map(() => ({ type: 'p', color: 'b' })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map(() => ({ type: 'p', color: 'w' })),
  [
    { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' },
    { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }
  ],
];

const PIECE_SYMBOLS: { [key in PieceType]: string } = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
};

export default function CyberChess() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<PieceColor>('w');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'grandmaster'>('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [capturedPieces, setCapturedPieces] = useState<{ w: PieceType[]; b: PieceType[] }>({ w: [], b: [] });

  const handleSquareClick = (r: number, c: number) => {
    if (turn !== 'w' || isAiThinking) return;

    if (selectedSquare) {
      const [sr, sc] = selectedSquare;
      const piece = board[sr][sc];

      // If clicked the same square, unselect
      if (sr === r && sc === c) {
        setSelectedSquare(null);
        return;
      }

      // If clicked own piece, re-select
      if (board[r][c]?.color === 'w') {
        uiaudio.hover();
        setSelectedSquare([r, c]);
        return;
      }

      // Execute move
      executeMove(sr, sc, r, c);
      setSelectedSquare(null);
    } else {
      if (board[r][c]?.color === 'w') {
        uiaudio.hover();
        setSelectedSquare([r, c]);
      }
    }
  };

  const executeMove = (fromR: number, fromC: number, toR: number, toC: number) => {
    uiaudio.click();
    const newBoard = board.map(row => [...row]);
    const movingPiece = newBoard[fromR][fromC];
    const targetPiece = newBoard[toR][toC];

    if (targetPiece) {
      uiaudio.success();
      setCapturedPieces(prev => ({
        ...prev,
        [targetPiece.color]: [...prev[targetPiece.color], targetPiece.type]
      }));
    }

    newBoard[toR][toC] = movingPiece;
    newBoard[fromR][fromC] = null;
    setBoard(newBoard);

    const cols = 'abcdefgh';
    const moveNotation = `${movingPiece?.type.toUpperCase()}${cols[fromC]}${8 - fromR} → ${cols[toC]}${8 - toR}`;
    setMoveHistory(prev => [moveNotation, ...prev.slice(0, 15)]);

    setTurn('b');

    // Trigger AI Turn
    triggerAiTurn(newBoard);
  };

  const triggerAiTurn = (currentBoard: BoardState) => {
    setIsAiThinking(true);

    setTimeout(() => {
      uiaudio.warp();
      setIsAiThinking(false);

      // Find all black pieces
      const blackMoves: { from: [number, number]; to: [number, number] }[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (currentBoard[r][c]?.color === 'b') {
            // Simple forward or capture move for AI
            if (r + 1 < 8 && !currentBoard[r + 1][c]) {
              blackMoves.push({ from: [r, c], to: [r + 1, c] });
            }
            if (r + 1 < 8 && c + 1 < 8 && currentBoard[r + 1][c + 1]?.color === 'w') {
              blackMoves.push({ from: [r, c], to: [r + 1, c + 1] });
            }
            if (r + 1 < 8 && c - 1 >= 0 && currentBoard[r + 1][c - 1]?.color === 'w') {
              blackMoves.push({ from: [r, c], to: [r + 1, c - 1] });
            }
          }
        }
      }

      if (blackMoves.length > 0) {
        const chosen = blackMoves[Math.floor(Math.random() * blackMoves.length)];
        const newB = currentBoard.map(row => [...row]);
        const movingP = newB[chosen.from[0]][chosen.from[1]];
        const targetP = newB[chosen.to[0]][chosen.to[1]];

        if (targetP) {
          setCapturedPieces(prev => ({
            ...prev,
            [targetP.color]: [...prev[targetP.color], targetP.type]
          }));
        }

        newB[chosen.to[0]][chosen.to[1]] = movingP;
        newB[chosen.from[0]][chosen.from[1]] = null;
        setBoard(newB);

        const cols = 'abcdefgh';
        const notat = `${movingP?.type.toUpperCase()}${cols[chosen.from[1]]}${8 - chosen.from[0]} → ${cols[chosen.to[1]]}${8 - chosen.to[0]}`;
        setMoveHistory(prev => [notat, ...prev.slice(0, 15)]);
      }

      setTurn('w');
    }, 1200);
  };

  const handleReset = () => {
    uiaudio.click();
    setBoard(INITIAL_BOARD);
    setSelectedSquare(null);
    setTurn('w');
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
              CYBER CHESS 2077 // QUANTUM HOLOGRAM
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Holographic chess engine against DeepSeek-Quantum neural opponent
            </p>
          </div>
        </div>

        {/* Status HUD */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <span className={cn("w-2.5 h-2.5 rounded-full", turn === 'w' ? "bg-cyan-400 animate-ping" : "bg-purple-500")} />
            <span className="font-bold">{turn === 'w' ? 'YOUR TURN (CYAN)' : 'AI THINKING (PURPLE)'}</span>
          </div>
          <button
            onClick={handleReset}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Reset Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chess Arena */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chessboard (8 Cols) */}
        <div className="lg:col-span-8 bg-zinc-900/60 p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center justify-center">
          <div className="grid grid-cols-8 gap-1.5 p-3 bg-zinc-950 rounded-2xl border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                const isLight = (r + c) % 2 === 0;

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={cn(
                      "w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-3xl font-black cursor-pointer transition-all relative select-none",
                      isLight ? "bg-zinc-900/90 text-white" : "bg-zinc-950 text-zinc-300",
                      isSelected && "ring-2 ring-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(6,182,212,0.5)]",
                      "hover:brightness-125"
                    )}
                  >
                    {piece && (
                      <span 
                        className={cn(
                          "transition-transform hover:scale-110 drop-shadow-[0_0_10px_currentColor]",
                          piece.color === 'w' ? "text-cyan-400" : "text-purple-400"
                        )}
                      >
                        {PIECE_SYMBOLS[piece.type]}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Move Notation Tape & AI HUD (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              NEURAL CHESS HUD
            </h3>
          </div>

          {/* Captured Pieces */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>Captured Black Pieces:</span>
              <span className="text-purple-400 font-bold">
                {capturedPieces.b.map(p => PIECE_SYMBOLS[p]).join(' ')}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Captured White Pieces:</span>
              <span className="text-cyan-400 font-bold">
                {capturedPieces.w.map(p => PIECE_SYMBOLS[p]).join(' ')}
              </span>
            </div>
          </div>

          {/* Move Log */}
          <div className="space-y-1.5">
            <span className="text-zinc-400 font-bold">PGN MOVE STREAM</span>
            <div className="max-h-48 overflow-y-auto space-y-1 bg-zinc-950 p-3 rounded-xl border border-white/5">
              {moveHistory.length === 0 ? (
                <div className="text-zinc-600 text-center py-4">Awaiting first move...</div>
              ) : (
                moveHistory.map((m, idx) => (
                  <div key={idx} className="flex justify-between text-zinc-300">
                    <span className="text-zinc-500">#{moveHistory.length - idx}</span>
                    <span className="font-bold text-cyan-400">{m}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
