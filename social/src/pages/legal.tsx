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
  'Google Identity Services when you choose Google sign-in',
  'Cloudinary (when configured) for uploaded media',
  'Resend (when configured) for transactional email',
  'OpenAI or Google Gemini (when configured) for moderation or enabled AI features',
  'Razorpay (only when payments are enabled)',
  'LiveKit (only when live rooms or RTC calls are enabled)',
].join('; ');

function buildDocuments(): Record<string, LegalDocument> {
  const identity = publicBetaConfig.publicBeta
    ? `${publicBetaConfig.operatorName || 'Operator not configured'}, ${publicBetaConfig.operatorAddress || 'address not configured'}`
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
        { heading: 'Data we process', body: 'We process your verified email, account credentials, profile details, uploaded content and media, follows, messages and their delivery metadata, reports, device/session identifiers, moderation decisions and safety settings. Eligibility checks also process your declared country, requested account experience, assurance results and any required guardian permissions. Security and service infrastructure may process network addresses and browser/device information. Passwords and one-time credentials are stored as one-way hashes; TOTP seeds are encrypted at rest. We do not retain a raw address book for IRL Shield: selected identifiers are normalized into keyed match digests.' },
        { heading: 'How we use it', body: 'We use data to authenticate you, deliver social and creator features, personalize feeds, prevent abuse, apply audience controls, answer support and grievance requests, maintain security logs, and improve reliability. We do not sell personal data.' },
        { heading: 'Providers and disclosures', body: `Data may be processed by providers needed to run the service: ${providerSummary}. We disclose data when you ask us to, when needed to provide a feature, or when required to protect people, the service, or comply with a lawful request. Provider availability is controlled by this beta's feature flags.` },
        { heading: 'Browser storage and optional analytics', body: 'We use a refresh-session cookie, browser memory, local and session storage, and a service-worker cache for the purposes described in our Cookies and Browser Storage notice. This release does not currently collect optional navigation or profiling events. Optional account-linked analytics require configuration, a current server eligibility decision permitting adult analytics, and your permission in Settings. You can withdraw that choice there. Registration and accepting Terms do not enable optional analytics or marketing.' },
        { heading: 'International processing', body: 'Hosting and configured service providers may process information outside your country. The operator must approve the actual providers, processing locations, contractual safeguards and applicable transfer arrangements before public release. This development notice does not certify that a particular transfer arrangement has been approved.' },
        { heading: 'Your controls', body: 'You can edit profile and privacy settings, block or mute accounts, manage IRL Shield entries, export your account data, and permanently delete your account after password confirmation. Account exports exclude authentication secrets, other people’s private data and internal safety evidence. Guest grievance reports and unbound verification requests are not automatically included in an account export; contact the privacy address to request access or correction, with enough context to verify the request. Some safety, fraud, accounting or legal records may be retained in a minimized form for a documented period.' },
        { heading: 'Retention and security', body: 'Access tokens are short-lived and refresh credentials are held in an HttpOnly cookie; refresh values and TOTP seeds are protected before storage. Account deletion revokes sessions and removes or minimizes account records; external media cleanup can require queued retries. Copies can remain in restricted backups until those backups expire under the operator’s approved retention process. Security, fraud, accounting or legal records can have separate retention requirements. The operator must approve and publish the actual retention periods and backup handling before launch. No storage or transmission method guarantees absolute security.' },
        { heading: 'Contact', body: `Privacy questions: ${privacyContact}. General support: ${support}. Include the account email and enough context for us to locate your request; never send a password or authenticator code.` },
      ],
    },
    '/terms': {
      title: 'Terms of Use',
      eyebrow: publicBetaConfig.publicBeta ? `Yor Talks · terms ${publicBetaConfig.termsVersion}` : 'Yor Talks · development terms',
      intro: `${betaNotice} By using the public beta, you agree to these terms and the Community Guidelines. Eligibility and feature access follow the approved policy for your territory, including any required assurance or guardian authorization.`,
      sections: [
        { heading: 'Eligibility, age and account security', body: 'Complete the territory, age-assurance and guardian-authorization steps shown in the service. The server applies the approved policy for the relevant territory; age declarations or guardian relationships alone do not grant access to restricted features. Access may remain restricted when the required policy or assurance is unavailable. Keep your password, recovery links and authenticator codes private. Do not create accounts for other people, impersonate someone, or evade a safety restriction.' },
        { heading: 'Your content and permission', body: 'You retain rights you hold in content you submit. You grant Yor Talks the limited, non-exclusive permission needed to host, transmit, display, back up and moderate that content for the service. Post only material you created or are authorized to use.' },
        { heading: 'Prohibited conduct', body: 'Do not threaten, harass, stalk, dox, exploit, scam, spam, phish, distribute non-consensual intimate material, sexualize or target minors, infringe copyright, manipulate engagement, disrupt the service, or attempt unauthorized access.' },
        { heading: 'Moderation and appeals', body: 'We may warn, reduce reach, remove content, limit features, preserve evidence, or suspend accounts when needed to protect people or the service. Severe safety risks may be escalated immediately. Use the in-product report controls or grievance portal to request review; include links, timestamps and context.' },
        { heading: 'Beta limits and optional features', body: `The beta may change, pause or remove experimental features. Payments, live rooms, push alerts and RTC calls are ${publicBetaConfig.paymentsEnabled || publicBetaConfig.liveRoomsEnabled || publicBetaConfig.webPushEnabled || publicBetaConfig.rtcCallsEnabled ? 'enabled only where the interface says so' : 'disabled for this beta'}. No feature creates a promise of earnings, availability or uninterrupted service.` },
        { heading: 'Contact and governing terms', body: `Support: ${support}. Governing law and dispute information: ${publicBetaConfig.governingLaw || 'to be supplied by the operator before public release'}. The operator for this build is ${identity}.` },
      ],
    },
    '/cookies': {
      title: 'Cookies and Browser Storage',
      eyebrow: 'Your device · storage choices',
      intro: `${betaNotice} Cookies are one form of browser storage. This notice also describes memory, local storage, session storage and caches used by the current application.`,
      sections: [
        { heading: 'Sign-in and security', body: 'The API sets a refreshToken cookie to restore and rotate your sign-in session. JavaScript cannot read it (HttpOnly), and production sets it to HTTPS-only (Secure). It expires after seven days from issuance or rotation and is cleared by sign-out or account deletion. Short-lived access tokens are kept in page memory. An older yortalks-tokens local-storage entry is removed when the application encounters it. A yortalks-logged-out local marker prevents an explicitly signed-out session from returning while a cookie update is pending; it remains until successful sign-in or you clear site data.' },
        { heading: 'Appearance and functional preferences', body: 'Local storage remembers the theme, accent choice (yor-talks-accent-theme), sidebar state (yor-sidebar-collapsed), companion preferences (yor-companion-pet) and world preferences (yortalks-storage). These preferences have no automatic expiry and remain until replaced, reset or cleared in your browser. A reusable sidebar component can set a sidebar_state preference cookie for seven days when used. These settings support features you choose and are separate from optional analytics.' },
        { heading: 'Drafts and verification in progress', body: 'Post drafts are saved locally under an account-specific yor-composer-draft key, including text, poll choices, audience and content classification; selected file bytes are not saved there. Drafts are removed when published or cleared in the composer, and otherwise have no automatic expiry. Registration and owner-verification references use session storage (yor:eligibility:registration:v1 and yor:eligibility:owner-challenge:v1) so a verification step can resume in the same tab. They are cleared as the flow completes or expires, when the tab’s session ends, or when you clear site data. The server still validates every request; a stored reference does not grant account access.' },
        { heading: 'Optional analytics', body: 'Analytics are off by default, and this release does not currently collect optional navigation or profiling events. If your current account is eligible and you turn on “Allow optional analytics” in Settings, yor:telemetry:consent:v1 stores the consenting account identifier. A configured collector can use yor:telemetry:queue:v1 to temporarily queue navigation events and performance measurements. The service can link received events to the signed-in account; they are not anonymous. Queued events are removed when delivered, discarded after retries, or when consent or eligibility is withdrawn. The consent choice has no automatic expiry. Turn the setting off to stop new collection and clear the queued events and consent marker; already received server records follow the operator’s retention process.' },
        { heading: 'Offline cache and notifications', body: 'When the service worker is registered, the Cache Storage API stores the application HTML, hashed static assets, manifest and favicon in the yor-talks-v3 cache. It does not deliberately cache API responses, private messages or external media. Cached files remain until replaced, removed by a later cache version, evicted by the browser, or cleared in site settings. Push notifications require browser permission and the feature to be enabled. A subscription identifies the device’s browser push endpoint and is also saved with the account. You can revoke notification permission in your browser; do not rely on notification delivery for urgent messages.' },
        { heading: 'Preview features', body: 'Local preview tools can store achievement-card choices (yor-achievement-card-sets), calendar reminders (yor-esports-calendar-reminders), a rankings vote (yor-power-rankings-preview-vote), or a trade draft (yor-vault-trade-draft). These are device-local preview state, have no automatic expiry, and do not establish purchases, real game ownership, earned rewards or official tournament results.' },
        { heading: 'External services', body: 'The application serves its font styles and font files from this site. Google Identity Services loads after you choose “Continue with Google” on the sign-in screen. Choosing an enabled checkout, call, AI or media feature can contact the configured payment, communications, AI or media provider. External images, GIFs, embeds and user-supplied media can also contact their hosting service when displayed. Those requests expose network and browser information to the destination, and providers may apply their own storage policies. Their current contracts, retention and regional settings require operator review; this notice does not describe every provider’s storage as a Yor cookie.' },
        { heading: 'Your controls', body: `Manage optional analytics in Settings, appearance in the interface, and cookies, local storage, site permissions, service workers and caches in your browser’s site settings. Clearing site data can sign you out, remove unsent drafts and reset preferences. On a shared device, sign out and clear site data when appropriate. The application does not directly create an IndexedDB database in the current source; browser or provider internals can maintain their own data. Questions about storage or privacy: ${privacyContact}.` },
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
  };
}

export default function LegalPage() {
  const [location] = useLocation();
  const documents = buildDocuments();
  const document = documents[location] ?? documents['/privacy'];

  return (
    <main className="min-h-screen break-words bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Button asChild variant="ghost" className="rounded-xl"><Link href="/auth"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Yor</Link></Button>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Trust center</div>
        </div>
        {!legalConfigReady && <p role="status" className="mb-6 rounded-2xl border border-border bg-card p-4 text-sm leading-6">Public release is blocked until the operator supplies verified business details, contact information, a dated terms version, and approved legal content. The notices below remain available for review.</p>}
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
        <nav aria-label="Legal information" className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground"><Link href="/privacy" className="hover:text-primary">Privacy</Link><Link href="/terms" className="hover:text-primary">Terms</Link><Link href="/cookies" className="hover:text-primary">Cookies and storage</Link><Link href="/community-guidelines" className="hover:text-primary">Guidelines</Link><Link href="/grievance" className="hover:text-primary">Grievance portal</Link></nav>
      </div>
    </main>
  );
}
