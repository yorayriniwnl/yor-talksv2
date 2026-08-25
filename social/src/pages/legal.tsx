import { Link, useLocation } from 'wouter';
import { ArrowLeft, FileText, ShieldCheck, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LegalDocument = {
  title: string;
  eyebrow: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
};

const documents: Record<string, LegalDocument> = {
  '/privacy': {
    title: 'Privacy Policy',
    eyebrow: 'Yor Talks · KIIT beta',
    intro: 'This draft explains the data Yor Talks uses to operate the college beta. It must be reviewed, approved and dated by the product owner and legal adviser before production launch.',
    sections: [
      { heading: 'What we collect', body: 'We collect your seven-digit @kiit.ac.in email, account credentials, profile details, content you publish, follows, messages, reports and safety settings. Passwords are stored as one-way hashes. We do not store your raw address book for IRL Shield; selected contact identifiers are normalized into keyed match digests.' },
      { heading: 'Why we use it', body: 'We use this information to authenticate KIIT members, provide social features, prevent abuse, enforce campus safety, respond to reports, maintain security logs and improve the beta. We do not sell personal data.' },
      { heading: 'Sharing and providers', body: 'Content and account data may be processed by infrastructure and service providers required to run the product, such as Postgres, Redis, media storage, email delivery, realtime rooms and error/operational tooling. Production provider contracts, regions and subprocessor notices must be confirmed before launch.' },
      { heading: 'Your controls', body: 'You can change privacy settings, block users, manage IRL Shield entries, export your account data and permanently delete your account after password confirmation. Legal retention may apply to de-identified financial or safety records.' },
      { heading: 'Security and retention', body: 'Sessions use short-lived access tokens and an HttpOnly refresh cookie. We retain account and safety data only as long as needed for the stated purposes or a documented legal obligation. The production retention schedule, incident contact and deletion timelines must be approved before launch.' },
      { heading: 'Contact', body: 'An official privacy contact address and effective date are still required. Do not treat this draft as final legal advice or a substitute for a signed privacy notice.' },
    ],
  },
  '/terms': {
    title: 'Terms of Use',
    eyebrow: 'Yor Talks · beta terms draft',
    intro: 'These draft terms govern use of Yor Talks inside the KIIT beta. They require owner acceptance, an effective date and legal review before production launch.',
    sections: [
      { heading: 'Eligibility and account security', body: 'Access is limited to people who control a valid seven-digit @kiit.ac.in mailbox during this beta. Keep your password and authenticator codes private. Do not create accounts for other people or evade a safety restriction.' },
      { heading: 'Your content', body: 'You retain ownership of content you submit, and grant Yor Talks the limited permission needed to host, display, transmit and moderate it for the service. Do not upload content you do not have the right to use.' },
      { heading: 'Prohibited use', body: 'Do not harass, threaten, impersonate, dox, exploit, scam, spam, distribute non-consensual intimate material, target minors, infringe copyright, disrupt the service or attempt unauthorized access.' },
      { heading: 'Moderation and reports', body: 'Yor Talks may restrict, remove or preserve content, suspend accounts and cooperate with lawful requests when necessary to protect people or the service. Reports and grievances should include enough detail for review.' },
      { heading: 'Service limits', body: 'The beta may change, pause or remove experimental features. Payments, creator earnings, live rooms and external provider features remain disabled where production credentials or approvals are missing.' },
      { heading: 'Contact and governing terms', body: 'The legal entity, registered address, support contact, governing law and dispute process must be completed and approved before launch. This draft is not final.' },
    ],
  },
  '/community-guidelines': {
    title: 'Community Guidelines',
    eyebrow: 'Make campus feel safer, not smaller',
    intro: 'Yor is built for expressive campus life. These rules set the baseline for participation and are enforced with context, consistency and an appeal path.',
    sections: [
      { heading: 'Protect people', body: 'No threats, harassment, stalking, bullying, hate, targeted humiliation, doxxing, blackmail or encouragement of self-harm. Critique ideas without attacking a person’s identity or safety.' },
      { heading: 'Consent matters', body: 'Do not share private information, intimate imagery, recordings or identifying material without consent. Never sexualize or exploit minors.' },
      { heading: 'Be honest', body: 'No impersonation, fraud, phishing, fake giveaways, deceptive engagement, spam, coordinated manipulation or attempts to bypass account restrictions.' },
      { heading: 'Respect creative work', body: 'Post only material you created or have permission to use. Copyright and takedown requests should include the relevant work and a reliable contact.' },
      { heading: 'How enforcement works', body: 'We may warn, limit reach, remove content, lock features or suspend accounts. Severe safety risks may be escalated immediately. Mistakes can be reported through the grievance portal; the production appeal owner and response process must be published before launch.' },
      { heading: 'Report a problem', body: 'Use the report controls on content or visit the grievance portal. Include links, context and timestamps. Do not submit emergencies through Yor; contact local emergency services instead.' },
    ],
  },
};

export default function LegalPage() {
  const [location] = useLocation();
  const document = documents[location] ?? documents['/privacy'];

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/auth"><Button variant="ghost" className="rounded-xl"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Yor</Button></Link>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Trust center</div>
        </div>
        <article className="rounded-3xl border border-border/60 bg-card/70 p-7 shadow-2xl sm:p-10">
          <div className="mb-8 border-b border-border/50 pb-7">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><FileText className="h-4 w-4" /> {document.eyebrow}</p>
            <h1 className="mb-4 text-3xl font-black tracking-tight sm:text-4xl">{document.title}</h1>
            <p className="text-sm leading-7 text-muted-foreground">{document.intro}</p>
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
