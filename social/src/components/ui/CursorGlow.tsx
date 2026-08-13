import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -500, y: -500 });
  const pos = useRef({ x: -500, y: -500 });
  const raf = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover || reduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (raf.current === null && document.visibilityState === 'visible') {
        raf.current = requestAnimationFrame(animate);
      }
    };

    const animate = () => {
      const deltaX = mouse.current.x - pos.current.x;
      const deltaY = mouse.current.y - pos.current.y;
      pos.current.x += deltaX * 0.15;
      pos.current.y += deltaY * 0.15;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${pos.current.x - 150}px, ${pos.current.y - 150}px)`;
      }

      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        raf.current = requestAnimationFrame(animate);
      } else {
        raf.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && raf.current !== null) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [reduceMotion]);

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 hidden h-[300px] w-[300px] rounded-full pointer-events-none z-30 opacity-0 transition-opacity duration-500 sm:block sm:opacity-100 motion-reduce:hidden"
      style={{
        background: 'radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
        willChange: 'transform',
      }}
      aria-hidden="true"
    />
  );
}
