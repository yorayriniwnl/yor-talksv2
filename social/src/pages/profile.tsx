import { useParams, Link, useLocation } from 'wouter';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAppStore, type Showcase, type ProfileComment, type Story } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, MessageCircle, Trophy, Trash2, Plus, Sparkles, MoreHorizontal,
  Grid3X3, Heart, Bookmark, Star, Award, Pin, ThumbsUp, Share2, Film,
  Image as ImageIcon, Link as LinkIcon, MapPin, Calendar, Shield, ExternalLink,
  UserPlus, Zap, Eye, Play, ChevronRight, Copy, Check
} from 'lucide-react';

import { PostCardMemo as PostCard } from '@/components/feed/Post';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { BadgeShowcaseModal } from '@/components/steam/BadgeShowcaseModal';
import { ProfileTiltCard } from '@/components/ui/ProfileTiltCard';
import { HoloAvatarCard } from '@/components/ui/HoloAvatarCard';
import { ProfileMusicPlayer } from '@/components/profile/ProfileMusicPlayer';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { staggerContainer, staggerItem, tapScale, springGentle, springBouncy, layoutIds } from '@/lib/motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const AWARDS = [
  { emoji: '🏆', label: 'Trophy', xp: 50 },
  { emoji: '⭐', label: 'Star', xp: 25 },
  { emoji: '🔥', label: 'Fire', xp: 15 },
  { emoji: '💎', label: 'Diamond', xp: 100 },
  { emoji: '❤️', label: 'Heart', xp: 10 },
  { emoji: '🚀', label: 'Rocket', xp: 30 },
];

const HIGHLIGHT_COVERS = [
  { id: 'h1', title: 'Travel', emoji: '✈️', gradient: 'from-blue-500 to-cyan-400' },
  { id: 'h2', title: 'Music', emoji: '🎵', gradient: 'from-purple-500 to-pink-400' },
  { id: 'h3', title: 'Food', emoji: '🍜', gradient: 'from-orange-500 to-yellow-400' },
  { id: 'h4', title: 'Pets', emoji: '🐾', gradient: 'from-emerald-500 to-teal-400' },
];

