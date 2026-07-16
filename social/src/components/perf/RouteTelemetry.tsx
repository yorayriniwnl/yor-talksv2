import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { mark } from '@/lib/perf';
import { sendTelemetry } from '@/lib/telemetry';

export default function RouteTelemetry() {
  const [location] = useLocation();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    const from = prevRef.current ?? 'unknown';
    const to = location;
    prevRef.current = location;
    try {
      mark(`navigation:start:${to}`);
      sendTelemetry({ type: 'navigation', payload: { from, to } });
    } catch (e) {
      // ignore
    }
  }, [location]);

  return null;
}
