import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Sparkles, Award, Palette, Check, Star, Shield, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';

const SHOP_ITEMS = [
  { id: 'frame-neon', type: 'frame', title: 'Cyber Neon Frame', points: 500, previewColor: 'from-cyan-400 to-blue-500', category: 'Avatar Frame' },
  { id: 'frame-gold', type: 'frame', title: 'Golden Dragon Frame', points: 1000, previewColor: 'from-amber-300 to-orange-500', category: 'Avatar Frame' },
  { id: 'frame-cosmic', type: 'frame', title: 'Deep Cosmic Frame', points: 750, previewColor: 'from-red-500 to-indigo-600', category: 'Avatar Frame' },
  { id: 'frame-fire', type: 'frame', title: 'Supernova Fire Frame', points: 1200, previewColor: 'from-red-500 to-yellow-400', category: 'Avatar Frame' },
  
  { id: 'bg-cyber', type: 'background', title: 'Cyberpunk Metropolis Wallpaper', points: 1500, coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop', category: 'Profile Theme' },
  { id: 'bg-nebula', type: 'background', title: 'Deep Space Nebula Wallpaper', points: 1500, coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop', category: 'Profile Theme' },
  { id: 'bg-sunset', type: 'background', title: 'Synthwave Sunset Wallpaper', points: 1500, coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop', category: 'Profile Theme' },

  { id: 'badge-voyager', type: 'badge', title: 'Multiverse Pioneer Badge', points: 2000, icon: Sparkles, category: 'Steam Badge' },
  { id: 'badge-master', type: 'badge', title: 'Code Architect Badge', points: 2500, icon: Shield, category: 'Steam Badge' },
];

export default function PointsShop() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [points, setPoints] = useState(3450); // Simulated Steam points balance
  const [unlockedItems, setUnlockedItems] = useState<string[]>(['frame-neon']);
  const [filter, setFilter] = useState<'all' | 'frame' | 'background' | 'badge'>('all');

  const handlePurchase = (item: typeof SHOP_ITEMS[number]) => {
    if (unlockedItems.includes(item.id)) {
      sounds.playPop();
      toast.info(`Equipped ${item.title}`);
      return;
    }
    if (points < item.points) {
      toast.error('Insufficient Steam Points balance!');
      return;
    }
    sounds.playChime();
    triggerConfetti();
    setPoints(p => p - item.points);
    setUnlockedItems(prev => [...prev, item.id]);
    toast.success(`Unlocked & Equipped ${item.title}!`);
  };

  const filteredItems = SHOP_ITEMS.filter(i => filter === 'all' || i.type === filter);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center glow-neon-primary shadow-md">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Steam Points Shop</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Customize your Profile & Avatars</p>
          </div>
        </div>

        {/* Steam Points Counter */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl surface-1 border border-amber-500/30 font-mono text-xs font-bold text-amber-400 shadow-sm">
          <Star className="w-4 h-4 fill-amber-400" />
          <span>{points.toLocaleString()} Points</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Category Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: '✨ All Items' },
            { id: 'frame', label: '🖼️ Avatar Frames' },
            { id: 'background', label: '🌌 Profile Backgrounds' },
            { id: 'badge', label: '🛡️ Profile Badges' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                filter === f.id ? "bg-amber-500 text-black shadow-md glow-neon-primary" : "surface-1 text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Shop Items Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredItems.map((item) => {
            const isUnlocked = unlockedItems.includes(item.id);
            const BadgeIcon = item.icon;

            return (
              <motion.div
                key={item.id}
                variants={staggerItem}
                className="surface-1 rounded-3xl p-6 border border-border/40 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[0.65rem] uppercase font-bold tracking-wider font-mono px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400">
                      {item.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> {item.points.toLocaleString()}
                    </span>
                  </div>

                  {/* Preview Container */}
                  <div className="w-full h-40 rounded-2xl bg-muted/50 border border-border/30 mb-4 flex items-center justify-center overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-500">
                    {item.type === 'frame' && (
                      <div className={cn("p-1 rounded-full bg-gradient-to-tr shadow-lg", item.previewColor)}>
                        <Avatar className="w-20 h-20 border-2 border-background">
                          <AvatarImage src={currentUser?.avatarUrl} />
                          <AvatarFallback className="font-display font-bold text-xl">{currentUser?.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}

                    {item.type === 'background' && (
                      <div className="w-full h-full relative">
                        <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                    )}

                    {item.type === 'badge' && BadgeIcon && (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/40 glow-neon-primary">
                        <BadgeIcon className="w-10 h-10 text-amber-400" />
                      </div>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-base mb-1">{item.title}</h3>
                </div>

                <Button
                  onClick={() => handlePurchase(item)}
                  className={cn(
                    "w-full rounded-xl font-bold text-xs h-10 mt-4 transition-all",
                    isUnlocked
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-amber-500 hover:bg-amber-600 text-black shadow-md glow-neon-primary"
                  )}
                >
                  {isUnlocked ? (
                    <><Check className="w-4 h-4 mr-1.5" /> Equipped</>
                  ) : (
                    `Unlock for ${item.points.toLocaleString()} Points`
                  )}
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
