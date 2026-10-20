import * as React from 'react';
import { Link } from 'wouter';
import QRCode from 'qrcode';
import { ArrowUpRight, ArrowDown, Box, WandSparkles, Sparkles, Scan, AtSign, MoveUpRight, CheckCheck, Copy, ArrowRight, Check, Mail, Loader2, Plus, Heart, MapPin, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { api, ApiError, type PreregisterPass } from '@/lib/api-client';
import YorProductPreviews from '@/components/launch/YorProductPreviews';
import DeferredYorWorldPreview from '@/components/launch/DeferredYorWorldPreview';
import type { YorWorldDistrict } from '@/components/launch/YorWorldPreview';
import YorSocialPreview, { YorSocialFeatures } from '@/components/launch/YorSocialPreview';
import '@/styles/preregister.css';
import '@/components/launch/yor-social-preview.css';
const DISTRICTS: {
  id: YorWorldDistrict;
  label: string;
  title: string;
  copy: string;
}[] = [{
  id: 'commons',
  label: 'The Commons',
  title: 'Your people have a place.',
  copy: 'Find communities around what moves you. Start conversations, share stories, and build a world that feels like yours.'
}, {
  id: 'studio',
  label: 'Creator Studio',
  title: 'Your ideas deserve a first take.',
  copy: 'Explore visual styles and creative tools. Give your photos, stories and next project a voice of their own.'
}, {
  id: 'dream',
  label: 'Dream Dock',
  title: 'Give a thought somewhere to go.',
  copy: 'Shape an idea into roles and milestones, then find collaborators who want to help make it real.'
}];
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
          <span>YOR TALKS GOES LIVE</span>
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
  const [district, setDistrict] = React.useState<YorWorldDistrict>('commons');
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
    document.title = 'Yor Talks — Premium social. Rooted in India. Launching 1 December 2026';
    if (description) description.content = 'A premium social experience with Indian data residency as a launch commitment and privacy inspired by EU principles. Join the Yor Talks launch list for 1 December 2026.';
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
  function handleDistrictKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % DISTRICTS.length;else if (event.key === 'ArrowLeft') next = (index + DISTRICTS.length - 1) % DISTRICTS.length;else if (event.key === 'Home') next = 0;else if (event.key === 'End') next = DISTRICTS.length - 1;else return;
    event.preventDefault();
    setDistrict(DISTRICTS[next].id);
    document.getElementById(`pr-district-${DISTRICTS[next].id}`)?.focus();
  }
  return <div className={"pr-page"}>
<a className={"pr-skip"} href={"#pr-signup"}>
{"Skip to pre-registration"}
</a>
<header className={"pr-header pr-container"}>
<Link href={"/preregister"} className={"pr-brand"} aria-label={"Yor Talks home"}>
{"yor talks"}
<span>
{"\u2733"}
</span>
</Link>
<nav className={"pr-nav"} aria-label={"Launch navigation"}>
<a href={"#pr-commitments"}>
{"Our commitments"}
</a>
<a href={"#pr-social"}>
{"The experience"}
</a>
<a href={"#pr-register-title"}>
{"Early member perks"}
</a>
</nav>
<div className="pr-header-makers"><span><span className="pr-header-makers__label">Made with <Heart size={12} aria-hidden="true" /> by</span><strong>Aditi &amp; Ayush.</strong></span></div>
<a className={"pr-header-cta"} href={"#pr-signup"}>
{"Get early access "}
<ArrowUpRight size={16} />
</a>
</header>
<main>
<LaunchCountdown />
<section className="pr-social-hero pr-container" aria-labelledby="pr-title">
  <div className="pr-social-hero-grid">
    <div className="pr-product-copy">
      <p className="pr-kicker"><span className="pr-india-mark" aria-hidden="true"><i /><i /><i /></span> ROOTED IN INDIA. BUILT AROUND YOU.</p>
      <h1 id="pr-title">Your world.<br />Your privacy.<br /><em>Rooted in India.</em></h1>
      <p className="pr-hero-description">A <strong>premium social experience</strong>, with Indian data residency as a launch commitment and privacy inspired by EU principles.</p>
      <div className="pr-product-actions">
        <a className="pr-product-primary" href="#pr-signup">Get early access <ArrowUpRight size={20} /></a>
        <a className="pr-explore-link" href="#pr-commitments"><span><ArrowDown size={17} /></span>What we stand for</a>
      </div>
      <p className="pr-hero-detail">Free pre-registration. Early member benefits. A more considered social life.</p>
    </div>
    <YorSocialPreview />
  </div>
  <div className="pr-social-signoff"><span>THOUGHTFULLY SOCIAL. DISTINCTLY YOURS.</span><a href="#pr-commitments">A BETTER FOUNDATION <ArrowDown size={13} /></a></div>
