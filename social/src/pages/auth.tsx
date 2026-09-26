import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AtSign,
  Check,
  Code2,
  Eye,
  EyeOff,
  MessageCircle,
  PenLine,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  User,
  Users,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError, type TwoFactorChallenge } from '@/lib/api-client';
import {
  getPasswordRequirements,
  isValidPassword,
  PASSWORD_REQUIREMENT_MESSAGE,
} from '@/lib/password-policy';
import { useAppStore } from '@/lib/store';
import '@/styles/operator-access.css';
import { publicBetaConfig } from '@/lib/public-beta-config';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const USERNAME_PATTERN = /^[a-zA-Z0-9_][a-zA-Z0-9_-]{2,23}$/;

export default function Auth() {
  const login = useAppStore((state) => state.login);
  const loginWithGoogle = useAppStore((state) => state.loginWithGoogle);
  const loginWithEmailOtp = useAppStore((state) => state.loginWithEmailOtp);
  const completeTwoFactorLogin = useAppStore((state) => state.completeTwoFactorLogin);
  const register = useAppStore((state) => state.register);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'email-code'>('password');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [passwordResetPending, setPasswordResetPending] = useState(false);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);
  const [twoFactorFallback, setTwoFactorFallback] = useState(false);
  const [twoFactorFallbackCode, setTwoFactorFallbackCode] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [readiness, setReadiness] = useState<'checking' | 'operational' | 'unavailable'>('checking');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleCredentialRef = useRef<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [googleRetry, setGoogleRetry] = useState(0);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  const passwordRequirements = useMemo(() => getPasswordRequirements(password), [password]);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const result = await api.checkReadiness();
      if (active) setReadiness(result.ok ? 'operational' : 'unavailable');
    };
    void check();
    const timer = window.setInterval(() => void check(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setInterval(() => setOtpCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (mode !== 'login' || !googleClientId || !googleButtonRef.current) return;

    let cancelled = false;
    let script: HTMLScriptElement | null = null;
    setGoogleStatus('loading');
    const unavailable = () => { if (!cancelled) setGoogleStatus('unavailable'); };
    const timeout = window.setTimeout(unavailable, 10_000);
    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current) return;
      if (!window.google?.accounts?.id) { unavailable(); return; }
      googleButtonRef.current.replaceChildren();
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          ux_mode: 'popup',
          use_fedcm_for_prompt: true,
          callback: (response) => {
            googleCredentialRef.current = response.credential;
            setErrorMsg('');
            setFieldErrors({});
            setLoading(true);
            void loginWithGoogle(response.credential)
              .then((challenge) => {
                if (cancelled) return;
                if (challenge) {
                  setTwoFactorChallenge(challenge);
                  setTwoFactorFallback(false);
                  setTwoFactorFallbackCode('');
                  setApprovalBusy(false);
                } else {
                  googleCredentialRef.current = null;
                }
              })
              .catch((error) => {
                if (!cancelled) setErrorMsg(error instanceof Error ? error.message : 'Google sign-in failed.');
              })
              .finally(() => {
                if (!cancelled) setLoading(false);
              });
          },
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 360,
        });
        window.clearTimeout(timeout);
        setGoogleStatus('ready');
      } catch {
        unavailable();
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      let existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
      if (googleRetry > 0) {
        existingScript?.remove();
        existingScript = null;
      }
      script = existingScript ?? document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderGoogleButton, { once: true });
      script.addEventListener('error', unavailable, { once: true });
      if (!existingScript) document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      script?.removeEventListener('load', renderGoogleButton);
      script?.removeEventListener('error', unavailable);
      googleButtonRef.current?.replaceChildren();
    };
  }, [googleClientId, googleRetry, loginWithGoogle, mode]);

  useEffect(() => {
    if (!twoFactorChallenge || twoFactorFallback || approvalBusy) return;
    let active = true;

    const checkApproval = async () => {
      try {
        const status = await api.getTwoFactorChallengeStatus(twoFactorChallenge.challengeId);
        if (!active) return;
        if (status.status === 'approved') {
          setApprovalBusy(true);
          try {
            await completeTwoFactorLogin(twoFactorChallenge.challengeId);
            toast.success('Sign-in approved on your phone.');
          } catch (error) {
            if (active) {
              setApprovalBusy(false);
              setErrorMsg(error instanceof Error ? error.message : 'Could not complete sign-in.');
            }
          }
        } else if (status.status === 'expired') {
          setTwoFactorChallenge(null);
          setErrorMsg('This sign-in request expired. Start again.');
        }
      } catch (error) {
        if (active && error instanceof ApiError && error.status === 404) {
          setTwoFactorChallenge(null);
          setErrorMsg('This sign-in request was denied or expired. Start again.');
        }
      }
    };

    void checkApproval();
    const timer = window.setInterval(() => void checkApproval(), 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [approvalBusy, completeTwoFactorLogin, twoFactorChallenge, twoFactorFallback]);

  const resetChallenge = () => {
    setTwoFactorChallenge(null);
    setTwoFactorFallback(false);
    setTwoFactorFallbackCode('');
    googleCredentialRef.current = null;
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMsg('');
    setFieldErrors({});
    setOtpSent(false);
    setOtpCode('');
    setPasswordResetPending(false);
    setVerificationPending(false);
    resetChallenge();
  };

  const selectLoginMethod = (method: 'password' | 'email-code') => {
    setLoginMethod(method);
    setErrorMsg('');
    setFieldErrors({});
    setPasswordResetPending(false);
    if (method === 'password') {
      setOtpSent(false);
      setOtpCode('');
    } else {
      setPassword('');
    }
    resetChallenge();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (mode === 'register') {
      if (fullName.trim().length < 2) errors.fullName = 'Enter at least 2 characters.';
      if (!USERNAME_PATTERN.test(username.trim())) {
        errors.username = 'Use 3–24 letters, numbers, underscores, or hyphens.';
      }
      if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
      if (!isValidPassword(password)) errors.password = PASSWORD_REQUIREMENT_MESSAGE;
      if (!acceptedTerms) errors.acceptedTerms = `Accept the Terms and Privacy Notice to create an account.`;
      if (!confirmedAge) errors.confirmedAge = `Confirm that you are at least ${publicBetaConfig.minimumAge}.`;
    } else if (googleCredentialRef.current) {
      if (twoFactorFallback && !/^\d{6}$/.test(twoFactorFallbackCode)) {
        errors.twoFactorFallbackCode = 'Enter the six-digit code from your authenticator app.';
      }
    } else if (loginMethod === 'password') {
      if (!email.trim()) errors.email = 'Enter your username or email.';
      if (!password) errors.password = 'Enter your password.';
    } else {
      if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
      if (!otpSent) errors.otpCode = 'Send a code to your email first.';
      else if (!/^\d{6}$/.test(otpCode)) errors.otpCode = 'Enter the six-digit code sent to your email.';
    }

    if (mode === 'login' && twoFactorChallenge && twoFactorFallback && !/^\d{6}$/.test(twoFactorFallbackCode)) {
      errors.twoFactorFallbackCode = 'Enter the six-digit code from your authenticator app.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const challenge = googleCredentialRef.current
          ? await loginWithGoogle(
              googleCredentialRef.current,
              twoFactorFallback ? twoFactorFallbackCode : undefined,
              twoFactorFallback ? twoFactorChallenge?.challengeId : undefined,
            )
          : loginMethod === 'email-code'
            ? await loginWithEmailOtp(
                email.trim(),
                otpCode,
                twoFactorFallback ? twoFactorFallbackCode : undefined,
                twoFactorFallback ? twoFactorChallenge?.challengeId : undefined,
              )
            : await login(
                email.trim(),
                password,
                twoFactorFallback ? twoFactorFallbackCode : undefined,
                twoFactorFallback ? twoFactorChallenge?.challengeId : undefined,
              );
        if (challenge) {
          setTwoFactorChallenge(challenge);
          setTwoFactorFallback(false);
          setTwoFactorFallbackCode('');
          setApprovalBusy(false);
          return;
        }
        resetChallenge();
      } else {
        await register(username.trim(), email.trim(), password, fullName.trim(), acceptedTerms, confirmedAge);
        setVerificationPending(true);
        setMode('login');
        setLoginMethod('password');
        setPassword('');
        toast.success('Account created. Verify your email to continue.');
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'We couldn’t complete that request. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!isValidEmail(email)) {
      setFieldErrors({ email: 'Enter the email used for your account.' });
      return;
    }
    setResendingVerification(true);
    try {
      await api.resendPublicVerificationEmail(email.trim());
      toast.success('A fresh verification email is on its way.');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not resend the verification email.');
    } finally {
      setResendingVerification(false);
    }
  };

  const requestEmailCode = async () => {
    if (!isValidEmail(email)) {
      setFieldErrors({ email: 'Enter a valid email address.' });
      return;
    }
    setFieldErrors({});
    setErrorMsg('');
    setRequestingOtp(true);
    try {
      await api.requestEmailOtp(email.trim());
      setOtpSent(true);
      setOtpCooldown(60);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not send the sign-in code.');
    } finally {
      setRequestingOtp(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!isValidEmail(email)) {
      setFieldErrors({ email: 'Enter the email address for your account.' });
      return;
    }
    setFieldErrors({});
    setErrorMsg('');
    setRequestingReset(true);
    try {
      await api.requestPasswordReset(email.trim());
      setPasswordResetPending(true);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not request a password reset.');
    } finally {
      setRequestingReset(false);
    }
  };

  return (
    <main className="operator-access-shell">
      <aside className="operator-access-intro" aria-label="About Yor">
        <div className="operator-access-intro__inner">
          <div className="operator-access-brand">
            <span className="operator-access-brand__mark" aria-hidden="true">Y</span>
            <span><strong>Yor Talks</strong><small>A place for your people</small></span>
          </div>

          <div className="operator-access-copy">
            <p className="operator-kicker"><span /> A little closer to what matters</p>
            <h1>Good people.<br />Great ideas.<br /><em>Your corner.</em></h1>
            <p>For the things you’re making, the thoughts you’re having, and the people who make it all worthwhile.</p>
          </div>

          <section className="operator-identity-card" aria-label="What you can do on Yor">
            <header>
              <div className="operator-identity-card__avatar" aria-hidden="true">Y</div>
              <div><strong>Room for your many sides.</strong><span>A conversation is a good place to start.</span></div>
            </header>
            <div className="operator-identity-card__proof">
              <div><PenLine /><span><strong>Put something into the world</strong><small>A thought, a photo, a work in progress.</small></span><b>SHARE</b></div>
              <div><MessageCircle /><span><strong>Keep the conversation going</strong><small>Reply, connect, and catch up in messages.</small></span><b>CONNECT</b></div>
              <div><Users /><span><strong>Find your kind of people</strong><small>Follow creators and explore communities.</small></span><b>BELONG</b></div>
            </div>
            <footer>
              <span><b>Your voice.</b> Make it yours</span>
              <span><b>Your circle.</b> Find your people</span>
              <span><b>Your pace.</b> Stay a little</span>
            </footer>
          </section>

          <div className="operator-access-system">
            <span><i className={readiness === 'operational' ? undefined : 'is-muted'} /> {readiness === 'checking' ? 'Checking API…' : readiness === 'operational' ? 'API operational' : 'API unavailable'}</span>
            <span>Private sign-in</span>
            <span>{publicBetaConfig.publicBeta ? 'Public beta' : 'Development build'}</span>
          </div>
        </div>
      </aside>

      <section className="operator-access-panel">
        <div className="operator-access-panel__inner">
          <div className="operator-access-mobile-brand">
            <div className="operator-access-brand">
              <span className="operator-access-brand__mark" aria-hidden="true">Y</span>
              <span><strong>Yor Talks</strong><small>A place for your people</small></span>
            </div>
          </div>

          <div className="operator-access-mode" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => switchMode('register')}>Create account</button>
          </div>

          <header className="operator-access-heading">
            <p className="operator-kicker"><span /> Secure access</p>
            <h2>{mode === 'login' ? 'Welcome to your corner.' : 'Make yourself at home.'}</h2>
            <p>{mode === 'login' ? `Pick up where you left off. Sign in with your password, email code${googleClientId ? ', or Google' : ''}.` : 'Create an account, verify your email, and find your people.'}</p>
          </header>

          {mode === 'login' && googleClientId && (
            <div className="operator-google-access" role="group" aria-label="Google sign-in">
              <div ref={googleButtonRef} className="operator-google-access__button" />
              {googleStatus === 'loading' && <p role="status" className="text-center text-sm text-muted-foreground">Loading Google sign-in…</p>}
              {googleStatus === 'unavailable' && <div className="rounded-xl border border-border/50 p-3 text-center">
                <p role="status" className="text-sm leading-6 text-muted-foreground">Google sign-in couldn’t load. Password and email code are still available.</p>
                <button type="button" className="mt-2 min-h-11 rounded-lg border border-border px-4 text-sm font-semibold text-foreground" onClick={() => setGoogleRetry((attempt) => attempt + 1)}>Retry Google sign-in</button>
              </div>}
              <div className="operator-access-divider"><span>or use Yor access</span></div>
            </div>
          )}

          <form id="auth-form-panel" onSubmit={handleSubmit} className="operator-access-form" noValidate>
            {errorMsg && <div className="operator-access-alert is-error" role="alert"><ShieldCheck /> <span>{errorMsg}</span></div>}

            {verificationPending && (
              <div className="operator-access-alert is-info" role="status">
                <Mail />
                <div><strong>Verify your email to continue</strong><span>Open the link sent to {email}. It expires after 24 hours.</span><button type="button" onClick={resendVerification} disabled={resendingVerification}>{resendingVerification ? 'Sending…' : 'Resend verification email'}</button></div>
              </div>
            )}

            {passwordResetPending && (
              <div className="operator-access-alert is-success" role="status">
                <Check />
                <div><strong>Check your inbox</strong><span>If an account matches {email}, its one-hour reset link has been sent.</span></div>
              </div>
            )}

            {mode === 'register' && (
              <div className="operator-access-grid">
                <div className="operator-field">
                  <Label htmlFor="fullName">Full name</Label>
                  <div className="operator-field__control"><User /><Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" autoComplete="name" aria-invalid={Boolean(fieldErrors.fullName)} /></div>
                  {fieldErrors.fullName && <p className="operator-field__error">{fieldErrors.fullName}</p>}
                </div>
                <div className="operator-field">
                  <Label htmlFor="username">Username</Label>
                  <div className="operator-field__control"><AtSign /><Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="operator_name" autoComplete="username" aria-invalid={Boolean(fieldErrors.username)} /></div>
                  {fieldErrors.username && <p className="operator-field__error">{fieldErrors.username}</p>}
                </div>
              </div>
            )}

            <div className="operator-field">
              <Label htmlFor="accountIdentifier">{mode === 'login' && loginMethod === 'password' ? 'Username or email' : 'Email address'}</Label>
              <div className="operator-field__control">
                {mode === 'login' && loginMethod === 'password' ? <User /> : <Mail />}
                <Input
                  id="accountIdentifier"
                  type={mode === 'login' && loginMethod === 'password' ? 'text' : 'email'}
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setPasswordResetPending(false); }}
                  placeholder={mode === 'login' && loginMethod === 'password' ? 'you@example.com or username' : 'you@example.com'}
                  autoComplete={mode === 'login' && loginMethod === 'password' ? 'username' : 'email'}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
              </div>
              {fieldErrors.email && <p className="operator-field__error">{fieldErrors.email}</p>}
            </div>

            {mode === 'login' && (
              <div className="operator-method-switch" role="tablist" aria-label="Sign in method">
                <button type="button" role="tab" aria-selected={loginMethod === 'password'} className={loginMethod === 'password' ? 'is-active' : ''} onClick={() => selectLoginMethod('password')}><KeyRound /> Password</button>
                <button type="button" role="tab" aria-selected={loginMethod === 'email-code'} className={loginMethod === 'email-code' ? 'is-active' : ''} onClick={() => selectLoginMethod('email-code')}><Mail /> Email code</button>
              </div>
            )}

            {mode === 'login' && loginMethod === 'email-code' && (
              <div className="operator-field">
                <Label htmlFor="otpCode">One-time code</Label>
                <div className="operator-code-row">
                  <div className="operator-field__control"><Code2 /><Input id="otpCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-invalid={Boolean(fieldErrors.otpCode)} /></div>
                  <Button type="button" variant="outline" onClick={requestEmailCode} disabled={requestingOtp || otpCooldown > 0}>
                    {requestingOtp ? <Loader2 className="animate-spin" /> : otpCooldown > 0 ? `Resend ${otpCooldown}s` : otpSent ? 'Resend code' : 'Send code'}
                  </Button>
                </div>
                {fieldErrors.otpCode && <p className="operator-field__error">{fieldErrors.otpCode}</p>}
                {otpSent && <p className="operator-field__status"><Check /> Code sent. It expires in 5 minutes and works once.</p>}
              </div>
            )}

            {(mode === 'register' || loginMethod === 'password') && (
              <div className="operator-field">
                <div className="operator-field__label-row">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'login' && <button type="button" onClick={requestPasswordReset} disabled={requestingReset}>{requestingReset ? 'Sending reset…' : 'Forgot password?'}</button>}
                </div>
                <div className="operator-field__control">
                  <Lock />
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'Create a strong password' : 'Your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} aria-invalid={Boolean(fieldErrors.password)} />
                  <button type="button" className="operator-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff /> : <Eye />}</button>
                </div>
                {fieldErrors.password && <p className="operator-field__error">{fieldErrors.password}</p>}
                {mode === 'register' && (
                  <div className="operator-password-rules" aria-label="Password requirements">
                    {passwordRequirements.map((requirement) => <span key={requirement.id} className={requirement.met ? 'is-met' : ''}><i>{requirement.met ? <Check /> : null}</i>{requirement.label}</span>)}
                  </div>
                )}
              </div>
            )}

            {mode === 'login' && twoFactorChallenge && !twoFactorFallback && (
              <section className="operator-approval-card" aria-live="polite">
                <header><Smartphone /><div><strong>Approve this sign-in</strong><span>Open Yor on your trusted phone and enter this number.</span></div></header>
                <div className="operator-approval-card__number"><small>Match number</small><b>{twoFactorChallenge.matchingNumber}</b></div>
                <p>This request expires in five minutes. This page will continue automatically when approved.</p>
                <button type="button" onClick={() => { setTwoFactorFallback(true); setTwoFactorFallbackCode(''); }}>Use an authenticator code instead</button>
              </section>
            )}

            {mode === 'login' && twoFactorChallenge && twoFactorFallback && (
              <section className="operator-approval-card">
                <header><Smartphone /><div><strong>Authenticator fallback</strong><span>Enter the six-digit code from the app enrolled in Settings.</span></div></header>
                <div className="operator-field__control"><KeyRound /><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={twoFactorFallbackCode} onChange={(event) => setTwoFactorFallbackCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-label="Authenticator code" /></div>
                {fieldErrors.twoFactorFallbackCode && <p className="operator-field__error">{fieldErrors.twoFactorFallbackCode}</p>}
                <button type="button" onClick={() => { setTwoFactorFallback(false); setTwoFactorFallbackCode(''); }}>Return to phone approval</button>
              </section>
            )}

            {mode === 'register' && (
              <fieldset className="operator-access-consent">
                <legend>Before you create your account</legend>
                <label>
                  <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} aria-invalid={Boolean(fieldErrors.acceptedTerms)} />
                  <span>I accept the <Link href="/terms">Terms</Link>, <Link href="/privacy">Privacy Notice</Link>, and <Link href="/community-guidelines">Community Guidelines</Link>.</span>
                </label>
                {fieldErrors.acceptedTerms && <p className="operator-field__error">{fieldErrors.acceptedTerms}</p>}
                <label>
                  <input type="checkbox" checked={confirmedAge} onChange={(event) => setConfirmedAge(event.target.checked)} aria-invalid={Boolean(fieldErrors.confirmedAge)} />
                  <span>I confirm I am at least {publicBetaConfig.minimumAge} years old.</span>
                </label>
                {fieldErrors.confirmedAge && <p className="operator-field__error">{fieldErrors.confirmedAge}</p>}
              </fieldset>
            )}

            <Button type="submit" className="operator-access-submit" disabled={loading || Boolean(twoFactorChallenge && !twoFactorFallback)}>
              {loading ? <><Loader2 className="animate-spin" /> Working…</> : mode === 'register' ? <>Create account <span>→</span></> : twoFactorChallenge && twoFactorFallback ? <>Verify and sign in <span>→</span></> : twoFactorChallenge ? <>Waiting for approval…</> : loginMethod === 'email-code' ? <>Verify code and sign in <span>→</span></> : <>Sign in <span>→</span></>}
            </Button>

            <p className="operator-access-legal">By continuing, you agree to the <Link href="/terms">Terms</Link>, <Link href="/privacy">Privacy Policy</Link>, and <Link href="/community-guidelines">Community Guidelines</Link>.</p>
          </form>

          <div className="operator-access-trust"><ShieldCheck /><span><strong>What happens next?</strong> New accounts verify email, choose their world and interests, then enter the feed.</span></div>
        </div>
      </section>
    </main>
  );
}
