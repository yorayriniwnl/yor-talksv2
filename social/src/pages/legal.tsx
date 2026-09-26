import { Link, useLocation } from 'wouter';
import { ArrowLeft, FileText, ShieldCheck, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { legalConfigReady, publicBetaConfig } from '@/lib/public-beta-config';

type LegalDocument = {
  title: string;
  eyebrow: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
};

const providerSummary = [
  'Postgres and Redis for account, content, session and queue storage',
  'Cloudinary (when configured) for uploaded media',
  'Resend (when configured) for transactional email',
  'LiveKit (only when enabled) for live rooms',
].join('; ');

function buildDocuments(): Record<string, LegalDocument> {
  const identity = publicBetaConfig.publicBeta
    ? `${publicBetaConfig.operatorName}, ${publicBetaConfig.operatorAddress}`
    : 'the Yor Talks development operator';
  const effective = publicBetaConfig.effectiveDate || 'development build';
  const support = publicBetaConfig.supportEmail || 'the support contact configured by the operator';
  const privacyContact = publicBetaConfig.privacyContactEmail || support;
  const grievanceContact = publicBetaConfig.grievanceContactEmail || support;
  const betaNotice = publicBetaConfig.publicBeta
    ? `Effective ${effective}. Operator: ${identity}.`
    : 'This is a local development build and is not a public beta. Do not rely on it as a final legal notice.';

  return {
    '/privacy': {
      title: 'Privacy Notice',
      eyebrow: publicBetaConfig.publicBeta ? 'Yor Talks · public beta trust center' : 'Yor Talks · development trust center',
      intro: `${betaNotice} This notice explains the personal data processed to provide Yor Talks, protect people, and honor account controls.`,
      sections: [
        { heading: 'Data we process', body: 'We process your verified email, account credentials, profile details, content, follows, messages, reports, device/session identifiers, moderation decisions and safety settings. Passwords and one-time credentials are stored as one-way hashes; TOTP seeds are encrypted at rest. We do not retain a raw address book for IRL Shield: selected identifiers are normalized into keyed match digests.' },
        { heading: 'How we use it', body: 'We use data to authenticate you, deliver social and creator features, personalize feeds, prevent abuse, apply audience controls, answer support and grievance requests, maintain security logs, and improve reliability. We do not sell personal data.' },
        { heading: 'Providers and disclosures', body: `Data may be processed by providers needed to run the service: ${providerSummary}. We disclose data when you ask us to, when needed to provide a feature, or when required to protect people, the service, or comply with a lawful request. Provider availability is controlled by this beta's feature flags.` },
        { heading: 'Your controls', body: 'You can edit profile and privacy settings, block or mute accounts, manage IRL Shield entries, export your account data, and permanently delete your account after password confirmation. Some safety, fraud, accounting or legal records may be retained in a minimized form for a documented period.' },
        { heading: 'Retention and security', body: 'Access tokens are short-lived and refresh credentials are held in an HttpOnly cookie; refresh values and TOTP seeds are protected before storage. We retain data only for the stated purpose, a reasonable safety period, or a documented legal obligation, then delete or de-identify it.' },
        { heading: 'Contact', body: `Privacy questions: ${privacyContact}. General support: ${support}. Include the account email and enough context for us to locate your request; never send a password or authenticator code.` },
      ],
    },
    '/terms': {
      title: 'Terms of Use',
      eyebrow: publicBetaConfig.publicBeta ? `Yor Talks · terms ${publicBetaConfig.termsVersion}` : 'Yor Talks · development terms',
      intro: `${betaNotice} By using the public beta, you agree to these terms and the Community Guidelines. You must be at least ${publicBetaConfig.minimumAge}.`,
      sections: [
        { heading: 'Eligibility and account security', body: `You must be at least ${publicBetaConfig.minimumAge}, provide a verified email accepted by this deployment, and keep your password, recovery links and authenticator codes private. Do not create accounts for other people, impersonate someone, or evade a safety restriction.` },
        { heading: 'Your content and permission', body: 'You retain rights you hold in content you submit. You grant Yor Talks the limited, non-exclusive permission needed to host, transmit, display, back up and moderate that content for the service. Post only material you created or are authorized to use.' },
        { heading: 'Prohibited conduct', body: 'Do not threaten, harass, stalk, dox, exploit, scam, spam, phish, distribute non-consensual intimate material, sexualize or target minors, infringe copyright, manipulate engagement, disrupt the service, or attempt unauthorized access.' },
        { heading: 'Moderation and appeals', body: 'We may warn, reduce reach, remove content, limit features, preserve evidence, or suspend accounts when needed to protect people or the service. Severe safety risks may be escalated immediately. Use the in-product report controls or grievance portal to request human review; include links, timestamps and context.' },
        { heading: 'Beta limits and optional features', body: `The beta may change, pause or remove experimental features. Payments, live rooms, push alerts and RTC calls are ${publicBetaConfig.paymentsEnabled || publicBetaConfig.liveRoomsEnabled || publicBetaConfig.webPushEnabled || publicBetaConfig.rtcCallsEnabled ? 'enabled only where the interface says so' : 'disabled for this beta'}. No feature creates a promise of earnings, availability or uninterrupted service.` },
        { heading: 'Contact and governing terms', body: `Support: ${support}. Governing law and dispute information: ${publicBetaConfig.governingLaw || 'to be supplied by the operator before public release'}. The operator for this build is ${identity}.` },
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
        { heading: 'How enforcement works', body: `We may warn, limit reach, remove content, lock features or suspend accounts. Decisions consider severity, context, repeated behavior and safety risk. You can request human review through the grievance portal; the appointed contact is ${publicBetaConfig.grievanceOfficerName || 'the operator contact shown on that portal'} at ${grievanceContact}.` },
        { heading: 'Report a problem', body: 'Use report controls on content or visit the grievance portal. Include links, context and timestamps. Do not submit emergencies through Yor; contact local emergency services instead.' },
      ],
    },
  };
}

export default function LegalPage() {
  const [location] = useLocation();
  const documents = buildDocuments();
  const document = documents[location] ?? documents['/privacy'];

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Button asChild variant="ghost" className="rounded-xl"><Link href="/auth"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Yor</Link></Button>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Trust center</div>
        </div>
        <article className="rounded-3xl border border-border/60 bg-card/70 p-7 shadow-2xl sm:p-10">
          <div className="mb-8 border-b border-border/50 pb-7">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><FileText className="h-4 w-4" /> {document.eyebrow}</p>
            <h1 className="mb-4 text-3xl font-black tracking-tight sm:text-4xl">{document.title}</h1>
            <p className="text-sm leading-7 text-muted-foreground">{document.intro}</p>
            {publicBetaConfig.publicBeta && legalConfigReady && <p className="mt-4 text-xs font-semibold text-muted-foreground">Version {publicBetaConfig.termsVersion} · Effective {publicBetaConfig.effectiveDate} · Contact {publicBetaConfig.supportEmail}</p>}
          </div>
          <div className="space-y-8">
            {document.sections.map((section) => <section key={section.heading}><h2 className="mb-2 flex items-center gap-2 text-base font-bold"><Scale className="h-4 w-4 text-primary" /> {section.heading}</h2><p className="text-sm leading-7 text-muted-foreground">{section.body}</p></section>)}
          </div>
        </article>
        <nav className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground"><Link href="/privacy" className="hover:text-primary">Privacy</Link><Link href="/terms" className="hover:text-primary">Terms</Link><Link href="/community-guidelines" className="hover:text-primary">Guidelines</Link><Link href="/grievance" className="hover:text-primary">Grievance portal</Link></nav>
      </div>
    </main>
  );
}
