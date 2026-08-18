import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, Shield, Heart, Trophy, RotateCcw, 
  Sparkles, Key, Zap, Skull, Compass, Package
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type TileType = 'wall' | 'floor' | 'player' | 'enemy' | 'chest' | 'exit';

interface Entity {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
}

const GRID_SIZE = 12;

export default function CyberRogue() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [floor, setFloor] = useState(1);
  const [player, setPlayer] = useState<Entity>({ x: 1, y: 1, hp: 100, maxHp: 100, atk: 25 });
  const [enemies, setEnemies] = useState<Entity[]>([
    { x: 4, y: 3, hp: 40, maxHp: 40, atk: 12 },
    { x: 8, y: 7, hp: 60, maxHp: 60, atk: 18 },
  ]);
  const [chests, setChests] = useState<{ x: number; y: number; item: string }[]>([
    { x: 3, y: 8, item: 'Thermal Katana (+15 ATK)' },
    { x: 9, y: 2, item: 'Subdermal Plating (+30 HP)' },
  ]);
  const [exitPos] = useState({ x: 10, y: 10 });
  const [inventory, setInventory] = useState<string[]>(['Basic Cyber-Deck']);
  const [log, setLog] = useState<string[]>(['Entered Neon Sub-level 1. Systems online.']);
  const [isGameOver, setIsGameOver] = useState(false);

  // Generate Maze Walls
  const isWall = (x: number, y: number) => {
    if (x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1) return true;
    if ((x === 3 && y < 7) || (x === 7 && y > 4) || (y === 5 && x > 2 && x < 8)) return true;
    return false;
  };

  const movePlayer = (dx: number, dy: number) => {
    if (isGameOver) return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (isWall(nx, ny)) return;

    // Check Enemy Combat
    const enemyIdx = enemies.findIndex(e => e.x === nx && e.y === ny);
    if (enemyIdx !== -1) {
      uiaudio.warp();
      const enemy = enemies[enemyIdx];
      const newEnemyHp = enemy.hp - player.atk;

      if (newEnemyHp <= 0) {
        uiaudio.success();
        setEnemies(prev => prev.filter((_, i) => i !== enemyIdx));
        setLog(prev => [`Dealt ${player.atk} DMG! Hostile cyber-drone neutralised!`, ...prev.slice(0, 8)]);
      } else {
        // Enemy strikes back
        const newPlayerHp = Math.max(0, player.hp - enemy.atk);
        setEnemies(prev => prev.map((e, i) => i === enemyIdx ? { ...e, hp: newEnemyHp } : e));
        setPlayer(p => ({ ...p, hp: newPlayerHp }));
        setLog(prev => [`Hit enemy for ${player.atk} DMG. Took ${enemy.atk} counter-damage!`, ...prev.slice(0, 8)]);

        if (newPlayerHp <= 0) {
          uiaudio.error();
          setIsGameOver(true);
          setLog(prev => ['CRITICAL SYSTEM FAILURE: Operative terminated in combat.', ...prev]);
        }
      }
      return;
    }

    // Check Chest Pickup
    const chestIdx = chests.findIndex(c => c.x === nx && c.y === ny);
    if (chestIdx !== -1) {
      uiaudio.success();
      const item = chests[chestIdx].item;
      setChests(prev => prev.filter((_, i) => i !== chestIdx));
      setInventory(prev => [...prev, item]);
      if (item.includes('ATK')) setPlayer(p => ({ ...p, atk: p.atk + 15 }));
      if (item.includes('HP')) setPlayer(p => ({ ...p, maxHp: p.maxHp + 30, hp: p.hp + 30 }));
      setLog(prev => [`Looted cache: ${item}!`, ...prev.slice(0, 8)]);
    }

    // Check Exit Staircase
    if (nx === exitPos.x && ny === exitPos.y) {
      uiaudio.success();
      setFloor(f => f + 1);
      setPlayer(p => ({ ...p, x: 1, y: 1 }));
      setLog(prev => [`Advanced to Neon Sub-level ${floor + 1}! Hostile density increasing.`, ...prev.slice(0, 8)]);
      return;
    }

    uiaudio.hover();
    setPlayer(p => ({ ...p, x: nx, y: ny }));
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') movePlayer(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's') movePlayer(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') movePlayer(1, 0);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, enemies, chests, isGameOver]);

  const handleResetGame = () => {
    uiaudio.warp();
    setFloor(1);
    setPlayer({ x: 1, y: 1, hp: 100, maxHp: 100, atk: 25 });
    setEnemies([
      { x: 4, y: 3, hp: 40, maxHp: 40, atk: 12 },
      { x: 8, y: 7, hp: 60, maxHp: 60, atk: 18 },
    ]);
    setChests([
      { x: 3, y: 8, item: 'Thermal Katana (+15 ATK)' },
      { x: 9, y: 2, item: 'Subdermal Plating (+30 HP)' },
    ]);
    setInventory(['Basic Cyber-Deck']);
    setLog(['Simulation reinitialized. Systems online.']);
    setIsGameOver(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Skull className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
              CYBER ROGUE // NEON DUNGEON CRAWLER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Turn-based grid dungeon crawler with permadeath cyber combat for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Level Indicator */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <span className="text-zinc-400">FLOOR:</span>
            <span className="text-purple-400 font-black text-sm">LEVEL {floor}</span>
          </div>
          <button
            onClick={handleResetGame}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Reset Dungeon"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Dungeon Grid & HUD */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Grid Map (8 Cols) */}
        <div className="lg:col-span-8 bg-zinc-900/60 p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center justify-center">
          <div className="grid grid-cols-12 gap-1 p-2 bg-zinc-950 rounded-2xl border border-purple-500/20 shadow-inner">
            {Array.from({ length: GRID_SIZE }).map((_, r) =>
              Array.from({ length: GRID_SIZE }).map((_, c) => {
                const isP = player.x === c && player.y === r;
                const isE = enemies.some(e => e.x === c && e.y === r);
                const isC = chests.some(ch => ch.x === c && ch.y === r);
                const isEx = exitPos.x === c && exitPos.y === r;
                const isW = isWall(c, r);

                return (
                  <div
                    key={`${r}-${c}`}
                    className={cn(
                      "w-8 h-8 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-sm font-black transition-all",
                      isW ? "bg-zinc-900 border border-white/5" : "bg-zinc-950/40 border border-white/5",
                      isP && "bg-cyan-500 text-black shadow-[0_0_15px_#06b6d4] scale-105 z-10",
                      isE && "bg-red-500 text-white shadow-[0_0_15px_#ef4444] animate-pulse",
                      isC && "bg-amber-500 text-black shadow-[0_0_10px_#f59e0b]",
                      isEx && "bg-emerald-500 text-black shadow-[0_0_12px_#10b981]"
                    )}
                  >
                    {isP && '👤'}
                    {isE && '👾'}
                    {isC && '📦'}
                    {isEx && '🚪'}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Status HUD & Action Logs (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-sm uppercase text-white pb-2 border-b border-white/10">
              OPERATIVE VITALS
            </h3>

            {/* HP Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>HEALTH INTEGRITY:</span>
                <span className="text-cyan-400 font-bold">{player.hp} / {player.maxHp} HP</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all"
                  style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-zinc-400 pt-1">
              <span>ATTACK POWER:</span>
              <span className="text-amber-400 font-bold">{player.atk} DMG</span>
            </div>

            {/* Inventory */}
            <div className="pt-2 border-t border-white/5 space-y-1">
              <span className="text-zinc-400 font-bold">CYBER INVENTORY:</span>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {inventory.map((item, idx) => (
                  <div key={idx} className="p-1.5 bg-zinc-950 rounded border border-white/5 text-[11px] text-zinc-300">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Log */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase">COMBAT ACTION FEED</span>
            <div className="space-y-1 max-h-32 overflow-y-auto text-[10px] text-zinc-400">
              {log.map((entry, idx) => (
                <div key={idx} className="text-zinc-300">• {entry}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
