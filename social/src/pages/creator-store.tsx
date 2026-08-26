import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, PackageCheck, Search, ShoppingBag, ShieldCheck } from 'lucide-react';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { useAppStore, type Product } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

function PurchaseDialog({ product, onCompleted }: { product: Product; onCompleted: () => void }) {
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
      const order = await api.createMarketplaceOrder(product.id, {
        shippingName: shippingName.trim(),
        shippingAddress: shippingAddress.trim(),
        ...(shippingPhone.trim() ? { shippingPhone: shippingPhone.trim() } : {}),
      });
      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountMinor,
        currency: order.currency,
        name: 'Yor Talks Creator Store',
        description: product.title,
        order_id: order.providerOrderId,
        theme: { color: '#8b5cf6' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await api.verifyMarketplacePayment(response.razorpay_order_id, {
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            toast.success('Payment verified. Your order is confirmed.');
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" disabled={product.availability !== 'active'} onClick={() => setOpen(true)} className="rounded-xl text-xs font-bold">
        {product.availability === 'sold' ? 'Sold' : product.availability === 'reserved' ? 'Reserved' : 'Buy securely'}
      </Button>
      <DialogContent className="rounded-3xl border border-border/60 glass-heavy">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Buy {product.title}</DialogTitle>
          <DialogDescription>Payment is verified on the server before this listing becomes sold. Shipping details are shared with the seller only for fulfillment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor={`store-shipping-name-${product.id}`}>Recipient name</Label><Input id={`store-shipping-name-${product.id}`} value={shippingName} onChange={(event) => setShippingName(event.target.value)} maxLength={100} className="rounded-xl" /></div>
          <div className="space-y-1.5"><Label htmlFor={`store-shipping-address-${product.id}`}>Shipping / pickup details</Label><textarea id={`store-shipping-address-${product.id}`} value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} maxLength={1000} className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" /></div>
          <div className="space-y-1.5"><Label htmlFor={`store-shipping-phone-${product.id}`}>Phone (optional)</Label><Input id={`store-shipping-phone-${product.id}`} value={shippingPhone} onChange={(event) => setShippingPhone(event.target.value)} maxLength={24} className="rounded-xl" /></div>
          {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
          <Button onClick={() => void startPurchase()} disabled={paying || shippingName.trim().length < 2 || shippingAddress.trim().length < 5} className="h-11 w-full rounded-2xl font-bold">
            {paying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Waiting for payment…</> : <>Pay ₹{Number(product.price).toLocaleString('en-IN')}</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CreatorStore() {
  const products = useAppStore((state) => state.products);
  const users = useAppStore((state) => state.users);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const loadUserProfile = useAppStore((state) => state.loadUserProfile);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadProducts().finally(() => setLoading(false));
  }, [loadProducts]);

  useEffect(() => {
    products.forEach((product) => {
      if (!users[product.sellerId]) void loadUserProfile(product.sellerId);
    });
  }, [loadUserProfile, products, users]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((product) => product.category)))], [products]);
  const filtered = useMemo(() => products.filter((product) => {
    const text = `${product.title} ${product.description} ${product.category}`.toLowerCase();
    return (category === 'All' || product.category === category) && text.includes(query.toLowerCase());
  }), [category, products, query]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24 font-sans">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/40 bg-background/80 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-md"><ShoppingBag className="h-5 w-5" /></div><div className="min-w-0"><h1 className="truncate font-display text-xl font-bold">Yor Talks Creator Store</h1><p className="truncate text-[0.68rem] text-muted-foreground">Real creator listings with verified checkout and fulfillment records.</p></div></div>
          <a href="/marketplace" className="hidden shrink-0 sm:block"><Button variant="outline" className="rounded-2xl text-xs font-bold"><ExternalLink className="mr-1.5 h-4 w-4" />Manage listings</Button></a>
        </div>

        <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
          <div className="grid gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-5 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><ShieldCheck className="h-4 w-4" /> Verified commerce</div><h2 className="mt-2 font-display text-2xl font-black">Buy from people building the world.</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Every order reserves inventory, verifies payment server-side, and records the seller settlement. No demo purchases, fake stock, or client-only confirmations.</p></div><div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-background/60 px-4 py-3 text-xs font-semibold text-muted-foreground"><PackageCheck className="h-4 w-4 text-emerald-400" /> INR checkout</div></div>

          <div className="flex flex-col gap-3 sm:flex-row"><div className="relative max-w-md flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search creator goods…" className="rounded-2xl pl-10" /></div><div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={cn('whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all', category === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border/50 text-muted-foreground hover:text-foreground')}>{item}</button>)}</div></div>

          {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-border/50 px-6 py-16 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/40" /><h3 className="mt-3 font-display text-lg font-bold">No live listings yet</h3><p className="mt-1 text-sm text-muted-foreground">Creators can publish a listing from the marketplace manager.</p><a href="/marketplace" className="mt-4 inline-block"><Button variant="outline" className="rounded-xl text-xs font-bold">Open marketplace</Button></a></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product) => { const seller = users[product.sellerId]; const image = product.images[0] || `https://picsum.photos/seed/${encodeURIComponent(product.id)}/800/800`; return <article key={product.id} className="surface-1 flex flex-col overflow-hidden rounded-3xl border border-border/40 shadow-xl transition-all hover:border-primary/50"><div className="aspect-square overflow-hidden bg-muted/30"><img src={image} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" /></div><div className="flex flex-1 flex-col gap-4 p-5"><div className="min-w-0"><p className="text-[0.65rem] font-mono font-bold uppercase tracking-[0.14em] text-primary">{product.category}</p><h3 className="mt-1 line-clamp-2 font-display text-lg font-bold">{product.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{product.description}</p></div><div className="mt-auto flex items-end justify-between gap-3 border-t border-border/30 pt-4"><div><p className="text-[0.62rem] text-muted-foreground">Seller</p><p className="max-w-36 truncate text-xs font-bold">{seller?.displayName || seller?.username || 'Yor creator'}</p><p className="mt-1 text-lg font-black text-emerald-400">₹{Number(product.price).toLocaleString('en-IN')}</p></div><PurchaseDialog product={product} onCompleted={() => void loadProducts()} /></div></div></article>; })}</div>}
        </div>
      </div>
    </PageTransition>
  );
}
