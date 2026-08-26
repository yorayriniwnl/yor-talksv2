import { useEffect, useState } from 'react';
import { ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { api, type PendingTwoFactorChallenge } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * An authenticated Yor session is the approval device. We intentionally poll
 * while the app is open instead of pretending that browser push credentials
 * exist; a real APNs/FCM push channel can be added later without changing the
 * challenge or approval contract.
 */
export function DeviceApprovalInbox() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [challenge, setChallenge] = useState<PendingTwoFactorChallenge | null>(null);
  const [dismissedChallengeId, setDismissedChallengeId] = useState<string | null>(null);
  const [matchingNumber, setMatchingNumber] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    const loadPendingChallenges = async () => {
      try {
        const pending = await api.listTwoFactorChallenges();
        if (!active) return;
        const next = pending[0] ?? null;
        setChallenge((previous) => {
          if (!next) return null;
          if (previous?.challengeId === next.challengeId) return previous;
          return next.challengeId === dismissedChallengeId ? null : next;
        });
      } catch {
        // The inbox is secondary UI. A transient API failure should not
        // interrupt the rest of the signed-in session.
      }
    };

    void loadPendingChallenges();
    const timer = window.setInterval(() => void loadPendingChallenges(), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [currentUser, dismissedChallengeId]);

  const closeApproval = () => {
    if (challenge) setDismissedChallengeId(challenge.challengeId);
    setChallenge(null);
    setMatchingNumber('');
  };

  const approve = async () => {
    if (!challenge) return;
    const number = Number(matchingNumber);
    if (!Number.isInteger(number) || number < 1 || number > 99) {
      toast.error('Enter the 1–99 number shown on the other device');
      return;
    }

    setBusy(true);
    try {
      await api.approveTwoFactorChallenge(challenge.challengeId, number);
      toast.success('Sign-in approved');
      setChallenge(null);
      setMatchingNumber('');
      setDismissedChallengeId(null);
    } catch (error) {
      setMatchingNumber('');
      toast.error(error instanceof Error ? error.message : 'That number did not match');
    } finally {
      setBusy(false);
    }
  };

  const deny = async () => {
    if (!challenge) return;
    setBusy(true);
    try {
      await api.denyTwoFactorChallenge(challenge.challengeId);
      toast.success('Sign-in denied');
      setChallenge(null);
      setMatchingNumber('');
      setDismissedChallengeId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not deny sign-in');
    } finally {
      setBusy(false);
    }
  };

  if (!currentUser) return null;

  return (
    <Dialog open={Boolean(challenge)} onOpenChange={(open) => { if (!open) closeApproval(); }}>
      <DialogContent className="max-w-sm rounded-3xl border-primary/20 p-6">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-display text-xl font-bold">Approve sign-in</DialogTitle>
          <DialogDescription className="text-center text-xs leading-relaxed">
            A new login is waiting for your approval. Enter the number shown on the other device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Only approve this if you started the login. Yor will never ask you to share this number with anyone.
            </p>
          </div>
          <Input
            autoFocus
            inputMode="numeric"
            maxLength={2}
            placeholder="1–99"
            value={matchingNumber}
            onChange={(event) => setMatchingNumber(event.target.value.replace(/\D/g, '').slice(0, 2))}
            onKeyDown={(event) => { if (event.key === 'Enter') void approve(); }}
            aria-label="Number shown on the other device"
            className="h-14 rounded-2xl text-center font-mono text-2xl font-bold tracking-[0.25em]"
          />
          <div className="flex gap-2">
            <Button type="button" variant="destructive" onClick={() => void deny()} disabled={busy} className="flex-1 rounded-xl">
              Deny
            </Button>
            <Button type="button" variant="outline" onClick={closeApproval} disabled={busy} className="flex-1 rounded-xl">
              Later
            </Button>
            <Button type="button" onClick={() => void approve()} disabled={busy || !matchingNumber} className="flex-1 rounded-xl font-bold">
              {busy ? 'Approving…' : 'Approve'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
