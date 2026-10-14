import { enqueueTelemetry, hasTelemetryConsent, initTelemetryBatcher, setTelemetryConsent, setTelemetryEligibility } from './telemetryBatcher';

type TelemetryEvent = {
  type: string;
  timestamp?: string;
  payload?: Record<string, any>;
};

export function sendTelemetry(event: TelemetryEvent) {
  if (!hasTelemetryConsent()) return;
  try {
    enqueueTelemetry(event as any);
  } catch { /* Optional telemetry must never fall back to local or console logging. */ }
}

export function initTelemetry() {
  try {
    initTelemetryBatcher();
  } catch (e) {
    // noop
  }
}

export { hasTelemetryConsent, setTelemetryConsent, setTelemetryEligibility };

export default { sendTelemetry, initTelemetry };
