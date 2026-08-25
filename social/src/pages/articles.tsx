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
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { CONTENT_CATEGORIES, resolveContentCategory, type ContentCategory } from '@/lib/content-category';
import { ContentCategoryBadge } from '@/components/content/ContentCategoryBadge';

function CreateArticleDialog() {
  const createArticle = useAppStore((s) => s.createArticle);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [contentCategory, setContentCategory] = useState<ContentCategory | ''>('');
  const [contentRating, setContentRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
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
        contentCategory: contentCategory as ContentCategory,
        contentRating,
      });
      setOpen(false);
      setTitle(''); setExcerpt(''); setContent(''); setContentCategory(''); setContentRating(DEFAULT_CONTENT_RATING);
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
          <ContentCategorySelect id="article-content-category" value={contentCategory} onChange={setContentCategory} />
          <ContentRatingSelect id="article-content-rating" value={contentRating} onChange={setContentRating} />
          <div className="space-y-1.5">
            <Label htmlFor="article-excerpt" className="text-xs font-mono uppercase text-muted-foreground">Excerpt</Label>
            <Textarea id="article-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required maxLength={500} placeholder="A one or two sentence summary" rows={2} className="rounded-xl resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="article-content" className="text-xs font-mono uppercase text-muted-foreground">Content</Label>
            <Textarea id="article-content" value={content} onChange={(e) => setContent(e.target.value)} required rows={10} placeholder="Write your article…" className="rounded-xl font-serif" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || title.trim().length < 2 || !excerpt.trim() || !content.trim() || !contentCategory} className="rounded-xl font-bold text-xs px-6">
              {loading ? 'Publishing…' : 'Publish Article'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ARTICLE_GENRES = [
  { id: 'all', label: '🌟 All Articles' },
  { id: 'tech', label: '🤖 AI & Tech' },
  { id: 'gaming', label: '🎮 Gaming & Esports' },
  { id: 'music', label: '🎵 Music & Sound' },
  { id: 'art', label: '🎨 3D & Design' },
  { id: 'fashion', label: '👗 Fashion & Techwear' },
  { id: 'motorsport', label: '🏎️ Speed & Sim' },
  { id: 'science', label: '🔬 Quantum & Space' },
  { id: 'lifestyle', label: '☕ Crafts & Lifestyle' },
] as const;

function matchesArticleGenre(article: any, author: any, genre: string): boolean {
  if (genre === 'all') return true;
  const text = `${article.title} ${article.excerpt} ${article.content} ${article.collection || ''} ${author?.bio || ''}`.toLowerCase();
  switch (genre) {
    case 'tech':
      return text.includes('ai') || text.includes('tensor') || text.includes('transformer') || text.includes('gpu') || text.includes('code') || text.includes('shader') || text.includes('webgpu') || text.includes('interface') || text.includes('design');
    case 'gaming':
      return text.includes('game') || text.includes('esport') || text.includes('duel') || text.includes('arcade') || text.includes('tactical') || text.includes('mocap');
    case 'music':
      return text.includes('music') || text.includes('audio') || text.includes('synth') || text.includes('sound') || text.includes('acoustics') || text.includes('sitar') || text.includes('raga') || text.includes('techno');
    case 'art':
      return text.includes('3d') || text.includes('unreal') || text.includes('render') || text.includes('anime') || text.includes('art') || text.includes('concept') || text.includes('geometry');
    case 'fashion':
      return text.includes('fashion') || text.includes('textile') || text.includes('wearable') || text.includes('couture') || text.includes('denim');
    case 'motorsport':
      return text.includes('car') || text.includes('aero') || text.includes('cfd') || text.includes('drift') || text.includes('rotary') || text.includes('race') || text.includes('sim');
    case 'science':
      return text.includes('quantum') || text.includes('space') || text.includes('biotech') || text.includes('protein') || text.includes('particle') || text.includes('telescope') || text.includes('cryogenics');
    case 'lifestyle':
      return text.includes('coffee') || text.includes('tea') || text.includes('wood') || text.includes('steel') || text.includes('watch') || text.includes('roast') || text.includes('bladesmith');
    default:
      return true;
  }
}

export default function Articles() {
  const articles = useAppStore((s) => s.articles);
  const users = useAppStore((s) => s.users);
  const loadArticles = useAppStore((s) => s.loadArticles);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | 'all'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  useEffect(() => { loadArticles(); }, [loadArticles]);

  useEffect(() => {
    for (const article of articles) {
      if (!users[article.authorId]) loadUserProfile(article.authorId);
    }
  }, [articles, users, loadUserProfile]);

  const filteredArticles = articles.filter((a) => {
    if (selectedCategory !== 'all' && resolveContentCategory(a.contentCategory).value !== selectedCategory) return false;
    const author = users[a.authorId];
    return matchesArticleGenre(a, author, selectedGenre);
  });

  const featuredArticle = filteredArticles.length > 0 ? filteredArticles[0] : null;
  const gridArticles = filteredArticles.length > 1 ? filteredArticles.slice(1) : [];

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Long-Form Articles</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">In-depth perspectives and technical papers across all genres</p>
        </div>
        <CreateArticleDialog />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="mb-4 flex gap-2 overflow-x-auto hide-scrollbar pb-1" aria-label="Filter articles by content category">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0',
              selectedCategory === 'all' ? 'bg-primary text-primary-foreground border-primary glow-neon-primary' : 'surface-1 border-border/50 text-muted-foreground hover:text-foreground',
            )}
          >
            ✨ All categories
          </button>
          {CONTENT_CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0',
                selectedCategory === category.value ? 'bg-primary text-primary-foreground border-primary glow-neon-primary' : 'surface-1 border-border/50 text-muted-foreground hover:text-foreground',
              )}
            >
              {category.emoji} {category.label}
            </button>
          ))}
        </div>

        {/* Genre Category Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-1">
          {ARTICLE_GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border shrink-0",
                selectedGenre === g.id
                  ? "bg-primary text-primary-foreground border-primary glow-neon-primary font-bold shadow-md"
                  : "surface-1 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-20 rounded-3xl border border-dashed border-border/50 surface-1">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="font-display font-bold text-lg mb-1">No articles found in this category</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Publish the first paper or article in this genre.</p>
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
                <ContentCategoryBadge value={featuredArticle.contentCategory} className="mb-3 w-fit border-white/25 bg-white/15 text-white" />
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
                      <ContentCategoryBadge value={article.contentCategory} className="absolute left-3 top-3 border-white/25 bg-black/45 text-white backdrop-blur-md" />
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
