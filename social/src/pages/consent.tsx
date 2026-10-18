import { useRef, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { publicBetaConfig } from '@/lib/public-beta-config';

export default function ConsentPage() {
  const [, navigate] = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const acceptCurrentTerms = useAppStore((state) => state.acceptCurrentTerms);
  const logout = useAppStore((state) => state.logout);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const acceptanceInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    if (!acceptedTerms) {
      setError('Accept the current terms to continue.');
      acceptanceInput.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await acceptCurrentTerms();
      const updatedUser = useAppStore.getState().currentUser;
      if (updatedUser?.id === currentUser?.id && (updatedUser?.termsVersion !== publicBetaConfig.termsVersion || !updatedUser?.termsAcceptedAt)) {
        setError('The service could not confirm acceptance of the terms version shown here. Access remains restricted. Try reloading, or contact support if this continues.');
      } else if (updatedUser?.id === currentUser?.id) {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your acceptance.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  if (!currentUser) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-xl rounded-3xl border border-border/60 bg-card p-6 shadow-2xl sm:p-10">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-primary">One quick account step</p>
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">Review the rules before you enter</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Yor is updating its public-beta terms. Accepting terms does not confirm your age or enable social features. Your account will use a separate verification step.</p>
          </div>
        </div>

          <div className="mb-6 grid gap-2 rounded-2xl border border-border/50 bg-muted/20 p-4 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Terms version</span><strong>{publicBetaConfig.termsVersion}</strong></div>
            <div className="text-muted-foreground">Age group is checked separately using the approved verification provider for your country.</div>
        </div>

        <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
          <label className="flex items-start gap-3 rounded-2xl border border-border/60 p-4 text-sm leading-relaxed hover:border-primary/60">
            <input ref={acceptanceInput} type="checkbox" checked={acceptedTerms} disabled={busy} aria-invalid={Boolean(error && !acceptedTerms)} aria-describedby={error && !acceptedTerms ? 'terms-acceptance-error' : undefined} onChange={(event) => { setAcceptedTerms(event.target.checked); setError(''); }} className="mt-1 h-4 w-4 accent-primary" />
            <span>I accept the <Link href="/terms" className="font-semibold text-primary underline-offset-4 hover:underline">Terms</Link> and <Link href="/community-guidelines" className="font-semibold text-primary underline-offset-4 hover:underline">Community Guidelines</Link>, and acknowledge the <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">Privacy Notice</Link>.</span>
          </label>
          <p className="text-xs leading-5 text-muted-foreground">This step does not enable optional analytics or marketing. Read the <Link href="/cookies" className="font-semibold text-primary underline-offset-4 hover:underline">Cookies and storage notice</Link> for browser storage and preference controls.</p>
          {error && <p id="terms-acceptance-error" role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full rounded-2xl py-6 font-bold">{busy ? 'Saving…' : <><Check className="mr-2 h-4 w-4" />Accept and continue</>}</Button>
        </form>

        <button type="button" onClick={() => void logout()} className="mt-5 w-full text-center text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Sign out instead</button>
      </div>
    </main>
  );
}
