import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import '@/styles/operator-access.css';

export default function VerifyEmail() {
  const [location] = useLocation();
  let token = '';
  try {
    token = location.startsWith('/verify-email/') ? decodeURIComponent(location.slice('/verify-email/'.length)).trim() : '';
  } catch {
    // Malformed links still need a usable recovery screen.
  }
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email…');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!token) {
      setState('error');
      setMessage('This verification link is incomplete or invalid. Request a new email from the sign-in page.');
      return;
    }

    setState('loading');
    setMessage('Verifying your email…');
    api.verifyEmail(token)
      .then(() => {
        if (!active) return;
        setState('success');
        setMessage('Your email is verified. You can now sign in to Yor.');
      })
      .catch((error) => {
        if (!active) return;
        setState('error');
        setMessage(error instanceof Error ? error.message : 'This verification link is invalid or expired.');
      });
    return () => { active = false; };
  }, [token, attempt]);

  return (
    <main className="operator-access-state-page">
      <div className="operator-access-state-page__brand">
        <span className="operator-access-brand__mark" aria-hidden="true">Y</span>
        <span><strong>Yor Talks</strong><small>Identity verification</small></span>
      </div>
      <section className={`operator-access-state-card is-${state}`}>
        <div className="operator-access-state-card__index">AUTH / VERIFY</div>
        <div className="operator-access-state-card__icon">
          {state === 'loading' && <Loader2 className="animate-spin" />}
          {state === 'success' && <CheckCircle2 />}
          {state === 'error' && <ShieldAlert />}
        </div>
        <p className="operator-kicker"><span /> Verified access</p>
        <h1>{state === 'success' ? 'Email confirmed.' : state === 'error' ? 'Link not accepted.' : 'Confirming identity…'}</h1>
        <p role={state === 'error' ? 'alert' : 'status'}>{message}</p>
        <div className="operator-access-state-card__status">
          <span><i /> Email ownership</span><b>{state === 'success' ? 'VERIFIED' : state === 'error' ? 'ACTION NEEDED' : 'CHECKING'}</b>
        </div>
        <Button asChild>
          <Link href="/auth">Continue to sign in <span>→</span></Link>
        </Button>
        {state === 'error' && token && <Button type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}>Retry verification</Button>}
      </section>
    </main>
  );
}
