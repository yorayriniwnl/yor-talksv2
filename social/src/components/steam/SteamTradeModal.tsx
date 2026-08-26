import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Sparkles, Shield, Check, Trash2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

export interface SteamItem {
  id: string;
  name: string;
  game: string;
  rarity: 'Mythic' | 'Arcana' | 'Immortal' | 'Legendary' | 'Classified';
  rarityColor: string;
  price: number;
  inrPrice: number;
  imageUrl: string;
  floatVal?: string;
}

export const USER_INVENTORY: SteamItem[] = [
  {
    id: 'item-1',
    name: 'M416 | Glacier (Max Level 7 Kill Message)',
    game: 'BGMI / PUBG Mobile',
    rarity: 'Mythic',
    rarityColor: 'from-cyan-300 via-blue-500 to-indigo-600 border-cyan-400 text-cyan-300',
    price: 450.00,
    inrPrice: 37500,
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop',
    floatVal: 'Lv.7 Max'
  },
  {
    id: 'item-2',
    name: 'Kuronami no Yaiba (Vandal & Melee)',
    game: 'Valorant South Asia',
    rarity: 'Arcana',
    rarityColor: 'from-fuchsia-500 to-purple-600 border-fuchsia-500 text-fuchsia-300',
    price: 120.00,
    inrPrice: 9999,
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'item-3',
    name: 'AWP | Dragon Lore (Factory New)',
    game: 'CS2 India Masters',
    rarity: 'Mythic',
    rarityColor: 'from-amber-400 to-red-500 border-amber-400 text-amber-300',
    price: 3450.00,
    inrPrice: 285000,
    imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.0142'
  },
  {
    id: 'item-4',
    name: 'Karambit | Fade (Doppler Phase 2)',
    game: 'CS2 India Masters',
    rarity: 'Immortal',
    rarityColor: 'from-pink-500 to-rose-500 border-pink-500 text-pink-300',
    price: 1890.00,
    inrPrice: 156000,
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.0089'
  }
];

export const PARTNER_INVENTORY: SteamItem[] = [
  {
    id: 'p-item-1',
    name: 'Fool M416 (Level 6)',
    game: 'BGMI / PUBG Mobile',
    rarity: 'Mythic',
    rarityColor: 'from-purple-400 to-pink-600 border-purple-400 text-purple-300',
    price: 380.00,
    inrPrice: 31500,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p-item-2',
    name: 'Prime Vandal 2.0 (Gold Variant)',
    game: 'Valorant South Asia',
    rarity: 'Legendary',
    rarityColor: 'from-amber-300 to-yellow-500 border-amber-400 text-amber-300',
    price: 75.00,
    inrPrice: 6200,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p-item-3',
    name: 'Butterfly Knife | Gamma Doppler',
    game: 'CS2 India Masters',
    rarity: 'Mythic',
    rarityColor: 'from-emerald-400 to-teal-600 border-emerald-400 text-emerald-300',
    price: 4200.00,
    inrPrice: 348000,
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop',
    floatVal: '0.0031'
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

  const yourTotalINR = yourOffer.reduce((sum, i) => sum + i.inrPrice, 0);
  const theirTotalINR = theirOffer.reduce((sum, i) => sum + i.inrPrice, 0);

  const handleSaveDraft = () => {
    if (yourOffer.length === 0 && theirOffer.length === 0) {
      toast.error('Select at least 1 item to trade');
      return;
    }
    const draftKey = `yor-vault-trade-draft:${encodeURIComponent(partnerName)}`;
    localStorage.setItem(draftKey, JSON.stringify({
      partnerName,
      yourOffer: yourOffer.map(({ id }) => id),
      theirOffer: theirOffer.map(({ id }) => id),
      savedAt: new Date().toISOString(),
    }));
    sounds.playChime();
    toast.info(`Trade draft saved on this device. No offer was sent and no inventory or funds were moved.`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white glow-neon-primary">
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" /> P2P Gear Trade
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
                YOR Gear Vault & Trade
                <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Info className="w-2.5 h-2.5 inline mr-1" /> Trade Preview
                </span>
              </DialogTitle>
              <p className="text-xs text-zinc-400 font-mono">Peer-to-Peer Trading with {partnerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="text-right">
              <div className="text-[0.65rem] text-zinc-400 uppercase">Preview Value</div>
              <div className={cn("font-bold", yourTotalINR > theirTotalINR ? "text-amber-400" : "text-emerald-400")}>
                ₹{yourTotalINR.toLocaleString()} ⇄ ₹{theirTotalINR.toLocaleString()}
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
                <span className="text-xs font-mono text-emerald-400 font-bold">₹{yourTotalINR.toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[90px] p-2 rounded-2xl bg-black/40 border border-border/30">
                {yourOffer.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono m-auto">Click items from your vault below to add</p>
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
                <span className="text-xs font-mono text-cyan-400 font-bold">₹{theirTotalINR.toLocaleString()}</span>
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
                🎒 Your Vault ({USER_INVENTORY.length})
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'their' ? 'default' : 'outline'}
                onClick={() => setActiveTab('their')}
                className={cn("rounded-xl font-bold text-xs px-4", activeTab === 'their' && "bg-cyan-600 text-white")}
              >
                📦 {partnerName}'s Vault ({PARTNER_INVENTORY.length})
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
                        {item.floatVal}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className={cn("text-[0.6rem] font-mono font-bold uppercase block truncate", item.rarityColor)}>
                      {item.rarity} · {item.game}
                    </span>
                    <h5 className="font-bold text-xs text-white line-clamp-1 leading-tight">{item.name}</h5>
                    <div className="flex items-center justify-between mt-1 text-xs font-mono">
                      <span className="font-bold text-emerald-400">₹{item.inrPrice.toLocaleString()}</span>
                      <span className="text-[0.65rem] text-zinc-400">${item.price.toFixed(2)}</span>
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
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Preview values only · No escrow or inventory transfer connected</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleSaveDraft}
              className="rounded-xl font-bold text-xs px-6 bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Save Trade Draft
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
