import { useEffect, useRef, useState } from 'react';

export function useProgressiveList<T>(items: T[], pageSize = 8) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(pageSize, items.length));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(Math.min(pageSize, items.length));
  }, [items, pageSize]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(items.length, c + pageSize));
        }
      });
    }, { rootMargin: '200px' });

    io.observe(el);
    return () => io.disconnect();
  }, [items.length, pageSize]);

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    sentinelRef,
  };
}
