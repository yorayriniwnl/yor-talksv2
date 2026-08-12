export default function RouteSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading content" className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="surface-1 overflow-hidden rounded-2xl border border-border/40 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="skeleton-aurora h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton-aurora h-3 w-28" />
              <div className="skeleton-aurora h-2.5 w-20 opacity-70" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <div className="skeleton-aurora h-3 w-full" />
            <div className="skeleton-aurora h-3 w-4/5" />
            <div className="skeleton-aurora h-56 w-full" />
          </div>
        </div>
        <div className="surface-1 rounded-2xl border border-border/40 p-5 shadow-sm">
          <div className="skeleton-aurora h-3 w-2/5" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="skeleton-aurora h-24" />
            <div className="skeleton-aurora h-24" />
            <div className="skeleton-aurora h-24" />
          </div>
        </div>
      </div>
    </main>
  );
}
