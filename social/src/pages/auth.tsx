import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Auth() {
  const login = useAppStore((state) => state.login);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (email) login(email);
  };

  const title = mode === 'login' ? 'Welcome back.' : mode === 'signup' ? 'Make your corner.' : 'Reset your password.';
  const subtitle = mode === 'login'
    ? 'Pick up the conversations that matter to you.'
    : mode === 'signup'
      ? 'A calmer place to share ideas and find your people.'
      : 'We will send a secure reset link to your inbox.';

  return (
    <main className="app-canvas min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_24px_80px_-45px_hsl(20_25%_15%/0.55)] lg:min-h-[calc(100vh-4rem)] xl:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-[hsl(20_22%_12%)] p-10 text-white xl:flex xl:flex-col xl:justify-between">
          <div className="absolute -right-28 -top-20 h-96 w-96 rounded-full bg-primary/35 blur-3xl" />
          <div className="absolute -bottom-40 -left-20 h-[30rem] w-[30rem] rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="brand-mark grid h-10 w-10 place-items-center rounded-[14px] text-xl font-bold">Y</div>
            <span className="font-display text-xl font-bold tracking-tight">Yor Talks</span>
          </div>

          <div className="relative z-10 max-w-[38rem] py-12">
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-200"><Sparkles className="h-4 w-4" /> A more human social space</p>
            <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight 2xl:text-6xl">Come for the ideas.<br />Stay for the people.</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-orange-50/70">Yor Talks gives your conversations a home: no clutter, no performance, just room for what you want to say.</p>
            <div className="mt-10 grid max-w-md gap-3 sm:grid-cols-2">
              {['Build your circles', 'Share without the noise', 'Keep your privacy'].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/85 backdrop-blur"><span className="grid h-5 w-5 place-items-center rounded-full bg-orange-300 text-[hsl(20_22%_12%)]"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>{item}</div>)}
            </div>
          </div>

          <blockquote className="relative z-10 max-w-lg border-l-2 border-primary pl-5 text-sm leading-relaxed text-white/65">“The best social spaces feel less like a stage and more like a great room.”<footer className="mt-3 font-semibold text-white/90">The Yor Talks manifesto</footer></blockquote>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:p-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-[390px]">
            <div className="mb-10 flex items-center gap-3 xl:hidden">
              <div className="brand-mark grid h-10 w-10 place-items-center rounded-[14px] text-xl font-bold text-white">Y</div>
              <div><span className="block font-display text-xl font-bold tracking-tight">Yor Talks</span><span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Your corner of the web</span></div>
            </div>
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">{mode === 'login' ? 'Nice to have you here' : 'A thoughtful beginning'}</p>
              <h2 className="font-display text-3xl font-bold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold">Email address</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-12 rounded-xl border-border bg-muted/40 px-4 focus-visible:ring-primary/50" />
              </div>
              {mode !== 'forgot' && <div className="space-y-2">
                <div className="flex items-center justify-between"><Label htmlFor="password" className="font-semibold">Password</Label>{mode === 'login' && <button type="button" onClick={() => setMode('forgot')} className="text-sm font-semibold text-primary hover:underline">Forgot password?</button>}</div>
                <Input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required className="h-12 rounded-xl border-border bg-muted/40 px-4 focus-visible:ring-primary/50" />
              </div>}
              <Button type="submit" className="mt-2 h-12 w-full rounded-xl text-sm font-semibold shadow-lg shadow-primary/20">
                {mode === 'login' ? 'Enter Yor Talks' : mode === 'signup' ? 'Create my account' : 'Send reset link'} <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-7 text-center text-sm text-muted-foreground">
              {mode === 'login' ? <>New here? <button onClick={() => setMode('signup')} className="font-semibold text-primary hover:underline">Create an account</button></> : <>Already have an account? <button onClick={() => setMode('login')} className="font-semibold text-primary hover:underline">Sign in</button></>}
            </div>
            <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">By continuing, you agree to our community guidelines and respect the spaces you join.</p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
