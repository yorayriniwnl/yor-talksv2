import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
  const [location] = useLocation();
  const token = location.startsWith('/verify-email/') ? decodeURIComponent(location.slice('/verify-email/'.length)) : undefined;
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your KIIT email…');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is incomplete.');
      return;
    }

    api.verifyEmail(token)
      .then(() => {
        setState('success');
        setMessage('Your email is verified. You can now sign in to Yor.');
      })
      .catch((error) => {
        setState('error');
        setMessage(error instanceof Error ? error.message : 'This verification link is invalid or expired.');
      });
  }, [token]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-border/60 bg-card/90 p-8 text-center shadow-2xl">
        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${state === 'success' ? 'bg-emerald-500/15 text-emerald-600' : state === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          {state === 'loading' && <Loader2 className="h-7 w-7 animate-spin" />}
          {state === 'success' && <CheckCircle2 className="h-7 w-7" />}
          {state === 'error' && <ShieldAlert className="h-7 w-7" />}
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Yor · KIIT beta</p>
        <h1 className="mb-3 text-2xl font-black tracking-tight">{state === 'success' ? 'You’re verified' : state === 'error' ? 'Verification failed' : 'Confirming your email'}</h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">{message}</p>
        <Link href="/auth">
          <Button className="w-full rounded-2xl">Continue to sign in</Button>
        </Link>
      </section>
    </main>
  );
}
