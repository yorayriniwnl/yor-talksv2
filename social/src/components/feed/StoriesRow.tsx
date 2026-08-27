import { useMemo, useState } from 'react';
import { useAppStore, type Story } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import StoryViewer from './StoryViewer';
import { StoryBuilderModal } from './StoryBuilderModal';
import { Plus } from 'lucide-react';

export default function StoriesRow() {
  const stories = useAppStore((s) => s.stories);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);

  const [activeAuthorId, setActiveAuthorId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

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

  return (
    <>
      <StoryBuilderModal isOpen={builderOpen} onOpenChange={setBuilderOpen} />

      <div className="home-story-row flex gap-3 overflow-x-auto hide-scrollbar py-2 px-2 sm:px-4 snap-x snap-proximity">
        {/* Add Story Button */}
        {currentUser && (
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            aria-label="Add a story"
            className="story-item story-item--create flex flex-col items-center gap-2 shrink-0 w-[72px] group"
          >
            <div className="story-ring story-ring--create relative w-16 h-16 rounded-full flex items-center justify-center">
              <Avatar className="w-14 h-14 opacity-70 group-hover:opacity-100 transition-opacity">
                <AvatarImage src={currentUser.avatarUrl} />
                <AvatarFallback className="font-display font-bold">{currentDisplayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="story-add absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-xs font-bold truncate w-full text-center text-foreground">
              Add Story
            </span>
          </button>
        )}
        {authors.map((authorId) => {
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
              aria-label={`Open ${authorId === currentUser?.id ? 'your story' : `${authorDisplayName}'s story`}`}
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
                {authorId === currentUser?.id ? 'Your Story' : authorDisplayName}
              </span>
            </button>
          );
        })}
      </div>

      {activeAuthorId && (
        <StoryViewer
          initialAuthorId={activeAuthorId}
          groupedStories={groupedStories}
          authors={authors}
          onClose={() => setActiveAuthorId(null)}
        />
      )}
    </>
  );
}
