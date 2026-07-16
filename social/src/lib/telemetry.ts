import { enqueueTelemetry, initTelemetryBatcher } from './telemetryBatcher';

type TelemetryEvent = {
  type: string;
  timestamp?: string;
  payload?: Record<string, any>;
};

export function sendTelemetry(event: TelemetryEvent) {
  try {
    enqueueTelemetry(event as any);
  } catch (e) {
    // fallback logging
    // eslint-disable-next-line no-console
    console.debug('[telemetry] fallback', event.type, event.payload ?? {});
  }
}

export function initTelemetry() {
  try {
    initTelemetryBatcher();
  } catch (e) {
    // noop
  }
}

export default { sendTelemetry, initTelemetry };
