import { StorageService } from "./storage-service.js";
import { MediaModerationService } from "./media-moderation-service.js";
import { FFmpegMediaDecoder } from "./media-byte-verification.js";

/** Dependency health and core-media release acceptance are distinct. Deployment
 * smoke requires ready=true; isolated CI explicitly exercises unavailable
 * providers. Upload/finalize gates fail closed. No inference/provider writes. */
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
let cached: { expiresAt: number; report: ReturnType<typeof readMediaReadiness> } | undefined;
export function inspectMediaReadiness(force = false) {
  // Health polling must not exhaust Cloudinary's Admin API quota. Upload/finalize gates always make fresh provider checks.
  if (!force && cached && cached.expiresAt > Date.now()) return cached.report;
  const report = readMediaReadiness(); cached = { expiresAt: Date.now() + 60_000, report };
  return report;
}
