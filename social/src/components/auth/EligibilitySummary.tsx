import { Link } from 'wouter';
import { AlertCircle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import type { EligibilityDecision } from '@/lib/eligibility-contract';

function explanation(decision: EligibilityDecision | null, loaded: boolean) {
  if (!loaded) return { title: 'Checking account access', detail: 'We are checking the current account rules. Social features stay off until the check is available.' };
  if (!decision) return { title: 'We could not check right now', detail: 'Your account is still here. Try the check again later, or use Settings to export or delete your data and sign out.' };
  if (decision.activated && decision.experience === 'adult_18_plus') return { title: 'Adult account verified', detail: 'Your account can use the features allowed by the current country rules.' };
  if (decision.activated && decision.experience === 'teen_13_17') return { title: 'Teen account verified', detail: 'Your account can use the age-appropriate features allowed by the current country rules.' };
  if (decision.experience === 'under_13') return { title: 'A parent or guardian step is needed', detail: 'A parent or guardian must complete the required account step before any allowed account details are collected.' };
  if (decision.reason === 'territory_unavailable') return { title: 'Verification is not available here yet', detail: 'We cannot complete this check for the selected country right now. No social access has been enabled.' };
  if (decision.reason === 'guardian_required') return { title: 'Guardian permission is needed', detail: 'A parent or guardian needs to complete the permission step before this feature can be enabled.' };
  if (decision.reason === 'reassessment_required') return { title: 'A new check is needed', detail: 'Your earlier check has expired or changed. Complete a new check to continue.' };
  if (decision.reason === 'account_restricted') return { title: 'This account is restricted', detail: 'Social features are unavailable. You can still reach account settings, safety tools, and support.' };
  return { title: 'Verification is needed', detail: 'We cannot confirm account access from profile details or a checkbox. Complete the verification step to continue.' };
}

export function EligibilitySummary({ decision, loaded }: { decision: EligibilityDecision | null; loaded: boolean }) {
  const content = explanation(decision, loaded);
  const Icon = !loaded ? Clock3 : decision?.activated ? CheckCircle2 : decision ? ShieldCheck : AlertCircle;
  return (
    <section aria-live="polite" className="rounded-3xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{content.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{content.detail}</p>
          {decision && <p className="mt-4 text-xs text-muted-foreground">Account group: <strong className="text-foreground">{decision.experience.replaceAll('_', ' ')}</strong></p>}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/settings" className="rounded-xl border border-border px-4 py-2 hover:bg-muted">Settings and safety</Link>
        <Link href="/privacy" className="rounded-xl border border-border px-4 py-2 hover:bg-muted">Privacy information</Link>
        <Link href="/grievance" className="rounded-xl border border-border px-4 py-2 hover:bg-muted">Contact support</Link>
      </div>
    </section>
  );
}