</section>
<div className="pr-product-rail pr-container" aria-label="The Yor Talks commitments">
  <a href="#pr-india"><span className="pr-rail-number">01</span><MapPin size={21} strokeWidth={1.4} /><span><strong>Indian data residency</strong><small>A core commitment for launch</small></span><ArrowUpRight size={17} /></a>
  <a href="#pr-privacy"><span className="pr-rail-number">02</span><ShieldCheck size={21} strokeWidth={1.4} /><span><strong>EU-inspired privacy</strong><small>Consent, transparency & control</small></span><ArrowUpRight size={17} /></a>
  <a href="#pr-premium"><span className="pr-rail-number">03</span><Sparkles size={21} strokeWidth={1.4} /><span><strong>A premium experience</strong><small>Care in the details that matter</small></span><ArrowUpRight size={17} /></a>
</div>
<section className="pr-commitments pr-container" id="pr-commitments" aria-labelledby="pr-commitments-title">
  <div className="pr-section-heading">
    <div><p className="pr-kicker"><span className="pr-section-index">01 /</span> OUR LAUNCH COMMITMENTS</p><h2 id="pr-commitments-title">A better social experience<br /><span>starts with trust.</span></h2></div>
    <p>Where your data lives. How your choices are respected. How it feels to spend time here. These are the foundations we’re building on.</p>
  </div>
  <div className="pr-commitment-grid">
    <article id="pr-india">
      <div className="pr-commitment-top"><MapPin size={23} strokeWidth={1.4} /><span>01 / RESIDENCY</span></div>
      <h3>Your data.<br />At home in India.</h3>
      <p>Our commitment is to keep your personal data in India. India-based hosting and provider reviews are being finalised before launch.</p>
      <span className="pr-commitment-status"><span className="pr-live-dot" /> LAUNCH COMMITMENT</span>
    </article>
    <article id="pr-privacy">
      <div className="pr-commitment-top"><ShieldCheck size={23} strokeWidth={1.4} /><span>02 / PRIVACY</span></div>
      <h3>Privacy<br />with substance.</h3>
      <p>Inspired by EU privacy principles: clear consent, collecting only what’s needed, and meaningful access and deletion controls.</p>
      <Link className="pr-commitment-link" href="/privacy">Read our privacy approach <ArrowUpRight size={15} /></Link>
    </article>
    <article id="pr-premium">
      <div className="pr-commitment-top"><SlidersHorizontal size={23} strokeWidth={1.4} /><span>03 / EXPERIENCE</span></div>
      <h3>Premium<br />in every detail.</h3>
      <p>Expressive profiles, considered creative tools, and conversations that feel personal. A social space designed to deserve your time.</p>
      <a className="pr-commitment-link" href="#pr-social">Explore the experience <ArrowDown size={15} /></a>
    </article>
  </div>
  <div className="pr-privacy-controls"><span>YOUR CHOICES MATTER</span><p>Optional analytics are off by default. Account export and deletion controls are available in Settings.</p><Link href="/privacy">Your privacy controls <ArrowUpRight size={15} /></Link></div>
