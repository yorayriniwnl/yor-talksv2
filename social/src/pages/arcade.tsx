import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Trophy, Sparkles, Terminal, Flame, Star, Award, Shield, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CyberCricketGame } from '@/components/games/CyberCricketGame';
import { NeonHackerGame } from '@/components/games/NeonHackerGame';
import { CyberStarfighter } from '@/components/games/CyberStarfighter';
import { CyberTyper } from '@/components/games/CyberTyper';
import { CyberChess } from '@/components/games/CyberChess';
import { CyberSnake } from '@/components/games/CyberSnake';
import { CyberDrone } from '@/components/games/CyberDrone';
import { CyberAsteroids } from '@/components/games/CyberAsteroids';
import { CyberTank } from '@/components/games/CyberTank';
import { CyberBrickBreaker } from '@/components/games/CyberBrickBreaker';
import { Cyber2048 } from '@/components/games/Cyber2048';
import { CyberChaiTap } from '@/components/games/CyberChaiTap';
import { CyberRunner } from '@/components/games/CyberRunner';
import { CyberMemory } from '@/components/games/CyberMemory';
import { CyberTowerDefense } from '@/components/games/CyberTowerDefense';
import { CyberPinball } from '@/components/games/CyberPinball';
import { CyberHoli } from '@/components/games/CyberHoli';
import { CyberKite } from '@/components/games/CyberKite';
import { CyberKabaddi } from '@/components/games/CyberKabaddi';
import { CyberDiya } from '@/components/games/CyberDiya';
import { CyberGilliDanda } from '@/components/games/CyberGilliDanda';
import { CyberSaanpSeedhi } from '@/components/games/CyberSaanpSeedhi';
import { CyberDandiya } from '@/components/games/CyberDandiya';
import { CyberDosa } from '@/components/games/CyberDosa';
import { CyberGulabJamun } from '@/components/games/CyberGulabJamun';
import { CyberSamosa } from '@/components/games/CyberSamosa';
import { CyberJalebi } from '@/components/games/CyberJalebi';
import { CyberRasgulla } from '@/components/games/CyberRasgulla';
import { CyberKajuKatli } from '@/components/games/CyberKajuKatli';
import { CyberMysorePak } from '@/components/games/CyberMysorePak';
import { CyberMotichoor } from '@/components/games/CyberMotichoor';
import { CyberRasmalai } from '@/components/games/CyberRasmalai';
import { CyberGhewar } from '@/components/games/CyberGhewar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

