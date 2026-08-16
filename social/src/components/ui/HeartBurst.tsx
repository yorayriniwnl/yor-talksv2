import { useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  distance: number;
  scale: number;
  delay: number;
}

export function useHeartBurst() {
  const [particles, setParticles] = useState<Particle[]>([]);
  let nextId = 0;

  const burst = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const newParticles: Particle[] = Array.from({ length: 8 }, (_, i) => ({
      id: nextId++,
      x,
      y,
      angle: (i * 45) + (Math.random() * 20 - 10),
      distance: 40 + Math.random() * 30,
      scale: 0.6 + Math.random() * 0.6,
      delay: Math.random() * 80,
    }));

    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 800);
  }, []);

  return { particles, burst };
}

export function HeartBurstLayer({ particles }: { particles: Particle[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998]" aria-hidden="true">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;

        return (
          <span
            key={p.id}
            className="absolute text-rose-500 animate-heart-burst"
            style={{
              left: p.x,
              top: p.y,
              fontSize: `${p.scale * 18}px`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties}
          >
            ♥
          </span>
        );
      })}
    </div>
  );
}
