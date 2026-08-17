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
import { CyberGujiya } from '@/components/games/CyberGujiya';
import { CyberSandesh } from '@/components/games/CyberSandesh';
import { CyberPeda } from '@/components/games/CyberPeda';
import { CyberSoanPapdi } from '@/components/games/CyberSoanPapdi';
import { CyberKalakand } from '@/components/games/CyberKalakand';
import { CyberBalushahi } from '@/components/games/CyberBalushahi';
import { CyberImarti } from '@/components/games/CyberImarti';
import { CyberMalpua } from '@/components/games/CyberMalpua';
import { CyberPayasam } from '@/components/games/CyberPayasam';
import { CyberShrikhand } from '@/components/games/CyberShrikhand';
import { CyberGhevarMalai } from '@/components/games/CyberGhevarMalai';
import { CyberGondLaddu } from '@/components/games/CyberGondLaddu';
import { CyberBesanLadoo } from '@/components/games/CyberBesanLadoo';
import { CyberChikki } from '@/components/games/CyberChikki';
import { CyberPhirni } from '@/components/games/CyberPhirni';
import { CyberRabdiFalooda } from '@/components/games/CyberRabdiFalooda';
import { CyberKajuAnjeer } from '@/components/games/CyberKajuAnjeer';
import { CyberMatkaKulfi } from '@/components/games/CyberMatkaKulfi';
import { CyberDodhaBarfi } from '@/components/games/CyberDodhaBarfi';
import { CyberAkhrotHalwa } from '@/components/games/CyberAkhrotHalwa';
import { CyberDryFruitBarfi } from '@/components/games/CyberDryFruitBarfi';
import { CyberSohanHalwa } from '@/components/games/CyberSohanHalwa';
import { CyberRajbhog } from '@/components/games/CyberRajbhog';
import { CyberChumChum } from '@/components/games/CyberChumChum';
import { CyberLangcha } from '@/components/games/CyberLangcha';
import { CyberSitabhog } from '@/components/games/CyberSitabhog';
import { CyberBanarasiLalPeda } from '@/components/games/CyberBanarasiLalPeda';
import { CyberMalaiPaan } from '@/components/games/CyberMalaiPaan';
import { CyberAnjeerHalwa } from '@/components/games/CyberAnjeerHalwa';
import { CyberKesarChumChum } from '@/components/games/CyberKesarChumChum';
import { CyberKajuPistaRoll } from '@/components/games/CyberKajuPistaRoll';
import { CyberAgraPetha } from '@/components/games/CyberAgraPetha';
import { CyberGulkandRoll } from '@/components/games/CyberGulkandRoll';
import { CyberShahiMalpua } from '@/components/games/CyberShahiMalpua';
import { CyberKesarGhevar } from '@/components/games/CyberKesarGhevar';
import { CyberAngooriChamCham } from '@/components/games/CyberAngooriChamCham';
import { CyberMohanThal } from '@/components/games/CyberMohanThal';
import { CyberKesarMalaiPeda } from '@/components/games/CyberKesarMalaiPeda';
import { CyberKesarKulfiFalooda } from '@/components/games/CyberKesarKulfiFalooda';
import { CyberPistaMawaBarfi } from '@/components/games/CyberPistaMawaBarfi';
import { CyberBadamHalwa } from '@/components/games/CyberBadamHalwa';
import { CyberMalaiGilori } from '@/components/games/CyberMalaiGilori';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

