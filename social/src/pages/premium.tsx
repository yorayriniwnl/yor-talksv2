import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Sparkles, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, type PremiumBillingState, type PremiumOrder } from '@/lib/api-client';
import { loadRazorpayCheckout } from '@/lib/razorpay-checkout';

const benefits: Record<string, string> = {
  STORY_PRIVATE_VIEW: 'Optional private Story viewing', STORY_REWATCH_ANALYTICS: 'Story rewatch insights',
  STORY_VIEW_TIMESTAMPS: 'Identified Story viewer timestamps', STORY_PRIORITY: 'A capped Story ranking boost',
  EXTENDED_STORY: 'Stories lasting up to 72 hours', CUSTOM_STORY_AUDIENCE: 'Selected people and exclusions for Stories',
  SUPER_HEART: 'Super Heart reactions', DIRECT_HIGHLIGHT: 'Publish directly to Highlights',
  MESSAGE_UNREAD_PREVIEW: 'Preview unread messages without a read receipt', MESSAGE_FONT: 'Curated message styles',
  SIX_PINNED_POSTS: 'Up to six pinned posts', PROFILE_ONLY_POST: 'Posts published only to your profile',
  CUSTOM_BIO_FONT: 'Curated bio styles', STORY_FONT: 'Story typography controls', CUSTOM_APP_ICON: 'Yor web and PWA icon choices',
};
const pendingStates = ['provider_pending', 'creation_unknown', 'created'];
const money = (amount: number, currency: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount / 100);
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function Premium() {
  const [state, setState] = useState<PremiumBillingState | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const idempotencyKey = useRef(crypto.randomUUID());
  useEffect(() => {
    let active = true;
    api.getPremiumBilling().then(value => { if (active) { setState(value); setError(''); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Billing could not load'); });
    return () => { active = false; };
  }, [attempt]);

  const action = async (work: () => Promise<PremiumBillingState>, message: string) => {
    setBusy(true); setError(''); setNotice('');
    try { setState(await work()); setNotice(message); idempotencyKey.current = crypto.randomUUID(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Billing could not be updated. Try again.'); }
    finally { setBusy(false); }
  };
  const openCheckout = async (order: PremiumOrder) => {
    if (!order.providerOrderId) {
      setState(await api.getPremiumBilling());
      setNotice('The provider response is pending. Use Recover payment to check this order before starting another.');
      setBusy(false); return;
    }
    const Checkout = await loadRazorpayCheckout();
    const checkout = new Checkout({
      key: order.keyId, amount: order.amountMinor, currency: order.currency, order_id: order.providerOrderId,
      name: 'Yor Talks', description: `Yor Premium · ${order.plan.durationDays} days · no automatic renewal`,
      theme: { color: '#8b5cf6' },
      handler: (response: { razorpay_payment_id: string; razorpay_signature: string }) => void action(
        () => api.verifyPremiumOrder(order.id, { paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }),
        'Payment status refreshed. Your plan below shows confirmed access.',
      ),
      modal: { ondismiss: () => { setBusy(false); setAttempt(value => value + 1); setNotice('Checkout closed. Any completed payment can still be recovered below.'); } },
    });
    checkout.on?.('payment.failed', () => { setBusy(false); setError('Payment did not complete. Check the order below before trying again.'); setAttempt(value => value + 1); });
    checkout.open();
  };
  const purchase = async (existing?: PremiumOrder) => {
    const plan = state?.catalog.plan;
    if (!plan || (!existing && !accepted)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const order = existing ?? await api.createPremiumOrder({ idempotencyKey: idempotencyKey.current, acceptedTermsVersion: plan.termsVersion, acceptedPriceMinor: plan.priceMinor });
      setState(await api.getPremiumBilling());
      await openCheckout(order);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Checkout could not start. Recover any pending order before trying again.');
      setAttempt(value => value + 1); setBusy(false);
    }
  };
  const plan = state?.catalog.plan;
  const subscription = state?.subscription;
  const covered = subscription && ['active', 'cancelled'].includes(subscription.status) && new Date(subscription.ends_at).getTime() > Date.now();
  const pending = state?.orders.some(order => pendingStates.includes(order.status));
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 pb-28 sm:px-6">
    <section className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-background p-6 sm:p-9">
      <Sparkles className="mb-4 h-7 w-7 text-primary" aria-hidden="true" />
      <h1 className="font-display text-4xl font-black tracking-tight">Yor Premium</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">An optional plan for more expression and control. Your core social account stays free.</p>
      <p className="mt-3 text-sm">Posting, standard Stories and messages, basic privacy, blocking, reporting, export and account deletion are free.</p>
      <div className="mt-5 flex flex-wrap gap-4 text-sm"><Link className="underline underline-offset-4" href="/advanced">Explore each perk</Link><Link className="underline underline-offset-4" href="/settings">Privacy and account settings</Link></div>
    </section>
    {error && <div role="alert" className="rounded-2xl border border-destructive/30 p-4 text-sm"><p>{error}</p><Button variant="outline" className="mt-3" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Retry billing</Button></div>}
    {notice && <p role="status" className="rounded-2xl border border-border p-4 text-sm">{notice}</p>}
    {!state && !error && <p role="status">Loading your plan…</p>}
    {state && <>
      <section className="rounded-3xl border border-border bg-card p-6" aria-labelledby="current-plan">
        <h2 id="current-plan" className="font-display text-xl font-bold">Your plan</h2>
        <p className="mt-3 font-semibold">{covered ? 'Yor Premium' : 'Free account'}{subscription ? ` · ${subscription.status}` : ''}</p>
        {subscription && <p className="mt-2 text-sm text-muted-foreground">{covered ? 'Paid through' : 'Term ended'} {date(subscription.ends_at)}. No automatic renewal.</p>}
        {covered && !subscription.cancel_at_period_end && <Button variant="outline" className="mt-4" disabled={busy} onClick={() => void action(() => api.cancelPremiumOrder(subscription.order_id), 'Cancellation recorded. Premium stays available through the paid end date.')}>Cancel at end of term</Button>}
        {covered && subscription.cancel_at_period_end && <p className="mt-3 text-sm">Cancellation recorded. Your paid access remains until the date above.</p>}
        {!covered && Object.values(state.enabledFeatures).some(Boolean) && <p className="mt-3 text-sm">Your account has an authorized feature override. Its scope and expiry are independent of a paid plan.</p>}
        <p className="mt-4 text-sm text-muted-foreground">After expiry, new messages and Stories use standard typography. Existing content and its saved styling remain. New paid actions lock; your posts, drafts and conversations remain available. A refund ends access to the refunded term.</p>
        <p className="mt-2 text-sm text-muted-foreground">New Story views use the standard identified viewer list after private-view access expires. Previous private views keep their original privacy. Existing audiences and Highlights remain as published.</p>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6" aria-labelledby="premium-benefits">
        <h2 id="premium-benefits" className="font-display text-xl font-bold">Premium perks</h2>
        <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{Object.entries(benefits).map(([key, label]) => <li key={key} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{label}{state.catalog.operationalFeatures[key] === false && <span className="block text-muted-foreground">Temporarily unavailable</span>}</span></li>)}</ul>
        <p className="mt-4 text-sm text-muted-foreground">Creator memberships, tips and store purchases are billed separately and do not grant Yor Premium.</p>
      </section>
      <section className="rounded-3xl border border-primary/25 bg-card p-6" aria-labelledby="premium-purchase">
        <h2 id="premium-purchase" className="font-display text-xl font-bold">Price and terms</h2>
        {state.catalog.testMode && <p className="mt-3 font-semibold text-primary">Test checkout · no live payment</p>}
        {plan ? <>
          <p className="mt-3 text-2xl font-bold">{money(plan.priceMinor, plan.currency)} <span className="text-sm font-normal text-muted-foreground">for {plan.durationDays} days</span></p>
          <p className="mt-2 text-sm">One prepaid term. No automatic renewal. You can purchase again after expiry.</p>
          <p className="mt-3 whitespace-pre-wrap text-sm">{plan.refundPolicy}</p>
          <p className="mt-2 text-sm text-muted-foreground">Terms version: {plan.termsVersion}. Cancelling a paid term preserves access until it ends and does not initiate a refund. Contact support for a refund request.</p>
          {!covered && !pending && state.catalog.available && <><label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={accepted} onChange={event => setAccepted(event.target.checked)} />I accept the price, prepaid term and refund policy shown above.</label><Button className="mt-4 min-h-11" disabled={busy || !accepted} onClick={() => void purchase()}>Upgrade to Yor Premium</Button></>}
        </> : <p className="mt-3 text-sm">A purchase price has not been configured. Yor Premium checkout is unavailable.</p>}
        {!state.catalog.available && plan && <p className="mt-3 text-sm">New purchases are currently unavailable. You can still check existing orders.</p>}
        {pending && <p className="mt-3 text-sm">You have a pending checkout. Resume, recover or cancel it in billing history.</p>}
      </section>
      <section className="rounded-3xl border border-border bg-card p-6" aria-labelledby="billing-history">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="billing-history" className="font-display text-xl font-bold">Billing history</h2><Button variant="outline" disabled={busy} onClick={() => setAttempt(value => value + 1)}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Refresh status</Button></div>
        {!state.orders.length && <p className="mt-4 text-sm text-muted-foreground">No Premium orders yet.</p>}
        <ul className="mt-4 divide-y divide-border">{state.orders.map(order => <li key={order.id} className="space-y-2 py-4">
          <p className="font-semibold">{money(order.amountMinor, order.currency)} · {order.status.replaceAll('_', ' ')}</p><p className="text-sm text-muted-foreground">{date(order.createdAt)} · {order.plan.durationDays} days</p><p className="break-all text-xs text-muted-foreground">Order {order.id}</p>
          {order.lastPaymentStatus === 'failed' && <p className="text-sm">The last payment attempt failed. You can retry this checkout or cancel it.</p>}
          {order.status === 'refund_required' && <p className="text-sm">Payment was received after this order became unavailable. Access was not granted. Contact support with this order reference.</p>}
          {pendingStates.includes(order.status) && <div className="flex flex-wrap gap-2">
            {order.providerOrderId && <Button disabled={busy || !state.catalog.available} onClick={() => void purchase(order)}>Resume checkout</Button>}
            <Button variant="outline" disabled={busy} onClick={() => void action(() => api.recoverPremiumOrder(order.id), 'Order checked with the provider. Confirmed access appears in Your plan.')}>Recover payment</Button>
            <Button variant="ghost" disabled={busy} onClick={() => void action(() => api.cancelPremiumOrder(order.id), 'Pending checkout cancelled. Contact support if a payment was already taken.')}>Cancel checkout</Button>
          </div>}
        </li>)}</ul>
        {state.catalog.supportEmail && <a href={`mailto:${state.catalog.supportEmail}`} className="mt-5 inline-block text-sm underline underline-offset-4">Contact billing support</a>}
      </section>
    </>}
  </main>;
}
