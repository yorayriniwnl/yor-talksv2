import { Suspense, useEffect, useMemo, useState } from 'react';
import { useAppStore, type Story } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Plus } from 'lucide-react';

const StoryViewer = lazyWithRetry(() => import('./StoryViewer'));
const StoryBuilderModal = lazyWithRetry(() => import('./StoryBuilderModal').then(module => ({ default: module.StoryBuilderModal })));

export default function StoriesRow({ compactEmpty = false }: { compactEmpty?: boolean }) {
  const stories = useAppStore((s) => s.stories);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);

  const [activeAuthorId, setActiveAuthorId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderVisited, setBuilderVisited] = useState(false);
  const openBuilder = () => { setBuilderVisited(true); setBuilderOpen(true); };

  useEffect(() => {
    for (const id of new Set(stories.map((story) => story.authorId))) void loadUserProfile(id);
  }, [stories, loadUserProfile]);

  // Group stories by author
  const groupedStories = useMemo(() => {
    const groups: Record<string, Story[]> = {};
    for (const story of stories) {
      // Basic expiration check just in case backend didn't filter
      if (!story.isHighlight && new Date(story.expiresAt) < new Date()) continue;
      
      if (!groups[story.authorId]) groups[story.authorId] = [];
      groups[story.authorId].push(story);
    }
    return groups;
  }, [stories]);

  const authors = Object.keys(groupedStories).sort((a, b) => {
    // Current user always first
    if (a === currentUser?.id) return -1;
    if (b === currentUser?.id) return 1;
    // Then by whether they have unseen stories
    const aStories = groupedStories[a] || [];
    const bStories = groupedStories[b] || [];
    const aHasUnseen = aStories.some(s => !s.viewed);
    const bHasUnseen = bStories.some(s => !s.viewed);
    if (aHasUnseen && !bHasUnseen) return -1;
    if (!aHasUnseen && bHasUnseen) return 1;
    // Finally, most recent story
    const aLatest = Math.max(...(aStories.map(s => new Date(s.createdAt).getTime()) || [0]));
    const bLatest = Math.max(...(bStories.map(s => new Date(s.createdAt).getTime()) || [0]));
    return bLatest - aLatest;
  });

  const currentDisplayName = currentUser?.displayName || currentUser?.username || 'You';
  const currentUserStories = currentUser ? groupedStories[currentUser.id] || [] : [];
  const hasOwnStories = currentUserStories.length > 0;
  const hasUnseenOwn = currentUserStories.some((s) => !s.viewed);
  const otherAuthors = authors.filter((id) => id !== currentUser?.id);

  return (
    <>
      {builderVisited && <Suspense fallback={<p role="status">Opening Story editor…</p>}><StoryBuilderModal isOpen={builderOpen} onOpenChange={setBuilderOpen} /></Suspense>}

      {compactEmpty && authors.length === 0 ? (
        <button type="button" className="home-moment-action" onClick={openBuilder} aria-label="Add a story">
          <span className="home-moment-action__icon"><Plus className="h-5 w-5" /></span>
          <span><strong>Your story starts here</strong><small>Share a moment · 24 hours</small></span>
        </button>
      ) : <div className="home-story-row flex gap-3 overflow-x-auto hide-scrollbar py-2 px-2 sm:px-4 snap-x snap-proximity">
        {/* Unified Current User Story Item */}
        {currentUser && (
          <div className="story-item flex flex-col items-center gap-2 shrink-0 w-[72px] group relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (hasOwnStories) {
                    setActiveAuthorId(currentUser.id);
                  } else {
                    openBuilder();
                  }
                }}
                aria-label={hasOwnStories ? "View your story" : "Add a story"}
                className={cn(
                  "story-ring rounded-full block transition-transform group-hover:scale-105",
                  hasOwnStories
                    ? (hasUnseenOwn ? 'story-ring--unseen' : 'story-ring--seen')
                    : 'story-ring--create'
                )}
              >
                <Avatar className="w-16 h-16 border-2 border-background">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentDisplayName} />
                  <AvatarFallback className="font-display font-bold">{currentDisplayName.charAt(0)}</AvatarFallback>
                </Avatar>
              </button>

              {/* Plus button to add a new story */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openBuilder();
                }}
                aria-label="Create new story"
                className="story-add absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform border-2 border-background z-10"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-xs font-medium truncate w-full text-center text-foreground/80">
              {hasOwnStories ? 'Your Story' : 'Add Story'}
            </span>
          </div>
        )}
        {otherAuthors.map((authorId) => {
          const author = users[authorId];
          if (!author) return null; // Defensive

          const authorStories = groupedStories[authorId] || [];
          const hasUnseen = authorStories.some((s) => !s.viewed);
          const authorDisplayName = author.displayName || author.username || 'User';

          return (
            <button
              key={authorId}
              type="button"
              onClick={() => setActiveAuthorId(authorId)}
              aria-label={`Open ${authorDisplayName}'s story`}
              className="story-item flex flex-col items-center gap-2 shrink-0 w-[72px] snap-start"
            >
              <div
                className={cn(
                  'story-ring rounded-full',
                  hasUnseen ? 'story-ring--unseen' : 'story-ring--seen',
                )}
              >
                <Avatar className="w-16 h-16 border-2 border-background">
                  <AvatarImage src={author.avatarUrl} alt={authorDisplayName} />
                  <AvatarFallback>{authorDisplayName.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs font-medium truncate w-full text-center text-foreground/80">
                {authorDisplayName}
              </span>
            </button>
          );
        })}
      </div>}

      {activeAuthorId && (
        <Suspense fallback={<p role="status">Opening Story…</p>}><StoryViewer
          initialAuthorId={activeAuthorId}
          groupedStories={groupedStories}
          authors={authors}
          onClose={() => setActiveAuthorId(null)}
        /></Suspense>
      )}
    </>
  );
}
