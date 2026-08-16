import { useState } from 'react';
import { useAppStore, type Community } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, Compass, Plus, Sparkles, MessageSquare, Pin, ArrowLeft, 
  ThumbsUp, Award, Shield, Flame, Check, Share2, Tag, Gamepad2 
} from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Link, useLocation, useRoute } from 'wouter';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ForumThread {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  isPinned?: boolean;
  isDev?: boolean;
  repliesCount: number;
  likes: number;
  timestamp: string;
  tag: string;
  awards: { icon: string; count: number; name: string }[];
}

const FORUM_THREADS: Record<string, ForumThread[]> = {
  default: [
    {
      id: 'thread-1',
      title: '📌 [Official Announcement] Next Major Platform Update & Steam Inventory Integration',
      author: 'Cyberpunk Admin',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      isPinned: true,
      isDev: true,
      repliesCount: 84,
      likes: 312,
      timestamp: '2 hours ago',
      tag: 'Announcements',
      awards: [{ icon: '💎', count: 18, name: 'Take My Points' }, { icon: '🐐', count: 9, name: 'Golden Goat' }]
    },
    {
      id: 'thread-2',
      title: 'Best GPU Shader Optimization Guide for 144Hz Smooth FPS',
      author: 'Alex_Chen',
      authorAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
      repliesCount: 42,
      likes: 189,
      timestamp: '5 hours ago',
      tag: 'Guides',
      awards: [{ icon: '🤯', count: 12, name: 'Mind Blown' }]
    },
    {
      id: 'thread-3',
      title: 'Looking for 2 more players for the Weekly Tournament Squad! (Level 50+)',
      author: 'Kai_Takahashi',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
      repliesCount: 16,
      likes: 54,
      timestamp: '1 day ago',
      tag: 'LFG / Clans',
      awards: [{ icon: '🔥', count: 6, name: 'Hype' }]
    },
    {
      id: 'thread-4',
      title: 'Showcase your customized Steam Profile and Avatar Frames here!',
      author: 'Elena_Rostova',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
      repliesCount: 97,
      likes: 420,
      timestamp: '2 days ago',
      tag: 'General',
      awards: [{ icon: '👑', count: 24, name: 'Royal' }, { icon: '💎', count: 31, name: 'Gems' }]
    }
  ]
};

