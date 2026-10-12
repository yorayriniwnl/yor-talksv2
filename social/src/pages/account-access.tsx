import { useState } from 'react';
import { AccountAccessNav } from '@/components/auth/AccountAccessNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

export default function AccountAccessPage() {
  const currentUser = useAppStore((state) => state.currentUser);
  const logout = useAppStore((state) => state.logout);
  const setTwoFactorEnabled = useAppStore((state) => state.setTwoFactorEnabled);
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not complete this action. Please retry.'); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-background px-4 py-10 text-foreground">
    <div className="mx-auto max-w-2xl space-y-6">
      <AccountAccessNav />
      <h1 className="font-display text-2xl font-bold">Security and account rights</h1>
      <p className="text-sm text-muted-foreground">These controls remain available while social access is pending or restricted.</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {message && <p role="status">{message}</p>}
      <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Two-factor authentication</h2>
        <p className="text-sm">{currentUser?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</p>
        {!currentUser?.twoFactorEnabled && !setup && <Button disabled={busy} onClick={() => void run(async () => { setSetup(await api.setupTwoFactor()); })}>Set up authenticator</Button>}
        {setup && <div className="space-y-2 text-sm"><p>Add this setup key to your authenticator app. Keep it private.</p><code className="block break-all select-all">{setup.secret}</code><a href={setup.otpauthUrl} className="text-primary underline">Open authenticator app</a></div>}
        {(setup || currentUser?.twoFactorEnabled) && <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault(); void run(async () => {
            if (!/^\d{6}$/.test(code)) throw new Error('Enter the current six-digit authenticator code.');
            if (setup) { await api.confirmTwoFactor(code); setTwoFactorEnabled(true); setSetup(null); setMessage('Two-factor authentication enabled.'); }
            else { await api.disableTwoFactor(code); setTwoFactorEnabled(false); setMessage('Two-factor authentication disabled.'); }
            setCode('');
          });
        }}><label className="block text-sm">Authenticator code<Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="mt-2" /></label><Button disabled={busy}>{setup ? 'Confirm setup' : 'Disable two-factor authentication'}</Button></form>}
        <Button variant="outline" disabled={busy} onClick={() => void run(async () => { await api.request('/auth/logout-all', { method: 'POST' }); await logout(); })}>Sign out on all devices</Button>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Export your data</h2>
        <Button disabled={busy} onClick={() => void run(async () => {
          const data = await api.exportMyData();
          const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
          const link = document.createElement('a'); link.href = url; link.download = 'yor-talks-account-export.json'; link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Your account export is ready.');
        })}>Download account export</Button>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Delete your account</h2>
        <p className="text-sm text-muted-foreground">This permanently deletes your account and associated data. Export any data you want to keep first.</p>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void run(async () => {
          if (confirmation !== 'DELETE') throw new Error('Type DELETE to confirm account removal.');
          await api.deleteAccount(password); await logout();
        }); }}>
          <label className="block text-sm">Account password<Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-2" /></label>
          <label className="block text-sm">Type DELETE to confirm<Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required className="mt-2" /></label>
          <Button variant="destructive" disabled={busy || confirmation !== 'DELETE'}>Permanently delete account</Button>
        </form>
      </section>
    </div>
  </main>;
}
