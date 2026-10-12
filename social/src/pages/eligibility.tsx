import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AccountAccessNav } from '@/components/auth/AccountAccessNav';
import { eligibilityApi, hasSocialAccess, type EligibilityChallenge, type EligibilityChallengeStatus, type GuardianAuthorization } from '@/lib/eligibility';
import { useAppStore } from '@/lib/store';

const reasons: Record<string, string> = {
  account_restricted: 'Social access is restricted for this account. You can still manage security, export or delete your data, and report a concern.',
  terms_required: 'Please review and accept the current terms before continuing verification.',
  verification_required: 'Complete verification to check which features are available for your account.',
  verification_expired: 'Your previous verification expired. Please complete verification again.',
  territory_unavailable: 'Social access is not currently available for your verified territory.',
  policy_changed: 'The policy for your territory changed. Your account needs a new verification.',
  age_unavailable: 'Social access is not currently available for this account. Your account rights remain available.',
  guardian_required: 'A verified parent or guardian must authorize access before social features can open.',
};

export default function EligibilityPage() {
  const currentUser = useAppStore((state) => state.currentUser);
  const eligibility = useAppStore((state) => state.eligibility);
  const eligibilityLoading = useAppStore((state) => state.eligibilityLoading);
  const eligibilityError = useAppStore((state) => state.eligibilityError);
  const refreshEligibility = useAppStore((state) => state.refreshEligibility);
  const [country, setCountry] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [guardians, setGuardians] = useState<GuardianAuthorization[]>([]);
  const [guardianError, setGuardianError] = useState('');
  const [challenge, setChallenge] = useState<EligibilityChallenge | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<EligibilityChallengeStatus['status'] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadGuardians = async () => {
    try { setGuardians(await eligibilityApi.listGuardians()); setGuardianError(''); }
    catch (err) { setGuardianError(err instanceof Error ? err.message : 'Could not load guardian authorizations.'); }
  };
  useEffect(() => { void loadGuardians(); }, [currentUser?.id]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not complete this step. Please retry.'); }
    finally { setBusy(false); }
  };
  const start = (authorizationId?: string) => void run(async () => {
    if (!/^[A-Z]{2}$/.test(country.trim().toUpperCase())) throw new Error('Enter your two-letter country code.');
    const result = await eligibilityApi.startChallenge(country.trim().toUpperCase(), authorizationId);
    setChallenge(result); setChallengeStatus('pending');
  });
  const checkChallenge = () => void run(async () => {
    if (!challenge) return;
    const result = await eligibilityApi.challengeStatus(challenge.challengeId);
    setChallengeStatus(result.status);
    await refreshEligibility();
    await loadGuardians();
  });

  return <main className="min-h-screen bg-background px-4 py-10 text-foreground">
    <div className="mx-auto max-w-2xl space-y-6">
      <AccountAccessNav />
      <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <h1 className="font-display text-2xl font-bold">Account access</h1>
        <p role="status" className="text-sm text-muted-foreground">{eligibilityLoading ? 'Checking your account access…' : hasSocialAccess(eligibility) ? 'Your account is ready to use social features.' : reasons[eligibility?.reason ?? ''] ?? 'Account access has not been confirmed. Please retry the check.'}</p>
        {eligibilityError && <p role="alert" className="text-sm text-destructive">{eligibilityError}</p>}
        <Button variant="outline" disabled={eligibilityLoading || busy} onClick={() => void refreshEligibility()}>Retry account check</Button>
        {hasSocialAccess(eligibility) && <Link href={currentUser?.onboardingCompleted === false ? '/onboarding' : '/'} className="block text-primary underline">Continue to Yor</Link>}
        {eligibility?.reason === 'terms_required' && <Link href="/consent" className="block text-primary underline">Review current terms</Link>}
      </section>

      {eligibility?.verificationAvailable && eligibility.reason !== 'account_restricted' && <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Verification</h2>
        <p className="text-sm text-muted-foreground">Our verification partner checks eligibility. A country entry or checkbox does not prove age or parental responsibility. Share verification documents only with the partner through its secure link.</p>
        <label className="block text-sm">Country of residence (two-letter code)
          <Input aria-label="Country of residence" value={country} maxLength={2} autoComplete="country" onChange={(event) => setCountry(event.target.value.toUpperCase())} className="mt-2 max-w-xs" placeholder="Country code" />
        </label>
        <Button disabled={busy || eligibilityLoading} onClick={() => start()}>Start verification</Button>
        {challenge && <div className="space-y-3 rounded-xl border border-border p-4 text-sm">
          <p>Verification status: {challengeStatus ?? 'pending'}. Link expires {new Date(challenge.expiresAt).toLocaleString()}.</p>
          {challengeStatus === 'pending' && <a href={challenge.verificationUrl} target="_blank" rel="noopener noreferrer" className="block text-primary underline">Open secure verification</a>}
          <Button variant="outline" disabled={busy} onClick={checkChallenge}>Check verification result</Button>
          {challengeStatus === 'rejected' && <p>The partner could not confirm this verification. You can retry or report a concern.</p>}
          {challengeStatus === 'expired' && <p>This link expired. Start a new verification to retry.</p>}
        </div>}
      </section>}
      {eligibility && !eligibility.verificationAvailable && !hasSocialAccess(eligibility) && <p className="text-sm text-muted-foreground">Verification is temporarily unavailable. Retry later; your account security and data rights remain available.</p>}

      <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Parent or guardian authorization</h2>
        <p className="text-sm text-muted-foreground">A request stays pending until an eligible adult completes a separate parental-responsibility verification. Sending a request does not open social access.</p>
        {eligibility?.reason === 'guardian_required' && <form onSubmit={(event) => { event.preventDefault(); void run(async () => { await eligibilityApi.requestGuardian(guardianId.trim()); await loadGuardians(); }); }} className="space-y-3">
          <label className="block text-sm">Guardian account ID<Input value={guardianId} onChange={(event) => setGuardianId(event.target.value)} className="mt-2" required /></label>
          <Button disabled={busy}>Request authorization</Button>
        </form>}
        {guardianError && <p role="alert" className="text-sm text-destructive">{guardianError}</p>}
        <Button variant="outline" disabled={busy} onClick={() => void loadGuardians()}>Refresh authorizations</Button>
        {guardians.map((guardian) => <div key={guardian.id} className="space-y-2 rounded-xl border border-border p-4 text-sm">
          <p>{guardian.role === 'guardian' ? 'Authorization requested from you' : 'Your authorization request'}: {guardian.status}</p>
          <p>Purpose: {guardian.purposes.join(', ')}. Notice version: {guardian.noticeVersion}.</p>
          {guardian.role === 'guardian' && guardian.status === 'pending' && eligibility?.experience === 'adult_18_plus' && hasSocialAccess(eligibility) && <Button disabled={busy} onClick={() => start(guardian.id)}>Verify parental responsibility</Button>}
          {['pending', 'verified'].includes(guardian.status) && <Button variant="outline" disabled={busy} onClick={() => void run(async () => { await eligibilityApi.withdrawGuardian(guardian.id); await loadGuardians(); await refreshEligibility(); })}>Withdraw authorization</Button>}
        </div>)}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </section>
    </div>
  </main>;
}
