import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { YorWorldDistrict } from './YorWorldPreview';

const YorWorldPreview = lazy(() => import('./YorWorldPreview'));

function WorldPlaceholder() {
  return <div className="pr-world-placeholder">
    <img src={`${import.meta.env.BASE_URL}images/yor-world-portal-v2.jpg`} alt="Yor World concept environment with a monumental illuminated portal" loading="lazy" decoding="async" />
    <span>YOR WORLD · EXPERIENCE PREVIEW</span>
  </div>;
}

export default function DeferredYorWorldPreview({ selectedDistrict, onSelectDistrict }: {
  selectedDistrict: YorWorldDistrict;
  onSelectDistrict: (district: YorWorldDistrict) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    if (!('IntersectionObserver' in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setReady(true);
      observer.disconnect();
    }, { rootMargin: '300px' });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={host} className="pr-world-showcase">
    {ready ? <Suspense fallback={<WorldPlaceholder />}>
      <YorWorldPreview selectedDistrict={selectedDistrict} onSelectDistrict={onSelectDistrict} />
    </Suspense> : <WorldPlaceholder />}
  </div>;
}
