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
import { toast } from 'sonner';

interface ClanMember {
  id: string;
  name: string;
  avatar: string;
  role: 'IGL (Leader)' | 'Entry Fragger' | 'Sniper' | 'Support' | 'Coach';
  kd: string;
  winrate: string;
  status: 'online' | 'in-game' | 'offline';
}

export default function Clans() {
  const [activeTab, setActiveTab] = useState<'roster' | 'scrims' | 'warroom'>('roster');
  const [roster] = useState<ClanMember[]>([]);
  const [chatMessages] = useState<{ user: string; text: string; time: string }[]>([]);
  const [newMsg, setNewMsg] = useState('');

  const handleSendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    sounds.playPop();
    toast.info('Clan chat is not connected yet. Your message was not sent.');
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
                    Preview only
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">Connected clan profile, roster, and results will appear here.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-center">
                <span className="text-muted-foreground block text-[0.62rem]">Clan Karma Vault</span>
                <span className="font-bold text-amber-400">—</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-center">
                <span className="text-muted-foreground block text-[0.62rem]">Win Rate</span>
                <span className="font-bold text-emerald-400">—</span>
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
            <Users className="w-3.5 h-3.5 mr-1.5" /> Roster preview ({roster.length})
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
          /* Squad roster preview */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roster.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">Create or join a connected clan to see its verified roster.</div> : roster.map((m) => (
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
          /* Tactical War Room Chat preview */
          <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-lg">
            <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Tactical Squad Channel preview
              </span>
              <span className="text-[0.65rem] font-mono text-muted-foreground">End-to-End P2P Channel</span>
            </div>

            <div className="p-5 h-64 overflow-y-auto space-y-3">
              {chatMessages.length === 0 ? <p className="text-center text-xs text-muted-foreground">Connect a clan to enable its private war room.</p> : chatMessages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs font-sans">
                  <span className="font-bold text-primary shrink-0">{msg.user}:</span>
                  <p className="text-foreground/90 flex-1">{msg.text}</p>
                  <span className="text-[0.62rem] font-mono text-muted-foreground shrink-0">{msg.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMsg} className="p-3 border-t border-border/40 bg-muted/10 flex items-center gap-2">
              <Input
                disabled
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Connect a clan to enable chat…"
                className="rounded-xl bg-background border-border/60 text-xs h-10"
              />
              <Button type="submit" size="sm" disabled className="rounded-xl h-10 px-4 bg-muted text-muted-foreground font-bold shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
