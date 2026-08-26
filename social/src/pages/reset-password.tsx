import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPassword() {
  const [location] = useLocation();
  const token = useMemo(() => new URLSearchParams(location.split('?')[1] || '').get('token') || '', [location]);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>(token ? 'idle' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This password reset link is incomplete.');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setState('error');
      setMessage('The passwords do not match.');
      return;
    }
    setState('saving');
    try {
      await api.confirmPasswordReset(token, password);
      setState('success');
      setMessage('Your password has been updated. You can sign in with it now.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'This reset link is invalid or expired.');
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-border/60 bg-card/90 p-8 shadow-2xl">
        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${state === 'success' ? 'bg-emerald-500/15 text-emerald-600' : state === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          {state === 'success' ? <CheckCircle2 className="h-7 w-7" /> : state === 'error' ? <ShieldAlert className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
        </div>
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Yor · account security</p>
        <h1 className="mb-3 text-center text-2xl font-black tracking-tight">{state === 'success' ? 'Password updated' : 'Reset your password'}</h1>
        {state === 'success' ? (
          <>
            <p className="mb-8 text-center text-sm leading-6 text-muted-foreground">{message}</p>
            <Link href="/auth"><Button className="w-full rounded-2xl">Continue to sign in</Button></Link>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {message && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
            <Input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" autoComplete="new-password" required />
            <Input type="password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirm new password" autoComplete="new-password" required />
            <p className="text-xs leading-5 text-muted-foreground">Use at least 8 characters with uppercase, lowercase, a number, and a symbol.</p>
            <Button className="w-full rounded-2xl" disabled={state === 'saving' || !token}>{state === 'saving' ? 'Updating…' : 'Update password'}</Button>
            <Link href="/auth"><Button type="button" variant="ghost" className="w-full rounded-2xl">Back to sign in</Button></Link>
          </form>
        )}
      </section>
    </main>
  );
}
