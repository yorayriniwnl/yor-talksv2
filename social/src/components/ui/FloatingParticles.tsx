import { useAppReducedMotion } from '@/components/accessibility/AccessibilityProvider';

export function FloatingParticles() {
  const reduceMotion = useAppReducedMotion();

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
