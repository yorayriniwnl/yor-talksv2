import { HandCoins, ShieldCheck, Sparkles } from 'lucide-react';

export default function Bounties() {
  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <header className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black shadow-md">
            <HandCoins className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Creator Grants &amp; Bounties</h1>
            <p className="font-mono text-[0.68rem] text-muted-foreground">Sponsor-verified opportunities</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-border/50 bg-card/70 px-6 py-12 text-center shadow-xl sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.12),transparent_60%)]" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
            <Sparkles className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 font-mono text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            No verified listings
          </div>
          <h2 className="mx-auto mt-5 max-w-2xl font-display text-2xl font-black tracking-tight sm:text-4xl">
            No sponsor-verified grants are open right now.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Opportunities will appear here after the sponsor, funding amount, deadline, and application terms have been confirmed.
          </p>
          <p className="mt-8 text-xs text-muted-foreground">
            Check back later for confirmed creator opportunities.
          </p>
        </section>
      </main>
    </div>
  );
}
