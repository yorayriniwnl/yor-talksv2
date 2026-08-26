import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, X, TrendingUp, Flame } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { sounds } from '@/lib/sound';

export interface GifItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

const TRENDING_GIFS: GifItem[] = [
  {
    id: 'g1',
    title: 'Mind Blown',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  },
  {
    id: 'g2',
    title: 'Global Celebrations / Dance',
    url: 'https://media.giphy.com/media/l1IY8mBoHYpksZG7C/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/l1IY8mBoHYpksZG7C/giphy.gif',
  },
  {
    id: 'g3',
    title: 'Popcorn / Shocked',
    url: 'https://media.giphy.com/media/tyqcJoNjNv0Fq/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/tyqcJoNjNv0Fq/giphy.gif',
  },
  {
    id: 'g4',
    title: 'Namaste / Respect',
    url: 'https://media.giphy.com/media/3o7TKqTOqevMCYB04g/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7TKqTOqevMCYB04g/giphy.gif',
  },
  {
    id: 'g5',
    title: 'Fire / Lit',
    url: 'https://media.giphy.com/media/nrXif9YExO9EI/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/nrXif9YExO9EI/giphy.gif',
  },
  {
    id: 'g6',
    title: 'Laughing Cat',
    url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif',
  },
  {
    id: 'g7',
    title: 'GG / High Five',
    url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  },
  {
    id: 'g8',
    title: 'Clapping Ovation',
    url: 'https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif',
  },
];

const CATEGORIES = ['Trending 🔥', 'Reactions 😲', 'Global ✨', 'Gaming 🎮', 'Anime ✨', 'Love ❤️'];

export function GifPickerModal({
  isOpen,
  onOpenChange,
  onSelectGif,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGif: (gif: GifItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Trending 🔥');

  const filteredGifs = TRENDING_GIFS.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl font-sans glass-heavy border border-primary/30 p-5">
        <DialogHeader className="pb-1">
          <DialogTitle className="font-display font-black text-lg flex items-center gap-2 text-foreground">
            <Flame className="w-5 h-5 text-amber-400" /> Select a GIF
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all GIFs via GIPHY..."
            className="pl-9 rounded-2xl surface-2 border-border/40 text-xs h-10"
            autoFocus
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); sounds.playPop(); }}
              className={`px-3 py-1 rounded-full text-[0.7rem] font-bold font-mono shrink-0 transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground glow-neon-primary'
                  : 'surface-1 text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* GIF Grid */}
        <div className="grid grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto hide-scrollbar pt-2">
          {filteredGifs.map((gif) => (
            <motion.button
              key={gif.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                sounds.playPop();
                onSelectGif(gif);
                onOpenChange(false);
              }}
              className="relative h-32 rounded-2xl overflow-hidden group border border-border/40 surface-1 focus:outline-none cursor-pointer"
            >
              <img
                src={gif.url}
                alt={gif.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <span className="text-[0.65rem] font-bold text-white truncate">{gif.title}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