</section>
<YorSocialFeatures />
<section className={"pr-platform pr-container"} id={"pr-platform"} aria-labelledby={"pr-platform-title"}>
<div className={"pr-section-heading"}>
<div>
<p className={"pr-kicker"}>
<span className={"pr-section-index"}>
{"03 /"}
</span>
{" THE CREATIVE SIDE OF YOR TALKS"}
</p>
<h2 id={"pr-platform-title"}>
{"Make it yours."}
<br />
<span>
{"Then share it."}
</span>
</h2>
</div>
<p>
{"For the photos you post, the stories you tell, and the ideas you share."}
<br />
{"Meet the creative side of your social life."}
<br />
{"Try Studio and Dream."}
</p>
</div>
<YorProductPreviews />
<div className={"pr-connection-line"}>
<div className={"pr-connection-mark"} aria-hidden={"true"}>
<span>
{"y"}
</span>
<span>
{"o"}
</span>
<span>
{"r"}
</span>
</div>
<div>
<strong>
{"Better when it\u2019s together."}
</strong>
<p>
{"Communities, conversations, stories and shared projects. Find the people who turn \u201Cwhat if\u201D into \u201Clet\u2019s do it.\u201D"}
</p>
</div>
<a href={"#pr-signup"} aria-label={"Join the community launch list"}>
<ArrowUpRight size={26} />
</a>
</div>
</section>
<section className={"pr-registration pr-container"} aria-labelledby={"pr-register-title"}>
<div className={"pr-signup-story"}>
<p className={"pr-kicker"}>
<span className={"pr-section-index"}>
{"04 /"}
</span>
{" EARLY LOOKS GOOD ON YOU"}
</p>
<h2 id={"pr-register-title"}>
{"A better social life."}
<br />
<span>
{"An earlier start."}
</span>
<br />
<em>
{"Be here first."}
</em>
</h2>
<p>
{"Be part of a premium social experience rooted in India. Get launch updates, choose your preferred name, and discover the benefits of being here early."}
</p>
<div className={"pr-early-benefits"}>
<div>
<span>
<Sparkles size={19} />
</span>
<p>
<strong>
{"The original-member treatment"}
</strong>
{"A founder badge and special profile frame for eligible accounts."}
</p>
</div>
<div>
<span>
<WandSparkles size={19} />
</span>
<p>
<strong>
{"A year of SuperPass"}
</strong>
{"One year of premium features for eligible founder accounts."}
</p>
</div>
<div>
<span>
<AtSign size={19} />
</span>
<p>
<strong>
{"A name that\u2019s yours"}
</strong>
{"Tell us your preferred handle. Confirm availability when you create your account."}
</p>
</div>
</div>
<p className={"pr-early-note"}>
{"Use the same email when you create your account. Account eligibility and final launch terms apply."}
</p>
</div>
<div className={"pr-signup"} id={"pr-signup"} tabIndex={-1}>
<div className={"pr-card-tab"}>
<span className={"pr-live-dot"} />
{" THE FIRST CHAPTER "}
<span>
{"01.12.26"}
</span>
</div>
<div className={"pr-card"}>
<div className={"pr-card__top"}>
<span>
{"YOUR INVITATION STARTS HERE"}
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
{"Two details. A whole world to look forward to."}
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
{" Your account comes later. Your story starts here."}
</p>
</div>
</section>
<section className={"pr-world-section pr-container"} id={"pr-world"} aria-labelledby={"pr-world-title"}>
<div className={"pr-section-heading"}>
<div>
<p className={"pr-kicker"}>
<span className={"pr-section-index"}>
{"05 /"}
</span>
{" YOR WORLD"}
</p>
<h2 id={"pr-world-title"}>
{"Meet Yor World."}
<br />
<span>
{"Another way to explore."}
</span>
</h2>
</div>
<p>
{"There’s more to explore inside Yor Talks."}
<br />
{"Yor World adds an immersive dimension to the social experience. Try this 3D preview: drag to look around or choose a district."}
</p>
</div>
<div className={"pr-engine-frame"}>
<div className={"pr-engine-toolbar"}>
<span>
<Box size={15} />
{" YOR WORLD "}
<i>
{"/"}
</i>
{" EXPERIENCE PREVIEW"}
</span>
<span className={"pr-engine-status"}>
<span className={"pr-live-dot"} />
{" INTERACTIVE 3D"}
</span>
</div>
<DeferredYorWorldPreview selectedDistrict={district} onSelectDistrict={setDistrict} />
<div className={"pr-engine-details"}>
<div className={"pr-district-tabs"} role={"tablist"} aria-label={"Explore Yor World districts"}>
{DISTRICTS.map((j, D) => <button type={"button"} role={"tab"} id={`pr-district-${j.id}`} aria-controls={`pr-district-panel-${j.id}`} aria-selected={district === j.id} tabIndex={district === j.id ? 0 : -1} onClick={() => setDistrict(j.id)} onKeyDown={se => handleDistrictKey(se, D)} key={j.id}>
<span>
{"0"}
{D + 1}
</span>
{j.label}
<ArrowUpRight size={15} />
</button>)}
</div>
{DISTRICTS.map(j => <div className={"pr-world-info"} role={"tabpanel"} id={`pr-district-panel-${j.id}`} aria-labelledby={`pr-district-${j.id}`} hidden={district !== j.id} key={j.id}>
<h3>
{j.title}
</h3>
<p>
{j.copy}
</p>
</div>)}
</div>
</div>
<div className={"pr-world-footnote"}>
<span>
<Scan size={14} />
{" EXPLORE IN 3D "}
<i>
{"\xB7"}
</i>
{" ROTATE THE CAMERA "}
<i>
{"\xB7"}
</i>
{" FIND YOUR CORNER"}
</span>
<span>
{"Yor World is one part of Yor Talks. This is an experience preview."}
</span>
</div>
</section>
<section className={"pr-faq pr-container"} aria-labelledby={"pr-faq-title"}>
<div>
<p className={"pr-kicker"}>
{"A LITTLE CLARITY"}
</p>
<h2 id={"pr-faq-title"}>
{"Before you"}
<br />
<span>
{"say hello."}
</span>
</h2>
</div>
<div className={"pr-faq__list"}>
<details>
<summary>
{"What exactly is Yor Talks?"}
<Plus size={18} />
</summary>
<p>
{"Yor Talks is a premium social platform built around an Indian data residency commitment and privacy inspired by EU principles. Share posts and stories, message friends, and find communities. Studio, Dream and Yor World add more ways to create and explore."}
</p>
</details>
<details>
<summary>Will my data stay in India?<Plus size={18} /></summary>
<p>Keeping your personal data in India is our launch commitment. Hosting locations, backups and external service arrangements are still being reviewed. India-only storage is not yet verified; we’ll publish the confirmed scope and any exceptions before launch.</p>
</details>
<details>
<summary>Is Yor Talks GDPR compliant?<Plus size={18} /></summary>
<p>Our privacy approach is inspired by EU principles, including clear consent, data minimisation and access and deletion rights. Legal and operational reviews are still in progress. We do not currently claim verified GDPR compliance. Read our <Link href="/privacy">Privacy Policy</Link> for the current scope and controls.</p>
</details>
<details>
<summary>
{"When can I get in?"}
<Plus size={18} />
</summary>
<p>
{"Our launch date is 1 December 2026. The countdown runs to midnight India Standard Time (UTC+05:30). Join the list for launch updates."}
</p>
</details>
<details>
<summary>
{"What happens after I join the list?"}
<Plus size={18} />
</summary>
<p>
{"Your email, preferred username and consent to updates are saved. New signups receive an early member pass right here. You\u2019ll create your eligible account separately, using the same email."}
</p>
</details>
<details>
<summary>
{"Does it cost anything?"}
<Plus size={18} />
</summary>
<p>
{"Pre-registration is free. You don\u2019t need a password, payment details or an existing account."}
</p>
</details>
</div>
</section>
</main>
<footer className={"pr-footer"}>
<div className={"pr-container"}>
<div className={"pr-footer__invitation"}>
<div>
<p>
{"YOUR WORLD. YOUR PRIVACY. ROOTED IN INDIA."}
</p>
<h2>
{"See you on"}
<br />
<span>
{"Yor Talks."}
</span>
</h2>
</div>
<a href={"#pr-signup"} aria-label={"Back to pre-registration"}>
<ArrowUpRight size={56} strokeWidth={1.1} />
</a>
</div>
<div className={"pr-footer__bottom"}>
<div className={"pr-makers"}>
<Heart size={14} aria-hidden={"true"} />
<span>
{"With love by "}
<strong>
{"Aditi & Ayush."}
</strong>
</span>
</div>
<span>
{"\xA9 2026 Yor Talks"}
</span>
<div>
<Link href={"/privacy"}>
{"Privacy"}
</Link>
<Link href={"/terms"}>
{"Terms"}
</Link>
<Link href={"/auth"}>
{"Sign in "}
<ArrowUpRight size={13} />
</Link>
</div>
</div>
</div>
</footer>
</div>;
}