export default function Arcade() {
  const [activeGame, setActiveGame] = useState<'cricket' | 'hacker' | 'starfighter' | 'typer' | 'chess' | 'snake' | 'drone' | 'asteroids' | 'tank' | 'breaker' | '2048' | 'chai' | 'runner' | 'memory' | 'defense' | 'pinball' | 'holi' | 'kite' | 'kabaddi' | 'diya' | 'gilli' | 'saanp' | 'dandiya' | 'dosa' | 'jamun' | 'samosa' | 'jalebi' | 'rasgulla' | 'kaju' | 'mysore' | 'motichoor' | 'rasmalai' | 'ghewar'>('cricket');

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-primary text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Cyber Arcade & Mini-Games</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Play Instant Web Games, Climb Leaderboards & Win Karma</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Trophy className="w-3.5 h-3.5 fill-amber-400" /> Daily Karma Pool: 10,000 Pts
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Game Switcher Tabs */}
        <div className="flex gap-2 p-1.5 rounded-2xl surface-1 border border-border/40 w-fit mx-auto flex-wrap justify-center">
          <Button
            size="sm"
            variant={activeGame === 'cricket' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('cricket');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'cricket' && "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md")}
          >
            🏏 Cricket
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'hacker' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('hacker');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'hacker' && "bg-emerald-600 text-black shadow-md")}
          >
            💻 Matrix
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'starfighter' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('starfighter');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'starfighter' && "bg-cyan-600 text-white shadow-md")}
          >
            🚀 Space
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'typer' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('typer');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'typer' && "bg-purple-600 text-white shadow-md")}
          >
            ⌨️ Typer
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'chess' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('chess');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'chess' && "bg-amber-500 text-black shadow-md")}
          >
            👑 Chess
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'snake' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('snake');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'snake' && "bg-teal-500 text-black shadow-md")}
          >
            🐍 Snake
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'drone' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('drone');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'drone' && "bg-blue-600 text-white shadow-md")}
          >
            🛸 Drone
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'asteroids' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('asteroids');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'asteroids' && "bg-pink-600 text-white shadow-md")}
          >
            ☄️ Orbit
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'tank' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('tank');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'tank' && "bg-emerald-600 text-black shadow-md")}
          >
            🛡️ Tank
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'breaker' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('breaker');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'breaker' && "bg-rose-500 text-white shadow-md")}
          >
            🧱 Breakout
          </Button>

          <Button
            size="sm"
            variant={activeGame === '2048' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('2048');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === '2048' && "bg-amber-400 text-black shadow-md")}
          >
            🔱 2048
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'chai' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('chai');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'chai' && "bg-orange-500 text-white shadow-md")}
          >
            ☕ Chai Rush
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'runner' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('runner');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'runner' && "bg-cyan-500 text-black shadow-md")}
          >
            🏃 Runner
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'memory' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('memory');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'memory' && "bg-purple-600 text-white shadow-md")}
          >
            🧠 Memory
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'defense' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('defense');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'defense' && "bg-indigo-600 text-white shadow-md")}
          >
            🏰 Defense
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'pinball' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('pinball');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'pinball' && "bg-pink-600 text-white shadow-md")}
          >
            🕹️ Pinball
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'holi' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('holi');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'holi' && "bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-md")}
          >
            🎨 Holi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kite' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kite');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kite' && "bg-amber-400 text-black shadow-md")}
          >
            🪁 Patang
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kabaddi' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kabaddi');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kabaddi' && "bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md")}
          >
            🤼 Kabaddi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'diya' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('diya');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'diya' && "bg-amber-500 text-black shadow-md")}
          >
            🪔 Diya
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'gilli' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('gilli');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'gilli' && "bg-gradient-to-r from-amber-400 to-red-500 text-black shadow-md")}
          >
            🏏 Gilli Danda
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'saanp' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('saanp');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'saanp' && "bg-gradient-to-r from-emerald-400 to-indigo-600 text-black shadow-md")}
          >
            🎲 Saanp Seedhi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'dandiya' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('dandiya');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'dandiya' && "bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-md")}
          >
            🥢 Dandiya
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'dosa' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('dosa');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'dosa' && "bg-amber-500 text-black shadow-md")}
          >
            🥞 Dosa Master
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'jamun' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('jamun');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'jamun' && "bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md")}
          >
            🍯 Gulab Jamun
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'samosa' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('samosa');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'samosa' && "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md")}
          >
            🥟 Samosa
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'jalebi' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('jalebi');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'jalebi' && "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md")}
          >
            🌀 Jalebi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'rasgulla' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('rasgulla');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'rasgulla' && "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md")}
          >
            ⚪ Rasgulla
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kaju' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kaju');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kaju' && "bg-gradient-to-r from-amber-200 via-white to-slate-200 text-black shadow-md")}
          >
            💎 Kaju Katli
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'mysore' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('mysore');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'mysore' && "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md")}
          >
            👑 Mysore Pak
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'motichoor' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('motichoor');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'motichoor' && "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md")}
          >
            ✨ Motichoor Ladoo
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'rasmalai' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('rasmalai');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'rasmalai' && "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-black shadow-md")}
          >
            🥛 Rasmalai
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'ghewar' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('ghewar');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'ghewar' && "bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-black shadow-md")}
          >
            👑 Ghewar
          </Button>
        </div>

        {/* Active Mini-Game View */}
        <div>
          {activeGame === 'cricket' && <CyberCricketGame />}
          {activeGame === 'hacker' && <NeonHackerGame />}
          {activeGame === 'starfighter' && <CyberStarfighter />}
          {activeGame === 'typer' && <CyberTyper />}
          {activeGame === 'chess' && <CyberChess />}
          {activeGame === 'snake' && <CyberSnake />}
          {activeGame === 'drone' && <CyberDrone />}
          {activeGame === 'asteroids' && <CyberAsteroids />}
          {activeGame === 'tank' && <CyberTank />}
          {activeGame === 'breaker' && <CyberBrickBreaker />}
          {activeGame === '2048' && <Cyber2048 />}
          {activeGame === 'chai' && <CyberChaiTap />}
          {activeGame === 'runner' && <CyberRunner />}
          {activeGame === 'memory' && <CyberMemory />}
          {activeGame === 'defense' && <CyberTowerDefense />}
          {activeGame === 'pinball' && <CyberPinball />}
          {activeGame === 'holi' && <CyberHoli />}
          {activeGame === 'kite' && <CyberKite />}
          {activeGame === 'kabaddi' && <CyberKabaddi />}
          {activeGame === 'diya' && <CyberDiya />}
          {activeGame === 'gilli' && <CyberGilliDanda />}
          {activeGame === 'saanp' && <CyberSaanpSeedhi />}
          {activeGame === 'dandiya' && <CyberDandiya />}
          {activeGame === 'dosa' && <CyberDosa />}
          {activeGame === 'jamun' && <CyberGulabJamun />}
          {activeGame === 'samosa' && <CyberSamosa />}
          {activeGame === 'jalebi' && <CyberJalebi />}
          {activeGame === 'rasgulla' && <CyberRasgulla />}
          {activeGame === 'kaju' && <CyberKajuKatli />}
          {activeGame === 'mysore' && <CyberMysorePak />}
          {activeGame === 'motichoor' && <CyberMotichoor />}
          {activeGame === 'rasmalai' && <CyberRasmalai />}
          {activeGame === 'ghewar' && <CyberGhewar />}
        </div>

        {/* Global Mini-Game Hall of Fame Leaderboard */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-sm max-w-xl mx-auto">
          <div className="showcase-section-title mb-4">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3>National Arcade Leaderboard (Season 1)</h3>
          </div>

          <div className="space-y-3">
            {[
              { rank: 1, name: 'Ayush Roy', score: '184 Runs', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', reward: '👑 Grandmaster' },
              { rank: 2, name: 'Rohan Verma', score: '162 Runs', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', reward: '🥈 Diamond' },
              { rank: 3, name: 'Anya Sharma', score: '148 Runs', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop', reward: '🥉 Platinum' },
            ].map((lead) => (
              <div key={lead.rank} className="p-3.5 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn("w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs font-mono", lead.rank === 1 ? "bg-amber-400 text-black" : "bg-muted text-muted-foreground")}>
                    {lead.rank}
                  </span>
                  <Avatar className="w-8 h-8 border border-border/40">
                    <AvatarImage src={lead.avatar} />
                    <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-xs text-foreground">{lead.name}</span>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="font-bold text-amber-400">{lead.score}</span>
                  <span className="text-[0.62rem] text-muted-foreground ml-2">{lead.reward}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
