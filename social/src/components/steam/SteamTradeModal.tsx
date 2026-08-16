import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Sparkles, Shield, Check, Plus, Trash2, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export interface SteamItem {
  id: string;
  name: string;
  game: string;
  rarity: 'Arcana' | 'Immortal' | 'Legendary' | 'Classified' | 'Mil-Spec';
  rarityColor: string;
  price: number;
  imageUrl: string;
  floatVal?: string;
}

export const USER_INVENTORY: SteamItem[] = [
  {
    id: 'item-1',
    name: 'AWP | Dragon Lore (Factory New)',
    game: 'Counter-Strike 2',
    rarity: 'Arcana',
    rarityColor: 'from-amber-400 to-red-500 border-amber-400 text-amber-300',
    price: 3450.00,
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.0142'
  },
  {
    id: 'item-2',
    name: 'Karambit | Fade (Doppler Phase 2)',
    game: 'Counter-Strike 2',
    rarity: 'Immortal',
    rarityColor: 'from-fuchsia-500 to-rose-500 border-fuchsia-500 text-fuchsia-300',
    price: 1890.00,
    imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.0089'
  },
  {
    id: 'item-3',
    name: 'Manifold Paradox (Phantom Assassin Arcana)',
    game: 'Dota 2',
    rarity: 'Arcana',
    rarityColor: 'from-cyan-400 to-blue-600 border-cyan-400 text-cyan-300',
    price: 45.00,
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'item-4',
    name: 'AK-47 | Vulcan (Minimal Wear)',
    game: 'Counter-Strike 2',
    rarity: 'Classified',
    rarityColor: 'from-rose-500 to-red-600 border-rose-500 text-rose-300',
    price: 240.00,
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.0812'
  },
  {
    id: 'item-5',
    name: 'M4A4 | Howl (Field-Tested)',
    game: 'Counter-Strike 2',
    rarity: 'Arcana',
    rarityColor: 'from-red-600 to-amber-500 border-red-500 text-red-400',
    price: 4100.00,
    imageUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.1650'
  },
  {
    id: 'item-6',
    name: 'Glock-18 | Water Elemental',
    game: 'Counter-Strike 2',
    rarity: 'Mil-Spec',
    rarityColor: 'from-blue-400 to-indigo-600 border-blue-400 text-blue-300',
    price: 18.50,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.0410'
  }
];

export const PARTNER_INVENTORY: SteamItem[] = [
  {
    id: 'p-item-1',
    name: 'Butterfly Knife | Gamma Doppler (Emerald)',
    game: 'Counter-Strike 2',
    rarity: 'Arcana',
    rarityColor: 'from-emerald-400 to-teal-600 border-emerald-400 text-emerald-300',
    price: 4950.00,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.0031'
  },
  {
    id: 'p-item-2',
    name: 'Sport Gloves | Vice (Field-Tested)',
    game: 'Counter-Strike 2',
    rarity: 'Immortal',
    rarityColor: 'from-pink-500 to-purple-600 border-pink-500 text-pink-300',
    price: 1450.00,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.1980'
  },
  {
    id: 'p-item-3',
    name: 'Demon Eater (Shadow Fiend Arcana)',
    game: 'Dota 2',
    rarity: 'Arcana',
    rarityColor: 'from-orange-500 to-red-600 border-orange-500 text-orange-300',
    price: 48.00,
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p-item-4',
    name: 'USP-S | Kill Confirmed (Factory New)',
    game: 'Counter-Strike 2',
    rarity: 'Classified',
    rarityColor: 'from-red-500 to-rose-700 border-red-500 text-red-300',
    price: 195.00,
    imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.0210'
  }
];

interface SteamTradeModalProps {
  partnerName?: string;
  partnerAvatar?: string;
  trigger?: React.ReactNode;
}