// Interactive Steam Community Hub Detail Page
function CommunityHubDetail({ communityId }: { communityId: string }) {
  const [, setLocation] = useLocation();
  const communities = useAppStore((s) => s.communities);
  const toggleCommunityMembership = useAppStore((s) => s.toggleCommunityMembership);

  const community = communities.find((c) => c.id === communityId) || communities[0];
  const [activeTab, setActiveTab] = useState<'discussions' | 'announcements' | 'members'>('discussions');
  const [threads, setThreads] = useState<ForumThread[]>(FORUM_THREADS[communityId] || FORUM_THREADS.default);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [threadTag, setThreadTag] = useState('General');

  if (!community) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold font-display mb-2">Circle not found</h2>
          <Button onClick={() => setLocation('/communities')}>Return to Communities</Button>
        </div>
      </div>
    );
  }

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadTitle.trim()) return;

    sounds.playChime();
    triggerConfetti();
    const newThread: ForumThread = {
      id: `thread-${Date.now()}`,
      title: threadTitle.trim(),
      author: 'You',
      authorAvatar: 'https://picsum.photos/seed/you/200/200',
      repliesCount: 0,
      likes: 1,
      timestamp: 'Just now',
      tag: threadTag,
      awards: []
    };

    setThreads(prev => [newThread, ...prev]);
    setNewThreadOpen(false);
    setThreadTitle('');
    setThreadContent('');
    toast.success('Discussion thread published to Community Hub!');
  };

  const handleGiveAward = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playPop();
    triggerConfetti();
    setThreads(prev =>
      prev.map(t => {
        if (t.id === threadId) {
          return {
            ...t,
            likes: t.likes + 1,
            awards: [...t.awards, { icon: '💎', count: 1, name: 'Take My Points' }]
          };
        }
        return t;
      })
    );
    toast.success('Awarded Take My Points (💎) to author!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Community Header Banner */}
      <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-muted">
        <img src={community.coverUrl} alt={community.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-black/40" />

        <div className="absolute top-4 left-4 sm:left-6 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/communities')}
            className="rounded-full bg-black/60 backdrop-blur-md border-white/20 text-white hover:bg-black/80"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> All Circles
          </Button>
        </div>

        <div className="absolute bottom-6 left-4 sm:left-6 right-4 sm:right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-20">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-xs font-mono font-bold text-primary mb-2">
              <Sparkles className="w-3.5 h-3.5" /> {community.category}
            </span>
            <h1 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight">{community.name}</h1>
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-300 mt-2">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> {community.members.toLocaleString()} Members</span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> 842 Online In-Game</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                toggleCommunityMembership(community.id);
                sounds.playPop();
              }}
              className={cn("rounded-2xl font-bold text-xs px-6 h-11 shadow-lg", community.isMember ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "glow-neon-primary bg-primary text-primary-foreground")}
            >
              {community.isMember ? <Check className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {community.isMember ? 'Joined Circle' : 'Join Circle'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* About Card */}
        <div className="surface-1 p-5 rounded-3xl border border-border/40 font-sans">
          <p className="text-sm font-serif text-foreground/90 leading-relaxed">{community.description}</p>
        </div>

        {/* Steam Community Forum Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeTab === 'discussions' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('discussions')}
              className="rounded-xl font-bold text-xs px-4"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Discussions ({threads.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'announcements' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('announcements')}
              className="rounded-xl font-bold text-xs px-4"
            >
              <Pin className="w-3.5 h-3.5 mr-1.5" /> Announcements
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'members' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('members')}
              className="rounded-xl font-bold text-xs px-4"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" /> Clan Roster
            </Button>
          </div>

          <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Start Discussion
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl glass-heavy border border-border/60 font-sans">
              <DialogHeader>
                <DialogTitle className="font-display font-bold text-xl">Create Discussion Thread</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateThread} className="space-y-4">
                <div className="space-y-1.5">
                  <Input
                    value={threadTitle}
                    onChange={(e) => setThreadTitle(e.target.value)}
                    placeholder="Thread title or question…"
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Textarea
                    value={threadContent}
                    onChange={(e) => setThreadContent(e.target.value)}
                    placeholder="Provide details, guides, or squad recruitment info…"
                    rows={4}
                    className="rounded-xl resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <select
                    value={threadTag}
                    onChange={(e) => setThreadTag(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-xs font-medium"
                  >
                    <option value="General">General Discussion</option>
                    <option value="Guides">Guides & Strategy</option>
                    <option value="LFG / Clans">Looking for Group</option>
                    <option value="Trading">Trading & Marketplace</option>
                  </select>
                </div>
                <DialogFooter>
                  <Button type="submit" className="rounded-xl font-bold text-xs px-6">Publish Thread</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Discussion Threads List */}
        <div className="space-y-3">
          {threads.map((thread) => (
            <motion.div
              layout
              key={thread.id}
              className={cn(
                "p-4 sm:p-5 rounded-3xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer",
                thread.isPinned
                  ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                  : "surface-1 border-border/40 hover:border-border"
              )}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <Avatar className="w-10 h-10 shrink-0 border border-border/40">
                  <AvatarImage src={thread.authorAvatar} />
                  <AvatarFallback>{thread.author.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {thread.isPinned && (
                      <span className="text-[0.62rem] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Pinned
                      </span>
                    )}
                    {thread.isDev && (
                      <span className="text-[0.62rem] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        Developer
                      </span>
                    )}
                    <span className="text-[0.65rem] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded-md bg-muted/60">
                      {thread.tag}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {thread.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-1">
                    <span>By <strong className="text-foreground">{thread.author}</strong></span>
                    <span>·</span>
                    <span>{thread.timestamp}</span>
                  </div>

                  {/* Steam Awards Display */}
                  {thread.awards.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {thread.awards.map((award, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[0.65rem] font-mono text-amber-300">
                          <span>{award.icon}</span>
                          <span className="font-bold">{award.count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Thread Stats & Award Button */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{thread.repliesCount}</span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleGiveAward(thread.id, e)}
                  className="rounded-xl font-bold text-xs h-8 px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <Award className="w-3.5 h-3.5 mr-1" /> Award
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Communities() {
  const [, params] = useRoute('/communities/:id');
  const communityId = params?.id;

  const communities = useAppStore((s) => s.communities);
  const joinCommunity = useAppStore((s) => (s as any).joinCommunity || s.toggleCommunityMembership);
  const leaveCommunity = useAppStore((s) => (s as any).leaveCommunity || s.toggleCommunityMembership);

  // If URL matches `/communities/:id`, render the interactive Steam Community Hub & Forum
  if (communityId) {
    return <CommunityHubDetail communityId={communityId} />;
  }

  const yourCircles = communities.filter(c => c.isMember);
  const discoverCircles = communities.filter(c => !c.isMember);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Circles & Communities</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Connect around shared passions & clan discussions</p>
        </div>
        <div className="level-badge">
          <Users className="w-3.5 h-3.5" /> {yourCircles.length} Joined
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        <section>
          <div className="showcase-section-title mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3>Your Circles ({yourCircles.length})</h3>
          </div>
          
          {yourCircles.length === 0 ? (
            <div className="surface-1 rounded-3xl p-10 text-center border border-dashed border-border/60">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <h4 className="font-display font-bold text-lg mb-1">No circles joined yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Explore the communities below and join your first circle to enter discussion forums.</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {yourCircles.map(community => (
                <motion.div key={community.id} variants={staggerItem} className="surface-1 rounded-3xl overflow-hidden flex flex-col border border-border/40 hover:border-primary/40 transition-all duration-300 group shadow-sm">
                  <div className="h-36 bg-muted relative shrink-0 overflow-hidden">
                    <img src={community.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-3 right-3 text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                      {community.category}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1 justify-between">
                    <div>
                      <Link href={`/communities/${community.id}`}>
                        <h3 className="font-display font-bold text-lg leading-tight mb-1 hover:underline cursor-pointer group-hover:text-primary transition-colors">{community.name}</h3>
                      </Link>
                      <p className="text-xs font-serif text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{community.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{community.members.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/communities/${community.id}`}>
                          <Button size="sm" className="rounded-xl font-bold text-xs glow-neon-primary bg-primary">
                            Enter Hub
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => leaveCommunity(community.id)} className="rounded-xl font-bold text-xs border-border/60 hover:bg-destructive/10 hover:text-destructive">
                          Leave
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        <section>
          <div className="showcase-section-title mb-6">
            <Compass className="w-4 h-4 text-accent" />
            <h3>Discover Circles</h3>
          </div>

          {discoverCircles.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono">No new circles to discover right now.</p>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {discoverCircles.map(community => (
                <motion.div key={community.id} variants={staggerItem} className="surface-1 rounded-3xl overflow-hidden flex flex-col border border-border/40 hover:border-accent/40 transition-all duration-300 group shadow-sm">
                  <div className="h-36 bg-muted relative shrink-0 overflow-hidden">
                    <img src={community.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-3 right-3 text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                      {community.category}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1 justify-between">
                    <div>
                      <Link href={`/communities/${community.id}`}>
                        <h3 className="font-display font-bold text-lg leading-tight mb-1 hover:underline cursor-pointer group-hover:text-primary transition-colors">{community.name}</h3>
                      </Link>
                      <p className="text-xs font-serif text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{community.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{community.members.toLocaleString()}</span>
                      </div>
                      <Button size="sm" onClick={() => joinCommunity(community.id)} className="rounded-xl font-bold text-xs glow-neon-primary bg-primary">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Join Circle
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
