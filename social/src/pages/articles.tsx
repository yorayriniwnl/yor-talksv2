import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_ARTICLES = [
  {
    id: 'a1',
    title: 'The Future of Interface Design: Moving Beyond Screens',
    excerpt: 'As spatial computing becomes mainstream, how do we adapt our mental models of user interfaces? A deep dive into zero-UI and spatial design patterns.',
    author: { name: 'Alex Rivera', handle: '@alex_yt', avatar: 'https://i.pravatar.cc/150?u=u1' },
    coverUrl: 'https://picsum.photos/seed/a1/800/400',
    date: '2024-04-12T10:00:00Z',
    readTime: 6,
    claps: 1240,
    comments: 84,
  },
  {
    id: 'a2',
    title: 'Why I Stopped Using Redux in 2024',
    excerpt: 'State management has evolved. Here is how Zustand and React Query completely replaced complex boilerplate in my workflow.',
    author: { name: 'Sarah Chen', handle: '@sarah_codes', avatar: 'https://i.pravatar.cc/150?u=u2' },
    coverUrl: 'https://picsum.photos/seed/a2/800/400',
    date: '2024-04-10T14:30:00Z',
    readTime: 4,
    claps: 890,
    comments: 142,
  },
  {
    id: 'a3',
    title: 'Finding Inspiration in Japanese Woodblock Prints',
    excerpt: 'What ukiyo-e can teach us about color theory, composition, and visual hierarchy in modern web design.',
    author: { name: 'Marcus Johnson', handle: '@marcus_daily', avatar: 'https://i.pravatar.cc/150?u=u3' },
    coverUrl: 'https://picsum.photos/seed/a3/800/400',
    date: '2024-04-05T09:15:00Z',
    readTime: 8,
    claps: 3200,
    comments: 45,
  }
];

export default function Articles() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="font-display font-bold text-4xl mb-2">Yor Talks Articles</h1>
          <p className="text-lg text-muted-foreground">Deep dives, stories, and ideas from the community.</p>
        </div>
      </div>

      <div className="space-y-12">
        {MOCK_ARTICLES.map((article, i) => (
          <motion.article 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={article.id} 
            className="group cursor-pointer"
          >
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              <div className="w-full md:w-[240px] shrink-0 order-2 md:order-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={article.author.avatar} />
                      <AvatarFallback>{article.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium">{article.author.name}</p>
                      <p className="text-muted-foreground">{format(new Date(article.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-muted-foreground mt-4 md:mt-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Heart className="w-4 h-4" /> {article.claps}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <MessageCircle className="w-4 h-4" /> {article.comments}
                    </div>
                  </div>
                </div>
                
                <div className="hidden md:flex items-center justify-between text-muted-foreground text-sm mt-4">
                  <span>{article.readTime} min read</span>
                  <Bookmark className="w-4 h-4 hover:text-primary transition-colors" />
                </div>
              </div>

              <div className="flex-1 order-1 md:order-2">
                <div className="aspect-[2/1] md:aspect-[5/2] rounded-2xl overflow-hidden mb-4 bg-muted">
                  <img src={article.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold leading-tight mb-3 group-hover:text-primary transition-colors">
                  {article.title}
                </h2>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="md:hidden flex items-center justify-between text-muted-foreground text-sm mt-4">
                  <span>{article.readTime} min read</span>
                  <Bookmark className="w-4 h-4 hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
