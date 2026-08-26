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
import { Search, Heart, ShoppingBag, Plus, Tag, ArrowLeftRight, Sparkles, Shield, Check, Loader2, PackageCheck, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SteamTradeModal, USER_INVENTORY } from '@/components/steam/SteamTradeModal';
import { sounds } from '@/lib/sound';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

const PRODUCT_CATEGORIES = [
  'Hardware & Silicon',
  'Esports & Gaming Gear',
  'Modular Synth & Audio',
  '3D Art & Sculpture',
  'Techwear & Fashion',
  'Motorsports & Sim Rigs',
  'FPV Drones & Aero',
  'Bladesmithing & Watches',
  'Specialty Coffee & Tea',
  'Electronics',
  'Other'
];
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
        // Keep the client and API contract in sync with the two-decimal
        // currency column used by the marketplace.
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
        <Button className="rounded-2xl font-bold text-xs px-4 glow-neon-primary bg-primary shadow-md">
          <Plus className="w-4 h-4 mr-1.5" /> Sell Item
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl font-sans glass-heavy border border-border/60">
        <DialogHeader><DialogTitle className="font-display font-bold text-xl">Create a Marketplace Listing</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="product-title" className="text-xs font-mono uppercase text-muted-foreground">Title</Label>
            <Input id="product-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} placeholder="Ergonomic mechanical keyboard" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-description" className="text-xs font-mono uppercase text-muted-foreground">Description</Label>
            <Textarea id="product-description" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Condition, specs, pickup details…" className="rounded-xl resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-price" className="text-xs font-mono uppercase text-muted-foreground">Price (INR)</Label>
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
            <Button type="submit" disabled={loading || title.trim().length < 2 || !description.trim() || !price} className="rounded-xl font-bold text-xs px-6 bg-primary">
              {loading ? 'Listing…' : 'Post Listing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type RazorpayCheckout = new (options: Record<string, unknown>) => { open: () => void };

function loadRazorpayCheckout(): Promise<RazorpayCheckout> {
  const existing = (window as Window & { Razorpay?: RazorpayCheckout }).Razorpay;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
    const finish = () => {
      const checkout = (window as Window & { Razorpay?: RazorpayCheckout }).Razorpay;
      checkout ? resolve(checkout) : reject(new Error('Razorpay Checkout did not load'));
    };
    if (current) {
      current.addEventListener('load', finish, { once: true });
      current.addEventListener('error', () => reject(new Error('Razorpay Checkout could not load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = finish;
    script.onerror = () => reject(new Error('Razorpay Checkout could not load'));
    document.body.appendChild(script);
  });
}

function PurchaseProductDialog({ product, onCompleted }: { product: any; onCompleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const startPurchase = async () => {
    setPaying(true);
    setError('');
    try {
      const order = await api.createMarketplaceOrder(product.id, { shippingName, shippingAddress, ...(shippingPhone.trim() ? { shippingPhone: shippingPhone.trim() } : {}) });
      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountMinor,
        currency: order.currency,
        name: 'Yor Talks Marketplace',
        description: product.title,
        order_id: order.providerOrderId,
        theme: { color: '#8b5cf6' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await api.verifyMarketplacePayment(response.razorpay_order_id, { paymentId: response.razorpay_payment_id, signature: response.razorpay_signature });
            toast.success('Payment verified. The listing is now marked sold.');
            setOpen(false);
            onCompleted();
          } catch (verificationError) {
            const message = verificationError instanceof Error ? verificationError.message : 'Payment verification failed';
            setError(message);
            toast.error(message);
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      checkout.open();
    } catch (purchaseError) {
      const message = purchaseError instanceof Error ? purchaseError.message : 'Purchase could not be started';
      setError(message);
      toast.error(message);
      setPaying(false);
    }
  };

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" disabled={product.availability && product.availability !== 'active'} className="rounded-xl font-bold text-xs bg-primary">{product.availability === 'sold' ? 'Sold' : product.availability === 'reserved' ? 'Reserved' : 'Buy now'}</Button></DialogTrigger><DialogContent className="rounded-3xl font-sans glass-heavy border border-border/60"><DialogHeader><DialogTitle className="font-display font-bold text-xl">Buy {product.title}</DialogTitle></DialogHeader><div className="space-y-4"><p className="text-sm text-muted-foreground">Your payment is verified server-side before the listing is marked sold. Shipping details are shared with the seller for fulfillment.</p><div className="space-y-1.5"><Label htmlFor={`shipping-name-${product.id}`} className="text-xs font-mono uppercase text-muted-foreground">Recipient name</Label><Input id={`shipping-name-${product.id}`} value={shippingName} onChange={(event) => setShippingName(event.target.value)} className="rounded-xl" maxLength={100} /></div><div className="space-y-1.5"><Label htmlFor={`shipping-address-${product.id}`} className="text-xs font-mono uppercase text-muted-foreground">Shipping / pickup details</Label><Textarea id={`shipping-address-${product.id}`} value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} className="rounded-xl resize-none" maxLength={1000} /></div><div className="space-y-1.5"><Label htmlFor={`shipping-phone-${product.id}`} className="text-xs font-mono uppercase text-muted-foreground">Phone (optional)</Label><Input id={`shipping-phone-${product.id}`} value={shippingPhone} onChange={(event) => setShippingPhone(event.target.value)} className="rounded-xl" maxLength={24} /></div>{error && <p className="text-xs text-destructive rounded-xl border border-destructive/30 bg-destructive/10 p-3">{error}</p>}<Button onClick={() => void startPurchase()} disabled={paying || shippingName.trim().length < 2 || shippingAddress.trim().length < 5} className="w-full rounded-2xl font-bold h-11">{paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Waiting for payment…</> : <>Pay ₹{Number(product.price).toLocaleString('en-IN')}</>}</Button></div></DialogContent></Dialog>;
}

function OrderHistoryDialog({ orders, products, open, onOpenChange }: { orders: any[]; products: any[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-3xl font-sans glass-heavy border border-border/60 max-w-xl"><DialogHeader><DialogTitle className="font-display font-bold text-xl">Marketplace orders</DialogTitle></DialogHeader><div className="max-h-[60vh] overflow-y-auto space-y-3">{orders.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Your purchases and sales will appear here.</p> : orders.map((order) => { const product = products.find((item) => item.id === order.productId); return <div key={order.id} className="rounded-2xl border border-border/40 p-4 flex items-center justify-between gap-4"><div className="min-w-0"><p className="font-bold text-sm truncate">{product?.title ?? 'Marketplace item'}</p><p className="text-xs text-muted-foreground font-mono">{order.status} · {new Date(order.createdAt).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">Verified buyer / seller transaction</p></div><span className="font-display font-bold shrink-0">₹{(Number(order.amountMinor) / 100).toLocaleString('en-IN')}</span></div>; })}</div></DialogContent></Dialog>;
}

export default function Marketplace() {
  const products = useAppStore((s: any) => s.products || []);
  const users = useAppStore((s: any) => s.users || {});
  const loadProducts = useAppStore((s: any) => s.loadProducts);
  const loadUserProfile = useAppStore((s: any) => s.loadUserProfile);
  const toggleSaveProduct = useAppStore((s: any) => s.toggleSaveProduct);
  const currentUser = useAppStore((s: any) => s.currentUser);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);

  const [mode, setMode] = useState<'store' | 'inventory'>('store');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const refreshOrders = () => {
    if (!currentUser) return;
    void api.getMarketplaceOrders().then(setOrders).catch(() => setOrders([]));
  };
  useEffect(() => { refreshOrders(); }, [currentUser?.id]);

  useEffect(() => {
    for (const product of products) {
      if (!users[product.sellerId]) loadUserProfile(product.sellerId);
    }
  }, [products, users, loadUserProfile]);

  const categories: string[] = ['All', ...Array.from(new Set<string>(products.map((p: any) => String(p.category || 'Other'))))];
  const filtered = products.filter((p: any) =>
    (category === 'All' || p.category === category) &&
    (p.title || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Marketplace & Steam Inventory</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Buy, sell & peer-to-peer Steam trade</p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && <Button variant="outline" onClick={() => { refreshOrders(); setOrdersOpen(true); }} className="rounded-2xl font-bold text-xs"><ClipboardList className="w-4 h-4 mr-1.5" /> Orders</Button>}
          <SteamTradeModal />
          <CreateListingDialog />
        </div>
      </div>

      <OrderHistoryDialog orders={orders} products={products} open={ordersOpen} onOpenChange={setOrdersOpen} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Main Section Mode Tabs */}
        <div className="flex gap-2 mb-6 p-1.5 rounded-2xl surface-1 border border-border/40 w-fit">
          <button
            onClick={() => setMode('store')}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              mode === 'store' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Goods Marketplace
          </button>
          <button
            onClick={() => setMode('inventory')}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              mode === 'inventory' ? "bg-emerald-600 text-white shadow-md" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Steam Inventory ({USER_INVENTORY.length})
          </button>
        </div>

        {mode === 'inventory' ? (
          /* Steam Inventory View */
          <div className="space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  🎒 Your Steam Inventory
                  <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    6 Verified Skins
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">CS2 & Dota 2 High-Tier Collectibles with Float Metrics</p>
              </div>

              <SteamTradeModal
                trigger={
                  <Button className="rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary px-6 h-11">
                    <ArrowLeftRight className="w-4 h-4 mr-1.5" /> Launch Steam Trade Window
                  </Button>
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {USER_INVENTORY.map((item) => (
                <div
                  key={item.id}
                  className="surface-1 rounded-3xl overflow-hidden border border-border/40 hover:border-emerald-500/50 transition-all duration-300 flex flex-col shadow-sm group p-4"
                >
                  <div className="aspect-video relative rounded-2xl bg-black/60 overflow-hidden mb-4">
                    <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.name} />
                    {item.floatVal && (
                      <span className="absolute bottom-2 left-2 text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-black/70 text-zinc-300 border border-white/10">
                        Float: {item.floatVal}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <span className={cn("text-[0.62rem] font-mono font-bold uppercase block mb-1", item.rarityColor)}>
                        {item.rarity} · {item.game}
                      </span>
                      <h4 className="font-display font-bold text-sm text-foreground line-clamp-1 leading-tight">{item.name}</h4>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-3 border-t border-border/30">
                      <span className="font-mono font-bold text-emerald-400 text-base">${item.price.toFixed(2)}</span>
                      <SteamTradeModal
                        trigger={
                          <Button size="sm" variant="outline" className="rounded-xl font-bold text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                            Trade Skin
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Goods Marketplace View */
          <>
            {/* Search & Category Pills */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="Search products & goods…" 
                  className="pl-10 rounded-2xl surface-1 border-border/40 h-11 text-sm" 
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
              {filtered.map((product: any) => {
                const seller = users[product.sellerId];
                const isSaved = product.savedByMe;
                
                return (
                  <motion.div
                    variants={staggerItem}
                    key={product.id}
                    className="surface-1 rounded-3xl overflow-hidden group cursor-pointer border border-border/40 hover:border-primary/40 transition-all duration-300 flex flex-col shadow-sm"
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
                        ₹{Number(product.price).toLocaleString('en-IN')}
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
                        <div className="flex items-center gap-2"><span className="text-[0.62rem] uppercase font-bold tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{product.condition.replace('-', ' ')}</span>{currentUser?.id !== product.sellerId && <PurchaseProductDialog product={product} onCompleted={() => { void loadProducts(); refreshOrders(); }} />}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
