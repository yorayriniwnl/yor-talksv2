import { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPasswordRequirements, isValidPassword, PASSWORD_REQUIREMENT_MESSAGE } from '@/lib/password-policy';
import '@/styles/operator-access.css';

export default function ResetPassword() {
  const [location] = useLocation();
  const token = useMemo(() => {
    const routeSearch = location.includes('?') ? location.slice(location.indexOf('?')) : '';
    return new URLSearchParams(window.location.search || routeSearch).get('token') || '';
  }, [location]);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>(token ? 'idle' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This password reset link is incomplete.');
  const [invalidField, setInvalidField] = useState<'password' | 'confirmation' | null>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmationInput = useRef<HTMLInputElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const pending = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current || !token) return;
    if (password !== confirmation) {
      setInvalidField('confirmation');
      setState('error');
      setMessage('The passwords do not match.');
      confirmationInput.current?.focus();
      return;
    }
    if (!isValidPassword(password)) {
      setInvalidField('password');
      setState('error');
      setMessage(PASSWORD_REQUIREMENT_MESSAGE);
      passwordInput.current?.focus();
      return;
    }
    pending.current = true;
    setInvalidField(null);
    setMessage('');
    setState('saving');
    try {
      await api.confirmPasswordReset(token, password);
      setState('success');
      setMessage('Your password has been updated. You can sign in with it now.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'This reset link is invalid or expired.');
      requestAnimationFrame(() => errorSummary.current?.focus());
    } finally {
      pending.current = false;
    }
  };

  return (
    <main className="operator-access-state-page">
      <div className="operator-access-state-page__brand">
        <span className="operator-access-brand__mark" aria-hidden="true">Y</span>
        <span><strong>Yor Talks</strong><small>Account recovery</small></span>
      </div>
      <section className={`operator-access-state-card is-${state}`}>
        <div className="operator-access-state-card__index">AUTH / RECOVERY</div>
        <div className="operator-access-state-card__icon">
          {state === 'success' ? <CheckCircle2 /> : state === 'error' && !token ? <ShieldAlert /> : <KeyRound />}
        </div>
        <p className="operator-kicker"><span /> Account security</p>
        <h1>{state === 'success' ? 'Password updated.' : 'Set a new password.'}</h1>
        {state !== 'success' && <p>Choose a password that is unique to Yor. Completing this step signs out older sessions.</p>}
        {state === 'success' ? (
          <>
            <p>{message}</p>
            <div className="operator-access-state-card__status"><span><i /> Account credential</span><b>UPDATED</b></div>
            <Button asChild><Link href="/auth">Continue to sign in <span>→</span></Link></Button>
          </>
        ) : (
          <form onSubmit={submit} className="operator-reset-form" aria-busy={state === 'saving'}>
            {message && <div ref={errorSummary} id="reset-password-error" tabIndex={-1} className="operator-access-alert is-error" role="alert"><ShieldAlert aria-hidden="true" /><span>{message}</span></div>}
            <div className="operator-field">
              <label htmlFor="newPassword">New password</label>
              <div className="operator-field__control"><Lock /><Input ref={passwordInput} disabled={state === 'saving'} aria-invalid={invalidField === 'password'} aria-describedby={invalidField === 'password' ? 'reset-password-error' : undefined} id="newPassword" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setInvalidField(null); if (state === 'error' && token) { setState('idle'); setMessage(''); } }} placeholder="Create a strong password" autoComplete="new-password" required /><button type="button" className="operator-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
            </div>
            <div className="operator-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="operator-field__control"><Lock /><Input ref={confirmationInput} disabled={state === 'saving'} aria-invalid={invalidField === 'confirmation'} aria-describedby={invalidField === 'confirmation' ? 'reset-password-error' : undefined} id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); if (invalidField === 'confirmation') { setInvalidField(null); setState('idle'); setMessage(''); } }} placeholder="Repeat the password" autoComplete="new-password" required /></div>
            </div>
            <div className="operator-password-rules" aria-label="Password requirements">
              {getPasswordRequirements(password).map((requirement) => <span key={requirement.id} className={requirement.met ? 'is-met' : ''}><i>{requirement.met ? <Check /> : null}</i>{requirement.label}</span>)}
            </div>
            <Button disabled={state === 'saving' || !token}>{state === 'saving' ? <><Loader2 className="animate-spin" /> Updating…</> : <>Update password <span>→</span></>}</Button>
            <Link href="/auth" className="operator-reset-form__back">Back to sign in</Link>
          </form>
        )}
      </section>
    </main>
  );
}
