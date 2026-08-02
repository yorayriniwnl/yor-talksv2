import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Users, Compass, Plus, Sparkles } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

export default function Communities() {
  const communities = useAppStore((s) => s.communities);
  
  const joinCommunity = useAppStore((s) => (s as any).joinCommunity || s.toggleCommunityMembership);
  const leaveCommunity = useAppStore((s) => (s as any).leaveCommunity || s.toggleCommunityMembership);

  const yourCircles = communities.filter(c => c.isMember);
  const discoverCircles = communities.filter(c => !c.isMember);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Circles & Communities</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Connect around shared passions</p>
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
            <div className="surface-1 rounded-2xl p-10 text-center border border-dashed border-border/60">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <h4 className="font-display font-bold text-lg mb-1">No circles joined yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Explore the communities below and join your first circle to stay updated.</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {yourCircles.map(community => (
                <motion.div key={community.id} variants={staggerItem} className="surface-1 rounded-2xl overflow-hidden flex flex-col border border-border/40 hover:border-primary/40 transition-all duration-300 group">
                  <div className="h-36 bg-muted relative shrink-0 overflow-hidden">
                    <img src={community.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-3 right-3 text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                      {community.category}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <Link href={`/communities/${community.id}`}>
                      <h3 className="font-display font-bold text-lg leading-tight mb-1 hover:underline cursor-pointer">{community.name}</h3>
                    </Link>
                    <p className="text-xs font-serif text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{community.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{community.members.toLocaleString()}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => leaveCommunity(community.id)} className="rounded-xl font-bold text-xs border-border/60 hover:bg-destructive/10 hover:text-destructive">
                        Leave
                      </Button>
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
                <motion.div key={community.id} variants={staggerItem} className="surface-1 rounded-2xl overflow-hidden flex flex-col border border-border/40 hover:border-accent/40 transition-all duration-300 group">
                  <div className="h-36 bg-muted relative shrink-0 overflow-hidden">
                    <img src={community.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-3 right-3 text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                      {community.category}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <Link href={`/communities/${community.id}`}>
                      <h3 className="font-display font-bold text-lg leading-tight mb-1 hover:underline cursor-pointer">{community.name}</h3>
                    </Link>
                    <p className="text-xs font-serif text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{community.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{community.members.toLocaleString()}</span>
                      </div>
                      <Button size="sm" onClick={() => joinCommunity(community.id)} className="rounded-xl font-bold text-xs glow-neon-primary bg-primary">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Join
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
