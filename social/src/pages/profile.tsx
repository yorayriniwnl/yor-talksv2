import { useParams, Link, useLocation } from 'wouter';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { mapPost, useAppStore, type Showcase, type ProfileComment, type Story, type Post } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, MessageCircle, Trophy, Trash2, Plus, Sparkles, MoreHorizontal,
  Grid3X3, Heart, Bookmark, Star, Award, Pin, ThumbsUp, Share2, Film,
  Image as ImageIcon, Link as LinkIcon, MapPin, Calendar, Shield, ExternalLink,
  UserPlus, Zap, Eye, Play, ChevronRight, Copy, Check, UserRound, Crown
} from 'lucide-react';

import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { BadgeShowcaseModal } from '@/components/steam/BadgeShowcaseModal';
import ReelsSwiper from '@/components/video/ReelsSwiper';
import StoryViewer from '@/components/feed/StoryViewer';
import { StoryBuilderModal } from '@/components/feed/StoryBuilderModal';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerItem, springGentle } from '@/lib/motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { api, type BackendUser } from '@/lib/api-client';
import { uploadApprovedMedia } from '@/lib/media-upload';
import { MediaImageField } from '@/components/media/MediaImageField';
import { FounderBadge, LevelBadge, Metric, SignalLabel, StatusBadge } from '@/components/system';
import { toast } from 'sonner';
import { computeLevel } from '@/lib/achievement-progress';
import { ProtectedMediaImage, ProtectedMediaVideo } from '@/lib/protected-media';
import { useFollowAction } from '@/hooks/use-follow-action';

type ProfileCollection = { key: string; ids: string[]; loading: boolean; error: string; nextCursor?: string; errorCursor?: string };

