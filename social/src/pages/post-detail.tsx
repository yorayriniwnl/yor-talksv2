import { useParams, Link } from 'wouter';
import { useAppStore } from '@/lib/store';
import { PostCard } from '@/components/feed/Post';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function PostDetail() {
  const { id } = useParams();
  const { posts, users, currentUser } = useAppStore();
  
  const post = posts.find(p => p.id === id);
  
  if (!post) return <div className="p-8 text-center">Post not found</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex-1 max-w-2xl border-r border-border/50 min-h-screen">
        <div className="sticky top-0 z-20 glass px-4 py-2 flex items-center gap-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h2 className="font-display font-bold text-xl leading-tight">Post</h2>
        </div>

        {/* We reuse the PostCard but could make a detailed view variant */}
        <PostCard post={post} />

        {/* Reply Box */}
        <div className="p-4 border-b border-border/50 bg-muted/10 flex gap-4">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={currentUser?.avatarUrl} />
            <AvatarFallback>{currentUser?.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <textarea
              placeholder="Post your reply"
              className="w-full bg-transparent resize-none outline-none text-lg placeholder:text-muted-foreground min-h-[40px]"
            />
            <div className="flex justify-end mt-2">
              <Button className="rounded-full font-medium" disabled>Reply</Button>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="divide-y divide-border/50">
          {/* Mock Comments */}
          {[1, 2, 3].map((i) => {
            const commentAuthor = users[`u${(i % 3) + 2}`];
            if (!commentAuthor) return null;
            return (
              <div key={i} className="p-4 flex gap-4 hover:bg-muted/20 transition-colors">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={commentAuthor.avatarUrl} />
                  <AvatarFallback>{commentAuthor.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium hover:underline cursor-pointer">{commentAuthor.displayName}</span>
                    <span className="text-muted-foreground text-sm">@{commentAuthor.username}</span>
                    <span className="text-muted-foreground text-sm">· {i}h</span>
                  </div>
                  <p className="mt-1 text-[15px]">This is an insightful comment about the post above. Really makes you think.</p>
                  <div className="flex items-center gap-4 mt-3 text-muted-foreground">
                    <button className="flex items-center gap-1.5 hover:text-primary transition-colors text-xs">
                      <MessageCircle className="w-4 h-4" /> {Math.floor(Math.random() * 10)}
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-red-500 transition-colors text-xs">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      {Math.floor(Math.random() * 50)}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
