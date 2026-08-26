import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, Shield, User, Lock, Mail, Loader2, AtSign, Eye, EyeOff, KeyRound, Smartphone } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fadeInUp, staggerContainer, staggerItem, tapScale } from '@/lib/motion';
import { toast } from 'sonner';
import { Link } from 'wouter';

export default function Auth() {
  const login = useAppStore((state) => state.login);
  const loginWithEmailOtp = useAppStore((state) => state.loginWithEmailOtp);
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
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setFieldErrors({});
    setVerificationPending(false);

    const errors: Record<string, string> = {};
    if (mode === 'register') {
      if (fullName.length < 2) errors.fullName = 'Full name must be at least 2 characters';
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) errors.username = 'Username must be 3-20 characters, alphanumeric and underscores only';
      if (!/^\d{7}@kiit\.ac\.in$/i.test(email.trim())) errors.email = 'Use your 7-digit KIIT college email, for example 2329027@kiit.ac.in';
      if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    } else if (loginMethod === 'password') {
      if (!email) errors.email = 'Email/Username is required';
      if (!password) errors.password = 'Password is required';
    } else {
      if (!/^\d{7}@kiit\.ac\.in$/i.test(email.trim())) errors.email = 'Use your 7-digit KIIT college email';
      if (!/^\d{6}$/.test(otpCode)) errors.otpCode = 'Enter the six-digit code sent to your email';
    }

    if (mode === 'login' && twoFactorRequired && !/^\d{6}$/.test(twoFactorCode)) {
      errors.twoFactorCode = 'Enter the six-digit code from your authenticator app';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const requiresTwoFactor = loginMethod === 'email-code'
          ? await loginWithEmailOtp(email, otpCode, twoFactorRequired ? twoFactorCode : undefined)
          : await login(email, password, twoFactorRequired ? twoFactorCode : undefined);
        if (requiresTwoFactor) {
          setTwoFactorRequired(true);
          setErrorMsg('');
          setLoading(false);
          return;
        }
        setTwoFactorRequired(false);
        setTwoFactorCode('');
      } else {
        await register(username, email, password, fullName);
        setVerificationPending(true);
        setMode('login');
        setLoginMethod('password');
        toast.success('Account created — verify your KIIT email before signing in.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrorMsg('');
    setFieldErrors({});
    setOtpSent(false);
    setOtpCode('');
    setTwoFactorRequired(false);
    setTwoFactorCode('');
    setVerificationPending(false);
  };

  const resendVerification = async () => {
    if (!/^\d{7}@kiit\.ac\.in$/i.test(email.trim())) {
      setFieldErrors({ email: 'Enter your seven-digit KIIT email first' });
      return;
    }
    setResendingVerification(true);
    try {
      await api.resendPublicVerificationEmail(email.trim());
      toast.success('If that account needs verification, a new email has been sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not resend verification email');
    } finally {
      setResendingVerification(false);
    }
  };

  const requestEmailCode = async () => {
    if (!/^\d{7}@kiit\.ac\.in$/i.test(email.trim())) {
      setFieldErrors({ email: 'Use your 7-digit KIIT college email' });
      return;
    }
    setRequestingOtp(true);
    try {
      await api.requestEmailOtp(email.trim());
      setOtpSent(true);
      toast.success('If that account exists, a sign-in code is on its way.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the sign-in code');
    } finally {
      setRequestingOtp(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!email.trim()) {
      setFieldErrors({ email: 'Enter your KIIT email first' });
      return;
    }
    try {
      await api.requestPasswordReset(email.trim());
      toast.success('If that account exists, a password reset link has been sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not request a password reset');
    }
  };

  return (
    <main className="premium-auth-shell min-h-screen font-sans relative overflow-hidden">
      <div className="premium-auth-glow premium-auth-glow--one" aria-hidden="true" />
      <div className="premium-auth-glow premium-auth-glow--two" aria-hidden="true" />

      <section className="premium-auth-hero">
        <div className="premium-auth-hero__inner">
          <div className="premium-brand-lockup">
            <div className="premium-brand-mark">Y</div>
            <div>
              <p className="premium-brand-name">Yor</p>
              <p className="premium-brand-meta">Global worlds · KIIT beta</p>
            </div>
          </div>

          <p className="premium-auth-eyebrow">The living internet begins here</p>
          <h1 className="premium-auth-title">
            Don’t just post.<br /><span>Make things happen.</span>
          </h1>
          <p className="premium-auth-description">
            Share a seed, find its people, and turn an unfinished thought into something real. KIIT is Yor’s first trusted world—not its final boundary.
          </p>

          <div className="premium-auth-proof">
            <div className="premium-auth-proof__item">
              <Sparkles className="h-4 w-4" />
              <div><strong>Your Orbit</strong><span>Control what enters your attention instead of serving an endless feed.</span></div>
            </div>
            <div className="premium-auth-proof__item">
              <Users className="h-4 w-4" />
              <div><strong>Worlds with gravity</strong><span>People, projects, rituals, and memories held in one living place.</span></div>
            </div>
            <div className="premium-auth-proof__item">
              <Shield className="h-4 w-4" />
              <div><strong>Trusted launch world</strong><span>College-only access while the global product earns its shape.</span></div>
            </div>
          </div>

          <p className="premium-auth-footnote">Private beta · Seven-digit @kiit.ac.in email required</p>
        </div>
      </section>

      <section className="premium-auth-form-shell">
        <div className="premium-auth-mobile-brand">
          <div className="premium-brand-mark">Y</div>
          <div><p className="premium-brand-name">Yor</p><p className="premium-brand-meta">Global worlds · KIIT beta</p></div>
        </div>

        <div className="premium-auth-form">
          {/* Mode Switcher Tabs */}
          <div className="premium-auth-mode" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              onClick={() => switchMode('login')}
              aria-selected={mode === 'login'}
              aria-controls="auth-form-panel"
              className={`premium-auth-mode__button ${
                mode === 'login'
                  ? 'is-active'
                  : ''
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              onClick={() => switchMode('register')}
              aria-selected={mode === 'register'}
              aria-controls="auth-form-panel"
              className={`premium-auth-mode__button ${
                mode === 'register'
                  ? 'is-active'
                  : ''
              }`}
            >
              Create Account
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              id="auth-form-panel"
              role="tabpanel"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="w-full"
            >
              <div className="premium-auth-heading">
                <h2>
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p>
                  {mode === 'login' ? 'Sign in to your campus space.' : 'Create your place in the campus conversation.'}
                </p>
              </div>

              <div className="premium-auth-beta-note">
                <Shield className="h-4 w-4 shrink-0" />
                <div><strong>KIIT beta access</strong><span>Use your seven-digit college email to get started.</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3.5 text-xs font-mono text-destructive bg-destructive/10 rounded-xl border border-destructive/30">
                    {errorMsg}
                  </div>
                )}

                {verificationPending && (
                  <div className="p-4 text-xs text-foreground bg-primary/10 rounded-xl border border-primary/20 space-y-3">
                    <div><strong>One last step:</strong> open the verification link in your KIIT inbox, then sign in here.</div>
                    <button type="button" onClick={resendVerification} disabled={resendingVerification} className="text-primary font-semibold hover:underline disabled:opacity-60">
                      {resendingVerification ? 'Sending…' : 'Resend verification email'}
                    </button>
                  </div>
                )}

                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                  {mode === 'register' && (
                    <>
                      <motion.div variants={staggerItem} className="space-y-1">
                        <Label htmlFor="fullName" className="premium-auth-label">Full name</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="Full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            autoComplete="name"
                            className="premium-auth-input pl-10 h-11 rounded-xl"
                            required
                          />
                        </div>
                        {fieldErrors.fullName && <p className="text-xs text-destructive mt-1">{fieldErrors.fullName}</p>}
                      </motion.div>
                      
                      <motion.div variants={staggerItem} className="space-y-1">
                        <Label htmlFor="username" className="premium-auth-label">Username</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <AtSign className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="username"
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            className="premium-auth-input pl-10 h-11 rounded-xl font-mono"
                            required
                          />
                        </div>
                        {fieldErrors.username && <p className="text-xs text-destructive mt-1">{fieldErrors.username}</p>}
                      </motion.div>
                      
                      <motion.div variants={staggerItem} className="space-y-1">
                        <Label htmlFor="email" className="premium-auth-label">College email</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            className="premium-auth-input pl-10 h-11 rounded-xl"
                            required
                          />
                        </div>
                        {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
                      </motion.div>
                    </>
                  )}

                  {mode === 'login' && (
                    <motion.div variants={staggerItem} className="space-y-1">
                      <Label htmlFor="loginUsername" className="premium-auth-label">{loginMethod === 'password' ? 'Username or email' : 'College email'}</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          {loginMethod === 'password' ? <User className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <Input
                          id="loginUsername"
                          type={loginMethod === 'password' ? 'text' : 'email'}
                          placeholder={loginMethod === 'password' ? 'Username or email' : 'KIIT email address'}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete={loginMethod === 'password' ? 'username' : 'email'}
                          className="premium-auth-input pl-10 h-11 rounded-xl"
                          required
                        />
                      </div>
                      {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
                    </motion.div>
                  )}

                  {mode === 'login' && (
                    <div className="premium-auth-methods" role="tablist" aria-label="Sign in method">
                      <button type="button" role="tab" aria-selected={loginMethod === 'password'} className={loginMethod === 'password' ? 'is-active' : ''} onClick={() => { setLoginMethod('password'); setOtpSent(false); setOtpCode(''); setTwoFactorRequired(false); setTwoFactorCode(''); }}>
                        <KeyRound className="h-3.5 w-3.5" /> Password
                      </button>
                      <button type="button" role="tab" aria-selected={loginMethod === 'email-code'} className={loginMethod === 'email-code' ? 'is-active' : ''} onClick={() => { setLoginMethod('email-code'); setPassword(''); setTwoFactorRequired(false); setTwoFactorCode(''); }}>
                        <Mail className="h-3.5 w-3.5" /> Email code
                      </button>
                    </div>
                  )}

                  {mode === 'login' && loginMethod === 'email-code' && (
                    <motion.div variants={staggerItem} className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          id="otpCode"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit code"
                          value={otpCode}
                          onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          aria-label="Six-digit email code"
                          className="premium-auth-input h-11 rounded-xl font-mono tracking-[0.3em]"
                          required
                        />
                        <Button type="button" variant="outline" onClick={requestEmailCode} disabled={requestingOtp} className="h-11 shrink-0 rounded-xl text-xs">
                          {requestingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : otpSent ? 'Resend' : 'Send code'}
                        </Button>
                      </div>
                      {fieldErrors.otpCode && <p className="text-xs text-destructive">{fieldErrors.otpCode}</p>}
                    </motion.div>
                  )}

                  {(mode === 'register' || loginMethod === 'password') && <motion.div variants={staggerItem} className="space-y-1">
                    <Label htmlFor="password" className="premium-auth-label">Password</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        className="premium-auth-input pl-10 pr-10 h-11 rounded-xl"
                        required
                      />
                      <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>}
                    {mode === 'login' && (
                      <div className="text-right">
                        <button type="button" className="text-xs text-primary hover:underline font-medium" onClick={requestPasswordReset}>
                          Forgot password?
                        </button>
                      </div>
                    )}
                    {mode === 'register' && password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 h-1.5 mb-1">
                          <div className={`flex-1 rounded-full ${password.length < 8 ? 'bg-destructive' : 'bg-primary/20'}`} />
                          <div className={`flex-1 rounded-full ${password.length >= 8 ? (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-muted'}`} />
                          <div className={`flex-1 rounded-full ${password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'bg-emerald-500' : 'bg-muted'}`} />
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground text-right">
                          {password.length < 8 ? <span className="text-destructive">Weak</span> : password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? <span className="text-emerald-500">Strong</span> : <span className="text-amber-500">Medium</span>}
                        </p>
                      </div>
                    )}
                  </motion.div>}

                  {mode === 'login' && twoFactorRequired && (
                    <motion.div variants={staggerItem} className="space-y-2 rounded-2xl border border-primary/25 bg-primary/10 p-4">
                      <div className="flex items-start gap-3">
                        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div><Label htmlFor="twoFactorCode" className="premium-auth-label">Authenticator code</Label><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Open your authenticator app on your phone and enter the current six-digit code to finish signing in.</p></div>
                      </div>
                      <Input id="twoFactorCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))} aria-label="Six-digit authenticator code" className="premium-auth-input h-11 rounded-xl font-mono text-center text-lg tracking-[0.45em]" autoFocus />
                      {fieldErrors.twoFactorCode && <p className="text-xs text-destructive">{fieldErrors.twoFactorCode}</p>}
                    </motion.div>
                  )}
                </motion.div>

                <motion.div whileTap={tapScale} className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="premium-auth-submit w-full h-11 rounded-xl font-bold text-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : mode === 'login' ? (
                      twoFactorRequired ? 'Verify & sign in' : loginMethod === 'email-code' ? 'Verify code & sign in' : 'Sign In'
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </motion.div>

                <p className="premium-auth-legal">
                  By continuing, you agree to keep Yor Talks respectful and campus-safe. <span>Beta access is limited to seven-digit @kiit.ac.in emails.</span>
                  <span><Link href="/terms" className="hover:underline">Terms</Link> · <Link href="/privacy" className="hover:underline">Privacy</Link> · <Link href="/community-guidelines" className="hover:underline">Guidelines</Link></span>
                </p>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
