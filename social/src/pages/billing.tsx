import { publicBetaConfig } from '@/lib/public-beta-config';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { api, type CheckoutState } from '@/lib/api-client';
import { loadRazorpayCheckout } from '@/lib/razorpay-checkout';

const pending = new Set(['created', 'provider_pending', 'creation_unknown']);
const labels = { tip: 'Creator tip', membership: 'Creator membership', marketplace: 'Marketplace purchase' };
export default function Billing() {
  const [items, setItems] = useState<CheckoutState[]>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false; setLoading(true); setError('');
    api.getCheckouts().then(value => { if (!Array.isArray(value)) throw new Error('Invalid history'); if (!disposed) setItems(value); })
      .catch(() => { if (!disposed) setError('Payment history could not load. Please retry.'); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [attempt]);
  const run = async (id: string, action: 'recover' | 'cancel') => {
    setBusy(id); setError('');
    try { setItems(await (action === 'recover' ? api.recoverCheckout(id) : api.cancelCheckout(id))); }
    catch (e) { setError(e instanceof Error ? e.message : 'Payment status could not be updated. Retry later.'); }
    finally { setBusy(''); }
  };
  const resume = async (item: CheckoutState) => {
    setBusy(item.checkoutId); setError('');
    try {
      // Recheck before offering payment; recovery also settles any captured payment.
      const current = await api.recoverCheckout(item.checkoutId); setItems(current);
      const order = current.find(value => value.checkoutId === item.checkoutId);
      if (!order || order.status !== 'created' || !order.providerOrderId) { setBusy(''); return; }
      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({ key: order.keyId, amount: order.amountMinor, currency: order.currency,
        order_id: order.providerOrderId, name: 'Yor Talks', description: labels[order.product], theme: { color: '#8b5cf6' },
        handler: () => void run(order.checkoutId, 'recover'), modal: { ondismiss: () => setBusy('') } });
      checkout.on?.('payment.failed', () => { setBusy(''); setError('Payment attempt failed. You can retry this saved checkout.'); });
      checkout.open();
    } catch (e) { setBusy(''); setError(e instanceof Error ? e.message : 'Checkout could not open.'); }
  };
  return <main className="mx-auto max-w-3xl px-4 py-8 pb-28 space-y-6">
    <div><h1 className="text-3xl font-display font-bold">Payment history</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your latest 50 creator tips, memberships and marketplace checkouts. Payments are checked again even when you close checkout.</p>
      <Link href="/premium" className="inline-block mt-3 text-primary underline">Yor Premium plans and billing</Link></div>
    <p className="rounded-2xl border border-border/50 p-4 text-sm text-muted-foreground">Creator memberships are prepaid for 30 days, with no automatic renewal. Cancelling an active membership keeps it valid until expiry. Cancelling a pending checkout stops fulfilment; a late payment will require refund review. Refunds and disputes may remove access.</p>
    {error && <div role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm">{error} <Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Retry history</Button></div>}
    {loading ? <p role="status">Loading payment history…</p> : !items.length && !error ? <p>No creator payments yet.</p> : items.map(item => <article key={item.checkoutId} aria-label={`${labels[item.product]} ${item.status.replaceAll('_',' ')}`} className="rounded-2xl surface-1 border border-border/60 p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{labels[item.product]}</h2><span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: item.currency }).format(item.amountMinor / 100)}</span></div>
      {item.lastPaymentStatus === 'failed' && <p className="text-sm">The last payment attempt failed. You can retry this saved checkout.</p>}
      <p className="text-sm">Status: <strong>{item.status.replaceAll('_',' ')}</strong></p>
      <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · Reference <span className="break-all">{item.checkoutId}</span></p>
      {item.status === 'refund_required' && <p className="text-sm">This payment could not be fulfilled. Keep this reference when contacting support for a refund review.</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={Boolean(busy)} onClick={() => void run(item.checkoutId, 'recover')}>{busy === item.checkoutId ? 'Checking…' : 'Recover payment status'}</Button>
        {item.providerOrderId && item.status === 'created' && <Button disabled={Boolean(busy)} onClick={() => void resume(item)}>Continue payment</Button>}
        {(pending.has(item.status) || item.product === 'membership' && item.status === 'paid') && <Button variant="outline" disabled={Boolean(busy)} onClick={() => void run(item.checkoutId, 'cancel')}>{item.status === 'paid' ? 'End membership at expiry' : 'Cancel pending checkout'}</Button>}
      </div>
    </article>)}
    <a href={publicBetaConfig.supportEmail ? `mailto:${publicBetaConfig.supportEmail}` : "/terms"} className="text-primary underline">Payment support and terms</a>
  </main>;
}
