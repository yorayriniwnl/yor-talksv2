import { StorageService } from "./storage-service.js";
import { MediaModerationService } from "./media-moderation-service.js";
import { FFmpegMediaDecoder } from "./media-byte-verification.js";

/** Media is an optional feature: core health remains independent, while upload gates fail closed. No inference/provider writes. */
async function readMediaReadiness() {
  const [provider, decoder, moderation] = await Promise.all([
    new StorageService().inspectReadiness(),
    new FFmpegMediaDecoder().inspectReadiness(),
    new MediaModerationService().assertReady().then(() => true, () => false),
  ]);
  return { ...provider, decoder, moderation,
    ready: provider.storage && provider.presets && decoder && moderation,
    errorCodes: [...provider.errorCodes, ...(!decoder ? ["media_decoder_unavailable"] : []), ...(!moderation ? ["media_moderation_unavailable"] : [])],
  };
}
export type MediaReadiness = Awaited<ReturnType<typeof readMediaReadiness>>;

function unavailableMediaReadiness(code: string): MediaReadiness {
  return { storage: false, presets: false, direct: false, decoder: false, moderation: false, ready: false, errorCodes: [code] };
}

export function createMediaReadinessMonitor(
  probe: () => Promise<MediaReadiness>,
  now: () => number = Date.now,
  ttlMs = 60_000,
) {
  let cached: { expiresAt: number; report: MediaReadiness } | undefined;
  let inFlight: Promise<MediaReadiness> | undefined;
  const inspect = (force = false): Promise<MediaReadiness> => {
    // Share an active probe even after its original start time passes the TTL.
    if (inFlight) return inFlight;
    if (!force && cached && cached.expiresAt > now()) return Promise.resolve(cached.report);
    inFlight = Promise.resolve().then(probe)
      .catch(() => unavailableMediaReadiness('media_readiness_unavailable'))
      .then((report) => {
        cached = { expiresAt: now() + ttlMs, report };
        return report;
      })
      .finally(() => { inFlight = undefined; });
    return inFlight;
  };
  return {
    inspect,
    snapshot(): MediaReadiness {
      // Optional provider latency must never delay core readiness. Expired or
      // unfinished diagnostics cannot attest that media is ready.
      if (cached && cached.expiresAt > now()) return cached.report;
      void inspect();
      return unavailableMediaReadiness('media_readiness_pending');
    },
  };
}

// Health polling must not exhaust Cloudinary's Admin API quota. Upload/finalize
// gates always make fresh provider checks independently of this diagnostics cache.
const monitor = createMediaReadinessMonitor(readMediaReadiness);
export const inspectMediaReadiness = monitor.inspect;
export const getMediaReadinessSnapshot = monitor.snapshot;
