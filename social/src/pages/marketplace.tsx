import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Search, Heart, ShoppingBag, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_CATEGORIES = ['Furniture', 'Electronics', 'Clothing', 'Books', 'Other'];
const PRODUCT_CONDITIONS = ['new', 'like-new', 'used'] as const;

function CreateListingDialog() {
  const createProduct = useAppStore((s) => s.createProduct);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [condition, setCondition] = useState<typeof PRODUCT_CONDITIONS[number]>('used');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createProduct({
        title: title.trim(),
        description: description.trim(),
        price: Math.round(Number(price) * 100) / 100,
        images: [`https://picsum.photos/seed/${encodeURIComponent(title)}/500/500`],
        category,
        condition,
      });
      setOpen(false);
      setTitle(''); setDescription(''); setPrice('');
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold text-xs px-4 glow-neon-primary bg-primary"><Plus className="w-4 h-4 mr-1.5" /> Sell Item</Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl font-sans">
        <DialogHeader><DialogTitle className="font-display font-bold text-xl">Create a listing</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="product-title" className="text-xs font-mono uppercase text-muted-foreground">Title</Label>
            <Input id="product-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} placeholder="Vintage armchair" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-description" className="text-xs font-mono uppercase text-muted-foreground">Description</Label>
            <Textarea id="product-description" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Condition, pickup details, etc." className="rounded-xl resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-price" className="text-xs font-mono uppercase text-muted-foreground">Price (USD)</Label>
              <Input id="product-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="45.00" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-condition" className="text-xs font-mono uppercase text-muted-foreground">Condition</Label>
              <select id="product-condition" value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium">
                {PRODUCT_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-category" className="text-xs font-mono uppercase text-muted-foreground">Category</Label>
            <select id="product-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium">
              {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || title.trim().length < 2 || !description.trim() || !price} className="rounded-xl font-bold text-xs px-6">
              {loading ? 'Listing…' : 'Post Listing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Marketplace() {
  const products = useAppStore((s) => s.products);
  const users = useAppStore((s) => s.users);
  const loadProducts = useAppStore((s) => s.loadProducts);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);
  const toggleSaveProduct = useAppStore((s) => s.toggleSaveProduct);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    for (const product of products) {
      if (!users[product.sellerId]) loadUserProfile(product.sellerId);
    }
  }, [products, users, loadUserProfile]);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = products.filter(p =>
    (category === 'All' || p.category === category) &&
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Community Marketplace</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Buy and sell within your network</p>
        </div>
        <CreateListingDialog />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Search & Category Pills */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Search listings..." 
              className="pl-10 rounded-xl surface-1 border-border/40 h-11 text-sm" 
            />
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 items-center">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all",
                  category === c ? "bg-primary text-primary-foreground glow-neon-primary" : "surface-1 text-muted-foreground hover:bg-muted"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 rounded-3xl border border-dashed border-border/50 surface-1">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="font-display font-bold text-lg mb-1">No listings found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Try adjusting your search query or category filter.</p>
          </div>
        )}

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filtered.map((product) => {
            const seller = users[product.sellerId];
            const isSaved = product.savedByMe;
            
            return (
              <motion.div
                variants={staggerItem}
                key={product.id}
                className="surface-1 rounded-2xl overflow-hidden group cursor-pointer border border-border/40 hover:border-primary/40 transition-all duration-300 flex flex-col"
              >
                <div className="aspect-square relative bg-muted overflow-hidden">
                  <img src={product.images[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={product.title} />
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSaveProduct && toggleSaveProduct(product.id); }} 
                    className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors z-10"
                  >
                    <Heart className={cn("w-4 h-4", isSaved && "fill-current text-rose-500")} />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white font-display font-bold text-sm px-2.5 py-1 rounded-lg">
                    ${product.price.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <h3 className="font-display font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors mb-2">{product.title}</h3>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={seller?.avatarUrl} />
                        <AvatarFallback>{(seller?.displayName ?? '?').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">{seller?.displayName ?? 'Unknown'}</span>
                    </div>
                    <span className="text-[0.62rem] uppercase font-bold tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                      {product.condition.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
