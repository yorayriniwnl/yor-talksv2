import { useState, useEffect } from 'react';
import { Building2, ExternalLink, HandCoins, PackageCheck, Plus, ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { PageTransition } from '@/components/ui/PageTransition';

interface Business {
  id: string;
  name: string;
  industry: string;
  role: string;
  isVerified: boolean;
}

export default function BusinessDashboard() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products, setProducts] = useState<Array<{ sellerId: string; availability?: string }>>([]);
  const [orders, setOrders] = useState<Array<{ sellerId: string; status: string; amountMinor: number }>>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');

  useEffect(() => {
    void fetchDashboard();
  }, [currentUser?.id]);

  const fetchDashboard = async () => {
    try {
      const [businessResponse, productResponse, orderResponse] = await Promise.all([
        api.request<{ businesses: Business[] }>('/business'),
        api.getProducts(),
        api.getMarketplaceOrders(),
      ]);
      setBusinesses(businessResponse?.businesses ?? []);
      setProducts(productResponse.map((product) => ({ sellerId: product.sellerId, availability: product.availability })));
      setOrders(orderResponse.map((order) => ({ sellerId: order.sellerId, status: order.status, amountMinor: order.amountMinor })));
    } catch (e) {
      toast.error('Failed to load business workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.request('/business', {
        method: 'POST',
        body: JSON.stringify({ name, industry })
      });
      toast.success('Business Profile Created!');
      setIsCreating(false);
      setName('');
      setIndustry('');
      void fetchDashboard();
    } catch (e) {
      toast.error('Failed to create business profile');
    }
  };

  if (loading) return null;

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto p-4 md:p-8 pt-24 space-y-8">
        
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black font-display uppercase tracking-wider flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Enterprise Hub
            </h1>
            <p className="text-muted-foreground mt-2">Manage your Yor Talks businesses, agencies, and brands.</p>
          </div>
          
          <Button onClick={() => setIsCreating(true)} className="rounded-xl font-bold bg-white text-black hover:bg-white/90">
            <Plus className="w-4 h-4 mr-2" /> New Business
          </Button>
        </header>

        {isCreating && (
          <div className="surface-2 rounded-3xl p-6 border border-border/40 space-y-4">
            <h3 className="font-bold text-lg">Create a Business Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Business Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Corp" className="h-12 rounded-xl bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Industry</label>
                <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Retail, Agency, Tech" className="h-12 rounded-xl bg-background" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-primary text-black font-bold">Launch Profile</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses.map((biz) => (
            <div key={biz.id} className="surface-1 rounded-3xl p-6 border border-border/40 relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl font-display tracking-tight flex items-center gap-2">
                      {biz.name}
                      {biz.isVerified && <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] uppercase font-bold tracking-wider">Verified</span>}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">{biz.industry} • Role: <span className="text-primary">{biz.role}</span></p>
                  </div>
                </div>
              </div>

              {(() => {
                const ownedProducts = products.filter((product) => product.sellerId === currentUser?.id);
                const ownedOrders = orders.filter((order) => order.sellerId === currentUser?.id && ['paid', 'fulfilled'].includes(order.status));
                const revenueMinor = ownedOrders.reduce((total, order) => total + Number(order.amountMinor || 0), 0);
                return <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="bg-background rounded-xl p-3 border border-border/40">
                  <HandCoins className="w-4 h-4 text-emerald-400 mb-2" />
                  <div className="text-lg font-bold font-mono">₹{(revenueMinor / 100).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Settled revenue</div>
                </div>
                <div className="bg-background rounded-xl p-3 border border-border/40">
                  <Store className="w-4 h-4 text-purple-400 mb-2" />
                  <div className="text-lg font-bold font-mono">{ownedProducts.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Live listings</div>
                </div>
                <div className="bg-background rounded-xl p-3 border border-border/40">
                  <PackageCheck className="w-4 h-4 text-blue-400 mb-2" />
                  <div className="text-lg font-bold font-mono">{ownedOrders.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Paid orders</div>
                </div>
              </div>;
              })()}

              <div className="mt-6 flex flex-wrap gap-2 border-t border-border/30 pt-5">
                <a href="/marketplace"><Button size="sm" variant="outline" className="rounded-xl text-xs font-bold"><ShoppingBag className="mr-1.5 h-3.5 w-3.5" />Publish listing</Button></a>
                <a href="/store"><Button size="sm" variant="outline" className="rounded-xl text-xs font-bold"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />View storefront</Button></a>
              </div>
            </div>
          ))}
          
          {businesses.length === 0 && !isCreating && (
            <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border/60 rounded-3xl">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>You haven't established any businesses yet.</p>
              <Button variant="link" onClick={() => setIsCreating(true)} className="text-primary">Create your first Enterprise</Button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
