import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, LogOut, RotateCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EligibilitySummary } from '@/components/auth/EligibilitySummary';
import { api } from '@/lib/api-client';
import type { ChallengeStatus } from '@/lib/eligibility-contract';
import { useAppStore } from '@/lib/store';
import type { GuardianAuthorizationSummary } from '@/lib/eligibility-contract';

const CHALLENGE_KEY = 'yor:eligibility:owner-challenge:v1';
const permissionOptions = [
  { value: 'account_collection', label: 'Allow the minimum details needed to set up an account' },
  { value: 'account_activation', label: 'Allow account access after the required check' },
  { value: 'social_contact', label: 'Allow age-appropriate contact features' },
] as const;

export default function EligibilityPage() {
  const decision = useAppStore((state) => state.eligibility);
  const loaded = useAppStore((state) => state.eligibilityLoaded);
  const refreshEligibility = useAppStore((state) => state.refreshEligibility);
  const logout = useAppStore((state) => state.logout);
  const [territory, setTerritory] = useState('');
  const [purpose, setPurpose] = useState<'age_assessment' | 'guardian_authorization'>('age_assessment');
  const [permissions, setPermissions] = useState<Array<typeof permissionOptions[number]['value']>>(['account_activation']);
  const [guardians, setGuardians] = useState<GuardianAuthorizationSummary[]>([]);
  const [challenge, setChallenge] = useState<ChallengeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadGuardians = async () => {
    try { setGuardians(await api.getGuardianAuthorizations()); }
    catch { setGuardians([]); }
  };

  useEffect(() => {
    void refreshEligibility();
    void loadGuardians();
    try {
      const challengeId = sessionStorage.getItem(CHALLENGE_KEY);
      if (challengeId) api.getOwnerEligibilityChallenge(challengeId).then(setChallenge).catch(() => sessionStorage.removeItem(CHALLENGE_KEY));
    } catch { /* Session storage may be disabled. */ }
  }, [refreshEligibility]);

  useEffect(() => {
    if (!challenge || challenge.status !== 'pending') return;
    const timer = window.setInterval(() => {
      api.getOwnerEligibilityChallenge(challenge.challengeId).then((next) => {
        setChallenge(next);
        if (next.status === 'consumed' || next.status === 'expired' || next.status === 'revoked') {
          try { sessionStorage.removeItem(CHALLENGE_KEY); } catch { /* ignore */ }
          void refreshEligibility();
          void loadGuardians();
        }
      }).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [challenge?.challengeId, challenge?.status, refreshEligibility]);

  const beginVerification = async () => {
    const country = territory.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      setError('Enter the two-letter country code where you live, such as IN or US.');
      return;
    }
    if (purpose === 'guardian_authorization' && permissions.length === 0) {
      setError('Choose what the parent or guardian is being asked to allow.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const receipt = purpose === 'age_assessment'
        ? await api.startOwnerEligibilityChallenge({ purpose, territory: country })
        : await api.startOwnerEligibilityChallenge({ purpose, territory: country, purposes: permissions });
      try { sessionStorage.setItem(CHALLENGE_KEY, receipt.challengeId); } catch { /* Provider still receives no URL credentials. */ }
      window.location.assign(receipt.redirectUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification is temporarily unavailable. Your account remains restricted.');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (authorizationId: string) => {
    setBusy(true);
    setError('');
    try {
      await api.withdrawGuardianAuthorization(authorizationId);
      await Promise.all([loadGuardians(), refreshEligibility()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Permission could not be withdrawn right now.');
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><ShieldCheck className="h-4 w-4" /> Your account</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Check what is available</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Yor uses a verification provider and current country rules. We do not use a birth date, a checkbox, or saved browser data as proof of age. If you already had an account, keep signing in as usual; your account information stays available in Settings while you complete the new check.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void logout()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </header>

        <EligibilitySummary decision={decision} loaded={loaded} />

        <section className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold">Continue a verification step</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose your country and the step you need. The provider will return only a result such as an age group or permission status; Yor does not receive identity documents.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">Country code
              <input value={territory} onChange={(event) => setTerritory(event.target.value.toUpperCase().slice(0, 2))} autoComplete="country" maxLength={2} placeholder="IN" className="h-11 rounded-xl border border-input bg-background px-3 font-normal uppercase" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">Step
              <select value={purpose} onChange={(event) => setPurpose(event.target.value as typeof purpose)} className="h-11 rounded-xl border border-input bg-background px-3 font-normal">
                <option value="age_assessment">Check my age group</option>
                <option value="guardian_authorization">Ask a parent or guardian for permission</option>
              </select>
            </label>
          </div>
          {purpose === 'guardian_authorization' && <fieldset className="mt-5 space-y-3">
            <legend className="mb-3 text-sm font-semibold">What permission is needed?</legend>
            {permissionOptions.map((option) => <label key={option.value} className="flex items-start gap-3 text-sm leading-5 text-muted-foreground">
              <input type="checkbox" checked={permissions.includes(option.value)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, option.value] : current.filter((item) => item !== option.value))} className="mt-1 accent-primary" />
              <span>{option.label}</span>
            </label>)}
          </fieldset>}
          {challenge && <p className="mt-4 rounded-xl bg-muted/50 p-3 text-sm" role="status">Verification step: <strong>{challenge.status.replaceAll('_', ' ')}</strong></p>}
          {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void beginVerification()} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}{busy ? 'Starting…' : 'Continue with provider'}</Button>
            <Button variant="outline" onClick={() => { void refreshEligibility(); void loadGuardians(); }} disabled={busy}><RotateCw className="mr-2 h-4 w-4" />Check again</Button>
          </div>
        </section>

        {guardians.length > 0 && <section className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold">Parent or guardian permissions</h2>
          <ul className="mt-4 space-y-3">
            {guardians.map((authorization) => <li key={authorization.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-4 text-sm">
              <div><strong className="capitalize">{authorization.status}</strong><p className="mt-1 text-muted-foreground">{authorization.purposes.join(', ').replaceAll('_', ' ')} · expires {new Date(authorization.expiresAt).toLocaleDateString()}</p></div>
              {authorization.status === 'granted' && <Button variant="outline" size="sm" disabled={busy} onClick={() => void withdraw(authorization.id)}>Withdraw permission</Button>}
            </li>)}
          </ul>
        </section>}

        <p className="px-2 text-center text-xs leading-5 text-muted-foreground">You can open Settings at any time to manage safety, download your information, or delete your account.</p>
      </div>
    </main>
  );
}
