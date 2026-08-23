import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, IndianRupee, Sparkles, CheckCircle2, 
  Truck, ShieldCheck, Heart, Star, Flame, Tag 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface MerchItem {
  id: string;
  name: string;
  creator: string;
  price: number;
  image: string;
  category: string;
  inStock: number;
  sizes: string[];
}

const STORE_ITEMS: MerchItem[] = [
  {
    id: 'it-1',
    name: 'Team GodLike Official Pro Jersey 2026 👕',
    creator: 'GodLike Esports',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=800&auto=format&fit=crop',
    category: 'Esports',
    inStock: 14,
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 'it-2',
    name: 'Team Soul Cyber Hoodie (Glow Edition) 🧥',
    creator: 'Soul Mortal',
    price: 2499,
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop',
    category: 'Apparel',
    inStock: 8,
    sizes: ['M', 'L', 'XL']
  },
  {
    id: 'it-3',
    name: 'Bharat Cyber RGB Extended Desk Mat ⚡',
    creator: 'Yor Talks Hardware Lab',
    price: 899,
    image: 'https://images.unsplash.com/photo-1616588589596-3e4b78c8a14b?q=80&w=800&auto=format&fit=crop',
    category: 'Hardware',
    inStock: 32,
    sizes: ['900x400mm']
  },
  {
    id: 'it-4',
    name: 'Tokyo Underground Modular Eurorack Braided Patch Cables (Set of 8) 🎛️',
    creator: 'Renata Silva',
    price: 1499,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
    category: 'Music Gear',
    inStock: 19,
    sizes: ['30cm', '60cm', '90cm']
  },
  {
    id: 'it-5',
    name: 'Cyber-Samurai Holographic Heavyweight Art Print (Numbered 1-500) 🎨',
    creator: 'Kenji Sato',
    price: 1899,
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop',
    category: 'Art Prints',
    inStock: 25,
    sizes: ['A3 Foil', 'A2 Giclée']
  },
  {
    id: 'it-6',
    name: 'Luminescent Fiber-Optic Reactive Scarf 👗',
    creator: 'Leila Noor',
    price: 3499,
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
    category: 'Techwear',
    inStock: 6,
    sizes: ['Standard']
  },
  {
    id: 'it-7',
    name: 'Nürburgring GT3 Pre-preg Carbon Fiber Aero Keychain 🏎️',
    creator: 'Mateo Rossi',
    price: 699,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
    category: 'Motorsports',
    inStock: 45,
    sizes: ['Gloss 3K', 'Matte Forged']
  },
  {
    id: 'it-8',
    name: '512-Layer Pattern-Welded Damascus Pocket Bottle Opener ⚔️',
    creator: 'Thorin Lindqvist',
    price: 2199,
    image: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?q=80&w=800&auto=format&fit=crop',
    category: 'Crafts',
    inStock: 11,
    sizes: ['Ladder Pattern', 'Raindrop Pattern']
  },
  {
    id: 'it-9',
    name: 'Single Estate 96h Anaerobic Gesha Whole Bean Tin (250g) ☕',
    creator: 'Anika Das',
    price: 1199,
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop',
    category: 'Specialty Coffee',
    inStock: 28,
    sizes: ['Whole Bean', 'Filter Grind']
  },
  {
    id: 'it-10',
    name: 'Carina Core Deep-Sky Mosaic Silk Tapestry (120x80cm) 🌌',
    creator: 'Zara Thorne',
    price: 1799,
    image: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=800&auto=format&fit=crop',
    category: 'Astrophotography',
    inStock: 15,
    sizes: ['120x80cm']
  }
];

export default function CreatorStore() {
  const [items] = useState<MerchItem[]>(STORE_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<{ [id: string]: string }>({
    'it-1': 'L',
    'it-2': 'L',
    'it-3': '900x400mm',
    'it-4': '60cm',
    'it-5': 'A3 Foil',
    'it-6': 'Standard',
    'it-7': 'Gloss 3K',
    'it-8': 'Ladder Pattern',
    'it-9': 'Whole Bean',
    'it-10': '120x80cm'
  });

  const categories = ['All', ...Array.from(new Set(STORE_ITEMS.map(i => i.category)))];
  const filteredItems = items.filter(i => selectedCategory === 'All' || i.category === selectedCategory);

  const handleBuyNow = (item: MerchItem) => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`🎉 Order Confirmed for "${item.name}" (Size: ${selectedSize[item.id]})! Settled ₹${item.price} via Instant UPI.`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Creator Merch Storefront</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Official Clan Jerseys, Hoodies & Hardware with Instant UPI</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Truck className="w-3.5 h-3.5 text-emerald-400" /> Free Express Shipping Across India
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border shrink-0",
                selectedCategory === c
                  ? "bg-primary text-primary-foreground border-primary glow-neon-primary font-bold shadow-md"
                  : "surface-1 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="surface-1 rounded-3xl p-5 border border-border/40 flex flex-col justify-between shadow-xl space-y-4 hover:border-primary/50 transition-all"
            >
              <div className="space-y-4">
                <div className="aspect-square rounded-2xl overflow-hidden relative group">
                  <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[0.65rem] font-mono font-bold text-amber-300">
                    Only {item.inStock} Left
                  </div>
                </div>

                <div>
                  <span className="text-[0.65rem] font-mono text-primary font-bold">{item.creator}</span>
                  <h3 className="font-display font-bold text-base text-foreground leading-snug mt-0.5">{item.name}</h3>
                  <div className="font-display font-black text-xl text-emerald-400 mt-2">
                    ₹{item.price.toLocaleString()} INR
                  </div>
                </div>

                {/* Size Selector */}
                <div>
                  <span className="text-[0.6rem] font-mono uppercase text-muted-foreground block mb-1.5">Select Size / Variant:</span>
                  <div className="flex gap-2">
                    {item.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          sounds.playPop();
                          setSelectedSize({ ...selectedSize, [item.id]: s });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all",
                          selectedSize[item.id] === s ? "border-primary bg-primary/20 text-primary shadow" : "border-border/40 hover:bg-muted/40"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => handleBuyNow(item)}
                  className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                >
                  <IndianRupee className="w-3.5 h-3.5 mr-1" /> Buy Now (₹{item.price})
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
