import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Shield, UserPlus, MessageCircle, Sparkles, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

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
            className="absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl overflow-hidden glass-heavy border border-border/50 shadow-2xl font-sans text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cover Banner */}
            <div className="h-20 w-full relative bg-muted overflow-hidden">
              {user.coverUrl ? (
                <img src={user.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full aurora-bg" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-2 right-2 level-badge text-[0.62rem] shadow-md">
                <Shield className="w-3 h-3" /> Lv. 5
              </div>
            </div>

            {/* Avatar & Main Body */}
            <div className="p-4 pt-0 relative">
              <div className="flex justify-between items-end -mt-8 mb-3">
                <div className="profile-avatar-ring shadow-lg ring-2 ring-background">
                  <Avatar className="w-14 h-14 border border-border/40">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="font-display font-bold text-base">{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                
                {!isOwnProfile && (
                  <Button
                    size="sm"
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleToggleFollow}
                    className={cn("rounded-xl h-8 font-bold text-xs px-4", !isFollowing && "glow-neon-primary bg-primary")}
                  >
                    {isFollowing ? <Check className="w-3.5 h-3.5 mr-1 text-success" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>

              {/* Identity */}
              <div className="mb-2">
                <h4 className="font-display font-bold text-base leading-tight truncate flex items-center gap-1">
                  {user.displayName}
                  {user.verified && (
                    <svg className="w-4 h-4 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground font-mono">@{user.username}</p>
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-xs font-serif text-foreground/90 line-clamp-2 leading-relaxed mb-3">
                  {user.bio}
                </p>
              )}

              {/* Stats Bar */}
              <div className="flex items-center gap-4 pt-3 border-t border-border/30 font-mono text-xs text-muted-foreground">
                <div>
                  <strong className="text-foreground font-bold">{user.followers?.toLocaleString()}</strong> followers
                </div>
                <div>
                  <strong className="text-foreground font-bold">{user.following?.toLocaleString()}</strong> following
                </div>
              </div>

              {/* Message CTA */}
              {!isOwnProfile && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full rounded-xl mt-3 h-8 text-xs font-bold"
                  onClick={() => setLocation(`/messages/${user.id}`)}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-primary" /> Send Message
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
