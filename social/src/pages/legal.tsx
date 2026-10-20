import { Link, useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, ShieldCheck, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { legalConfigReady, publicBetaConfig } from '@/lib/public-beta-config';
import { api, type PremiumCatalog } from '@/lib/api-client';

type LegalDocument = {
  title: string;
  eyebrow: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
};

const providerSummary = [
  'PostgreSQL and Redis for account, content, session and queue storage',
  'Google Identity Services when Google sign-in is configured',
  'Cloudinary for uploaded media and Resend for transactional email when configured',
  'LiveKit for live rooms, Razorpay for payments, and browser push delivery only when those features are enabled',
  'A configured OpenAI or Gemini text-moderation integration, and Gemini media moderation when configured, may receive content submitted for moderation',
].join('; ');

function buildDocuments(): Record<string, LegalDocument> {
  const identity = publicBetaConfig.publicBeta
    ? legalConfigReady ? `${publicBetaConfig.operatorName}, ${publicBetaConfig.operatorAddress}` : 'not configured for this build'
    : 'the Yor Talks development operator';
  const effective = publicBetaConfig.effectiveDate || 'development build';
  const support = publicBetaConfig.supportEmail || 'the support contact configured by the operator';
  const privacyContact = publicBetaConfig.privacyContactEmail || support;
  const grievanceContact = publicBetaConfig.grievanceContactEmail || support;
  const betaNotice = publicBetaConfig.publicBeta
    ? legalConfigReady ? `Effective ${effective}. Operator: ${identity}.` : 'Required operator and contact details are incomplete; do not rely on this as a final legal notice.'
    : 'This is a local development build and is not a public beta. Do not rely on it as a final legal notice.';

  return {
    '/privacy': {
      title: 'Privacy Notice',
      eyebrow: legalConfigReady ? 'Yor Talks · approved trust center' : 'Yor Talks · pending review draft',
      intro: `${betaNotice} This notice explains the personal data processed to provide Yor Talks, protect people, and honor account controls.`,
      sections: [
        { heading: 'Data categories and purposes', body: 'Depending on features you use, Yor processes email address and verification status, credentials, device/session identifiers, two-factor authentication settings and security challenges; username, profile and eligibility information; posts, media, messages, reactions, follows and other social activity; reports, appeals and moderation records; support or grievance submissions; optional Contact Shield match digests; and, only when payments are enabled, order and financial records. These data support account access, service delivery, safety and moderation, payment processing, support, legal obligations and optional reliability analytics.' },
        { heading: 'Providers and disclosures', body: `Service data may be processed by providers used for a feature: ${providerSummary}. Google sign-in sends its credential to Yor for authentication; media uploads go to the configured storage provider; transactional messages go to the configured mail provider; and payment, live, push or moderation data is shared only when the corresponding service is configured or enabled. PostgreSQL and Redis are service infrastructure. The browser Contact Picker, when available and invoked, reads selected contacts locally; Yor receives normalized match values for IRL Shield. Provider contracts, regions and acceptance are not established by this notice.` },
        { heading: 'Your controls and rights requests', body: 'Settings let you change profile and privacy controls, manage Contact Shield entries, export account data, and request account deletion after password confirmation. Deletion queues cleanup of account data and owned media; it is not a promise that every backup, recipient copy, safety record or legally retained financial record is immediately erased. You may withdraw optional analytics consent at any time in Settings; doing so removes the local telemetry queue and prevents new optional events from being sent. Terms acceptance and age/eligibility verification are separate from optional analytics and marketing; this build does not ask for marketing consent.' },
        { heading: 'Retention', body: 'Data is kept while needed for the account or feature, until a configured content expiry or deletion takes effect, or while a documented safety, financial or legal hold applies. Some media, messages and Stories have product expiry behavior, but no approved comprehensive retention schedule is currently published. Backups, logs, moderation evidence and payment records may outlive account deletion while cleanup or an applicable retention obligation is pending. The unresolved periods require owner and legal approval before public release.' },
        { heading: 'Security and age/eligibility', body: 'Authentication uses short-lived access tokens and a server-set HttpOnly refresh cookie; the cookie is Secure in production and its SameSite setting is deployment-configured. Eligibility uses separate verification flows. A date of birth or self-declared age is not described here as independently verified age, and this notice does not claim certification, perfect security, or complete deletion.' },
        { heading: 'Moderation, complaints and contact', body: `Reports and grievance submissions may include account identifiers, URLs, descriptions and evidence and are used to review safety, privacy or copyright complaints and document decisions. Use in-product reporting or the grievance portal at /grievance. Privacy questions: ${privacyContact}. General support: ${support}. Grievance contact: ${grievanceContact}. The operator identity and applicable process must be supplied and reviewed before public release. Do not send passwords, authentication codes or emergency requests.` },
      ],
    },
    '/terms': {
      title: 'Terms of Use',
      eyebrow: publicBetaConfig.publicBeta ? `Yor Talks · terms ${publicBetaConfig.termsVersion}` : 'Yor Talks · development terms',
      intro: `${betaNotice} By using the public beta, you agree to these terms and the Community Guidelines. You must meet the currently configured minimum age of ${publicBetaConfig.minimumAge}.`,
      sections: [
        { heading: 'Eligibility and account security', body: `You must meet the configured minimum age of ${publicBetaConfig.minimumAge}, complete any separate eligibility verification required for your location or feature, and use an email accepted by this deployment. A terms checkbox is not age verification. Keep your password, recovery links and authenticator codes private. Do not create accounts for other people, impersonate someone, or evade a safety restriction.` },
        { heading: 'Accounts and user content', body: 'Keep your account credentials private and provide information you are authorized to use. You retain rights you hold in content you submit and grant Yor Talks a limited, non-exclusive permission to host, store, transmit, display and moderate it only as needed to operate the service. You are responsible for having rights to what you post. Account export and deletion controls are available in Settings; deletion may not immediately remove recipient copies, backups, safety evidence or legally retained payment records.' },
        { heading: 'Prohibited behavior and reporting', body: 'Do not threaten, harass, stalk, dox, exploit, scam, spam, phish, distribute non-consensual intimate material, sexualize or target minors, infringe copyright, manipulate engagement, disrupt the service, evade restrictions, or attempt unauthorized access. Report content in-product or use the grievance portal. Copyright and privacy complaints should identify the material, location, basis for the request and a reliable contact.' },
        { heading: 'Moderation, suspension and deletion', body: 'We may review reports, warn, restrict reach or features, remove content, preserve relevant evidence, or suspend accounts when needed for safety, policy enforcement or service integrity. Decisions may be appealed through the grievance portal. Users may request account deletion through Settings; certain security, safety, payment or legal records may remain subject to the Privacy Notice and retention schedule.' },
        { heading: 'Premium, payments and availability', body: `Core account use remains separate from optional paid features. Any Premium purchase must show its current server-configured price, prepaid duration, no-automatic-renewal terms and refund policy before checkout; the public refund policy is at /refund-policy. A paid term may be cancelled for renewal at its end, but cancellation does not itself initiate a refund. Creator memberships, tips and marketplace orders are separate products. No feature promises earnings, a particular audience, uninterrupted availability or a specific outcome. Experimental features may change or be unavailable.` },
        { heading: 'Contact and governing terms', body: `Support: ${support}. Governing law and dispute information: ${publicBetaConfig.governingLaw || 'not configured for this build'}. The operator for this build is ${identity}. These product terms are not represented as legal advice or counsel-approved terms.` },
      ],
    },
    '/community-guidelines': {
      title: 'Community Guidelines',
      eyebrow: 'Make every world feel safer, not smaller',
      intro: `${betaNotice} These rules apply to posts, profiles, messages, rooms, comments, marketplace activity and creator spaces.`,
      sections: [
        { heading: 'Protect people', body: 'No threats, harassment, stalking, bullying, hate, targeted humiliation, doxxing, blackmail or encouragement of self-harm. Critique ideas without attacking a person’s identity or safety.' },
        { heading: 'Consent matters', body: 'Do not share private information, intimate imagery, recordings or identifying material without consent. Never sexualize, groom or exploit minors. Do not use Yor to solicit harmful contact with a minor.' },
        { heading: 'Be honest', body: 'No impersonation, fraud, phishing, fake giveaways, deceptive engagement, spam, coordinated manipulation or attempts to bypass account restrictions.' },
        { heading: 'Respect creative work', body: 'Post only material you created or have permission to use. Copyright and takedown requests should include the relevant work, location and a reliable contact.' },
        { heading: 'How enforcement works', body: `We may warn, limit reach, remove content, lock features or suspend accounts. Decisions consider severity, context, repeated behavior and safety risk. You can request review through the grievance portal; the appointed contact is ${publicBetaConfig.grievanceOfficerName || 'the operator contact shown on that portal'} at ${grievanceContact}.` },
        { heading: 'Report a problem', body: 'Use report controls on content or visit the grievance portal. Include links, context and timestamps. Do not submit emergencies through Yor; contact local emergency services instead.' },
      ],
    },
    '/cookies': {
      title: 'Cookie and Storage Notice',
      eyebrow: 'Yor Talks · browser storage',
      intro: `${betaNotice} This notice describes browser storage used by the application and the optional third-party sign-in and checkout integrations.`,
      sections: [
        { heading: 'Essential session storage', body: 'The API sets a refreshToken cookie with HttpOnly, the production Secure attribute, the deployment-configured SameSite value, root path and a seven-day maximum age. It supports authentication and session renewal. Access tokens and some UI preferences are stored in browser localStorage; refresh-cookie authentication is not dependent on optional analytics consent.' },
        { heading: 'Optional analytics storage', body: 'Optional analytics is off unless the current account eligibility permits it and you turn it on in Settings. After opt-in, the browser stores your consent marker and a bounded queue of navigation/performance events in localStorage and sends batches to the configured Yor telemetry endpoint. No analytics queue or request is created before consent. Turn it off in Settings to withdraw consent and clear the local queue.' },
        { heading: 'Third-party browser services', body: 'Google Identity Services is loaded when Google sign-in is used and may use its own browser storage. Razorpay checkout resources are used only when a purchase is enabled and initiated. Browser push subscriptions are created only through the enabled, permission-gated push feature. No separate advertising or session-replay provider is configured in the reviewed application source.' },
        { heading: 'Choices', body: 'There is no cookie banner because optional analytics remains default-off and has a reversible control in Settings. Refusing analytics does not block authentication or other essential service functions. Browser controls can also clear local storage or cookies, which may sign you out or reset local preferences.' },
      ],
    },
    '/refund-policy': {
      title: 'Premium Refund Policy',
      eyebrow: 'Yor Talks · Premium purchase terms',
      intro: `${betaNotice} The current policy below is loaded from the same server catalog used by Premium checkout. No refund term is invented by this page.`,
      sections: [],
    },
  };
}

export default function LegalPage() {
  const [location] = useLocation();
  const [premiumCatalog, setPremiumCatalog] = useState<PremiumCatalog | null>(null);
  const [premiumCatalogState, setPremiumCatalogState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  useEffect(() => {
    if (location !== '/refund-policy') return;
    let active = true;
    setPremiumCatalogState('loading');
    api.getPremiumCatalog().then((catalog) => {
      if (active) {
        setPremiumCatalog(catalog);
        setPremiumCatalogState('ready');
      }
    }).catch(() => {
      if (active) setPremiumCatalogState('error');
    });
    return () => { active = false; };
  }, [location]);
  const documents = buildDocuments();
  const document = documents[location] ?? documents['/privacy'];
  const premiumPlan = premiumCatalog?.plan;

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Button asChild variant="ghost" className="rounded-xl"><Link href="/auth"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Yor</Link></Button>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Trust center</div>
        </div>
        {!legalConfigReady && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Unapproved Legal Draft Notice</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/90">
              This document is a technical and product draft. Operating entity details, statutory contacts, governing jurisdiction, effective dates, and territorial age assurance policies are pending formal qualified legal and executive approval. Do not rely on this draft as binding approval or final public policy.
            </p>
          </div>
        )}
        <article className="rounded-3xl border border-border/60 bg-card/70 p-7 shadow-2xl sm:p-10">
          <div className="mb-8 border-b border-border/50 pb-7">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><FileText className="h-4 w-4" /> {document.eyebrow}</p>
            <h1 className="mb-4 text-3xl font-black tracking-tight sm:text-4xl">{document.title}</h1>
            <p className="text-sm leading-7 text-muted-foreground">{document.intro}</p>
            {publicBetaConfig.publicBeta && legalConfigReady && <p className="mt-4 text-xs font-semibold text-muted-foreground">Version {publicBetaConfig.termsVersion} · Effective {publicBetaConfig.effectiveDate} · Contact {publicBetaConfig.supportEmail}</p>}
          </div>
          <div className="space-y-8">
            {document.sections.map((section) => <section key={section.heading}><h2 className="mb-2 flex items-center gap-2 text-base font-bold"><Scale className="h-4 w-4 text-primary" /> {section.heading}</h2><p className="text-sm leading-7 text-muted-foreground">{section.body}</p></section>)}
            {location === '/refund-policy' && <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-bold"><Scale className="h-4 w-4 text-primary" /> Current plan terms</h2>
              {premiumCatalogState === 'loading' && <p role="status" className="text-sm leading-7 text-muted-foreground">Loading the current server-configured policy…</p>}
              {premiumCatalogState === 'error' && <p role="alert" className="text-sm leading-7 text-muted-foreground">The current Premium policy could not be verified. Purchases should not proceed until the configured terms are available.</p>}
              {premiumCatalogState === 'ready' && premiumPlan && <>
                <p className="text-sm leading-7 text-muted-foreground">{premiumPlan.name}: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: premiumPlan.currency }).format(premiumPlan.priceMinor / 100)} for {premiumPlan.durationDays} days. This is one prepaid term with no automatic renewal.</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{premiumPlan.refundPolicy}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">Terms version: {premiumPlan.termsVersion}. Cancelling a paid term does not itself initiate a refund. Contact {premiumCatalog?.supportEmail || 'the operator support contact'} for a request. Purchase availability: {premiumCatalog?.available ? 'enabled by current configuration' : 'currently disabled'}.</p>
              </>}
              {premiumCatalogState === 'ready' && !premiumPlan && <p className="text-sm leading-7 text-muted-foreground">No refund terms or price are configured. Premium purchases are unavailable until the operator publishes and approves the complete purchase terms.</p>}
            </section>}
          </div>
        </article>
        <nav className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground"><Link href="/privacy" className="hover:text-primary">Privacy</Link><Link href="/terms" className="hover:text-primary">Terms</Link><Link href="/community-guidelines" className="hover:text-primary">Guidelines</Link><Link href="/cookies" className="hover:text-primary">Cookies and storage</Link><Link href="/refund-policy" className="hover:text-primary">Refund policy</Link><Link href="/grievance" className="hover:text-primary">Grievance portal</Link></nav>
      </div>
    </main>
  );
}
