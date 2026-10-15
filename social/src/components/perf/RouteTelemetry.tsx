import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { mark } from '@/lib/perf';
import { hasTelemetryConsent, sendTelemetry } from '@/lib/telemetry';

export default function RouteTelemetry() {
  const [location] = useLocation();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    const safeRoute = location.split('?')[0].replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id').replace(/\/@[^/]+/g, '/@:username');
    const from = prevRef.current ?? 'unknown';
    const to = safeRoute;
    prevRef.current = safeRoute;
    try {
      if (hasTelemetryConsent()) {
        mark(`navigation:start:${to}`);
        sendTelemetry({ type: 'navigation', payload: { from, to } });
      }
    } catch { /* Performance telemetry is optional. */ }
  }, [location]);

  return null;
}
