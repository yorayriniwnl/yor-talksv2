import { useReducedMotion } from 'framer-motion';

export function FloatingParticles() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <div className="particles-container" aria-hidden="true">
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
    </div>
  );
}
