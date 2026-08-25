import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Shield, UserPlus, MessageCircle, Sparkles, Check, Gamepad2, ArrowLeftRight, Trophy } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { SteamTradeModal } from '@/components/steam/SteamTradeModal';

interface MiniProfileCardProps {
  user: User;
  children: ReactNode;
}

export function MiniProfileCard({ user, children }: MiniProfileCardProps) {
  const [, setLocation] = useLocation();
  const currentUser = useAppStore((s) => s.currentUser);
  const followUser = useAppStore((s) => s.followUser);
  const unfollowUser = useAppStore((s) => s.unfollowUser);

  const [isOpen, setIsOpen] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const isOwnProfile = currentUser?.id === user.id;
  const isFollowing = !isOwnProfile && !!currentUser?.followingIds?.includes(user.id);

  const handleMouseEnter = () => {
    const timer = setTimeout(() => setIsOpen(true), 300);
    setTimeoutId(timer);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsOpen(false);
  };

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    isFollowing ? unfollowUser(user.id) : followUser(user.id);
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-2 z-50 w-80 rounded-3xl overflow-hidden glass-heavy border border-border/60 shadow-2xl font-sans text-left bg-zinc-950/95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cover Banner */}
            <div className="h-24 w-full relative bg-muted overflow-hidden">
              {user.coverUrl ? (
                <img src={user.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full aurora-bg" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
              
              {/* Steam Level Hex Badge */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/40 text-amber-400 font-mono text-[0.68rem] font-bold shadow-lg">
                <Shield className="w-3.5 h-3.5 fill-amber-400" />
                <span>Level {Math.max(12, ((user.followers || 100) % 90) + 10)}</span>
              </div>
            </div>

            {/* Avatar & Main Body */}
            <div className="p-4 pt-0 relative">
              <div className="flex justify-between items-end -mt-9 mb-3">
                {/* Animated Steam Avatar Border */}
                <div className="relative p-1 rounded-full bg-gradient-to-tr from-cyan-400 via-primary to-rose-500 animate-[spin_6s_linear_infinite] shadow-xl">
                  <div className="p-0.5 bg-zinc-950 rounded-full">
                    <Avatar className="w-14 h-14 border-2 border-zinc-950">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="font-display font-bold text-base bg-zinc-800 text-white">{(user.displayName || user.username || 'U').charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                {!isOwnProfile && (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={isFollowing ? "outline" : "default"}
                      onClick={handleToggleFollow}
                      className={cn("rounded-xl h-8 font-bold text-xs px-3", !isFollowing && "glow-neon-primary bg-primary")}
                    >
                      {isFollowing ? <Check className="w-3.5 h-3.5 mr-1 text-success" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Identity & Presence Status */}
              <div className="mb-2">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-display font-bold text-base leading-tight truncate text-white">
                    {user.displayName || user.username || 'User'}
                  </h4>
                  {user.verified && (
                    <svg className="w-4 h-4 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-400 font-mono">@{user.username}</span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[0.65rem] font-mono text-emerald-400 font-medium">In-Game</span>
                </div>
              </div>

              {/* Steam Rich Presence Banner */}
              <div className="p-2.5 rounded-2xl bg-zinc-900/90 border border-border/40 mb-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.62rem] font-mono uppercase text-zinc-400">Currently Playing</div>
                  <div className="text-xs font-bold text-white truncate">Cyberpunk 2077: Phantom Liberty</div>
                </div>
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-xs font-serif text-zinc-300 line-clamp-2 leading-relaxed mb-3">
                  {user.bio}
                </p>
              )}

              {/* Stats Bar */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border/40 font-mono text-xs text-zinc-400">
                <div>
                  <strong className="text-white font-bold">{user.followers?.toLocaleString()}</strong> followers
                </div>
                <div>
                  <strong className="text-white font-bold">{user.following?.toLocaleString()}</strong> following
                </div>
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Trophy className="w-3.5 h-3.5" /> 42 Badges
                </div>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl h-8 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white"
                    onClick={() => setLocation(`/messages/${user.id}`)}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-primary" /> Message
                  </Button>

                  <SteamTradeModal
                    partnerName={user.displayName}
                    partnerAvatar={user.avatarUrl}
                    trigger={
                      <Button
                        size="sm"
                        className="rounded-xl h-8 text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" /> Trade Offer
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
