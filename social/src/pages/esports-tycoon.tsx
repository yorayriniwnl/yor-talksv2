import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Users, Trophy, DollarSign, Award, Shield, 
  Zap, Flame, ArrowUpRight, CheckCircle2, Sliders, Briefcase
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PlayerContract {
  id: string;
  name: string;
  role: 'Duelist' | 'Initiator' | 'Controller' | 'Sentinel';
  rating: number;
  salaryPerMonth: number;
  morale: number;
  energy: number;
  avatarColor: string;
}

interface Facility {
  id: string;
  name: string;
  level: number;
  cost: number;
  description: string;
  buff: string;
}

export default function EsportsTycoon() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [treasury, setTreasury] = useState(150000);
  const [fansCount, setFansCount] = useState(48200);
  const [teamMorale, setTeamMorale] = useState(88);
  const [seasonWins, setSeasonWins] = useState(14);
  const [seasonLosses, setSeasonLosses] = useState(3);
  const [activeTab, setActiveTab] = useState<'roster' | 'facilities' | 'matches' | 'sponsors'>('roster');

  const [roster, setRoster] = useState<PlayerContract[]>([
    { id: '1', name: 'Anya', role: 'Duelist', rating: 96, salaryPerMonth: 12000, morale: 98, energy: 92, avatarColor: '#ec4899' },
    { id: '2', name: 'Vikram', role: 'Controller', rating: 91, salaryPerMonth: 8500, morale: 85, energy: 88, avatarColor: '#06b6d4' },
    { id: '3', name: 'Soraya', role: 'Initiator', rating: 93, salaryPerMonth: 9500, morale: 92, energy: 95, avatarColor: '#10b981' },
    { id: '4', name: 'Kazuki', role: 'Sentinel', rating: 94, salaryPerMonth: 10500, morale: 90, energy: 90, avatarColor: '#f59e0b' },
    { id: '5', name: 'Tariq', role: 'Duelist', rating: 89, salaryPerMonth: 7200, morale: 84, energy: 86, avatarColor: '#8b5cf6' },
  ]);

  const [facilities, setFacilities] = useState<Facility[]>([
    { id: 'fac-1', name: 'Cryotherapy Recovery Pods', level: 2, cost: 25000, description: 'Accelerates player physical fatigue recovery by 40%.', buff: '+15% Energy Regen' },
    { id: 'fac-2', name: 'Quantum AI Coaching Cluster', level: 3, cost: 45000, description: 'Generates automated opponent anti-strat blueprints.', buff: '+10 Team Rating' },
    { id: 'fac-3', name: 'Dedicated 10Gbps Dark Fiber', level: 4, cost: 35000, description: 'Eliminates jitter in online tournament scrims.', buff: 'Zero Packet Loss' },
  ]);

  const handleUpgradeFacility = (facId: string) => {
    const fac = facilities.find(f => f.id === facId);
    if (!fac || treasury < fac.cost) {
      uiaudio.error();
      alert('Insufficient organization capital!');
      return;
    }

    uiaudio.success();
    setTreasury(t => t - fac.cost);
    setFacilities(prev => prev.map(f => f.id === facId ? { ...f, level: f.level + 1, cost: Math.round(f.cost * 1.6) } : f));
  };

  const handleSimulateMatch = () => {
    uiaudio.warp();
    const win = Math.random() > 0.3;

    setTimeout(() => {
      if (win) {
        uiaudio.success();
        setSeasonWins(w => w + 1);
        setTreasury(t => t + 25000);
        setFansCount(f => f + 2400);
        alert('VICTORY! Your team won the National Cyber Invitational! Earned ₹25,000 Prize Pool!');
      } else {
        uiaudio.error();
        setSeasonLosses(l => l + 1);
        setTeamMorale(m => Math.max(50, m - 5));
        alert('DEFEAT in overtime. Reviewing VODs in the coaching facility.');
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Building2 className="w-8 h-8 text-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400">
                ESPORTS TYCOON // ORG MANAGER 2077
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                PRO LEAGUE TIER 1
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Roster contracts, facility investments, and tournament match simulations for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Financial Stats */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">TREASURY BALANCE</div>
            <div className="text-lg font-bold text-emerald-400">₹{treasury.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">RECORD (W-L)</div>
            <div className="text-lg font-bold text-amber-400">{seasonWins}W - {seasonLosses}L</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-2 font-mono text-xs">
        {(['roster', 'facilities', 'matches'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              uiaudio.click();
              setActiveTab(tab);
            }}
            className={cn(
              "px-4 py-2 rounded-xl uppercase transition-colors font-bold",
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" 
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'roster' && (
          <motion.div
            key="roster"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {roster.map((player) => (
              <div 
                key={player.id}
                className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl font-mono text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md text-sm"
                      style={{ backgroundColor: player.avatarColor }}
                    >
                      {player.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{player.name}</h3>
                      <p className="text-[10px] text-zinc-400 uppercase">{player.role}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-amber-400">{player.rating} OVR</div>
                    <div className="text-[10px] text-zinc-500">₹{player.salaryPerMonth}/mo</div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-zinc-400">
                    <span>Morale:</span>
                    <span className="text-emerald-400 font-bold">{player.morale}%</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Energy:</span>
                    <span className="text-cyan-400 font-bold">{player.energy}%</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'facilities' && (
          <motion.div
            key="facilities"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {facilities.map((fac) => (
              <div 
                key={fac.id}
                className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl font-mono text-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">{fac.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      LVL {fac.level}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed">{fac.description}</p>
                  <div className="text-emerald-400 font-bold pt-1">ACTIVE BUFF: {fac.buff}</div>
                </div>

                <button
                  onClick={() => handleUpgradeFacility(fac.id)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs shadow-lg hover:brightness-110 transition-all flex items-center justify-center space-x-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>UPGRADE (₹{fac.cost.toLocaleString()})</span>
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'matches' && (
          <motion.div
            key="matches"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl font-mono text-center space-y-6 max-w-xl mx-auto"
          >
            <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">UPCOMING TOURNAMENT SCRIM</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Next opponent: <strong className="text-cyan-400">Tokyo Cyber Samurai (Rank #2)</strong>.
              </p>
            </div>

            <button
              onClick={handleSimulateMatch}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-cyan-400 text-black font-black tracking-wider text-sm shadow-xl hover:brightness-110 transition-all"
            >
              SIMULATE TOURNAMENT MATCH
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
