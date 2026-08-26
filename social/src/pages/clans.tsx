import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Users, Trophy, Swords, Calendar, MessageSquare, 
  Plus, Check, Sparkles, Crown, Target, Flame, Send 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

interface ClanMember {
  id: string;
  name: string;
  avatar: string;
  role: 'IGL (Leader)' | 'Entry Fragger' | 'Sniper' | 'Support' | 'Coach';
  kd: string;
  winrate: string;
  status: 'online' | 'in-game' | 'offline';
}

const CLAN_ROSTER: ClanMember[] = [
  { id: '1', name: 'Ayush Roy (Yor)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', role: 'IGL (Leader)', kd: '6.42', winrate: '74%', status: 'online' },
  { id: '2', name: 'Rohan Verma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', role: 'Entry Fragger', kd: '7.15', winrate: '72%', status: 'in-game' },
  { id: '3', name: 'Anya', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop', role: 'Sniper', kd: '5.80', winrate: '69%', status: 'online' },
  { id: '4', name: 'Aravind Rao', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', role: 'Entry Fragger', kd: '6.90', winrate: '76%', status: 'online' },
  { id: '5', name: 'Devansh Deshmukh', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop', role: 'Support', kd: '4.90', winrate: '71%', status: 'offline' },
  { id: '6', name: 'Renata Silva', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop', role: 'Coach', kd: '5.10', winrate: '68%', status: 'online' },
  { id: '7', name: 'Kenji Sato', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop', role: 'Support', kd: '5.40', winrate: '70%', status: 'in-game' },
  { id: '8', name: 'Sakura Miyamoto', avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=200&auto=format&fit=crop', role: 'Support', kd: '4.75', winrate: '65%', status: 'online' },
];

export default function Clans() {
  const [activeTab, setActiveTab] = useState<'roster' | 'scrims' | 'warroom'>('roster');
  const [roster, setRoster] = useState<ClanMember[]>(CLAN_ROSTER);
  const [chatMessages, setChatMessages] = useState<{ user: string; text: string; time: string }[]>([
    { user: 'Ayush Roy', text: 'Scrims booked against Team SouL at 9:00 PM on Erangel!', time: '10m ago' },
    { user: 'Rohan Verma', text: 'Warm up TDM done. Ready for customs.', time: '5m ago' },
    { user: 'Anya', text: 'Locking AWM & M416 loadouts 🔥', time: 'Just now' },
    { user: 'Aravind Rao', text: 'Crosshair placement drills completed. Let us dominate!', time: 'Just now' },
  ]);
  const [newMsg, setNewMsg] = useState('');

  const handleSendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    sounds.playPop();
    setChatMessages(prev => [...prev, { user: 'You', text: newMsg.trim(), time: 'Just now' }]);
    setNewMsg('');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Clan Wars & Squad Command</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Roster and War Room preview · booking service pending</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Crown className="w-3.5 h-3.5 fill-amber-400" /> Rank #4 National Guild
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Clan Identity Banner */}
        <div className="surface-1 rounded-3xl p-6 sm:p-8 border border-border/40 relative overflow-hidden shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary via-purple-500 to-accent text-white flex items-center justify-center font-display font-black text-3xl shadow-xl glow-neon-primary shrink-0">
                YOR
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-black text-2xl text-foreground">Yor Esports Guild [YOR]</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[0.65rem] font-bold border border-emerald-500/30">
                    Tier 1 Verified
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">Conqueror Squad · 38 Tournament Victories · Mumbai & Bengaluru</p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-center">
                <span className="text-muted-foreground block text-[0.62rem]">Clan Karma Vault</span>
                <span className="font-bold text-amber-400">145,000 Pts</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-center">
                <span className="text-muted-foreground block text-[0.62rem]">Win Rate</span>
                <span className="font-bold text-emerald-400">73.5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1.5 rounded-2xl surface-1 border border-border/40 w-fit">
          <Button
            size="sm"
            variant={activeTab === 'roster' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('roster')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'roster' && "bg-primary text-primary-foreground shadow-md")}
          >
            <Users className="w-3.5 h-3.5 mr-1.5" /> Official Roster ({roster.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'scrims' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('scrims')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'scrims' && "bg-emerald-600 text-white shadow-md")}
          >
            <Swords className="w-3.5 h-3.5 mr-1.5" /> Scrims & Match Finder
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'warroom' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('warroom')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'warroom' && "bg-cyan-600 text-white shadow-md")}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Tactical War Room Chat
          </Button>
        </div>

        {activeTab === 'roster' && (
          /* Official Squad Roster Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roster.map((m) => (
              <div key={m.id} className="surface-1 rounded-3xl p-5 border border-border/40 flex items-center justify-between shadow-sm hover:border-primary/40 transition-all">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-14 h-14 border-2 border-border/60">
                      <AvatarImage src={m.avatar} />
                      <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background",
                      m.status === 'online' ? "bg-emerald-400" : m.status === 'in-game' ? "bg-cyan-400" : "bg-zinc-500"
                    )} />
                  </div>
                  <div>
                    <span className="text-[0.62rem] font-mono uppercase text-primary font-bold">{m.role}</span>
                    <h4 className="font-display font-bold text-sm text-foreground">{m.name}</h4>
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-0.5">
                      <span>K/D: <strong className="text-foreground">{m.kd}</strong></span>
                      <span>&middot;</span>
                      <span>Win: <strong className="text-emerald-400">{m.winrate}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={cn("text-[0.62rem] font-mono px-2 py-0.5 rounded-full uppercase font-bold", m.status === 'in-game' ? "bg-cyan-500/20 text-cyan-400" : "bg-muted text-muted-foreground")}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'scrims' && (
          /* Scrims Finder */
          <div className="space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Swords className="w-5 h-5 text-emerald-400" /> Tier-1 Daily Practice Scrims
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">Book official practice customs hosted by verified esports leagues.</p>
              </div>

              <Button
                disabled
                className="rounded-2xl font-bold text-xs h-11 px-6 bg-muted text-muted-foreground"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Booking unavailable
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'warroom' && (
          /* Tactical War Room Chat */
          <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-lg">
            <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Encrypted Tactical Squad Channel
              </span>
              <span className="text-[0.65rem] font-mono text-muted-foreground">End-to-End P2P Channel</span>
            </div>

            <div className="p-5 h-64 overflow-y-auto space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs font-sans">
                  <span className="font-bold text-primary shrink-0">{msg.user}:</span>
                  <p className="text-foreground/90 flex-1">{msg.text}</p>
                  <span className="text-[0.62rem] font-mono text-muted-foreground shrink-0">{msg.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMsg} className="p-3 border-t border-border/40 bg-muted/10 flex items-center gap-2">
              <Input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Type strategy message to squad…"
                className="rounded-xl bg-background border-border/60 text-xs h-10"
              />
              <Button type="submit" size="sm" className="rounded-xl h-10 px-4 bg-primary text-primary-foreground font-bold shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
