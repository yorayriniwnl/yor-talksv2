import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem, hoverLift, tapScale } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Bookmark, Heart, PenLine, BookOpen, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function CreateArticleDialog() {
  const createArticle = useAppStore((s) => s.createArticle);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const wordCount = content.trim().split(/\s+/).length;
      await createArticle({
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        coverUrl: `https://picsum.photos/seed/${encodeURIComponent(title)}/800/400`,
        readTime: Math.max(1, Math.round(wordCount / 200)),
      });
      setOpen(false);
      setTitle(''); setExcerpt(''); setContent('');
    } catch (err: any) {
      setError(err.message || 'Failed to publish article');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold text-xs px-4 glow-neon-primary bg-primary"><PenLine className="w-4 h-4 mr-1.5" /> Write</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl rounded-2xl">
        <DialogHeader><DialogTitle className="font-display font-bold text-xl">Write an article</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {error && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="article-title" className="text-xs font-mono uppercase text-muted-foreground">Title</Label>
            <Input id="article-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} placeholder="The Future of Interface Design" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="article-excerpt" className="text-xs font-mono uppercase text-muted-foreground">Excerpt</Label>
            <Textarea id="article-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required maxLength={500} placeholder="A one or two sentence summary" rows={2} className="rounded-xl resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="article-content" className="text-xs font-mono uppercase text-muted-foreground">Content</Label>
            <Textarea id="article-content" value={content} onChange={(e) => setContent(e.target.value)} required rows={10} placeholder="Write your article…" className="rounded-xl font-serif" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || title.trim().length < 2 || !excerpt.trim() || !content.trim()} className="rounded-xl font-bold text-xs px-6">
              {loading ? 'Publishing…' : 'Publish Article'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Articles() {
  const articles = useAppStore((s) => s.articles);
  const users = useAppStore((s) => s.users);
  const loadArticles = useAppStore((s) => s.loadArticles);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  useEffect(() => {
    for (const article of articles) {
      if (!users[article.authorId]) loadUserProfile(article.authorId);
    }
  }, [articles, users, loadUserProfile]);

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const gridArticles = articles.length > 1 ? articles.slice(1) : [];

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Long-Form Articles</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">In-depth perspectives from the community</p>
        </div>
        <CreateArticleDialog />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {articles.length === 0 && (
          <div className="text-center py-20 rounded-3xl border border-dashed border-border/50 surface-1">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="font-display font-bold text-lg mb-1">No articles published yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Be the first writer in your network to publish a long-form article.</p>
          </div>
        )}

        {featuredArticle && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-10">
            <div className="showcase-section-title mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3>Featured Article</h3>
            </div>
            <motion.div 
              whileHover={{ y: -3 }}
              className="relative h-72 sm:h-80 rounded-3xl overflow-hidden cursor-pointer group border border-border/30 shadow-lg"
            >
              <img src={featuredArticle.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={featuredArticle.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white mb-3 line-clamp-2 leading-tight">{featuredArticle.title}</h2>
                <p className="text-white/80 font-serif text-sm line-clamp-2 mb-4 max-w-2xl">{featuredArticle.excerpt}</p>
                <div className="flex items-center gap-3 text-white/90 text-xs font-mono">
                  <Avatar className="w-8 h-8 border-2 border-white/20">
                    <AvatarImage src={users[featuredArticle.authorId]?.avatarUrl} />
                    <AvatarFallback>{(users[featuredArticle.authorId]?.displayName ?? '?').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-bold">{users[featuredArticle.authorId]?.displayName ?? 'Unknown'}</span>
                  <span>·</span>
                  <span>{format(new Date(featuredArticle.createdAt), 'MMM d, yyyy')}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {featuredArticle.readTime} min read</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {gridArticles.length > 0 && (
          <div>
            <div className="showcase-section-title mb-6">
              <BookOpen className="w-4 h-4 text-accent" />
              <h3>Recent Stories</h3>
            </div>

            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            >
              {gridArticles.map((article) => {
                const author = users[article.authorId];
                const isSaved = article.savedByMe;

                return (
                  <motion.article 
                    variants={staggerItem}
                    key={article.id} 
                    className="surface-1 rounded-2xl overflow-hidden flex flex-col group cursor-pointer border border-border/40 hover:border-accent/40 transition-all duration-300"
                  >
                    <div className="h-44 overflow-hidden relative">
                      <img src={article.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={article.title} />
                      <button 
                        onClick={(e) => { e.stopPropagation(); }} 
                        className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
                        aria-label="Spark"
                      >
                        <Bookmark className={cn("w-4 h-4", isSaved && "fill-current text-accent")} />
                      </button>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-display font-bold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-tight">{article.title}</h3>
                      <p className="text-xs font-serif text-muted-foreground line-clamp-2 mb-4 flex-1 leading-relaxed">{article.excerpt}</p>
                      <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-border/30">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={author?.avatarUrl} />
                            <AvatarFallback>{(author?.displayName ?? '?').charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-muted-foreground font-semibold">{author?.displayName ?? 'Unknown'}</span>
                        </div>
                        <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime} min read</span>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