function useProfileCollection(profileId: string | undefined, kind: 'posts' | 'liked') {
  const viewerId = useAppStore(state => state.currentUser?.id);
  const [collection, setCollection] = useState<ProfileCollection>({ key: '', ids: [], loading: true, error: '' });
  const generation = useRef(0);
  const busy = useRef(false);
  const key = `${viewerId}:${profileId}:${kind}`;
  const load = useCallback(async (cursor?: string) => {
    if (!profileId || busy.current) return;
    const request = ++generation.current;
    busy.current = true;
    setCollection(previous => ({ ...(previous.key === key ? previous : { key, ids: [] }), loading: true, error: '', errorCursor: undefined }));
    try {
      const result = kind === 'posts' ? await api.getUserPostsPage(profileId, 30, cursor) : await api.getLikedPosts();
      if (request !== generation.current || useAppStore.getState().currentUser?.id !== viewerId) return;
      const mapped = result.data.map(post => mapPost(post, viewerId));
      const ids = new Set(mapped.map(post => post.id));
      useAppStore.setState(state => ({ posts: [...state.posts.filter(post => !ids.has(post.id)), ...mapped] }));
      setCollection(previous => ({ key, ids: cursor ? [...new Set([...previous.ids, ...ids])] : [...ids], loading: false, error: '', nextCursor: kind === 'posts' && result.hasMore && result.nextCursor !== cursor ? result.nextCursor : undefined }));
    } catch {
      if (request === generation.current) setCollection(previous => ({ ...previous, loading: false, error: `${cursor ? 'More posts' : kind === 'liked' ? 'Your liked posts' : 'Profile posts'} could not load. Please try again.`, errorCursor: cursor }));
    } finally {
      if (request === generation.current) busy.current = false;
    }
  }, [profileId, kind, key, viewerId]);
  useEffect(() => {
    void load();
    return () => { generation.current++; busy.current = false; };
  }, [load]);
  const current = collection.key === key ? collection : { ids: [] as string[], loading: Boolean(profileId), error: '', nextCursor: undefined, errorCursor: undefined };
  return { ...current, retry: () => load(current.errorCursor), loadMore: () => current.nextCursor ? load(current.nextCursor) : Promise.resolve() };
}

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

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(0) + 'K';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function getGenreBadge(bio?: string, username?: string): { label: string; icon: string } {
  const text = ((bio || '') + ' ' + (username || '')).toLowerCase();
  if (text.includes('ai') || text.includes('neural') || text.includes('tensor') || text.includes('machine learning') || text.includes('world models')) return { label: 'AI & Neural Tech', icon: '🤖' };
  if (text.includes('esports') || text.includes('duelist') || text.includes('clutch') || text.includes('arcade') || text.includes('fightstick') || text.includes('game') || text.includes('roguelike')) return { label: 'Esports & Gaming', icon: '🎮' };
  if (text.includes('beats') || text.includes('modular') || text.includes('synth') || text.includes('audio') || text.includes('drum') || text.includes('techno') || text.includes('sitar') || text.includes('oud') || text.includes('sound') || text.includes('music') || text.includes('kora') || text.includes('vocal')) return { label: 'Music & Sound Design', icon: '🎵' };
  if (text.includes('3d') || text.includes('unreal') || text.includes('shader') || text.includes('blender') || text.includes('illustrat') || text.includes('anime') || text.includes('mecha') || text.includes('sculpt')) return { label: '3D Art & CGI', icon: '🎨' };
  if (text.includes('fashion') || text.includes('apparel') || text.includes('couture') || text.includes('wearable') || text.includes('textile') || text.includes('sneaker') || text.includes('denim')) return { label: 'Haute Couture & Wearables', icon: '👗' };
  if (text.includes('motor') || text.includes('race') || text.includes('rotary') || text.includes('drift') || text.includes('sim') || text.includes('aero') || text.includes('hypercar') || text.includes('lap')) return { label: 'Motorsports & Sim Racing', icon: '🏎️' };
  if (text.includes('fpv') || text.includes('drone') || text.includes('swarm') || text.includes('slam') || text.includes('pilot')) return { label: 'FPV Drones & Aero', icon: '🛸' };
  if (text.includes('coffee') || text.includes('tea') || text.includes('roast') || text.includes('barista') || text.includes('siphon') || text.includes('chocolat')) return { label: 'Gastronomy & Beverage', icon: '☕' };
  if (text.includes('quantum') || text.includes('physics') || text.includes('astronomy') || text.includes('space') || text.includes('mars') || text.includes('nebula') || text.includes('radio interferometry') || text.includes('cern')) return { label: 'Quantum & Deep Space', icon: '🌌' };
  if (text.includes('bio') || text.includes('neuro') || text.includes('protein') || text.includes('prosthetic') || text.includes('exoskeleton') || text.includes('bci')) return { label: 'Biotech & Neuroscience', icon: '🧬' };
  if (text.includes('blade') || text.includes('steel') || text.includes('forge') || text.includes('knife') || text.includes('watch') || text.includes('horolog') || text.includes('wood') || text.includes('joiner') || text.includes('furniture')) return { label: 'Artisan Craftsmanship', icon: '⚔️' };
  if (text.includes('photo') || text.includes('film') || text.includes('colorist') || text.includes('cinema') || text.includes('imax') || text.includes('leica') || text.includes('anamorphic')) return { label: 'Cinematography & Film', icon: '📸' };
  if (text.includes('security') || text.includes('reverse') || text.includes('exploit') || text.includes('crypto') || text.includes('offensive')) return { label: 'Cybersecurity & Crypto', icon: '🛡️' };
  if (text.includes('architect') || text.includes('spatial') || text.includes('tessellation') || text.includes('geometry') || text.includes('timber')) return { label: 'Parametric Architecture', icon: '📐' };
  if (text.includes('chess') || text.includes('grandmaster') || text.includes('alphazero')) return { label: 'Grandmaster Chess', icon: '♟️' };
  if (text.includes('fpga') || text.includes('hardware') || text.includes('keeb') || text.includes('switch') || text.includes('modder')) return { label: 'Hardware & Silicon', icon: '💻' };
  if (text.includes('mycelium') || text.includes('biomimetic') || text.includes('clean energy') || text.includes('aeroponic')) return { label: 'Bio-Design & Clean Tech', icon: '🌿' };
  return { label: 'Multiverse Creator', icon: '✨' };
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const customImageMediaId = type === 'custom' && imageFiles[0] ? (await uploadApprovedMedia(imageFiles[0], 'showcase')).mediaId : undefined;
      await addShowcase({ userId, type, title: title.trim(), customText: customText.trim() || undefined, customImageMediaId });
      setOpen(false); setTitle(''); setCustomText(''); setImageFiles([]);
    } catch {
      // The store reports the error; leave all fields intact for a retry.
    } finally { setSaving(false); }
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
                <MediaImageField id="sc-img" label="Showcase image (optional)" files={imageFiles} onChange={setImageFiles} disabled={saving} />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving || !title.trim()} className="rounded-xl h-11 px-8 font-bold">{saving ? 'Saving…' : 'Add to Profile'}</Button>
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
          <button aria-label="Remove showcase" onClick={onRemove} className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-background/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all backdrop-blur-sm">
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
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">Shared by the profile owner</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="showcase-card-badge"><Sparkles className="w-3 h-3" /> Showcase</div>
            <h4 className="font-display font-bold text-[0.95rem] text-foreground leading-tight">{showcase.title}</h4>
            {showcase.customImageUrl && (
              <div className="w-full h-40 rounded-xl overflow-hidden mt-1 -mb-1">
                <ProtectedMediaImage src={showcase.customImageUrl} alt={showcase.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
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
      </div>
      {isOwner && (
        <button aria-label="Delete wall comment" onClick={onDelete} className="absolute top-2.5 right-2.5 p-2.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MEDIA GRID ITEM — Instagram-style with hover overlay
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
//  POST GRID ITEM — Instagram 3-column grid with overlay
// ═══════════════════════════════════════════════════════════════════════════
function PostGridItem({ post, onClick, canPin = false, onTogglePin, pinBusy = false }: { post: Post; onClick: () => void; canPin?: boolean; onTogglePin?: () => void; pinBusy?: boolean }) {
  const firstMedia = post.media?.[0];
  const hasMultiple = post.media && post.media.length > 1;
  const isVideo = firstMedia && /(^data:video\/|\/video\/upload\/|\.(mp4|m4v|mov|webm|ogv)(?:[?#]|$))/i.test(firstMedia);

  return (
    <div className="relative aspect-square overflow-hidden bg-muted group hover-lift">
      <button type="button" aria-label={`Open post: ${post.content.slice(0, 90) || `${formatCount(post.likes)} likes and ${formatCount(post.comments)} comments`}`} className="h-full w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" onClick={onClick}>
      {firstMedia ? (
        isVideo ? <ProtectedMediaVideo src={firstMedia} aria-label="Video preview" muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <ProtectedMediaImage src={firstMedia} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
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
      </button>
      {canPin && onTogglePin && (
        <button type="button" aria-label={post.pinnedPosition != null ? 'Unpin post from profile' : 'Pin post to profile'} aria-pressed={post.pinnedPosition != null} disabled={pinBusy} onClick={(event) => { event.stopPropagation(); onTogglePin(); }} className={cn('absolute right-2 top-2 z-20 rounded-full p-2 backdrop-blur-md transition-colors', post.pinnedPosition != null ? 'bg-primary text-primary-foreground' : 'bg-black/45 text-white hover:bg-black/65', pinBusy && 'opacity-60')}>
          <Pin className={cn('h-3.5 w-3.5', post.pinnedPosition != null && 'fill-current')} />
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROFILE PAGE — Main Component
// ═══════════════════════════════════════════════════════════════════════════
export default function Profile() {
  const { id, username } = useParams<{ id?: string; username?: string }>();
  const [, setLocation] = useLocation();
  const currentUser = useAppStore(s => s.currentUser);
  const users = useAppStore(s => s.users);
  const posts = useAppStore(s => s.posts);
  const stories = useAppStore(s => s.stories);
  const achievements = useAppStore(s => s.achievements);
  const videos = useAppStore(s => s.videos);
  const loadVideos = useAppStore(s => s.loadVideos);
  const loadUserProfile = useAppStore(s => s.loadUserProfile);
  const { toggleFollow: handleToggleFollow, pendingIds: followPendingIds } = useFollowAction();
  const toggleBlockUser = useAppStore(s => s.toggleBlockUser);
  const showcases = useAppStore(s => s.showcases);
  const removeShowcase = useAppStore(s => s.removeShowcase);
  const profileComments = useAppStore(s => s.profileComments);
  const addProfileComment = useAppStore(s => s.addProfileComment);
  const deleteProfileComment = useAppStore(s => s.deleteProfileComment);
  const loadProfileInteractions = useAppStore(s => s.loadProfileInteractions);
  const pinPost = useAppStore(s => s.pinPost);
  const unpinPost = useAppStore(s => s.unpinPost);

  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'grid' | 'reels' | 'liked'>('grid');
  const [showAwardPicker, setShowAwardPicker] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const [followerListOpen, setFollowerListOpen] = useState(false);
  const [followerListMode, setFollowerListMode] = useState<'followers' | 'following'>('followers');
  const [selectedFrame, setSelectedFrame] = useState('neon');
  const [frameDialogOpen, setFrameDialogOpen] = useState(false);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [highlightBuilderOpen, setHighlightBuilderOpen] = useState(false);
  const [highlightViewerGroup, setHighlightViewerGroup] = useState<string | null>(null);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [finishedProfileLookup, setFinishedProfileLookup] = useState('');
  const [profileFollowers, setProfileFollowers] = useState<BackendUser[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [pinBusyId, setPinBusyId] = useState<string | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [interactions, setInteractions] = useState({ key: '', loading: true, error: false });
  const [interactionsAttempt, setInteractionsAttempt] = useState(0);

  const profileLookup = id || username || currentUser?.id;
  const profile = id
    ? users[id]
    : username
      ? Object.values(users).find((user) => user.username.toLowerCase() === username.toLowerCase()) ?? null
      : currentUser
        ? users[currentUser.id] ?? currentUser
        : null;
  const profileId = profile?.id;
  const isOwnProfile = currentUser?.id === profileId;
  const visibleTab = activeTab === 'liked' && !isOwnProfile ? 'grid' : activeTab;
  const isFollowing = !isOwnProfile && !!currentUser?.followingIds?.includes(profileId ?? '');
  const isFollowPending = !isOwnProfile && !!currentUser?.pendingFollowIds?.includes(profileId ?? '');
  const isBlocked = !isOwnProfile && !!currentUser?.blockedUserIds?.includes(profileId ?? '');
  const isFavorite = !isOwnProfile && !!currentUser?.favoriteCreatorIds?.includes(profileId ?? '');
  const toggleFavoriteCreator = useAppStore((s) => s.toggleFavoriteCreator);
  const profileCollection = useProfileCollection(profileId, 'posts');
  const likedCollection = useProfileCollection(isOwnProfile ? profileId : undefined, 'liked');
  useEffect(() => {
    let frame = profile?.avatarFrame || 'neon';
    if (isOwnProfile && profileId) {
      try { frame = localStorage.getItem(`yor:profile-frame:${profileId}`) || frame; } catch { /* Device preferences are optional. */ }
    }
    setSelectedFrame(['neon', 'gold', 'cosmic', 'fire', 'holographic', 'founder'].includes(frame) ? frame : 'neon');
  }, [profileId, profile?.avatarFrame, isOwnProfile]);
  const videosLoading = useAppStore(s => s.videosLoading);
  const videosError = useAppStore(s => s.videosError);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  useEffect(() => {
    let active = true;
    if (profileLookup && !profile) {
      setFinishedProfileLookup('');
      void loadUserProfile(profileLookup).finally(() => { if (active) setFinishedProfileLookup(profileLookup); });
    }
    return () => { active = false; };
  }, [profileLookup, profile, loadUserProfile, profileAttempt]);

  useEffect(() => {
    let active = true;
    setProfileFollowers([]);
    if (profileId && !isOwnProfile) {
      void api.getFollowers(profileId).then((followers) => { if (active) setProfileFollowers(followers); }).catch(() => {});
    }
    return () => { active = false; };
  }, [profileId, isOwnProfile]);

  useEffect(() => {
    if (!profileId) return;
    let active = true;
    setInteractions({ key: profileId, loading: true, error: false });
    void loadProfileInteractions(profileId).then(success => {
      if (active) setInteractions({ key: profileId, loading: false, error: !success });
    });
    return () => { active = false; };
  }, [profileId, loadProfileInteractions, interactionsAttempt]);

  // Scroll to top on profile change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setActiveTab('grid');
    setActiveReelIndex(null);
    setHighlightViewerGroup(null);
    setFollowerListOpen(false);
    setNewComment('');
  }, [profileLookup]);

  const userPosts = useMemo(() => [...posts.filter(p => p.authorId === profile?.id && profileCollection.ids.includes(p.id))].sort((a, b) => {
    const aPin = a.pinnedPosition ?? Number.MAX_SAFE_INTEGER;
    const bPin = b.pinnedPosition ?? Number.MAX_SAFE_INTEGER;
    return aPin - bPin || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }), [posts, profile?.id, profileCollection.ids]);
  const userVideos = useMemo(() => videos.filter(v => v.authorId === profile?.id), [videos, profile?.id]);
  const userReels = useMemo(() => userVideos.filter(v => v.type === 'short'), [userVideos]);
  const genreBadge = useMemo(() => getGenreBadge(profile?.bio, profile?.username), [profile?.bio, profile?.username]);
  const likedPosts = useMemo(() => isOwnProfile ? posts.filter(p => p.likedByMe && likedCollection.ids.includes(p.id)) : [], [posts, isOwnProfile, likedCollection.ids]);

  const userShowcases = profile ? (showcases[profile.id] || []) : [];
  const userComments = profile ? (profileComments[profile.id] || []) : [];
  const interactionsLoading = interactions.key !== profileId || interactions.loading;
  const interactionsError = interactions.key === profileId && interactions.error;
  const levelData = computeLevel(achievements);

  // Story highlights for this user
  const userHighlights = useMemo(() => {
    return stories.filter(s => s.authorId === profile?.id && s.isHighlight);
  }, [stories, profile?.id]);

  const highlightGroups = useMemo(() => {
    const groups = new Map<string, Story[]>();
    for (const story of userHighlights) {
      const title = story.highlightTitle?.trim() || 'Highlights';
      groups.set(title, [...(groups.get(title) ?? []), story]);
    }
    return [...groups.entries()].map(([title, groupStories]) => ({ title, stories: groupStories }));
  }, [userHighlights]);

  const viewingHighlights = highlightGroups.find(group => group.title === highlightViewerGroup)?.stories ?? [];

  const mutualFollowers = useMemo(() => {
    if (isOwnProfile || !currentUser?.followingIds) return [];
    return profileFollowers.filter(u =>
      u.id !== currentUser.id && currentUser.followingIds?.includes(u.id)
    ).slice(0, 3).map(u => ({ ...u, displayName: u.fullName || u.username }));
  }, [profileFollowers, currentUser, isOwnProfile]);

  const handleToggleFavorite = useCallback(async () => {
    if (!profile || isOwnProfile || favoriteBusy) return;
    setFavoriteBusy(true);
    try { await toggleFavoriteCreator(profile.id); }
    catch { /* The store preserves the previous value and reports the error. */ }
    finally { setFavoriteBusy(false); }
  }, [isOwnProfile, profile, toggleFavoriteCreator, favoriteBusy]);

  const handleCopyLink = useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Copy is unavailable in this browser. Copy the address from the address bar.');
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not copy the profile link'); }
  }, []);

  const handleShareProfile = useCallback(async () => {
    if (navigator.share && profile) {
      try {
        await navigator.share({ title: `${profile.displayName} on Yor`, text: `Check out ${profile.displayName}'s profile on Yor.`, url: window.location.href });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    handleCopyLink();
  }, [handleCopyLink, profile]);

  const handleBlockProfile = useCallback(async () => {
    if (!profile || isOwnProfile) return;
    if (await toggleBlockUser(profile.id)) setLocation('/');
  }, [isOwnProfile, profile, setLocation, toggleBlockUser]);

  const handleTogglePin = useCallback(async (post: typeof userPosts[number]) => {
    if (!isOwnProfile || pinBusyId) return;
    setPinBusyId(post.id);
    try {
      if (post.pinnedPosition != null) await unpinPost(post.id);
      else await pinPost(post.id);
      toast.success(post.pinnedPosition != null ? 'Post unpinned from your profile' : 'Post pinned to your profile');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update profile pins');
    } finally {
      setPinBusyId(null);
    }
  }, [isOwnProfile, pinBusyId, pinPost, unpinPost]);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
          <UserRound className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="font-display font-bold text-xl">{finishedProfileLookup === profileLookup ? 'Profile unavailable' : 'Loading profile…'}</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm font-serif">
          {finishedProfileLookup === profileLookup ? 'The profile may be private, removed, or temporarily unavailable.' : 'Getting the latest profile details.'}
        </p>
        {finishedProfileLookup === profileLookup && <Button onClick={() => setProfileAttempt((value) => value + 1)}>Retry profile</Button>}
        <Button asChild variant="outline" className="rounded-2xl font-bold text-xs">
          <Link href="/explore">
            Discover People
          </Link>
        </Button>
      </div>
    );
  }

  const suggestedUsers = Object.values(users).filter(u => u.id !== profile.id && u.id !== currentUser?.id).slice(0, 5);

  return (
    <div className="operator-profile-page flex min-h-screen flex-col bg-background">
      {isOwnProfile && <BadgeShowcaseModal isOpen={badgeModalOpen} onOpenChange={setBadgeModalOpen} />}
      <StoryBuilderModal isOpen={highlightBuilderOpen} onOpenChange={setHighlightBuilderOpen} isHighlight />
      {highlightViewerGroup !== null && profile && viewingHighlights.length > 0 && (
        <StoryViewer
          initialAuthorId={profile.id}
          groupedStories={{ [profile.id]: viewingHighlights }}
          authors={[profile.id]}
          onClose={() => setHighlightViewerGroup(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
         STICKY GLASS HEADER
         ══════════════════════════════════════════════════════════════════ */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="operator-profile-topbar sticky top-0 z-40 flex items-center gap-3 px-4 py-2">
        <Button asChild variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0"><Link href="/" aria-label="Back to Orbit"><ArrowLeft className="w-[18px] h-[18px]" /></Link></Button>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-[0.92rem] leading-tight truncate">{profile.displayName}</h2>
          <p className="text-[0.6rem] text-muted-foreground font-mono tracking-wide">{userPosts.length} posts</p>
        </div>
        {isOwnProfile && <button onClick={() => setBadgeModalOpen(true)} className="operator-profile-topbar__level" aria-label={`View level ${levelData.level} achievements`}>
          <Shield className="h-3.5 w-3.5" /> Level {levelData.level}
        </button>}
      </motion.header>

      {/* ══════════════════════════════════════════════════════════════════
         CINEMATIC COVER — 3D Parallax Tilt with gradient dissolve
         ══════════════════════════════════════════════════════════════════ */}
      <section className="operator-profile-cover" aria-label={`${profile.displayName}'s cover`}>
        {profile.coverUrl ? <ProtectedMediaImage src={profile.coverUrl} alt="" /> : <div className="operator-profile-cover__fallback"><span>YOR // IDENTITY NODE</span></div>}
        <div className="operator-profile-cover__shade" />
        <SignalLabel className="operator-profile-cover__label">Profile signal</SignalLabel>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         MAIN CONTENT
         ══════════════════════════════════════════════════════════════════ */}
      <div className="operator-profile-layout">
        <section aria-label="Profile content" className="operator-profile-main">

        {/* ── Avatar + Actions ──────────────────────────────────────── */}
        <section className="operator-profile-identity operator-panel">
        <div className="flex flex-wrap items-end justify-between gap-3 -mt-14 relative z-10 mb-4">
          <div className={cn("profile-avatar-ring shadow-xl glow-neon-primary animated-border", `steam-frame-${selectedFrame}`)}>
            <Avatar className="w-[88px] h-[88px] avatar-inner">
              <AvatarImage src={profile.avatarUrl} />
              <AvatarFallback className="text-2xl font-display">{profile.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>

          <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2 pb-0.5">
            {isOwnProfile ? (
              <>
                <Button asChild variant="outline" className="h-9 rounded-xl text-xs font-bold"><Link href="/settings">Edit profile</Link></Button>
                <Dialog open={frameDialogOpen} onOpenChange={setFrameDialogOpen}>
                  <DialogTrigger asChild>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" aria-label="Customize profile theme and avatar frame" className="rounded-xl h-9 font-bold text-[0.78rem] px-3 sm:px-5 border-border/80">
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" /><span className="hidden sm:inline">Theme &amp; frame</span><span className="sm:hidden">Frame</span>
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[420px] rounded-2xl">
                    <DialogHeader><DialogTitle className="font-display text-lg">Customize profile frame</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2 font-sans">
                      <p className="text-xs text-muted-foreground font-serif">Choose how your avatar appears on this device.</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'founder', name: 'VIP Genesis Founder', color: 'from-amber-400 via-rose-500 to-red-600', badge: 'Mythic' },
                          { id: 'holographic', name: 'Cyber Hologram', color: 'from-pink-500 via-cyan-400 to-indigo-600', badge: 'Epic' },
                          { id: 'neon', name: 'Cyber Neon', color: 'from-cyan-400 to-blue-500' },
                          { id: 'gold', name: 'Golden Dragon', color: 'from-amber-300 to-orange-500' },
                          { id: 'cosmic', name: 'Deep Cosmic', color: 'from-red-500 to-indigo-600' },
                          { id: 'fire', name: 'Supernova Fire', color: 'from-red-500 to-yellow-400' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button" aria-pressed={selectedFrame === f.id} onClick={() => setSelectedFrame(f.id)}
                            className={cn(
                              "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative overflow-hidden",
                              selectedFrame === f.id ? "border-primary bg-primary/10 font-bold" : "border-border/60 hover:border-border"
                            )}
                          >
                            {(f as any).badge && (
                              <span className="absolute top-1 right-1 text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-primary/20 text-primary uppercase">
                                {(f as any).badge}
                              </span>
                            )}
                            <div className={cn("w-10 h-10 rounded-full bg-gradient-to-tr shadow-md", f.color)} />
                            <span className="text-xs font-mono">{f.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => {
                        try { localStorage.setItem(`yor:profile-frame:${profile.id}`, selectedFrame); toast.success('Frame saved on this device'); }
                        catch { toast.error('This browser could not save your frame preference.'); }
                        setFrameDialogOpen(false);
                      }} className="rounded-xl font-bold text-xs px-6">Save frame</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Tooltip><TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-xl h-9 w-9" onClick={handleCopyLink} aria-label="Copy profile link">
                    {copiedLink ? <Check className="w-4 h-4 text-success" /> : <Share2 className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger><TooltipContent>Share profile</TooltipContent></Tooltip>
              </>
            ) : (
              <>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button variant={isFollowing || isFollowPending ? 'outline' : 'default'} className={cn("rounded-xl h-9 font-bold text-[0.78rem] px-6", !isFollowing && !isFollowPending && "glow-neon-primary")} disabled={followPendingIds.has(profile.id) || isBlocked} onClick={() => void handleToggleFollow(profile.id)}>
                    {followPendingIds.has(profile.id) ? 'Saving…' : isFollowing ? 'Following' : isFollowPending ? 'Requested' : (<><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Follow</>)}
                  </Button>
                </motion.div>
                <Tooltip><TooltipTrigger asChild>
                  <Button
                    variant={isFavorite ? 'default' : 'outline'}
                    size="icon"
                    className={cn('rounded-xl h-9 w-9', isFavorite && 'bg-amber-400 text-amber-950 hover:bg-amber-300')}
                    disabled={favoriteBusy} aria-pressed={isFavorite} onClick={() => void handleToggleFavorite()}
                    aria-label={isFavorite ? `Remove ${profile.displayName} from Favorites` : `Add ${profile.displayName} to Favorites`}
                  >
                    <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                  </Button>
                </TooltipTrigger><TooltipContent>{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</TooltipContent></Tooltip>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="rounded-xl h-9 font-bold text-[0.78rem] px-5" onClick={() => setLocation(`/messages/${profile.id}`)}>Message</Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="rounded-xl h-9 font-bold text-[0.78rem] px-4 border-amber-400/40 text-amber-500" onClick={() => setLocation(`/fanclub?creatorId=${encodeURIComponent(profile.id)}`)}><Crown className="w-3.5 h-3.5 mr-1.5" /> Fan Club</Button>
                </motion.div>
                <Popover>
                  <PopoverTrigger asChild><Button variant="outline" size="icon" className="rounded-xl h-9 w-9" aria-label="More profile actions"><MoreHorizontal className="w-4 h-4" /></Button></PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5 rounded-xl" align="end">
                    <button type="button" onClick={() => void handleShareProfile()} className="flex items-center gap-2.5 w-full p-2.5 rounded-lg text-[0.78rem] font-medium hover:bg-muted transition-colors"><Share2 className="w-4 h-4" /> Share profile</button>
                    <button type="button" onClick={handleCopyLink} className="flex items-center gap-2.5 w-full p-2.5 rounded-lg text-[0.78rem] font-medium hover:bg-muted transition-colors"><Copy className="w-4 h-4" /> Copy link</button>
                    <button type="button" onClick={() => void handleBlockProfile()} className="flex items-center gap-2.5 w-full p-2.5 rounded-lg text-[0.78rem] font-medium hover:bg-muted transition-colors text-destructive"><Shield className="w-4 h-4" /> {isBlocked ? 'Unblock' : 'Block'}</button>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </div>

        {/* ── Profile Info ──────────────────────────────────────────── */}
        <div className="mb-5">
          {/* Name + Verified + Level */}
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h1 className="font-display font-extrabold text-[1.3rem] leading-tight tracking-tight">{profile.displayName}</h1>
            {profile.verified && (
              <Tooltip><TooltipTrigger>
                <svg className="w-[18px] h-[18px] text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
              </TooltipTrigger><TooltipContent>Verified account</TooltipContent></Tooltip>
            )}
            <FounderBadge
              isFounder={Boolean(profile.isFounder)}
              passNumber={profile.founderPassNumber}
              variant="pill"
            />
          </div>
          <p className="text-[0.82rem] text-muted-foreground font-mono mb-3">@{profile.username}</p>

          {/* Bio */}
          {profile.bio && <p className={cn('text-[0.88rem] leading-[1.6] mb-3 font-serif max-w-[480px]', profile.bioStyleId === 'editorial' && 'premium-profile-bio--editorial', profile.bioStyleId === 'mono' && 'premium-profile-bio--mono')}>{profile.bio}</p>}

          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[0.7rem] font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span>{genreBadge.icon}</span> {genreBadge.label}
            </span>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.75rem] text-muted-foreground mb-4">
            {profile.bio && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> Earth</span>
            )}
            <span className="flex items-center gap-1"><LinkIcon className="w-3.5 h-3.5 shrink-0" /> <Link href={`/@${profile.username}`} className="text-primary hover:underline font-medium">yor-talks.in/@{profile.username}</Link></span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0" /> Member</span>
          </div>

          {/* ── Instagram Stats Row ────────────────────────────────── */}
          <div className="profile-stats mb-4">
            <div className="profile-stat hover-lift">
              <AnimatedCounter value={userPosts.length} className="profile-stat-value" />
              <span className="profile-stat-label">Posts</span>
            </div>
            <button onClick={() => { setFollowerListMode('followers'); setFollowerListOpen(true); }} className="profile-stat hover-lift cursor-pointer hover:opacity-70 transition-opacity">
              <AnimatedCounter value={profile.followers || 0} className="profile-stat-value" />
              <span className="profile-stat-label">Followers</span>
            </button>
            <button onClick={() => { setFollowerListMode('following'); setFollowerListOpen(true); }} className="profile-stat hover-lift cursor-pointer hover:opacity-70 transition-opacity">
              <AnimatedCounter value={profile.following || 0} className="profile-stat-value" />
              <span className="profile-stat-label">Following</span>
            </button>
          </div>

          {/* ── Mutual Followers ────────────────────────────────────── */}
          {!isOwnProfile && mutualFollowers.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-2">
                {mutualFollowers.map(u => (
                  <Avatar key={u.id} className="w-6 h-6 ring-2 ring-background">
                  <AvatarImage src={u.avatarUrl || undefined} /><AvatarFallback className="text-[0.5rem]">{u.displayName.charAt(0)}</AvatarFallback>
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
        </section>

        {/* ══════════════════════════════════════════════════════════════
           STORY HIGHLIGHTS — Instagram-style circular row
           ══════════════════════════════════════════════════════════════ */}
        <section className="operator-profile-highlights operator-panel">
          <div className="operator-profile-module-heading">
            <div><SignalLabel>Moments</SignalLabel><h2>Highlights</h2></div>
            <span>{highlightGroups.length} collections</span>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
          {isOwnProfile && (
            <button type="button" onClick={() => setHighlightBuilderOpen(true)} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] cursor-pointer group">
              <div className="w-[62px] h-[62px] rounded-full border-[1.5px] border-dashed border-muted-foreground/40 flex items-center justify-center group-hover:border-primary transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[0.62rem] font-semibold text-muted-foreground truncate w-full text-center">New</span>
            </button>
          )}
          {highlightGroups.map((group, index) => {
            const cover = group.stories[0];
            const gradients = ['from-blue-500 to-cyan-400', 'from-purple-500 to-pink-400', 'from-orange-500 to-yellow-400', 'from-emerald-500 to-teal-400'];
            return <button type="button" key={group.title} onClick={() => setHighlightViewerGroup(group.title)} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] cursor-pointer group" aria-label={`Open ${group.title} highlights`}>
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-muted-foreground/20 to-muted-foreground/10">
                <div className={cn("relative w-[58px] h-[58px] overflow-hidden rounded-full bg-gradient-to-br flex items-center justify-center text-xl border-[3px] border-background", gradients[index % gradients.length])}>
                  {cover.type === 'image' && cover.mediaUrl ? <ProtectedMediaImage src={cover.mediaUrl} alt="" className="h-full w-full object-cover" /> : <span>{cover.textContent?.trim().slice(0, 1) || '✨'}</span>}
                </div>
              </div>
              <span className="text-[0.62rem] font-semibold text-foreground/80 truncate w-full text-center">{group.title}</span>
            </button>;
          })}
          {!isOwnProfile && highlightGroups.length === 0 && <span className="py-6 text-xs text-muted-foreground">No highlights yet.</span>}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
           STEAM SHOWCASE — Animated gradient border cards
           ══════════════════════════════════════════════════════════════ */}
        {(userShowcases.length > 0 || isOwnProfile) && (
          <section className="operator-profile-showcases operator-panel">
            <div className="showcase-section-title">
              <Zap className="w-4 h-4 text-primary" />
              <div><SignalLabel>Selected work</SignalLabel><h3>Featured showcase</h3></div>
            </div>
            <div className="showcase-grid">
              <AnimatePresence mode="popLayout">
                {userShowcases.map(sc => (
                  <ShowcaseCard key={sc.id} showcase={sc} canRemove={isOwnProfile} onRemove={() => removeShowcase(sc.id, profile.id)} />
                ))}
              </AnimatePresence>
              {isOwnProfile && userShowcases.length < 6 && <AddShowcaseDialog userId={profile.id} />}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════
           CONTENT TABS — Instagram-style grid
           ══════════════════════════════════════════════════════════════ */}
        <section className="operator-profile-content operator-panel">
          <Tabs key={profile.id} value={visibleTab} onValueChange={value => setActiveTab(value as typeof activeTab)}>
          <TabsList aria-label="Profile content" className="profile-tabs my-0 rounded-none bg-transparent gap-0 p-0 border-b border-border/50">
            {([
              { key: 'grid' as const, icon: Grid3X3, label: 'Posts' },
              { key: 'reels' as const, icon: Film, label: 'Reels' },
              ...(isOwnProfile ? [{ key: 'liked' as const, icon: Heart, label: 'Liked' }] : []),
            ]).map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} aria-label={tab.label}
                className={cn("profile-tab rounded-none border-b-2 transition-all press-scale",
                  visibleTab === tab.key ? "is-active border-foreground bg-transparent" : "border-transparent"
                )}>
                <tab.icon className="!w-4 !h-4" aria-hidden="true" /> <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            {/* ── Grid Tab (Instagram 3-col) ─────────────────────── */}
            {visibleTab === 'grid' && (
              <TabsContent key="grid" value="grid" asChild><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <ProfileCollectionStatus loading={profileCollection.loading} error={profileCollection.error} onRetry={() => void profileCollection.retry()} />
                {userPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[2px] mt-[2px] stagger-in">
                    {userPosts.map(post => (
                      <PostGridItem key={post.id} post={post} canPin={isOwnProfile} pinBusy={pinBusyId === post.id} onTogglePin={() => void handleTogglePin(post)} onClick={() => setLocation(`/post/${post.id}`)} />
                    ))}
                  </div>
                ) : !profileCollection.loading && !profileCollection.error && !profileCollection.nextCursor ? (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="font-display font-bold tracking-tight text-xl mb-1">{isOwnProfile ? 'Your story starts here' : 'No posts yet'}</h3>
                    <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">{isOwnProfile ? 'Share a photo, a thought, or something you are making.' : `${profile.displayName}'s posts will appear here when shared with you.`}</p>
                  </div>
                ) : null}
                {profileCollection.nextCursor && !profileCollection.error && <div className="p-4 text-center"><Button variant="outline" disabled={profileCollection.loading} onClick={() => void profileCollection.loadMore()}>{profileCollection.loading ? 'Loading more posts…' : 'Load more posts'}</Button></div>}
              </motion.div></TabsContent>
            )}

            {/* ── Reels Tab (Instagram/TikTok style Reels Grid) ──────────────────────── */}
            {visibleTab === 'reels' && (
              <TabsContent key="reels" value="reels" asChild><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <ProfileCollectionStatus loading={videosLoading} error={videosError ?? ''} onRetry={() => void loadVideos()} loadingLabel="Loading Reels…" />
                {userReels.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[2px] mt-[2px] stagger-in">
                    {userReels.map((video, idx) => (
                      <motion.button type="button" aria-label={`Play ${video.title}`}
                        key={video.id}
                        variants={staggerItem}
                        onClick={() => {
                          setActiveReelIndex(idx);
                        }}
                        className="relative aspect-[9/16] bg-muted overflow-hidden group cursor-pointer hover-lift rounded-none"
                      >
                        <ProtectedMediaImage
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 group-hover:from-black/90 transition-colors" />

                        {/* Top-right Reel Badge */}
                        <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[0.6rem] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1">
                          <Film className="w-2.5 h-2.5 text-primary" /> {video.type === 'short' ? 'Reel' : 'Video'}
                        </div>

                        {/* Center Play Button on Hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center text-white shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>

                        {/* Bottom Info & Views */}
                        <div className="absolute bottom-0 inset-x-0 p-2.5 z-10 flex flex-col justify-end">
                          <p className="text-[0.72rem] font-bold text-white line-clamp-1 mb-1 drop-shadow-md leading-tight">
                            {video.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-white/90 text-[0.65rem] font-mono font-bold">
                            <Play className="w-3 h-3 fill-white" />
                            <span>{formatCount(video.views || 0)}</span>
                            <span className="opacity-40">•</span>
                            <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                            <span>{formatCount(video.likes || 0)}</span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : !videosLoading && !videosError ? (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                      <Film className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="font-display font-bold tracking-tight text-xl mb-1">No Reels available</h3>
                    <p className="text-sm text-muted-foreground max-w-[260px] mx-auto mb-4">Recent short videos shared with you appear here.</p>
                    <Button asChild variant="outline" className="rounded-2xl font-bold text-xs">
                      <Link href="/videos">
                        <Play className="w-3.5 h-3.5 mr-1.5" /> Explore Yor Reels
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </motion.div></TabsContent>
            )}

            {/* ── Liked Tab ──────────────────────────────────────── */}
            {visibleTab === 'liked' && isOwnProfile && (
              <TabsContent key="liked" value="liked" asChild><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <ProfileCollectionStatus loading={likedCollection.loading} error={likedCollection.error} onRetry={() => void likedCollection.retry()} />
                {likedPosts.length >= 100 && <p className="px-4 py-3 text-sm text-muted-foreground">Showing up to 100 liked posts. Only you can see this collection.</p>}
                {likedPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[2px] mt-[2px] stagger-in">
                    {likedPosts.map(post => (
                      <PostGridItem key={post.id} post={post} onClick={() => setLocation(`/post/${post.id}`)} />
                    ))}
                  </div>
                ) : !likedCollection.loading && !likedCollection.error ? (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                      <Heart className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="font-display font-bold text-xl mb-1">Posts You've Liked</h3>
                    <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">When you like posts, they'll show up here.</p>
                  </div>
                ) : null}
              </motion.div></TabsContent>
            )}
          </AnimatePresence>
          </Tabs>
        </section>

        {/* ══════════════════════════════════════════════════════════════
           STEAM COMMENT WALL
           ══════════════════════════════════════════════════════════════ */}
        <section className="operator-profile-comments operator-panel">
          <div className="comment-wall-header">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h3 className="font-display tracking-tight">Comment Wall</h3>
              <span className="comment-wall-count">{userComments.length}</span>
            </div>
          </div>

          {interactionsLoading && <p role="status" className="py-4 text-sm text-muted-foreground">Loading showcases and wall comments…</p>}
          {interactionsError && <div role="alert" className="my-4 rounded-xl border border-destructive/30 p-4 text-sm"><p>Showcases and wall comments could not load. Please try again.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => setInteractionsAttempt(value => value + 1)}>Retry showcases and comments</Button></div>}

          {/* Composer */}
          {currentUser && (
            <div className="comment-composer">
              <Avatar className="w-9 h-9 shrink-0 ring-1 ring-border/40 mt-0.5">
                <AvatarImage src={currentUser.avatarUrl} />
                <AvatarFallback className="font-display text-xs">{currentUser.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex flex-col gap-2.5">
                <Textarea
                  aria-label="Write a wall comment"
                  disabled={postingComment}
                  maxLength={280}
                  placeholder={isOwnProfile ? "Write on your wall..." : `Write something to ${profile.displayName}...`}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="min-h-[76px] bg-transparent border-0 resize-none text-[0.84rem] placeholder:text-muted-foreground/50 focus-visible:ring-0 p-0"
                />
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <Popover open={showAwardPicker} onOpenChange={setShowAwardPicker}>
                    <PopoverTrigger asChild>
                      <button type="button" aria-label="Add an emoji to your wall comment" className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"><Award className="w-4 h-4" /></button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none" side="top">
                      <div className="award-picker">
                        {AWARDS.map(a => (
                          <Tooltip key={a.emoji}><TooltipTrigger asChild>
                            <button type="button" onClick={() => { setNewComment(p => (p + a.emoji).slice(0, 280)); setShowAwardPicker(false); }}>{a.emoji}</button>
                          </TooltipTrigger><TooltipContent className="text-xs">{a.label} emoji</TooltipContent></Tooltip>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[0.62rem] font-mono font-medium tabular-nums", newComment.length > 280 ? "text-destructive" : "text-muted-foreground/60")}>{newComment.length}/280</span>
                    <motion.div whileTap={{ scale: 0.94 }}>
                      <Button disabled={postingComment || !newComment.trim() || newComment.length > 280} onClick={async () => {
                        if (!profile || !newComment.trim() || postingComment) return;
                        setPostingComment(true);
                        try { await addProfileComment(profile.id, newComment.trim()); setNewComment(''); }
                        catch { /* Preserve the draft; the store reports the failure. */ }
                        finally { setPostingComment(false); }
                      }} className="rounded-xl h-8 px-5 text-[0.72rem] font-bold">{postingComment ? 'Posting…' : 'Post'}</Button>
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
            ) : !interactionsLoading && !interactionsError ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-border/60">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm font-semibold text-foreground/80 mb-1">No comments yet</p>
                <p className="text-[0.75rem] text-muted-foreground">Be the first to leave a message on this wall!</p>
              </div>
            ) : null}
          </div>
        </section>
        </section>

        <aside className="operator-profile-rail">
          {isOwnProfile && <section className="operator-profile-level operator-panel">
            <div className="operator-profile-level__topline">
              <StatusBadge status={isOwnProfile ? 'online' : 'offline'}>{isOwnProfile ? 'Online now' : 'Presence private'}</StatusBadge>
              <LevelBadge level={levelData.level} />
            </div>
            <SignalLabel tone="ember">Progress record</SignalLabel>
            <h2>Level {levelData.level} operator</h2>
            <p>{levelData.totalXp.toLocaleString()} XP recorded across achievements and community activity.</p>
            <div className="operator-profile-level__progress" role="progressbar" aria-label="Level progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(levelData.progress)}>
              <span style={{ width: `${levelData.progress}%` }} />
            </div>
            <div className="operator-profile-level__progress-copy">
              <span>{Math.round(levelData.progress)}% complete</span>
              <span>{Math.max(0, Math.round(levelData.nextLevelXp - levelData.totalXp))} XP to level {levelData.level + 1}</span>
            </div>
            <div className="operator-profile-level__metrics">
              <Metric value={achievements.filter((achievement) => achievement.unlocked).length} label="Unlocked" />
              <Metric value={userShowcases.length} label="Showcases" />
              <Metric value={userComments.length} label="Wall notes" />
            </div>
            <Button variant="outline" className="operator-profile-rail__action" onClick={() => setBadgeModalOpen(true)}>
              <Trophy className="h-4 w-4" /> View achievements
            </Button>
          </section>}

          <section className="operator-profile-library operator-panel">
            <div className="operator-profile-module-heading">
              <div><SignalLabel>Collections</SignalLabel><h2>Profile library</h2></div>
            </div>
            <div className="operator-profile-library__list">
              <button type="button" onClick={() => setActiveTab('grid')}>
                <span><Grid3X3 className="h-4 w-4" /><strong>Posts</strong></span><small>{userPosts.length}</small>
              </button>
              <button type="button" onClick={() => setActiveTab('reels')}>
                <span><Film className="h-4 w-4" /><strong>Reels</strong></span><small>{userReels.length}</small>
              </button>
              <button type="button" onClick={() => setHighlightViewerGroup(highlightGroups[0]?.title ?? null)} disabled={highlightGroups.length === 0}>
                <span><Star className="h-4 w-4" /><strong>Highlights</strong></span><small>{highlightGroups.length}</small>
              </button>
              <div>
                <span><Award className="h-4 w-4" /><strong>Showcases</strong></span><small>{userShowcases.length}</small>
              </div>
            </div>
          </section>

          {suggestedUsers.length > 0 && (
            <section className="operator-profile-people operator-panel">
              <div className="operator-profile-module-heading">
                <div><SignalLabel tone="muted">Network edge</SignalLabel><h2>People to know</h2></div>
                <Link href="/explore">Explore</Link>
              </div>
              <div className="operator-profile-people__list">
                {suggestedUsers.slice(0, 4).map((user) => {
                  const following = !!currentUser?.followingIds?.includes(user.id);
                  return (
                    <div key={user.id}>
                      <Link href={`/profile/${user.id}`}>
                        <Avatar className="h-9 w-9"><AvatarImage src={user.avatarUrl} /><AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback></Avatar>
                        <span><strong>{user.displayName}</strong><small>@{user.username}</small></span>
                      </Link>
                      <button type="button" disabled={followPendingIds.has(user.id)} onClick={() => void handleToggleFollow(user.id)}>{followPendingIds.has(user.id) ? 'Saving…' : following ? 'Following' : currentUser?.pendingFollowIds?.includes(user.id) ? 'Requested' : 'Follow'}</button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </aside>
      </div>

      {activeReelIndex !== null && (
        <ReelsSwiper
          videos={userReels}
          initialIndex={activeReelIndex}
          onClose={() => setActiveReelIndex(null)}
        />
      )}

      <FollowerListModal
        isOpen={followerListOpen}
        onOpenChange={setFollowerListOpen}
        mode={followerListMode}
        userId={profile?.id || ''}
      />
    </div>
  );
}

function ProfileCollectionStatus({ loading, error, onRetry, loadingLabel = 'Loading posts…' }: { loading: boolean; error: string; onRetry: () => void; loadingLabel?: string }) {
  if (error) return <div role="alert" className="m-4 rounded-2xl border border-destructive/30 p-4 text-sm"><p>{error}</p><Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Try again</Button></div>;
  if (loading) return <div role="status" className="p-6 text-center text-sm text-muted-foreground">{loadingLabel}</div>;
  return null;
}

function FollowerListModal({ isOpen, onOpenChange, mode, userId }: { isOpen: boolean; onOpenChange: (open: boolean) => void; mode: 'followers' | 'following'; userId: string }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const cachePublicProfiles = useAppStore((state) => state.cachePublicProfiles);
  const { toggleFollow, pendingIds } = useFollowAction();
  const [displayUsers, setDisplayUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isOpen || !userId) return;
    let active = true;
    setDisplayUsers([]);
    setLoading(true);
    setError('');
    const load = mode === 'followers' ? api.getFollowers(userId) : api.getFollowing(userId);
    void load.then((items) => {
      if (!active) return;
      cachePublicProfiles(items);
      setDisplayUsers(items);
    }).catch(() => {
      if (active) setError(`Could not load ${mode}. Check your connection and try again.`);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [isOpen, mode, userId, attempt, cachePublicProfiles]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-3xl max-h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b border-border/40">
          <DialogTitle className="font-display font-bold text-base text-center capitalize">{mode}</DialogTitle>
          <DialogDescription className="sr-only">People in this profile's {mode} list.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading {mode}…</p>}
          {error && <div role="alert" className="space-y-3 py-6 text-center text-sm"><p>{error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Retry {mode}</Button></div>}
          {!loading && !error && displayUsers.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No {mode} to show.</p>}
          {!loading && displayUsers.map((user) => {
            const following = currentUser?.followingIds?.includes(user.id);
            const requested = currentUser?.pendingFollowIds?.includes(user.id);
            const name = user.fullName || user.username;
            return (
              <div key={user.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/40">
                <Link href={`/profile/${user.id}`} onClick={() => onOpenChange(false)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">
                  <Avatar className="w-10 h-10 border border-border/50">
                    <AvatarImage src={user.avatarUrl} alt="" />
                    <AvatarFallback className="font-bold text-xs">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{name}</strong>
                    <span className="block truncate text-xs text-muted-foreground font-mono">@{user.username}</span>
                  </span>
                </Link>
                {user.id !== currentUser?.id && (
                  <Button
                    variant={following || requested ? 'secondary' : 'outline'}
                    size="sm"
                    disabled={pendingIds.has(user.id)}
                    aria-label={`${following ? 'Unfollow' : requested ? 'Cancel follow request to' : 'Follow'} ${name}`}
                    className="rounded-xl text-xs font-bold h-9 shrink-0"
                    onClick={() => void toggleFollow(user.id)}
                  >
                    {pendingIds.has(user.id) ? 'Saving…' : following ? 'Following' : requested ? 'Requested' : 'Follow'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
