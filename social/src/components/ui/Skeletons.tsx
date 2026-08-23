/**
 * Shimmer skeleton for individual feed posts.
 * Renders N placeholder cards that match the real post layout.
 */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading feed">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="surface-1 rounded-none sm:rounded-3xl border-y sm:border border-border/40 overflow-hidden shadow-sm p-4 sm:p-5"
        >
          {/* Author row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="skeleton-aurora h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-aurora h-3 w-28 rounded" />
              <div className="skeleton-aurora h-2.5 w-20 rounded opacity-70" />
            </div>
          </div>
          {/* Text lines */}
          <div className="space-y-2.5 mb-4">
            <div className="skeleton-aurora h-3 w-full rounded" />
            <div className="skeleton-aurora h-3 w-4/5 rounded" />
          </div>
          {/* Image placeholder */}
          {i % 2 === 0 && (
            <div className="skeleton-aurora h-56 w-full rounded-2xl mb-4" />
          )}
          {/* Action bar */}
          <div className="flex items-center gap-6 pt-2">
            <div className="skeleton-aurora h-4 w-12 rounded" />
            <div className="skeleton-aurora h-4 w-12 rounded" />
            <div className="skeleton-aurora h-4 w-12 rounded" />
            <div className="ml-auto skeleton-aurora h-4 w-6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Profile page skeleton for the header area.
 */
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading profile">
      {/* Cover */}
      <div className="skeleton-aurora h-48 sm:h-64 w-full" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-16">
        {/* Avatar */}
        <div className="skeleton-aurora h-28 w-28 rounded-full border-4 border-background" />
        <div className="mt-4 space-y-3">
          <div className="skeleton-aurora h-5 w-40 rounded" />
          <div className="skeleton-aurora h-3 w-28 rounded opacity-70" />
          <div className="skeleton-aurora h-3 w-64 rounded" />
          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="skeleton-aurora h-4 w-16 rounded" />
            <div className="skeleton-aurora h-4 w-16 rounded" />
            <div className="skeleton-aurora h-4 w-16 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Messages page skeleton.
 */
export function MessagesSkeleton() {
  return (
    <div className="flex h-screen" aria-busy="true" aria-label="Loading messages">
      {/* Conversation list */}
      <div className="w-80 border-r border-border/40 p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="skeleton-aurora h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-aurora h-3 w-24 rounded" />
              <div className="skeleton-aurora h-2.5 w-32 rounded opacity-60" />
            </div>
          </div>
        ))}
      </div>
      {/* Chat area */}
      <div className="flex-1 p-6 space-y-4">
        <div className="skeleton-aurora h-3 w-32 rounded mx-auto" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className="skeleton-aurora h-10 w-48 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
