import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Crown, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api, type BackendSubscription, type BackendSubscriptionTier, type BackendUser } from '@/lib/api-client';
import { publicBetaConfig } from '@/lib/public-beta-config';

interface FanTier {
  id: BackendSubscriptionTier['id'];
  name: string;
  price: number;
  badge: string;
  color: string;
  perks: string[];
  popular?: boolean;
}

const FALLBACK_TIERS: FanTier[] = [
  { id: 'chai', name: 'Desi Chai Club', price: 49, badge: '☕', color: 'from-amber-500 to-orange-500', perks: ['Custom member badge', 'Members-only posts', 'VIP live chat'] },
  { id: 'elite', name: 'Squad Elite Warrior', price: 199, badge: '⚡', color: 'from-cyan-500 to-blue-600', popular: true, perks: ['Everything in Chai Club', 'Early access to creator drops', 'Vote on creator content'] },
  { id: 'vip', name: 'Maha Maharaja VIP', price: 999, badge: '👑', color: 'from-purple-500 to-pink-600', perks: ['Everything in Elite Warrior', 'Priority community access', 'Monthly creator session'] },
];

function mergeTiers(remote: BackendSubscriptionTier[]): FanTier[] {
  return remote.map((tier, index) => ({
    id: tier.id,
    name: tier.name,
    price: tier.priceMinor / 100,
    badge: tier.badge,
    color: FALLBACK_TIERS[index]?.color ?? 'from-violet-500 to-fuchsia-500',
    perks: tier.perks,
    popular: tier.id === 'elite',
  }));
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

export default function FanClubSubscriptions() {
  const [location] = useLocation();
  const creatorId = new URLSearchParams(location.split('?')[1] ?? '').get('creatorId') ?? '';
  const [creator, setCreator] = useState<BackendUser | null>(null);
  const [tiers, setTiers] = useState<FanTier[]>(FALLBACK_TIERS);
  const [subscriptions, setSubscriptions] = useState<BackendSubscription[]>([]);
  const [payingTier, setPayingTier] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!creatorId) {
      setCreator(null);
      return;
    }
    void Promise.all([
      api.getProfile(creatorId).then(setCreator),
      api.getSubscriptionTiers(creatorId).then((remote) => setTiers(mergeTiers(remote))).catch(() => setTiers(FALLBACK_TIERS)),
      api.getMySubscriptions().then(setSubscriptions).catch(() => setSubscriptions([])),
    ]);
  }, [creatorId]);

  const activeMembership = subscriptions.find((subscription) => subscription.creatorId === creatorId && subscription.status === 'active' && (!subscription.expiresAt || new Date(subscription.expiresAt) > new Date()));

  const handleSubscribe = async (tier: FanTier) => {
    if (!publicBetaConfig.paymentsEnabled) {
      toast.info('Membership payments are not enabled for this public beta.');
      return;
    }
    if (!creatorId) {
      toast.info('Open a creator profile and choose Fan Club to subscribe.');
      return;
    }
    setPayingTier(tier.id);
    setError('');
    try {
      const order = await api.createSubscriptionOrder({ creatorId, tier: tier.id });
      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountMinor,
        currency: order.currency,
        name: 'Yor Talks',
        description: `${tier.name} membership`,
        order_id: order.orderId,
        theme: { color: '#8b5cf6' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await api.verifySubscriptionPayment(order.subscriptionId, {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            toast.success('Membership activated for 30 days');
            setSubscriptions(await api.getMySubscriptions());
          } catch (verificationError) {
            const message = verificationError instanceof Error ? verificationError.message : 'Membership payment verification failed';
            setError(message);
            toast.error(message);
          } finally {
            setPayingTier(null);
          }
        },
        modal: { ondismiss: () => setPayingTier(null) },
      });
      checkout.open();
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : 'Membership payment could not be started';
      setError(message);
      toast.error(message);
      setPayingTier(null);
    }
  };

  const cancelMembership = async () => {
    if (!activeMembership) return;
    try {
      await api.cancelSubscription(activeMembership.id);
      setSubscriptions(await api.getMySubscriptions());
      toast.success('Membership cancelled');
    } catch (cancelError) {
      toast.error(cancelError instanceof Error ? cancelError.message : 'Membership could not be cancelled');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary shrink-0"><Crown className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold font-display text-foreground truncate">{creator ? `${creator.fullName || creator.username}'s Fan Club` : 'Creator Fan Clubs'}</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Verified 30-day memberships • no silent autopay</p>
          </div>
        </div>
        <div className="level-badge shadow-sm shrink-0"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {creatorId ? 'Razorpay verified' : 'Creator not selected'}</div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {!creatorId && <div className="surface-1 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm">Open a creator profile and choose Fan Club to select who you want to support. Membership access is granted only after the payment provider confirms a captured payment.</div>}
        {!publicBetaConfig.paymentsEnabled && <div className="surface-1 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-100">Membership checkout is paused for this beta while payment settlement and support operations are completed.</div>}
        {error && <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
        {activeMembership && <div className="surface-1 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-mono uppercase text-emerald-300">Active membership</p><p className="font-display font-bold">{activeMembership.tier} · valid until {new Date(activeMembership.expiresAt ?? '').toLocaleDateString()}</p></div><Button variant="outline" onClick={() => void cancelMembership()} className="rounded-xl text-xs font-bold">Cancel membership</Button></div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {tiers.map((tier) => <div key={tier.id} className={cn('surface-1 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between shadow-xl relative transition-all border-border/40', tier.popular && 'border-primary ring-2 ring-primary/30')}>
            {tier.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[0.65rem] font-mono font-bold bg-primary text-primary-foreground uppercase shadow-md">MOST POPULAR</span>}
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-tr text-2xl flex items-center justify-center shadow-md', tier.color)}>{tier.badge}</div><div className="text-right"><span className="text-xs font-mono text-muted-foreground">30-day pass</span><div className="font-display font-black text-2xl">₹{tier.price}</div></div></div>
              <div><h3 className="font-display font-bold text-lg">{tier.name}</h3><p className="text-xs text-muted-foreground font-mono mt-0.5">Cancel before the next purchase anytime</p></div>
              <ul className="space-y-2.5 pt-4 border-t border-border/30 text-xs"><li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /><span>Access is granted only after server verification</span></li>{tier.perks.map((perk) => <li key={perk} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /><span>{perk}</span></li>)}</ul>
            </div>
            <div className="pt-6"><Button onClick={() => void handleSubscribe(tier)} disabled={!publicBetaConfig.paymentsEnabled || Boolean(payingTier) || Boolean(activeMembership) || !creatorId} className={cn('w-full rounded-2xl font-bold text-xs h-11 shadow-lg', tier.popular ? 'bg-primary text-primary-foreground glow-neon-primary' : 'bg-muted/40 hover:bg-muted text-foreground')}>{payingTier === tier.id ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Waiting for payment…</> : activeMembership ? 'Membership active' : !publicBetaConfig.paymentsEnabled ? 'Payments paused' : creatorId ? `Join for ₹${tier.price}` : 'Select a creator first'}</Button></div>
          </div>)}
        </div>
      </div>
    </div>
  );
}
