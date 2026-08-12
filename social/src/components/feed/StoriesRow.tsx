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
      if (new Date(story.expiresAt) < new Date()) continue;
      
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
    const aHasUnseen = groupedStories[a].some(s => !s.viewed);
    const bHasUnseen = groupedStories[b].some(s => !s.viewed);
    if (aHasUnseen && !bHasUnseen) return -1;
    if (!aHasUnseen && bHasUnseen) return 1;
    // Finally, most recent story
    const aLatest = Math.max(...groupedStories[a].map(s => new Date(s.createdAt).getTime()));
    const bLatest = Math.max(...groupedStories[b].map(s => new Date(s.createdAt).getTime()));
    return bLatest - aLatest;
  });

  if (authors.length === 0) return null;

  return (
    <>
      <StoryBuilderModal isOpen={builderOpen} onOpenChange={setBuilderOpen} />

      <div className="flex gap-3 overflow-x-auto hide-scrollbar py-2 px-2 sm:px-4 snap-x snap-proximity">
        {/* Add Story Button */}
        {currentUser && (
          <button
            onClick={() => setBuilderOpen(true)}
            className="flex flex-col items-center gap-2 shrink-0 w-[72px] group hover-lift"
          >
            <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center surface-1 group-hover:border-primary transition-all group-hover:scale-105 shadow-sm">
              <Avatar className="w-14 h-14 opacity-70 group-hover:opacity-100 transition-opacity">
                <AvatarImage src={currentUser.avatarUrl} />
                <AvatarFallback className="font-display font-bold">{currentUser.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md glow-neon-primary">
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

          const authorStories = groupedStories[authorId];
          const hasUnseen = authorStories.some((s) => !s.viewed);

          return (
            <button
              key={authorId}
              onClick={() => setActiveAuthorId(authorId)}
              className="flex flex-col items-center gap-2 shrink-0 w-[72px] snap-start transition-transform duration-200 hover:scale-105"
            >
              <div
                className={cn(
                  "p-[3px] rounded-full transition-transform hover:scale-105",
                  hasUnseen ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 shadow-md shadow-pink-500/20" : "bg-border opacity-60"
                )}
              >
                <Avatar className="w-16 h-16 border-2 border-background">
                  <AvatarImage src={author.avatarUrl} alt={author.displayName} />
                  <AvatarFallback>{author.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs font-medium truncate w-full text-center text-foreground/80">
                {authorId === currentUser?.id ? 'Your Story' : author.displayName}
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
