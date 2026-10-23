import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPasswordRequirements, isValidPassword, PASSWORD_REQUIREMENT_MESSAGE } from '@/lib/password-policy';
import '@/styles/operator-access.css';

export default function ResetPassword() {
  const search = useSearch();
  const token = useMemo(() => {
    return new URLSearchParams(window.location.search || search).get('token')?.trim() || '';
  }, [search]);
  // A new recovery link starts a new form and cannot inherit an earlier result.
  return <PasswordResetForm key={token} token={token} />;
}

function PasswordResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>(token ? 'idle' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This password reset link is incomplete.');
  const [invalidField, setInvalidField] = useState<'password' | 'confirmation' | null>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmationInput = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const errorMessage = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (state === 'success') resultHeading.current?.focus();
    if (state === 'error' && !invalidField) errorMessage.current?.focus();
  }, [state, invalidField]);

  const clearError = () => {
    if (state === 'error' && token) {
      setState('idle');
      setMessage('');
      setInvalidField(null);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current || !token || state === 'success') return;
    if (!isValidPassword(password)) {
      setState('error');
      setMessage(PASSWORD_REQUIREMENT_MESSAGE);
      setInvalidField('password');
      passwordInput.current?.focus();
      return;
    }
    if (password !== confirmation) {
      setState('error');
      setMessage('The passwords do not match.');
      setInvalidField('confirmation');
      confirmationInput.current?.focus();
      return;
    }
    pending.current = true;
    setInvalidField(null);
    setMessage('');
    setState('saving');
    try {
      await api.confirmPasswordReset(token, password);
      if (!mounted.current) return;
      setState('success');
      setMessage('Your password has been updated. You can sign in with it now.');
    } catch (error) {
      if (!mounted.current) return;
      setState('error');
      setMessage(error instanceof Error ? error.message : 'This reset link is invalid or expired.');
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
        <h1 ref={resultHeading} tabIndex={-1}>{state === 'success' ? 'Password updated.' : 'Set a new password.'}</h1>
        {state !== 'success' && <p>Choose a password that is unique to Yor. Completing this step signs out older sessions.</p>}
        {state === 'success' ? (
          <>
            <p>{message}</p>
            <div className="operator-access-state-card__status"><span><i /> Account credential</span><b>UPDATED</b></div>
            <Button asChild><Link href="/auth">Continue to sign in <span>→</span></Link></Button>
          </>
        ) : (
          <form onSubmit={submit} noValidate aria-busy={state === 'saving'} className="operator-reset-form">
            {message && <div ref={errorMessage} id="reset-password-error" tabIndex={-1} className="operator-access-alert is-error" role="alert"><ShieldAlert /><span>{message}</span></div>}
            <div className="operator-field">
              <label htmlFor="newPassword">New password</label>
              <div className="operator-field__control"><Lock /><Input ref={passwordInput} id="newPassword" type={showPassword ? 'text' : 'password'} value={password} disabled={state === 'saving' || !token} aria-invalid={invalidField === 'password'} aria-describedby={invalidField === 'password' ? 'reset-password-error reset-password-rules' : 'reset-password-rules'} onChange={(event) => { setPassword(event.target.value); clearError(); }} placeholder="Create a strong password" autoComplete="new-password" required /><button type="button" disabled={!token} className="operator-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
            </div>
            <div className="operator-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="operator-field__control"><Lock /><Input ref={confirmationInput} id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmation} disabled={state === 'saving' || !token} aria-invalid={invalidField === 'confirmation'} aria-describedby={invalidField === 'confirmation' ? 'reset-password-error' : undefined} onChange={(event) => { setConfirmation(event.target.value); clearError(); }} placeholder="Repeat the password" autoComplete="new-password" required /></div>
            </div>
            <div id="reset-password-rules" className="operator-password-rules" aria-label="Password requirements">
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
