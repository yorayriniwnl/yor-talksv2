import * as React from 'react';
import { Link } from 'wouter';
import QRCode from 'qrcode';
import { ArrowUpRight, ArrowDown, AtSign, MoveUpRight, CheckCheck, Copy, ArrowRight, Check, Mail, Loader2, Plus, Heart, MapPin, ShieldCheck, Fingerprint, LockKeyhole, KeyRound, Sparkles } from 'lucide-react';
import { api, ApiError, type PreregisterPass } from '@/lib/api-client';
import PrivateRelayPreview from '@/components/launch/PrivateRelayPreview';
import YorSocialPreview from '@/components/launch/YorSocialPreview';
import '@/styles/preregister-rebuild.css';
import '@/components/launch/yor-live-demo.css';
const LAUNCH_AT = new Date('2026-12-01T00:00:00+05:30').getTime();
type FieldErrors = Partial<Record<'email' | 'username' | 'consent', string>>;
function countdownValues() {
  const remaining = Math.max(0, Math.floor((LAUNCH_AT - Date.now()) / 1000));
  return [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];
}
function LaunchCountdown() {
  const [countdown, setCountdown] = React.useState(countdownValues);
  React.useEffect(() => {
    const timer = setInterval(() => setCountdown(countdownValues()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <section className="pr-launch-band" aria-label="Launch date and countdown">
    <div className="pr-container pr-launch-band__inner">
      <div className="pr-launch-date">
        <span className="pr-asterisk" aria-hidden="true">✳</span>
        <div>
          <span>THE NEXT CHAPTER BEGINS</span>
          <time dateTime="2026-12-01T00:00:00+05:30">1 December 2026</time>
          <small>00:00 IST</small>
        </div>
      </div>
      <div className="pr-countdown" role="timer" aria-label="Time until the launch date">
        {countdown.map((value, index) => <div key={index}>
          <strong>{String(value).padStart(2, '0')}</strong>
          <span>{['DAYS', 'HOURS', 'MINS', 'SECS'][index]}</span>
        </div>)}
      </div>
    </div>
  </section>;
}
function inviteUrl(code?: string | null) {
  const url = new URL(import.meta.env.BASE_URL + 'preregister', window.location.origin);
  if (code) url.searchParams.set('ref', code);
  return url.toString();
}
export default function Preregister() {
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [requestError, setRequestError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [pass, setPass] = React.useState<PreregisterPass | null>(null);
  const [qrCode, setQrCode] = React.useState('');
  const [copyStatus, setCopyStatus] = React.useState('');
  const [referralCode] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get('ref') || params.get('referral') || '').trim().toUpperCase();
    return /^YOR-[A-F0-9]{6,24}$/.test(code) ? code : '';
  });
  const successHeading = React.useRef<HTMLHeadingElement>(null);
  const emailInput = React.useRef<HTMLInputElement>(null);
  const returnToForm = React.useRef(false);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    const oldTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const oldDescription = description?.content;
    document.title = 'Yor Talks — Life’s personal. Keep it that way.';
    if (description) description.content = 'Meet Yor Talks. A premium social space being built around your people, your choices, and an India-first approach to your data. Launching 1 December 2026.';
    // Older drafts cached personal details and could contain fabricated passes.
    try {
      localStorage.removeItem('yor:founder:pass:v1');
    } catch {/* Storage is optional. */}
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      document.title = oldTitle;
      if (description && oldDescription !== undefined) description.content = oldDescription;
    };
  }, []);
  React.useEffect(() => {
    if (pass === null && returnToForm.current) {
      returnToForm.current = false;
      emailInput.current?.focus();
    }
  }, [pass]);
  React.useEffect(() => {
    if (!pass) return;
    successHeading.current?.focus();
    if (pass.isExisting !== false) return;
    let active = true;
    QRCode.toDataURL(inviteUrl(pass.referralCode), {
      width: 160,
      margin: 1,
      color: {
        dark: '#242820',
        light: '#fffdf8'
      }
    }).then(url => {
      if (active) setQrCode(url);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [pass]);
  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
    const nextErrors: FieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 255) nextErrors.email = 'Enter a valid email address.';
    if (!/^[a-z0-9_][a-z0-9_-]{2,23}$/.test(cleanUsername)) nextErrors.username = 'Use 3–24 letters, numbers, underscores or hyphens. Start with a letter, number or underscore.';
    if (!consent) nextErrors.consent = 'Please agree to launch and early member updates to join.';
    setErrors(nextErrors);
    setRequestError('');
    if (Object.keys(nextErrors).length) {
      document.getElementById(`pr-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }
    setLoading(true);
    try {
      const result = await api.preregister({
        email: cleanEmail,
        username: cleanUsername,
        launchUpdatesConsent: true,
        ...(referralCode ? {
          referralCode
        } : {})
      });
      if (!result || (result.isExisting !== true && (
        result.isExisting !== false
        || typeof result.username !== 'string'
        || !/^[a-z0-9_][a-z0-9_-]{2,23}$/.test(result.username)
        || typeof result.passNumber !== 'string'
        || !result.passNumber.trim()
        || (result.referralCode !== null && (typeof result.referralCode !== 'string' || !/^YOR-[A-F0-9]{6,24}$/.test(result.referralCode)))
      ))) {
        throw new ApiError('We couldn’t confirm your signup. Your details are still here; please try again.', 502);
      }
      setPass(result);
      setEmail('');
    } catch (error) {
      const errorName = error instanceof Error ? error.name : '';
      setRequestError(error instanceof ApiError
        ? error.message
        : errorName === 'TimeoutError' || errorName === 'AbortError'
          ? 'The request took too long. Your details are still here; please try again.'
          : error instanceof TypeError
            ? 'We couldn’t connect. Check your internet connection and try again. Your details are still here.'
            : 'We couldn’t save your spot. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  async function copyInvite() {
    if (!pass || pass.isExisting !== false) return;
    const url = inviteUrl(pass.referralCode);
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('Invite link copied');
    } catch {
      setCopyStatus(`Copy this invite link: ${url}`);
    }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyStatus(''), 10000);
  }
  function savePass() {
    if (!pass || pass.isExisting !== false) return;
    const contents = `YOR TALKS · EARLY MEMBER\n\n@${pass.username}\n${pass.passNumber}\n\nLaunch: 1 December 2026, 00:00 IST (UTC+05:30)\n\nThis confirms your launch-list signup. Create your eligible account separately with the same email. Final founder benefits are subject to launch terms.\n`;
    const url = URL.createObjectURL(new Blob([contents], {
      type: 'text/plain;charset=utf-8'
    }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'yor-talks-early-member.txt';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="pr-page">
    <a className="pr-skip" href="#pr-signup">Skip to pre-registration</a>
    <header className="pr-header pr-container">
      <Link href="/preregister" className="pr-brand" aria-label="Yor Talks home">yor<span className="pr-brand-symbol" aria-hidden="true">✳</span><span className="pr-brand-word">talks</span></Link>
      <nav className="pr-nav" aria-label="Launch navigation">
        <a href="#pr-demo">Try the app</a>
        <a href="#pr-commitments">Privacy &amp; security</a>
        <a href="#pr-questions">Good questions</a>
      </nav>
      <div className="pr-header-makers"><span>Made with <Heart size={11} aria-hidden="true" /></span><strong>Aditi &amp; Ayush.</strong></div>
      <a className="pr-header-cta" href="#pr-signup">Join the list <ArrowUpRight size={16} /></a>
    </header>
    <main>
      <LaunchCountdown />
      <section className="pr-hero pr-hero--with-demo pr-container" aria-labelledby="pr-title">
        <div className="pr-hero-copy">
          <p className="pr-kicker"><span className="pr-live-dot" /> A MORE PERSONAL SOCIAL LIFE</p>
          <h1 id="pr-title">Life’s personal.<br /><span>Keep it<br className="pr-title-break" /> that way.</span></h1>
        </div>
        <div className="pr-demo-invitation">
          <p className="pr-hero-description">Meet Yor Talks. A premium social space for <strong>your people and your private moments.</strong> Built around thoughtful design and a commitment to keep your personal data in India.</p>
          <div className="pr-hero-actions">
            <a className="pr-primary" href="#pr-demo">Step inside the app <ArrowUpRight size={19} /></a>
            <a className="pr-text-link" href="#pr-signup">Get early access <ArrowUpRight size={17} /></a>
          </div>
          <p className="pr-hero-note">Explore the demo. No account needed. Make yourself at home.</p>
        </div>
      </section>
      <section className="pr-demo-showcase pr-container" aria-label="Try the Yor Talks application">
        <YorSocialPreview />
      </section>
      <div className="pr-values pr-container" aria-label="What we are building around">
        <span><MapPin size={17} /> India at the heart</span>
        <span><Fingerprint size={18} /> Privacy by intention</span>
        <span><Sparkles size={17} /> Care in every detail</span>
        <a href="#pr-commitments">OUR COMMITMENTS <ArrowDown size={15} /></a>
      </div>

      <section className="pr-vision" id="pr-vision" aria-labelledby="pr-vision-title">
        <div className="pr-container">
          <div className="pr-vision-top"><p className="pr-kicker">01 / A SIMPLE BELIEF</p><span>PEOPLE FIRST. ALWAYS.</span></div>
          <h2 id="pr-vision-title">We’re here to<br /><em>connect you.</em></h2>
          <div className="pr-vision-bottom">
            <div className="pr-connection-art" aria-hidden="true"><span>you</span><i /><span className="pr-connection-art__yor">yor✳</span><i /><span>yours</span></div>
            <div><p>The late-night catch-ups. The plans that finally happen. The people who get you. That’s what a social space should make room for.</p><p className="pr-vision-principle">In Private chats, our role is delivery. You and the person you choose hold the keys to your conversation.</p><a href="#pr-privacy" className="pr-text-link">See how private chats work <ArrowUpRight size={17} /></a></div>
          </div>
        </div>
      </section>

      <section className="pr-foundations pr-container" id="pr-commitments" aria-labelledby="pr-commitments-title">
        <div className="pr-section-heading">
          <div><p className="pr-kicker">02 / BUILT ON WHAT MATTERS</p><h2 id="pr-commitments-title">Good connections.<br /><span>Stronger foundations.</span></h2></div>
          <p>A considered experience starts with the choices behind it. Here are ours, and where the work stands.</p>
        </div>
        <div className="pr-foundation-grid">
          <article className="pr-india-card" id="pr-india">
            <div className="pr-card-eyebrow"><MapPin size={19} /><span>ROOTED IN INDIA</span><span className="pr-state">LAUNCH COMMITMENT</span></div>
            <div className="pr-india-art" aria-hidden="true"><div className="pr-india-orbit pr-india-orbit--one" /><div className="pr-india-orbit pr-india-orbit--two" /><span className="pr-india-coordinate">20.5937° N &nbsp; 78.9629° E</span><strong>IN<span>✳</span></strong><div className="pr-india-home"><span /><span /><span /></div><span className="pr-india-caption">A CLOSER HOME FOR YOUR DATA</span></div>
            <h3>Your data deserves<br />a home in India.</h3>
            <p>Indian data residency is a core launch commitment. We’re reviewing hosting, backups and service providers to make that promise concrete.</p>
            <a className="pr-text-link" href="#pr-residency-answer" onClick={() => {
              const answer = document.getElementById('pr-residency-answer');
              if (answer instanceof HTMLDetailsElement) answer.open = true;
            }}>What this means for you <ArrowUpRight size={16} /></a>
          </article>
          <article className="pr-privacy-card" id="pr-privacy">
            <div className="pr-card-eyebrow"><LockKeyhole size={19} /><span>PERSONAL MEANS PERSONAL</span></div>
            <h3>Your words.<br />Between you.</h3>
            <p>In Private chats, one-to-one messages and small files are encrypted on your device. Yor Talks carries the encrypted content; your keys open it.</p>
            <div className="pr-status-note"><span className="pr-state">A SEPARATE PRIVATE MODE</span><p>Set up your own keys and save your recovery file. Standard messages still use server processing, including safety moderation.</p></div>
            <div className="pr-privacy-links"><Link className="pr-text-link" href="/private-messages">Open private chats <ArrowUpRight size={16} /></Link><Link className="pr-text-link" href="/privacy">Read our privacy approach <ArrowUpRight size={16} /></Link></div>
          </article>
          <article className="pr-control-card" id="pr-premium">
            <div className="pr-card-eyebrow"><Fingerprint size={19} /><span>YOUR SPACE. YOUR SAY.</span></div>
            <h3>More control.<br />Less second-guessing.</h3>
            <p>EU-inspired privacy principles guide our approach to consent, transparency and control over your data.</p>
            <ul><li><Check size={15} /> Optional analytics off by default</li><li><Check size={15} /> Account export and deletion controls</li><li><Check size={15} /> Two-factor authentication and session controls</li></ul>
            <Link className="pr-text-link" href="/privacy">Your privacy controls <ArrowUpRight size={16} /></Link>
          </article>
        </div>
        <div className="pr-security-line"><ShieldCheck size={20} /><p>Security is a responsibility, every day.</p><span>Clear promises. Visible progress. A launch built on trust.</span></div>
        <div className="pr-private-delivery">
          <div><p className="pr-kicker">HOW PRIVATE CHATS WORK</p><h2>We carry the message.<br /><span>You hold the keys.</span></h2><p>Follow a sample message from your device to your person. See what each side can read, and what the delivery service receives.</p><a className="pr-text-link" href="#pr-private-chat-answer" onClick={() => {
            const answer = document.getElementById('pr-private-chat-answer');
            if (answer instanceof HTMLDetailsElement) answer.open = true;
          }}>What private chats protect <ArrowUpRight size={17} /></a></div>
          <PrivateRelayPreview />
        </div>
      </section>

      <section className="pr-social-section pr-container" id="pr-social" aria-labelledby="pr-social-title">
        <div className="pr-social-intro"><p className="pr-kicker">03 / ROOM TO BE YOURSELF</p><h2 id="pr-social-title">A little more<br /><em>human.</em></h2><p>A thoughtful home for your everyday social life. Beautifully simple, with room for the things that matter to you.</p><a className="pr-text-link" href="#pr-signup">Be part of the beginning <ArrowUpRight size={17} /></a></div>
        <div className="pr-social-moments">
          <article><div className="pr-moment-art pr-moment-art--chat" aria-hidden="true"><span>Same time tomorrow?</span><span>Wouldn’t miss it. <Heart size={13} /></span></div><span className="pr-moment-number">01 / CONVERSATIONS</span><h3>Your kind of catch-up.</h3><p>Make room for the people you want to hear from.</p></article>
          <article><div className="pr-moment-art pr-moment-art--circle" aria-hidden="true"><span>music</span><span>design</span><span>you</span><span>life</span><span>ideas</span></div><span className="pr-moment-number">02 / COMMUNITIES</span><h3>Find your familiar.</h3><p>Come together around the things you care about.</p></article>
          <article><div className="pr-moment-art pr-moment-art--story" aria-hidden="true"><span>little<br />things.</span><i /><small>A MOMENT WORTH SHARING ↗</small></div><span className="pr-moment-number">03 / EXPRESSION</span><h3>A space that feels like you.</h3><p>Share a thought, a story, a little of your world.</p></article>
        </div>
      </section>

      <section className="pr-registration-wrap">
        <div className="pr-registration pr-container" aria-labelledby="pr-register-title">
          <div className="pr-signup-story">
            <p className="pr-kicker"><span className="pr-live-dot" /> THE START OF SOMETHING PERSONAL</p>
            <h2 id="pr-register-title">Your people.<br />Your space.<br /><em>Your invitation.</em></h2>
            <p>Be here for the beginning. Choose your preferred handle and get the news when Yor Talks opens its doors.</p>
            <div className="pr-early-benefits">
              <div><Sparkles size={20} /><p><strong>A little recognition</strong>A founder badge and profile frame for eligible early members.</p></div>
              <div><KeyRound size={20} /><p><strong>A year of SuperPass</strong>One year of premium features for eligible founder accounts.</p></div>
              <div><AtSign size={20} /><p><strong>A name that feels like you</strong>Share your preferred handle. Confirm availability at account creation.</p></div>
            </div>
            <p className="pr-early-note">Use the same email when you create your account. Eligibility and final launch terms apply.</p>
          </div>
          <div className={"pr-signup"} id={"pr-signup"} tabIndex={-1}>
<div className={"pr-card-tab"}>
<span className={"pr-live-dot"} />
{" YOUR EARLY ACCESS "}
<span>
{"01.12.26"}
</span>
</div>
<div className={"pr-card"}>
<div className={"pr-card__top"}>
<span>
{"A PLACE FOR YOUR PEOPLE"}
</span>
<MoveUpRight size={23} strokeWidth={1.3} />
</div>
{pass ? <div className={"pr-success"}>
<span className={"pr-success__check"}>
<CheckCheck size={25} />
</span>
<h2 ref={successHeading} tabIndex={-1}>
{"You\u2019re on the list."}
</h2>
{pass.isExisting === true ? <React.Fragment>
<p>
{"If this email is already on our launch list, you\u2019re all set. No second signup needed."}
</p>
<div className={"pr-return-date"}>
<span>
{"A DATE FOR YOUR DIARY"}
</span>
<strong>
{"1 December 2026 "}
<ArrowUpRight size={20} />
</strong>
</div>
</React.Fragment> : <React.Fragment>
<p>
{"Good to have you here. Your early member pass is ready."}
</p>
<div className={"pr-ticket"}>
<div className={"pr-ticket__heading"}>
<span>
{"YOR TALKS"}
</span>
<span>
{"EARLY MEMBER"}
</span>
</div>
<div className={"pr-ticket__identity"}>
<div>
<span>
{"YOUR NEXT CHAPTER"}
</span>
<strong>
{"@"}
{pass.username}
</strong>
</div>
{qrCode && <img src={qrCode} width={"68"} height={"68"} alt={"QR code for your invitation link"} />}
</div>
<p>
{pass.passNumber}
</p>
<div className={"pr-ticket__bottom"}>
<span>
{"01 DECEMBER 2026"}
</span>
<span>
{"THE BEGINNING \u2197"}
</span>
</div>
</div>
<button className={"pr-submit"} type={"button"} onClick={savePass}>
{"Save your pass "}
<ArrowDown size={19} />
</button>
<button className={"pr-secondary"} type={"button"} onClick={copyInvite}>
<Copy size={15} />
{" Invite your people"}
</button>
<p className={"pr-copy-status"} role={"status"}>
{copyStatus}
</p>
</React.Fragment>}
<p className={"pr-success__note"}>
{"Create your account separately when registration opens. Use the same email for your early member benefits."}
</p>
<button className={"pr-back"} type={"button"} onClick={() => {
                returnToForm.current = true;
                setPass(null);
                setUsername("");
                setConsent(false);
                setCopyStatus("");
                setQrCode("");
              }}>
{"Back to pre-registration "}
<ArrowRight size={14} />
</button>
</div> : <React.Fragment>
<h2>
{"You\u2019re early."}
<br />
<em>
{"We like that."}
</em>
</h2>
<p className={"pr-card__description"}>
{"Join the launch list. Make yourself at home."}
</p>
{referralCode && <p className={"pr-referral"}>
<Check size={14} />
{" You came with an invite. Nice."}
</p>}
<form onSubmit={handleRegister} noValidate={true} aria-label={"Pre-registration"} aria-busy={loading}>
<div className={"pr-field"}>
<label htmlFor={"pr-email"}>
{"Email address"}
</label>
<div className={`pr-input${errors.email ? " pr-input--error" : ""}`}>
<Mail size={18} aria-hidden={"true"} />
<input ref={emailInput} id={"pr-email"} type={"email"} autoComplete={"email"} placeholder={"you@yourworld.com"} maxLength={255} required={true} disabled={loading} value={email} onChange={j => {
                      setEmail(j.target.value);
                      setErrors(D => ({
                        ...D,
                        email: void 0
                      }));
                    }} aria-invalid={!!errors.email} aria-describedby={errors.email ? "pr-email-error" : void 0} />
</div>
{errors.email && <p className={"pr-error"} id={"pr-email-error"} role={"alert"}>
{errors.email}
</p>}
</div>
<div className={"pr-field"}>
<label htmlFor={"pr-username"}>
{"Your username"}
</label>
<div className={`pr-input${errors.username ? " pr-input--error" : ""}`}>
<AtSign size={18} aria-hidden={"true"} />
<input id={"pr-username"} type={"text"} autoComplete={"username"} autoCapitalize={"none"} spellCheck={false} placeholder={"something_very_you"} maxLength={25} required={true} disabled={loading} value={username} onChange={j => {
                      setUsername(j.target.value);
                      setErrors(D => ({
                        ...D,
                        username: void 0
                      }));
                    }} aria-invalid={!!errors.username} aria-describedby={`pr-username-hint${errors.username ? " pr-username-error" : ""}`} />
</div>
{errors.username && <p className={"pr-error"} id={"pr-username-error"} role={"alert"}>
{errors.username}
</p>}
<p className={"pr-hint"} id={"pr-username-hint"}>
{"Pick your preferred handle. Make it yours."}
</p>
</div>
<label className={"pr-consent"} htmlFor={"pr-consent"}>
<input id={"pr-consent"} type={"checkbox"} required={true} checked={consent} disabled={loading} onChange={j => {
                    setConsent(j.target.checked);
                    setErrors(D => ({
                      ...D,
                      consent: void 0
                    }));
                  }} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "pr-consent-error" : void 0} />
<span>
{"Email me about the launch and early member perks."}
</span>
</label>
{errors.consent && <p className={"pr-error"} id={"pr-consent-error"} role={"alert"}>
{errors.consent}
</p>}
{requestError && <p className={"pr-request-error"} role={"alert"}>
{requestError}
</p>}
<button className={"pr-submit"} type={"submit"} disabled={loading}>
{loading ? <React.Fragment>
{"Saving your spot "}
<Loader2 className={"pr-spin"} size={19} />
</React.Fragment> : <React.Fragment>
{"Join the launch list "}
<ArrowUpRight size={21} />
</React.Fragment>}
</button>
<p className={"pr-free"}>
<Check size={13} />
{" Free to join "}
<span>
{"\xB7"}
</span>
{" No password needed"}
</p>
</form>
<p className={"pr-privacy"}>
{"Just launch news and early member updates."}
<br />
{"By joining, you acknowledge our "}
<Link href={"/privacy"}>
{"Privacy Policy"}
</Link>
{"."}
</p>
</React.Fragment>}
</div>
<p className={"pr-card-footnote"}>
<Check size={13} />
{" Your account comes later. This is your invitation."}
</p>
</div>

        </div>
      </section>

      <section className="pr-faq pr-container" id="pr-questions" aria-labelledby="pr-faq-title">
        <div><p className="pr-kicker">04 / OPEN CONVERSATIONS</p><h2 id="pr-faq-title">Good questions.<br /><span>Honest answers.</span></h2><p>Trust begins with knowing where you stand.</p></div>
        <div className="pr-faq__list">
          <details><summary>What exactly is Yor Talks?<Plus size={19} /></summary><p>Yor Talks is a social platform in development for conversations, communities and sharing your world. We’re building a premium experience around an Indian data residency commitment and privacy inspired by EU principles.</p></details>
          <details id="pr-private-chat-answer"><summary>Can Yor Talks read my personal chats?<Plus size={19} /></summary><p>The separate <Link href="/private-messages">Private chats</Link> experience encrypts one-to-one text and small files on your device. Our delivery service receives encrypted content without the private keys to open it. Standard messages are not end-to-end encrypted: our servers process their readable content, including safety moderation that may use configured external providers.</p><p>Private chats require a recovery file, your passphrase and verification of the other person’s fingerprint through another channel. Keep that file safe: we cannot recover your private key. This mode does not cover group chats or calls, and it has not undergone an independent security audit.</p></details>
          <details><summary>What does Yor still see with private delivery?<Plus size={19} /></summary><p>Encrypted content and delivery details are different things. A delivery service still needs to know which accounts are connected and when messages are sent. End-to-end encryption protects the contents of a conversation; it does not make account or connection activity anonymous. The preview uses sample messages to explain that distinction.</p></details>
          <details id="pr-residency-answer"><summary>Will my data stay in India?<Plus size={19} /></summary><p>Keeping your personal data in India is our launch commitment. Hosting locations, backups and external service arrangements are still being reviewed. India-only storage is not yet verified; we’ll publish the confirmed scope and any exceptions before launch.</p></details>
          <details><summary>Is Yor Talks GDPR compliant?<Plus size={19} /></summary><p>Our approach is inspired by EU privacy principles, including clear consent, data minimisation and access and deletion rights. Legal and operational reviews are still in progress. We do not currently claim verified GDPR compliance. Read our <Link href="/privacy">Privacy Policy</Link> for the current scope and controls.</p></details>
          <details><summary>When can I get in?<Plus size={19} /></summary><p>Our planned launch date is 1 December 2026, at midnight India Standard Time (UTC+05:30). Join the list for launch updates.</p></details>
          <details><summary>What happens after I join the list?<Plus size={19} /></summary><p>We save your email, preferred username and consent to launch updates. New signups receive an early member pass here. You’ll create your eligible account separately using the same email. Pre-registration is free and doesn’t need payment details or a password.</p></details>
        </div>
      </section>
    </main>
    <footer className="pr-footer">
      <div className="pr-container">
        <div className="pr-footer-top"><p>A MORE PERSONAL SOCIAL LIFE.</p><a className="pr-text-link" href="#pr-signup">See you at the beginning <ArrowUpRight size={20} /></a></div>
        <div className="pr-footer-wordmark" aria-hidden="true">yor talks<span>✳</span></div>
        <div className="pr-footer__bottom"><span className="pr-makers"><Heart size={13} /> With love by <strong>Aditi &amp; Ayush.</strong></span><span>© 2026 Yor Talks</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/auth">Sign in <ArrowUpRight size={14} /></Link></div></div>
      </div>
    </footer>
  </div>;
}
