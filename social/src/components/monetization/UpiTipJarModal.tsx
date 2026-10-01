import { loadRazorpayCheckout } from '@/lib/razorpay-checkout';
import { useRef, useState, type ReactNode } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { publicBetaConfig } from '@/lib/public-beta-config';

interface UpiTipJarModalProps {
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    upiId?: string;
  };
  trigger?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  streamId?: string;
}


export function UpiTipJarModal({ creator, trigger, isOpen, onOpenChange, streamId }: UpiTipJarModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;
  const displayName = creator.displayName || creator.username || 'Creator';
  const [amountMinor, setAmountMinor] = useState(1000);
  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const checkoutKey = useRef(crypto.randomUUID());

  const startPayment = async () => {
    if (!publicBetaConfig.paymentsEnabled) {
      toast.info('Payments are not enabled for this public beta.');
      return;
    }
    setPaying(true);
    setError('');
    try {
      const order = await api.createTipOrder({ idempotencyKey: checkoutKey.current, creatorId: creator.id, streamId, amountMinor, message });
      if (!order.providerOrderId || order.status !== 'created') throw new Error('This checkout is saved. Open payment history to recover or cancel it before starting another payment.');
      const Razorpay = await loadRazorpayCheckout();
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountMinor,
        currency: order.currency,
        name: 'Yor Talks',
        description: `Tip for ${displayName}`,
        order_id: order.orderId,
        theme: { color: '#8b5cf6' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const result = await api.verifyTipPayment(response.razorpay_order_id, {
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (result.status !== 'paid') throw new Error('Payment needs review. See payment history for its current status.');
            checkoutKey.current = crypto.randomUUID();
            toast.success('Tip payment verified');
            setOpen(false);
          } catch (verificationError) {
            const verificationMessage = verificationError instanceof Error ? verificationError.message : 'Payment verification failed';
            setError(verificationMessage);
            toast.error(verificationMessage);
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      checkout.on?.('payment.failed', () => { setError('Payment attempt failed. You can retry the same checkout or recover it in payment history.'); setPaying(false); });
      checkout.open();
    } catch (paymentError) {
      const paymentMessage = paymentError instanceof Error ? paymentError.message : 'Payment could not be started';
      setError(paymentMessage);
      toast.error(paymentMessage);
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[440px] rounded-3xl font-sans glass-heavy border border-amber-500/30 p-6">
        <DialogHeader className="text-center flex flex-col items-center">
          <Avatar className="w-16 h-16 border-2 border-primary shadow-xl ring-4 ring-primary/20">
            <AvatarImage src={creator.avatarUrl} />
            <AvatarFallback className="font-display font-black text-xl">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <DialogTitle className="font-display font-black text-xl mt-3">
            Tips for {displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <a href="/billing" className="text-sm text-primary underline">Payment history and recovery</a>
          {!publicBetaConfig.paymentsEnabled && <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs leading-relaxed text-amber-100">Payments are paused for this beta while provider settlement and support operations are completed.</div>}
          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 2500].map((value) => (
              <Button
                key={value}
                type="button"
                variant={amountMinor === value ? 'default' : 'outline'}
                onClick={() => setAmountMinor(value)}
                className="rounded-xl font-bold"
              >
                ₹{value / 100}
              </Button>
            ))}
          </div>
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={200}
            placeholder="Add a message (optional)"
            className="rounded-xl"
          />
          {error && <p className="text-xs text-destructive rounded-xl border border-destructive/30 bg-destructive/10 p-3">{error}</p>}
          <div className="flex items-center justify-center gap-2 text-[0.68rem] text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {publicBetaConfig.paymentsEnabled ? 'Verified server-side through Razorpay' : 'Payment controls are disabled for this beta'}
          </div>
          <Button onClick={startPayment} disabled={paying || !publicBetaConfig.paymentsEnabled} className="w-full rounded-2xl font-bold text-xs h-11">
            {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {paying ? 'Waiting for payment…' : publicBetaConfig.paymentsEnabled ? `Tip ₹${(amountMinor / 100).toFixed(0)}` : 'Payments paused'}
          </Button>
        </div>

        <Button variant="outline" onClick={() => setOpen(false)} disabled={paying} className="w-full rounded-2xl font-bold text-xs h-11">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
