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

// No externally hosted gallery is configured. The active composer does not mount this picker.
const FEATURED_GIFS: GifItem[] = [];

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

  const filteredGifs = FEATURED_GIFS.filter((g) =>
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
            aria-label="Filter featured GIFs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter featured GIFs…"
            className="pl-9 rounded-2xl surface-2 border-border/40 text-xs h-10"
            autoFocus
          />
        </div>

        <p className="text-xs text-muted-foreground">Featured GIFs are unavailable until an approved catalogue is configured. Static image uploads remain available in the comment composer.</p>
        {filteredGifs.length === 0 && <p role="status" className="py-6 text-sm text-center">No featured GIFs match that search.</p>}

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
