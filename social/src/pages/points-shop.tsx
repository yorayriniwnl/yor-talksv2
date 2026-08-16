import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Sparkles, Award, Palette, Check, Star, Shield, Flame, Eye, RefreshCw } from 'lucide-react';
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

  { id: 'badge-voyager', type: 'badge', title: 'Multiverse Pioneer Badge', points: 2000, category: 'Steam Badge' },
  { id: 'badge-master', type: 'badge', title: 'Code Architect Badge', points: 2500, category: 'Steam Badge' },
];

export default function PointsShop() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [points, setPoints] = useState(4850);
  const [unlockedItems, setUnlockedItems] = useState<string[]>(['frame-neon']);
  const [filter, setFilter] = useState<'all' | 'frame' | 'background' | 'badge'>('all');
  const [previewFrame, setPreviewFrame] = useState<string>('from-cyan-400 to-blue-500');
  const [previewBackground, setPreviewBackground] = useState<string>('https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop');

  const handlePurchase = (item: typeof SHOP_ITEMS[number]) => {
    if (unlockedItems.includes(item.id)) {
      sounds.playPop();
      if (item.type === 'frame') setPreviewFrame(item.previewColor || 'from-cyan-400 to-blue-500');
      if (item.type === 'background') setPreviewBackground(item.coverUrl || '');
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
    if (item.type === 'frame') setPreviewFrame(item.previewColor || 'from-cyan-400 to-blue-500');
    if (item.type === 'background') setPreviewBackground(item.coverUrl || '');
    toast.success(`Unlocked & Equipped ${item.title}!`);
  };

  const filteredItems = SHOP_ITEMS.filter(i => filter === 'all' || i.type === filter);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center glow-neon-primary shadow-md">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Steam Points Shop</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Customize your Profile, Avatar Frames & Themes</p>
          </div>
        </div>

        {/* Steam Points Counter */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl surface-1 border border-amber-500/30 font-mono text-xs font-bold text-amber-400 shadow-sm">
          <Star className="w-4 h-4 fill-amber-400" />
          <span>{points.toLocaleString()} Steam Points</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Live 3D Avatar & Profile Customizer Preview Sandbox */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 relative overflow-hidden shadow-sm">
          <div className="absolute inset-0 opacity-20">
            <img src={previewBackground} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/50 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Dynamic Animated Avatar Sandbox */}
              <div className={cn("p-1.5 rounded-full bg-gradient-to-tr animate-[spin_5s_linear_infinite] shadow-2xl", previewFrame)}>
                <div className="p-0.5 bg-background rounded-full">
                  <Avatar className="w-20 h-20 border-2 border-background">
                    <AvatarImage src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'} />
                    <AvatarFallback className="text-xl font-bold font-display">{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-mono font-bold mb-1.5 border border-primary/30">
                  <Eye className="w-3.5 h-3.5" /> Live Sandbox Customizer
                </div>
                <h3 className="font-display font-bold text-xl text-foreground">{currentUser?.displayName || 'Your Profile'}</h3>
                <p className="text-xs text-muted-foreground font-mono">Testing frame & profile wallpaper combinations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreviewFrame('from-cyan-400 to-blue-500');
                  sounds.playPop();
                }}
                className="rounded-2xl font-bold text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reset Preview
              </Button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {[
            { id: 'all', label: '✨ All Items' },
            { id: 'frame', label: '🖼️ Avatar Frames' },
            { id: 'background', label: '🌌 Profile Backgrounds' },
            { id: 'badge', label: '🛡️ Profile Badges' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all font-sans",
                filter === cat.id ? "bg-primary text-primary-foreground shadow-md glow-neon-primary" : "surface-1 text-muted-foreground hover:bg-muted"
              )}
            >
              {cat.label}
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

            return (
              <motion.div
                key={item.id}
                variants={staggerItem}
                className="surface-1 rounded-3xl overflow-hidden border border-border/40 hover:border-primary/40 transition-all duration-300 flex flex-col shadow-sm group p-5 justify-between"
              >
                <div>
                  {/* Item Preview Container */}
                  <div className="h-44 rounded-2xl bg-muted/40 overflow-hidden mb-4 relative flex items-center justify-center">
                    {item.type === 'frame' && (
                      <div className={cn("p-1.5 rounded-full bg-gradient-to-tr animate-[spin_6s_linear_infinite] shadow-xl", item.previewColor)}>
                        <div className="p-0.5 bg-background rounded-full">
                          <Avatar className="w-16 h-16 border-2 border-background">
                            <AvatarImage src={currentUser?.avatarUrl} />
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    )}

                    {item.type === 'background' && (
                      <img src={item.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    )}

                    {item.type === 'badge' && (
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-3xl shadow-lg">
                        🛡️
                      </div>
                    )}

                    <span className="absolute top-3 left-3 text-[0.62rem] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10">
                      {item.category}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base text-foreground leading-tight mb-1">{item.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 font-bold mb-4">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{item.points.toLocaleString()} Points</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border/30">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (item.type === 'frame') setPreviewFrame(item.previewColor || '');
                      if (item.type === 'background') setPreviewBackground(item.coverUrl || '');
                      sounds.playPop();
                    }}
                    className="rounded-xl font-bold text-xs flex-1"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Try On
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handlePurchase(item)}
                    className={cn(
                      "rounded-xl font-bold text-xs flex-1 shadow-md",
                      isUnlocked ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "glow-neon-primary bg-primary text-primary-foreground"
                    )}
                  >
                    {isUnlocked ? <Check className="w-3.5 h-3.5 mr-1 text-white" /> : <ShoppingBag className="w-3.5 h-3.5 mr-1" />}
                    {isUnlocked ? 'Equip' : 'Unlock'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
