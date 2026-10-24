import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { assertRecoveryReplay } from '../services/privacy-readiness.js';

export function createRecoveryGate(check = () => assertRecoveryReplay({enabled:env.RECOVERY_REPLAY_GATE,
  through:env.RESTORE_DELETION_JOURNAL_THROUGH,sha256:env.RESTORE_DELETION_MANIFEST_SHA256})): RequestHandler {
  return async (req,res,next) => {
    // Keep probes available while isolating all application reads and writes.
    if (/^\/api(?:\/v1)?\/(?:healthz|livez|readyz)\/?$/.test(req.path)) { next(); return; }
    try { await check(); next(); }
    catch { res.setHeader('Cache-Control','no-store'); res.status(503).json({error:'Recovery reconciliation is incomplete',code:'recovery_unavailable'}); }
  };
}