export function SteamTradeModal({
  partnerName = 'Valkyrie_Zero',
  partnerAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
  trigger
}: SteamTradeModalProps) {
  const [open, setOpen] = useState(false);
  const [yourOffer, setYourOffer] = useState<SteamItem[]>([]);
  const [theirOffer, setTheirOffer] = useState<SteamItem[]>([]);
  const [activeTab, setActiveTab] = useState<'your' | 'their'>('your');

  const toggleYourItem = (item: SteamItem) => {
    sounds.playPop();
    setYourOffer(prev => 
      prev.find(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item]
    );
  };

  const toggleTheirItem = (item: SteamItem) => {
    sounds.playPop();
    setTheirOffer(prev => 
      prev.find(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item]
    );
  };

  const yourTotal = yourOffer.reduce((sum, i) => sum + i.price, 0);
  const theirTotal = theirOffer.reduce((sum, i) => sum + i.price, 0);

  const handleSendOffer = () => {
    if (yourOffer.length === 0 && theirOffer.length === 0) {
      toast.error('Select at least 1 item to trade');
      return;
    }
    sounds.playChime();
    triggerConfetti();
    toast.success(`Steam Trade Offer submitted to ${partnerName}! Steam Guard 2FA verification sent.`);
    setOpen(false);
    setYourOffer([]);
    setTheirOffer([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white glow-neon-primary">
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" /> Steam Trade
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border border-border/50 glass-heavy shadow-2xl font-sans text-foreground">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-border/40 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-black flex items-center justify-center font-bold shadow-lg">
              <ArrowLeftRight className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <DialogTitle className="font-display font-bold text-lg text-white flex items-center gap-2">
                Steam Trade Offer
                <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Steam Guard Active
                </span>
              </DialogTitle>
              <p className="text-xs text-zinc-400 font-mono">Trading with {partnerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="text-right">
              <div className="text-[0.65rem] text-zinc-400 uppercase">Trade Value Balance</div>
              <div className={cn("font-bold", yourTotal > theirTotal ? "text-amber-400" : "text-emerald-400")}>
                ${yourTotal.toFixed(2)} ⇄ ${theirTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Trade Window Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/40 bg-zinc-900/60 min-h-[160px] p-4 gap-4">
          {/* Your Offered Items Table */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">Your Offer ({yourOffer.length})</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">${yourTotal.toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[90px] p-2 rounded-2xl bg-black/40 border border-border/30">
                {yourOffer.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono m-auto">Click your inventory items below to add</p>
                ) : (
                  yourOffer.map(item => (
                    <motion.div
                      layout
                      key={item.id}
                      onClick={() => toggleYourItem(item)}
                      className="relative w-16 h-16 rounded-xl border border-border/60 bg-zinc-900/90 overflow-hidden cursor-pointer hover:border-red-400 group p-1"
                    >
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                      <div className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Trash2 className="w-4 h-4" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Their Offered Items Table */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">{partnerName}'s Offer ({theirOffer.length})</span>
                <span className="text-xs font-mono text-cyan-400 font-bold">${theirTotal.toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[90px] p-2 rounded-2xl bg-black/40 border border-border/30">
                {theirOffer.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono m-auto">Click their items below to request</p>
                ) : (
                  theirOffer.map(item => (
                    <motion.div
                      layout
                      key={item.id}
                      onClick={() => toggleTheirItem(item)}
                      className="relative w-16 h-16 rounded-xl border border-border/60 bg-zinc-900/90 overflow-hidden cursor-pointer hover:border-red-400 group p-1"
                    >
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                      <div className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Trash2 className="w-4 h-4" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Selector Selector Tabs */}
        <div className="p-4 bg-zinc-950/90 border-t border-border/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activeTab === 'your' ? 'default' : 'outline'}
                onClick={() => setActiveTab('your')}
                className={cn("rounded-xl font-bold text-xs px-4", activeTab === 'your' && "bg-emerald-600 text-white")}
              >
                🎒 Your Inventory ({USER_INVENTORY.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'their' ? 'default' : 'outline'}
                onClick={() => setActiveTab('their')}
                className={cn("rounded-xl font-bold text-xs px-4", activeTab === 'their' && "bg-cyan-600 text-white")}
              >
                📦 {partnerName}'s Items ({PARTNER_INVENTORY.length})
              </Button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto hide-scrollbar p-1">
            {(activeTab === 'your' ? USER_INVENTORY : PARTNER_INVENTORY).map(item => {
              const isSelected = (activeTab === 'your' ? yourOffer : theirOffer).some(i => i.id === item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => (activeTab === 'your' ? toggleYourItem(item) : toggleTheirItem(item))}
                  className={cn(
                    "p-2.5 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative group flex flex-col justify-between",
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/20 shadow-lg"
                      : "border-border/40 bg-zinc-900/70 hover:border-border"
                  )}
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-2 bg-black/60">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-[0.65rem] shadow">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    {item.floatVal && (
                      <span className="absolute bottom-1 left-1 text-[0.58rem] font-mono px-1.5 py-0.5 rounded bg-black/70 text-zinc-300">
                        Float: {item.floatVal}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className={cn("text-[0.6rem] font-mono font-bold uppercase block truncate", item.rarityColor)}>
                      {item.rarity}
                    </span>
                    <h5 className="font-bold text-xs text-white line-clamp-1 leading-tight">{item.name}</h5>
                    <div className="flex items-center justify-between mt-1 text-xs font-mono">
                      <span className="text-[0.65rem] text-zinc-400">{item.game}</span>
                      <span className="font-bold text-emerald-400">${item.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/40 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Escrow Protected · 0% Fee</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleSendOffer}
              className="rounded-xl font-bold text-xs px-6 bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Make Trade Offer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
