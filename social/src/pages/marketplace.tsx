import { useParams, useLocation } from 'wouter';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bookmark, ArrowLeft, MessageCircle, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function ProductDetail({ productId }: { productId: string }) {
  const [, setLocation] = useLocation();
  const products = useAppStore((s) => s.products);
  const users = useAppStore((s) => s.users);
  const toggleSaveProduct = useAppStore((s) => s.toggleSaveProduct);
  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <p>This listing is no longer available.</p>
        <Button variant="secondary" className="mt-4 rounded-full" onClick={() => setLocation('/marketplace')}>Back to Marketplace</Button>
      </div>
    );
  }

  const seller = users[product.sellerId];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => setLocation('/marketplace')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
          <img src={product.images[0]} className="w-full h-full object-cover" alt="" />
        </div>

        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{product.category} · {product.condition.replace('-', ' ')}</span>
          <h1 className="font-display font-bold text-2xl mt-2 mb-1">{product.title}</h1>
          <p className="text-3xl font-display font-bold text-primary mb-6">${product.price.toLocaleString()}</p>

          <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>

          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-muted/40">
            <Avatar className="w-10 h-10">
              <AvatarImage src={seller?.avatarUrl} />
              <AvatarFallback>{seller?.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{seller?.displayName}</p>
              <p className="text-xs text-muted-foreground">Listed {formatDistanceToNow(new Date(product.createdAt), { addSuffix: true })}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1 rounded-full h-11 gap-2">
              <MessageCircle className="w-4 h-4" /> Message Seller
            </Button>
            <Button variant="outline" size="icon" className="rounded-full h-11 w-11" onClick={() => toggleSaveProduct(product.id)}>
              <Bookmark className={`w-4 h-4 ${product.savedByMe ? 'fill-current text-primary' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const products = useAppStore((s) => s.products);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  if (params.id) {
    return <ProductDetail productId={params.id} />;
  }

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = products.filter(p =>
    (category === 'All' || p.category === category) &&
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl">Marketplace</h1>
          <p className="text-muted-foreground mt-1">Buy and sell within your community.</p>
        </div>
        <Button className="rounded-full">Sell an Item</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search listings" className="pl-10 rounded-full bg-muted/50 border-none h-11" />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium shrink-0 transition-colors ${category === c ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setLocation(`/marketplace/${product.id}`)}
            className="rounded-2xl overflow-hidden border border-border/50 bg-card cursor-pointer group"
          >
            <div className="aspect-square bg-muted relative overflow-hidden">
              <img src={product.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
              <span className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur text-white text-[10px] font-medium px-2 py-1 rounded-full">
                <Tag className="w-3 h-3" /> {product.condition.replace('-', ' ')}
              </span>
            </div>
            <div className="p-3">
              <p className="font-display font-bold text-lg">${product.price.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground truncate">{product.title}</p>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">No listings match your search.</div>
        )}
      </div>
    </div>
  );
}