function computeLevel(achievements: { unlocked: boolean; xp: number }[]) {
  const totalXp = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
  const level = Math.floor(Math.sqrt(totalXp / 50)) + 1;
  const currentLevelXp = Math.pow(level - 1, 2) * 50;
  const nextLevelXp = Math.pow(level, 2) * 50;
  const progress = nextLevelXp === currentLevelXp ? 100 : ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return { level, totalXp, progress: Math.min(progress, 100), nextLevelXp, currentLevelXp };
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(0) + 'K';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

// ═══════════════════════════════════════════════════════════════════════════

//  ADD SHOWCASE DIALOG
// ═══════════════════════════════════════════════════════════════════════════
function AddShowcaseDialog({ userId }: { userId: string }) {
  const addShowcase = useAppStore(s => s.addShowcase);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'achievement' | 'custom'>('custom');
  const [title, setTitle] = useState('');
  const [customText, setCustomText] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addShowcase({ userId, type, title: title.trim(), customText: customText.trim() || undefined, customImageUrl: customImageUrl.trim() || undefined });
    setOpen(false); setTitle(''); setCustomText(''); setCustomImageUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="showcase-add-btn group">
          <div className="flex flex-col items-center gap-2.5 text-muted-foreground group-hover:text-primary transition-colors">
            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[0.68rem] font-bold uppercase tracking-wider">Add Showcase</span>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle className="font-display text-lg">Add to Showcase</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 font-sans">
          <div className="grid grid-cols-2 gap-2">
            {(['custom', 'achievement'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={cn("p-4 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-2",
                  type === t ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border text-muted-foreground hover:border-border/80"
                )}>
                {t === 'custom' ? <ImageIcon className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                {t === 'custom' ? 'Custom' : 'Achievement'}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input id="sc-title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="My Gaming Setup" className="rounded-xl h-11" />
          </div>
          {type === 'custom' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="sc-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea id="sc-desc" value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Tell people about this..." className="rounded-xl resize-none min-h-[90px]" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-img" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Image URL</Label>
                <Input id="sc-img" type="url" value={customImageUrl} onChange={e => setCustomImageUrl(e.target.value)} placeholder="https://..." className="rounded-xl h-11" />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!title.trim()} className="rounded-xl h-11 px-8 font-bold">Add to Profile</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHOWCASE CARD — Steam-style with animated gradient border
// ═══════════════════════════════════════════════════════════════════════════
function ShowcaseCard({ showcase, canRemove, onRemove }: { showcase: Showcase; canRemove: boolean; onRemove: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.92, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }} transition={springGentle} className="showcase-card group hover-lift">
      <div className="showcase-card-inner card-shine">
        {canRemove && (
          <button onClick={onRemove} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all backdrop-blur-sm">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {showcase.type === 'achievement' ? (
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-accent/20 flex items-center justify-center shrink-0 shadow-inner">
              <Trophy className="w-7 h-7 text-primary drop-shadow-sm" />
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="showcase-card-badge mb-2"><Award className="w-3 h-3" /> Achievement</div>
              <h4 className="font-display font-bold text-[0.95rem] text-foreground leading-tight">{showcase.title}</h4>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">+50 XP earned</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="showcase-card-badge"><Sparkles className="w-3 h-3" /> Showcase</div>
            <h4 className="font-display font-bold text-[0.95rem] text-foreground leading-tight">{showcase.title}</h4>
            {showcase.customImageUrl && (
              <div className="w-full h-40 rounded-xl overflow-hidden mt-1 -mb-1">
                <img src={showcase.customImageUrl} alt={showcase.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
            )}
            {showcase.customText && (
              <p className="text-[0.82rem] text-muted-foreground leading-relaxed">{showcase.customText}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMMENT CARD — Steam-style with awards and interactions
// ═══════════════════════════════════════════════════════════════════════════
function CommentCard({ comment, author, isOwner, onDelete }: {
  comment: ProfileComment;
  author: { displayName: string; avatarUrl: string; id: string };
  isOwner: boolean;
  onDelete: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 8));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={springGentle} className="comment-card relative group">
      <Link href={`/profile/${author.id}`}>
        <Avatar className="w-9 h-9 shrink-0 cursor-pointer ring-1 ring-border/50">
          <AvatarImage src={author.avatarUrl} />
          <AvatarFallback className="font-display text-xs">{author.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/profile/${author.id}`}>
            <span className="font-bold text-[0.82rem] hover:underline cursor-pointer">{author.displayName}</span>
          </Link>
          <span className="text-[0.62rem] text-muted-foreground font-mono">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-[0.84rem] text-foreground/90 whitespace-pre-wrap leading-[1.55]">{comment.content}</p>
        <div className="comment-actions mt-1.5">
          <button type="button" onClick={() => { setLiked(!liked); setLikeCount(c => liked ? c - 1 : c + 1); }} className={cn(liked && '!text-primary')}>
            <ThumbsUp className={cn("w-3.5 h-3.5", liked && "fill-current")} /> {likeCount > 0 && likeCount}
          </button>
          <button type="button"><MessageCircle className="w-3.5 h-3.5" /> Reply</button>
          <button type="button"><Share2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {isOwner && (
        <button onClick={onDelete} className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MEDIA GRID ITEM — Instagram-style with hover overlay
// ═══════════════════════════════════════════════════════════════════════════
function MediaGridItem({ src, likes, comments }: { src: string; likes: number; comments: number }) {
  return (
    <div className="aspect-square bg-muted overflow-hidden relative group cursor-pointer hover-lift">
      <img src={src} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 text-white font-bold text-sm drop-shadow-lg">
          <Heart className="w-5 h-5 fill-white" /> {formatCount(likes)}
        </span>
        <span className="flex items-center gap-1.5 text-white font-bold text-sm drop-shadow-lg">
          <MessageCircle className="w-5 h-5 fill-white" /> {formatCount(comments)}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  POST GRID ITEM — Instagram 3-column grid with overlay
// ═══════════════════════════════════════════════════════════════════════════
function PostGridItem({ post, onClick }: { post: any; onClick: () => void }) {
  const firstMedia = post.media?.[0];
  const hasMultiple = post.media && post.media.length > 1;

  return (
    <div className="aspect-square bg-muted overflow-hidden relative group cursor-pointer hover-lift" onClick={onClick}>
      {firstMedia ? (
        <img src={firstMedia} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-accent/5">
          <p className="text-xs text-muted-foreground line-clamp-4 text-center font-serif leading-relaxed">{post.content}</p>
        </div>
      )}
      {/* Multi-image indicator */}
      {hasMultiple && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white drop-shadow-lg fill-current"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M3 5H1v16c0 1.1.9 2 2 2h16v-2H3V5z"/></svg>
        </div>
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 text-white font-bold text-sm drop-shadow-lg">
          <Heart className="w-5 h-5 fill-white" /> {formatCount(post.likes)}
        </span>
        <span className="flex items-center gap-1.5 text-white font-bold text-sm drop-shadow-lg">
          <MessageCircle className="w-5 h-5 fill-white" /> {formatCount(post.comments)}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROFILE PAGE — Main Component
// ═══════════════════════════════════════════════════════════════════════════
export default function Profile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const currentUser = useAppStore(s => s.currentUser);
  const users = useAppStore(s => s.users);
  const posts = useAppStore(s => s.posts);
  const stories = useAppStore(s => s.stories);
  const achievements = useAppStore(s => s.achievements);
  const loadUserProfile = useAppStore(s => s.loadUserProfile);
  const followUser = useAppStore(s => s.followUser);
  const unfollowUser = useAppStore(s => s.unfollowUser);
  const showcases = useAppStore(s => s.showcases);
  const removeShowcase = useAppStore(s => s.removeShowcase);
  const profileComments = useAppStore(s => s.profileComments);
  const addProfileComment = useAppStore(s => s.addProfileComment);
  const deleteProfileComment = useAppStore(s => s.deleteProfileComment);

  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'grid' | 'reels' | 'liked'>('grid');
  const [showAwardPicker, setShowAwardPicker] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const profileId = id || currentUser?.id;
  const profile = profileId ? users[profileId] : null;
  const isOwnProfile = currentUser?.id === profileId;
  const isFollowing = !isOwnProfile && !!currentUser?.followingIds?.includes(profileId ?? '');

  useEffect(() => {
    if (profileId && !users[profileId]) loadUserProfile(profileId);
  }, [profileId, users, loadUserProfile]);

  // Scroll to top on profile change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [profileId]);

  const userPosts = useMemo(() => posts.filter(p => p.authorId === profile?.id), [posts, profile?.id]);
  const userMedia = useMemo(() => userPosts.flatMap(p => {
    const ml = (p as any).mediaUrls || (p as any).media || [];
    return ml.map((m: any) => typeof m === 'string' ? { url: m, likes: (p as any).likes || 0, comments: (p as any).comments || 0 } : m);
  }), [userPosts]);
  const likedPosts = useMemo(() => posts.filter(p => p.likedByMe), [posts]);

  const userShowcases = profile ? (showcases[profile.id] || []) : [];
  const userComments = profile ? (profileComments[profile.id] || []) : [];
  const levelData = computeLevel(achievements);

  // Story highlights for this user
  const userHighlights = useMemo(() => {
    return stories.filter(s => s.authorId === profile?.id && s.isHighlight);
  }, [stories, profile?.id]);

  const mutualFollowers = useMemo(() => {
    if (isOwnProfile || !currentUser?.followingIds) return [];
    return Object.values(users).filter(u =>
      u.id !== profile?.id && u.id !== currentUser?.id && currentUser.followingIds?.includes(u.id)
    ).slice(0, 3);
  }, [users, profile?.id, currentUser, isOwnProfile]);

  const handleToggleFollow = useCallback((targetId: string) => {
    if (!currentUser) return;
    currentUser.followingIds?.includes(targetId) ? unfollowUser(targetId) : followUser(targetId);
  }, [currentUser, followUser, unfollowUser]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, []);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-[3px] border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading profile…</p>
        </div>
      </div>
    );
  }

  const suggestedUsers = Object.values(users).filter(u => u.id !== profile.id && u.id !== currentUser?.id).slice(0, 5);

  const [selectedFrame, setSelectedFrame] = useState<'neon' | 'gold' | 'cosmic' | 'fire'>('neon');
  const [frameDialogOpen, setFrameDialogOpen] = useState(false);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <BadgeShowcaseModal isOpen={badgeModalOpen} onOpenChange={setBadgeModalOpen} />

      {/* ══════════════════════════════════════════════════════════════════
         STICKY GLASS HEADER
         ══════════════════════════════════════════════════════════════════ */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-40 glass-heavy px-4 py-2 flex items-center gap-3">
        <Link href="/"><Button variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0"><ArrowLeft className="w-[18px] h-[18px]" /></Button></Link>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-[0.92rem] leading-tight truncate">{profile.displayName}</h2>
          <p className="text-[0.6rem] text-muted-foreground font-mono tracking-wide">{userPosts.length} posts</p>
        </div>
        <button onClick={() => setBadgeModalOpen(true)} className="level-badge cursor-pointer hover:scale-105 transition-transform">
          <Shield className="w-3 h-3 text-amber-400" /> Lv.{levelData.level}
        </button>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════
         CINEMATIC COVER — 3D Parallax Tilt with gradient dissolve
         ══════════════════════════════════════════════════════════════════ */}
      <ProfileTiltCard className="profile-hero noise-overlay">
        <div className="profile-hero-cover hover-lift">
          {profile.coverUrl ? <img src={profile.coverUrl} alt="" /> : <div className="w-full h-full aurora-bg" />}
        </div>
      </ProfileTiltCard>

      {/* ══════════════════════════════════════════════════════════════════
         MAIN CONTENT
         ══════════════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-[680px] mx-auto px-4 sm:px-6 pb-28">

        {/* ── Avatar + Actions ──────────────────────────────────────── */}
        <div className="flex justify-between items-end -mt-14 relative z-10 mb-4">
          <div className={cn("profile-avatar-ring shadow-xl glow-neon-primary", `steam-frame-${selectedFrame}`)}>
            <Avatar className="w-[88px] h-[88px] avatar-inner">
              <AvatarImage src={profile.avatarUrl} />
              <AvatarFallback className="text-2xl font-display">{profile.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex items-center gap-2 pb-0.5">
            {isOwnProfile ? (
              <>
                <Dialog open={frameDialogOpen} onOpenChange={setFrameDialogOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="rounded-xl h-9 font-bold text-[0.78rem] px-5 border-border/80">
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" /> Steam Theme & Frame
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[420px] rounded-2xl">
                    <DialogHeader><DialogTitle className="font-display text-lg">Customize Steam Frame</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2 font-sans">
                      <p className="text-xs text-muted-foreground font-serif">Choose an animated Steam Avatar Frame to display on your profile:</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'neon', name: 'Cyber Neon', color: 'from-cyan-400 to-blue-500' },
                          { id: 'gold', name: 'Golden Dragon', color: 'from-amber-300 to-orange-500' },
                          { id: 'cosmic', name: 'Deep Cosmic', color: 'from-red-500 to-indigo-600' },
                          { id: 'fire', name: 'Supernova Fire', color: 'from-red-500 to-yellow-400' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setSelectedFrame(f.id as any)}
                            className={cn(
                              "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                              selectedFrame === f.id ? "border-primary bg-primary/10 font-bold" : "border-border/60 hover:border-border"
                            )}
                          >
                            <div className={cn("w-10 h-10 rounded-full bg-gradient-to-tr shadow-md", f.color)} />
                            <span className="text-xs font-mono">{f.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setFrameDialogOpen(false)} className="rounded-xl font-bold text-xs px-6">Equip Frame</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-xl h-9 w-9" onClick={handleCopyLink}>
                    {copiedLink ? <Check className="w-4 h-4 text-success" /> : <Share2 className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger><TooltipContent>Share profile</TooltipContent></Tooltip>
              </>
            ) : (
              <>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button variant={isFollowing ? 'outline' : 'default'} className={cn("rounded-xl h-9 font-bold text-[0.78rem] px-6", !isFollowing && "glow-neon-primary")} onClick={() => handleToggleFollow(profile.id)}>
                    {isFollowing ? 'Following' : (<><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Follow</>)}
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="rounded-xl h-9 font-bold text-[0.78rem] px-5" onClick={() => setLocation(`/messages/${profile.id}`)}>Message</Button>
                </motion.div>
                <Popover>
                  <PopoverTrigger asChild><Button variant="outline" size="icon" className="rounded-xl h-9 w-9"><MoreHorizontal className="w-4 h-4" /></Button></PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5 rounded-xl" align="end">
                    <button className="flex items-center gap-2.5 w-full p-2.5 rounded-lg text-[0.78rem] font-medium hover:bg-muted transition-colors"><Share2 className="w-4 h-4" /> Share profile</button>
                    <button className="flex items-center gap-2.5 w-full p-2.5 rounded-lg text-[0.78rem] font-medium hover:bg-muted transition-colors"><Copy className="w-4 h-4" /> Copy link</button>
                    <button className="flex items-center gap-2.5 w-full p-2.5 rounded-lg text-[0.78rem] font-medium hover:bg-muted transition-colors text-destructive"><Shield className="w-4 h-4" /> Block</button>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </div>

        {/* ── Profile Info ──────────────────────────────────────────── */}
        <div className="mb-5">
          {/* Name + Verified + Level */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <h1 className="font-display font-extrabold text-[1.3rem] leading-tight tracking-tight">{profile.displayName}</h1>
            {profile.verified && (
              <Tooltip><TooltipTrigger>
                <svg className="w-[18px] h-[18px] text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
              </TooltipTrigger><TooltipContent>Verified account</TooltipContent></Tooltip>
            )}
          </div>
          <p className="text-[0.82rem] text-muted-foreground font-mono mb-3">@{profile.username}</p>

          {/* Bio */}
          {profile.bio && <p className="text-[0.88rem] leading-[1.6] mb-3 font-serif max-w-[480px]">{profile.bio}</p>}

          {/* Steam Profile Soundtrack Player */}
          <ProfileMusicPlayer />

          {/* Category Badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[0.7rem] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">✨ Creator</span>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.75rem] text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> San Francisco</span>
            <span className="flex items-center gap-1"><LinkIcon className="w-3.5 h-3.5 shrink-0" /> <a href="#" className="text-primary hover:underline font-medium">yortalks.dev</a></span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0" /> Joined Sep 2023</span>
          </div>

          {/* ── Instagram Stats Row ────────────────────────────────── */}
          <div className="profile-stats mb-4">
            <div className="profile-stat hover-lift">
              <AnimatedCounter value={userPosts.length} className="profile-stat-value" />
              <span className="profile-stat-label">Posts</span>
            </div>
            <div className="profile-stat hover-lift">
              <AnimatedCounter value={profile.followers || 0} className="profile-stat-value" />
              <span className="profile-stat-label">Followers</span>
            </div>
            <div className="profile-stat hover-lift">
              <AnimatedCounter value={profile.following || 0} className="profile-stat-value" />
              <span className="profile-stat-label">Following</span>
            </div>
          </div>

          {/* ── Mutual Followers ────────────────────────────────────── */}
          {!isOwnProfile && mutualFollowers.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-2">
                {mutualFollowers.map(u => (
                  <Avatar key={u.id} className="w-6 h-6 ring-2 ring-background">
                    <AvatarImage src={u.avatarUrl} /><AvatarFallback className="text-[0.5rem]">{u.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <p className="text-[0.72rem] text-muted-foreground leading-tight">
                Followed by <span className="font-semibold text-foreground">{mutualFollowers[0].displayName}</span>
                {mutualFollowers.length > 1 && <> and <span className="font-semibold text-foreground">{mutualFollowers.length - 1} others</span> you follow</>}
              </p>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
           STORY HIGHLIGHTS — Instagram-style circular row
           ══════════════════════════════════════════════════════════════ */}
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-5 mb-1 border-b border-border/50">
          {isOwnProfile && (
            <div className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] cursor-pointer group">
              <div className="w-[62px] h-[62px] rounded-full border-[1.5px] border-dashed border-muted-foreground/40 flex items-center justify-center group-hover:border-primary transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[0.62rem] font-semibold text-muted-foreground truncate w-full text-center">New</span>
            </div>
          )}
          {HIGHLIGHT_COVERS.map(h => (
            <div key={h.id} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] cursor-pointer group">
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-muted-foreground/20 to-muted-foreground/10">
                <div className={cn("w-[58px] h-[58px] rounded-full bg-gradient-to-br flex items-center justify-center text-xl border-[3px] border-background", h.gradient)}>
                  {h.emoji}
                </div>
              </div>
              <span className="text-[0.62rem] font-semibold text-foreground/80 truncate w-full text-center">{h.title}</span>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
           STEAM SHOWCASE — Animated gradient border cards
           ══════════════════════════════════════════════════════════════ */}
        {(userShowcases.length > 0 || isOwnProfile) && (
          <div className="my-8">
            <div className="showcase-section-title">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="font-display tracking-tight">Featured Showcase</h3>
            </div>
            <div className="showcase-grid">
              <AnimatePresence mode="popLayout">
                {userShowcases.map(sc => (
                  <ShowcaseCard key={sc.id} showcase={sc} canRemove={isOwnProfile} onRemove={() => removeShowcase(sc.id, profile.id)} />
                ))}
              </AnimatePresence>
              {isOwnProfile && userShowcases.length < 6 && <AddShowcaseDialog userId={profile.id} />}
            </div>
          </div>
        )}



        {/* ══════════════════════════════════════════════════════════════
           XP & LEVEL BAR
           ══════════════════════════════════════════════════════════════ */}
        <div className="mb-8 p-4 rounded-2xl surface-1 border border-border/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="level-badge"><Star className="w-3 h-3" /> Level {levelData.level}</div>
            </div>
            <span className="text-[0.68rem] font-mono text-muted-foreground font-medium">{levelData.totalXp} / {levelData.nextLevelXp} XP</span>
          </div>
          <div className="xp-bar-container"><div className="xp-bar-fill" style={{ width: `${levelData.progress}%` }} /></div>
          <p className="text-[0.65rem] text-muted-foreground mt-2.5 font-medium">{Math.round(levelData.nextLevelXp - levelData.totalXp)} XP until Level {levelData.level + 1}</p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
           HOLOGRAPHIC AVATAR CARD — 3D Particle Aura
           ══════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <HoloAvatarCard user={profile} level={levelData.level} />
        </div>

        {/* ══════════════════════════════════════════════════════════════
           CONTENT TABS — Instagram-style grid
           ══════════════════════════════════════════════════════════════ */}
        <div className="border-t border-border/50">
          <div className="profile-tabs my-0 rounded-none bg-transparent gap-0 p-0 border-b border-border/50">
            {([
              { key: 'grid' as const, icon: Grid3X3, label: 'Posts' },
              { key: 'reels' as const, icon: Film, label: 'Reels' },
              { key: 'liked' as const, icon: Heart, label: 'Liked' },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn("profile-tab rounded-none border-b-2 transition-all press-scale",
                  activeTab === tab.key ? "is-active border-foreground bg-transparent" : "border-transparent"
                )}>
                <tab.icon className="!w-4 !h-4" /> <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Grid Tab (Instagram 3-col) ─────────────────────── */}
            {activeTab === 'grid' && (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {userPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[2px] mt-[2px] stagger-in">
                    {userPosts.map(post => (
                      <PostGridItem key={post.id} post={post} onClick={() => setLocation(`/post/${post.id}`)} />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="font-display font-bold tracking-tight text-xl mb-1">Share Photos</h3>
                    <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">When you share photos, they will appear on your profile.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Reels Tab ──────────────────────────────────────── */}
            {activeTab === 'reels' && (
              <motion.div key="reels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <div className="py-20 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                    <Play className="w-8 h-8 text-muted-foreground/30 ml-1" />
                  </div>
                  <h3 className="font-display font-bold tracking-tight text-xl mb-1">Share Reels</h3>
                  <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">Create short, entertaining videos for the community.</p>
                </div>
              </motion.div>
            )}

            {/* ── Liked Tab ──────────────────────────────────────── */}
            {activeTab === 'liked' && (
              <motion.div key="liked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {likedPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[2px] mt-[2px] stagger-in">
                    {likedPosts.map(post => (
                      <PostGridItem key={post.id} post={post} onClick={() => setLocation(`/post/${post.id}`)} />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                      <Heart className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="font-display font-bold text-xl mb-1">Posts You've Liked</h3>
                    <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">When you like posts, they'll show up here.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ══════════════════════════════════════════════════════════════
           SUGGESTED USERS (own profile only)
           ══════════════════════════════════════════════════════════════ */}
        {isOwnProfile && suggestedUsers.length > 0 && (
          <div className="my-10">
            <div className="showcase-section-title"><Star className="w-4 h-4 text-accent" /><h3 className="font-display tracking-tight">Suggested for You</h3></div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-3">
              {suggestedUsers.map(user => {
                const sf = !!currentUser?.followingIds?.includes(user.id);
                return (
                  <motion.div key={user.id} whileHover={{ y: -3 }} className="surface-1 p-4 rounded-2xl min-w-[155px] max-w-[170px] shrink-0 flex flex-col items-center text-center border border-border/40 hover:border-primary/20 transition-all">
                    <Link href={`/profile/${user.id}`}><Avatar className="w-16 h-16 mb-2.5 cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all"><AvatarImage src={user.avatarUrl} /><AvatarFallback className="font-display text-lg">{user.displayName.charAt(0)}</AvatarFallback></Avatar></Link>
                    <Link href={`/profile/${user.id}`}><h4 className="font-bold text-[0.82rem] truncate w-full cursor-pointer hover:underline">{user.displayName}</h4></Link>
                    <p className="text-[0.68rem] text-muted-foreground mb-3 truncate w-full font-mono">@{user.username}</p>
                    <Button variant={sf ? 'outline' : 'default'} size="sm" className="w-full rounded-xl h-8 text-[0.72rem] font-bold" onClick={() => handleToggleFollow(user.id)}>
                      {sf ? 'Following' : 'Follow'}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
           STEAM COMMENT WALL
           ══════════════════════════════════════════════════════════════ */}
        <div className="pt-8 mt-4 border-t border-border/50 glass-heavy rounded-2xl p-6">
          <div className="comment-wall-header">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h3 className="font-display tracking-tight">Comment Wall</h3>
              <span className="comment-wall-count">{userComments.length}</span>
            </div>
          </div>

          {/* Composer */}
          {currentUser && (
            <div className="comment-composer">
              <Avatar className="w-9 h-9 shrink-0 ring-1 ring-border/40 mt-0.5">
                <AvatarImage src={currentUser.avatarUrl} />
                <AvatarFallback className="font-display text-xs">{currentUser.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col gap-2.5">
                <Textarea
                  placeholder={isOwnProfile ? "Write on your wall..." : `Write something to ${profile.displayName}...`}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="min-h-[76px] bg-transparent border-0 resize-none text-[0.84rem] placeholder:text-muted-foreground/50 focus-visible:ring-0 p-0"
                />
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <Popover open={showAwardPicker} onOpenChange={setShowAwardPicker}>
                    <PopoverTrigger asChild>
                      <button type="button" className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"><Award className="w-4 h-4" /></button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none" side="top">
                      <div className="award-picker">
                        {AWARDS.map(a => (
                          <Tooltip key={a.emoji}><TooltipTrigger asChild>
                            <button type="button" onClick={() => { setNewComment(p => p + a.emoji); setShowAwardPicker(false); }}>{a.emoji}</button>
                          </TooltipTrigger><TooltipContent className="text-xs">{a.label} · +{a.xp} XP</TooltipContent></Tooltip>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[0.62rem] font-mono font-medium tabular-nums", newComment.length > 280 ? "text-destructive" : "text-muted-foreground/60")}>{newComment.length}/280</span>
                    <motion.div whileTap={{ scale: 0.94 }}>
                      <Button disabled={!newComment.trim() || newComment.length > 280} onClick={() => { if (newComment.trim() && profile) { addProfileComment(profile.id, newComment.trim()); setNewComment(''); } }} className="rounded-xl h-8 px-5 text-[0.72rem] font-bold">Post</Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-2.5">
            {userComments.length > 0 ? (
              userComments.map(c => {
                const author = users[c.authorId];
                if (!author) return null;
                return <CommentCard key={c.id} comment={c} author={author} isOwner={isOwnProfile} onDelete={() => deleteProfileComment(c.id, profile.id)} />;
              })
            ) : (
              <div className="py-16 text-center rounded-2xl border border-dashed border-border/60">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm font-semibold text-foreground/80 mb-1">No comments yet</p>
                <p className="text-[0.75rem] text-muted-foreground">Be the first to leave a message on this wall!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