export default function Arcade() {
  const [activeGame, setActiveGame] = useState<'cricket' | 'hacker' | 'starfighter' | 'typer' | 'chess' | 'snake' | 'drone' | 'asteroids' | 'tank' | 'breaker' | '2048' | 'chai' | 'runner' | 'memory' | 'defense' | 'pinball' | 'holi' | 'kite' | 'kabaddi' | 'diya' | 'gilli' | 'saanp' | 'dandiya' | 'dosa' | 'jamun' | 'samosa' | 'jalebi' | 'rasgulla' | 'kaju' | 'mysore' | 'motichoor' | 'rasmalai' | 'ghewar' | 'gujiya' | 'sandesh' | 'peda' | 'soan' | 'kalakand' | 'balushahi' | 'imarti' | 'malpua' | 'payasam' | 'shrikhand' | 'malai-ghewar' | 'gond-laddu' | 'besan-ladoo' | 'chikki' | 'phirni' | 'falooda' | 'kaju-anjeer' | 'matka-kulfi' | 'dodha-barfi' | 'akhrot-halwa' | 'dryfruit-barfi' | 'sohan-halwa' | 'rajbhog' | 'chum-chum' | 'langcha' | 'sitabhog' | 'lal-peda' | 'malai-paan' | 'anjeer-halwa' | 'kesar-chum-chum' | 'kaju-pista-roll' | 'agra-petha' | 'gulkand-roll' | 'shahi-malpua' | 'kesar-ghevar' | 'angoori-cham-cham' | 'mohan-thal' | 'kesar-peda' | 'kulfi-falooda-delight' | 'pista-mawa-barfi' | 'badam-halwa' | 'malai-gilori'>('cricket');

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

          <Button
            size="sm"
            variant={activeGame === 'gujiya' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('gujiya');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'gujiya' && "bg-gradient-to-r from-amber-400 via-rose-500 to-yellow-500 text-white shadow-md")}
          >
            🌙 Gujiya
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'sandesh' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('sandesh');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'sandesh' && "bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-600 text-black shadow-md")}
          >
            🪷 Sandesh
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'peda' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('peda');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'peda' && "bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 text-white shadow-md")}
          >
            👑 Mathura Peda
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'soan' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('soan');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'soan' && "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 text-black shadow-md")}
          >
            ✨ Soan Papdi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kalakand' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kalakand');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kalakand' && "bg-gradient-to-r from-amber-400 via-amber-600 to-yellow-600 text-white shadow-md")}
          >
            👑 Alwar Kalakand
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'balushahi' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('balushahi');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'balushahi' && "bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-black shadow-md")}
          >
            👑 Balushahi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'imarti' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('imarti');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'imarti' && "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-black shadow-md")}
          >
            👑 Imarti
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'malpua' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('malpua');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'malpua' && "bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-black shadow-md")}
          >
            👑 Malpua Rabdi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'payasam' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('payasam');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'payasam' && "bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 text-black shadow-md")}
          >
            👑 Kheer Payasam
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'shrikhand' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('shrikhand');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'shrikhand' && "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 text-black shadow-md")}
          >
            👑 Kesar Shrikhand
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'malai-ghewar' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('malai-ghewar');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'malai-ghewar' && "bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-black shadow-md")}
          >
            👑 Malai Ghevar
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'gond-laddu' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('gond-laddu');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'gond-laddu' && "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-black shadow-md")}
          >
            👑 Shahi Gond Laddu
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'besan-ladoo' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('besan-ladoo');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'besan-ladoo' && "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black shadow-md")}
          >
            👑 Besan Ladoo
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'chikki' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('chikki');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'chikki' && "bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-500 text-white shadow-md")}
          >
            👑 Lonavala Chikki
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'phirni' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('phirni');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'phirni' && "bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-black shadow-md")}
          >
            👑 Mango Phirni
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'falooda' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('falooda');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'falooda' && "bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-white shadow-md")}
          >
            👑 Rabdi Falooda
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kaju-anjeer' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kaju-anjeer');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kaju-anjeer' && "bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-900 text-white shadow-md")}
          >
            👑 Kaju Anjeer Roll
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'matka-kulfi' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('matka-kulfi');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'matka-kulfi' && "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-700 text-black shadow-md")}
          >
            👑 Matka Kulfi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'dodha-barfi' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('dodha-barfi');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'dodha-barfi' && "bg-gradient-to-r from-amber-900 via-amber-800 to-yellow-600 text-white shadow-md")}
          >
            👑 Dodha Barfi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'akhrot-halwa' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('akhrot-halwa');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'akhrot-halwa' && "bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-500 text-white shadow-md")}
          >
            👑 Akhrot Halwa
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'dryfruit-barfi' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('dryfruit-barfi');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'dryfruit-barfi' && "bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-600 text-white shadow-md")}
          >
            👑 Dry Fruit Barfi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'sohan-halwa' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('sohan-halwa');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'soan' && "bg-gradient-to-r from-amber-700 via-amber-800 to-yellow-600 text-white shadow-md")}
          >
            👑 Sohan Halwa
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'rajbhog' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('rajbhog');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'rajbhog' && "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black shadow-md")}
          >
            👑 Kesar Rajbhog
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'chum-chum' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('chum-chum');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'chum-chum' && "bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white shadow-md")}
          >
            👑 Malai Chum Chum
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'langcha' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('langcha');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'langcha' && "bg-gradient-to-r from-amber-700 via-amber-800 to-yellow-600 text-white shadow-md")}
          >
            👑 Shaktigarh Langcha
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'sitabhog' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('sitabhog');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'sitabhog' && "bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-black shadow-md")}
          >
            👑 Bardhaman Sitabhog
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'lal-peda' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('lal-peda');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'lal-peda' && "bg-gradient-to-r from-amber-700 via-rose-700 to-amber-900 text-white shadow-md")}
          >
            👑 Banarasi Lal Peda
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'malai-paan' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('malai-paan');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'malai-paan' && "bg-gradient-to-r from-emerald-400 via-teal-500 to-amber-300 text-black shadow-md")}
          >
            👑 Awadhi Malai Paan
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'anjeer-halwa' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('anjeer-halwa');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'anjeer-halwa' && "bg-gradient-to-r from-amber-700 via-rose-800 to-amber-950 text-white shadow-md")}
          >
            👑 Shahi Anjeer Halwa
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kesar-chum-chum' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kesar-chum-chum');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kesar-chum-chum' && "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black shadow-md")}
          >
            👑 Kesar Malai Chum Chum
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kaju-pista-roll' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kaju-pista-roll');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kaju-pista-roll' && "bg-gradient-to-r from-emerald-500 via-teal-600 to-amber-300 text-black shadow-md")}
          >
            👑 Shahi Kaju Pista Roll
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'agra-petha' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('agra-petha');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'agra-petha' && "bg-gradient-to-r from-yellow-300 via-amber-400 to-emerald-500 text-black shadow-md")}
          >
            👑 Agra Angoori Petha
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'gulkand-roll' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('gulkand-roll');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'gulkand-roll' && "bg-gradient-to-r from-rose-500 via-emerald-600 to-amber-400 text-white shadow-md")}
          >
            👑 Kaju Gulkand Paan Roll
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'shahi-malpua' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('shahi-malpua');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'shahi-malpua' && "bg-gradient-to-r from-amber-500 via-yellow-500 to-rose-600 text-black shadow-md")}
          >
            👑 Shahi Rabdi Malpua
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kesar-ghevar' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kesar-ghevar');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kesar-ghevar' && "bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-black shadow-md")}
          >
            👑 Kesar Malai Ghevar
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'angoori-cham-cham' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('angoori-cham-cham');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'angoori-cham-cham' && "bg-gradient-to-r from-yellow-400 via-amber-500 to-rose-500 text-black shadow-md")}
          >
            👑 Angoori Cham Cham
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'mohan-thal' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('mohan-thal');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'mohan-thal' && "bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 text-white shadow-md")}
          >
            👑 Shahi Mohan Thal
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kesar-peda' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kesar-peda');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kesar-peda' && "bg-gradient-to-r from-yellow-400 via-amber-500 to-amber-700 text-black shadow-md")}
          >
            👑 Kesar Malai Peda
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'kulfi-falooda-delight' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('kulfi-falooda-delight');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'kulfi-falooda-delight' && "bg-gradient-to-r from-pink-500 via-rose-500 to-yellow-400 text-white shadow-md")}
          >
            👑 Kulfi Falooda
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'pista-mawa-barfi' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('pista-mawa-barfi');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'pista-mawa-barfi' && "bg-gradient-to-r from-emerald-500 via-green-600 to-amber-400 text-black shadow-md")}
          >
            👑 Pista Mawa Barfi
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'badam-halwa' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('badam-halwa');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'badam-halwa' && "bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 text-black shadow-md")}
          >
            👑 Badam Halwa
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'malai-gilori' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('malai-gilori');
            }}
            className={cn("rounded-xl font-bold text-xs px-2.5 h-10", activeGame === 'malai-gilori' && "bg-gradient-to-r from-rose-400 via-emerald-500 to-amber-300 text-black shadow-md")}
          >
            👑 Malai Gilori Paan
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
          {activeGame === 'gujiya' && <CyberGujiya />}
          {activeGame === 'sandesh' && <CyberSandesh />}
          {activeGame === 'peda' && <CyberPeda />}
          {activeGame === 'soan' && <CyberSoanPapdi />}
          {activeGame === 'kalakand' && <CyberKalakand />}
          {activeGame === 'balushahi' && <CyberBalushahi />}
          {activeGame === 'imarti' && <CyberImarti />}
          {activeGame === 'malpua' && <CyberMalpua />}
          {activeGame === 'payasam' && <CyberPayasam />}
          {activeGame === 'shrikhand' && <CyberShrikhand />}
          {activeGame === 'malai-ghewar' && <CyberGhevarMalai />}
          {activeGame === 'gond-laddu' && <CyberGondLaddu />}
          {activeGame === 'besan-ladoo' && <CyberBesanLadoo />}
          {activeGame === 'chikki' && <CyberChikki />}
          {activeGame === 'phirni' && <CyberPhirni />}
          {activeGame === 'falooda' && <CyberRabdiFalooda />}
          {activeGame === 'kaju-anjeer' && <CyberKajuAnjeer />}
          {activeGame === 'matka-kulfi' && <CyberMatkaKulfi />}
          {activeGame === 'dodha-barfi' && <CyberDodhaBarfi />}
          {activeGame === 'akhrot-halwa' && <CyberAkhrotHalwa />}
          {activeGame === 'dryfruit-barfi' && <CyberDryFruitBarfi />}
          {activeGame === 'sohan-halwa' && <CyberSohanHalwa />}
          {activeGame === 'rajbhog' && <CyberRajbhog />}
          {activeGame === 'chum-chum' && <CyberChumChum />}
          {activeGame === 'langcha' && <CyberLangcha />}
          {activeGame === 'sitabhog' && <CyberSitabhog />}
          {activeGame === 'lal-peda' && <CyberBanarasiLalPeda />}
          {activeGame === 'malai-paan' && <CyberMalaiPaan />}
          {activeGame === 'anjeer-halwa' && <CyberAnjeerHalwa />}
          {activeGame === 'kesar-chum-chum' && <CyberKesarChumChum />}
          {activeGame === 'kaju-pista-roll' && <CyberKajuPistaRoll />}
          {activeGame === 'agra-petha' && <CyberAgraPetha />}
          {activeGame === 'gulkand-roll' && <CyberGulkandRoll />}
          {activeGame === 'shahi-malpua' && <CyberShahiMalpua />}
          {activeGame === 'kesar-ghevar' && <CyberKesarGhevar />}
          {activeGame === 'angoori-cham-cham' && <CyberAngooriChamCham />}
          {activeGame === 'mohan-thal' && <CyberMohanThal />}
          {activeGame === 'kesar-peda' && <CyberKesarMalaiPeda />}
          {activeGame === 'kulfi-falooda-delight' && <CyberKesarKulfiFalooda />}
          {activeGame === 'pista-mawa-barfi' && <CyberPistaMawaBarfi />}
          {activeGame === 'badam-halwa' && <CyberBadamHalwa />}
          {activeGame === 'malai-gilori' && <CyberMalaiGilori />}
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
