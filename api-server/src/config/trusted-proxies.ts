import { isIP } from 'node:net';
import type { Express } from 'express';

/** Only literal infrastructure addresses/networks; no hop counts or aliases. */
export function parseTrustedProxyCidrs(value: string): string[] {
  const entries = value.split(',').map(entry => entry.trim()).filter(Boolean);
  for (const entry of entries) {
    const [address, prefix, extra] = entry.split('/');
    const version = isIP(address);
    if (!version || extra !== undefined || (prefix !== undefined
      && (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (version === 4 ? 32 : 128)))
      || (/^::ffff:/i.test(address) && prefix !== undefined && Number(prefix) <= 96)) {
      throw new Error('[Config Error] TRUSTED_PROXY_CIDRS must contain explicit IP addresses/CIDRs and cannot trust every client');
    }
  }
  return [...new Set(entries)];
}

/** Supported edges emit one sanitized client address and protocol. */
export function configureProxyTrust(app: Express, cidrs: readonly string[]): void {
  app.set('trust proxy', cidrs.length ? [...cidrs] : false);
  app.use((req, res, next) => {
    const trust = app.get('trust proxy fn') as (address: string, index: number) => boolean;
    const remote = req.socket.remoteAddress;
    if (!remote || !trust(remote, 0)) {
      for (const header of ['forwarded', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host', 'x-real-ip']) {
        delete req.headers[header];
      }
      next();
      return;
    }
    const address = req.get('x-forwarded-for');
    const protocol = req.get('x-forwarded-proto');
    // A comma chain is a configuration error for these canonical edge paths.
    // Accepting its first element would reintroduce variable-hop spoofing.
    if ((address !== undefined && isIP(address) === 0)
      || (protocol !== undefined && protocol !== 'http' && protocol !== 'https')) {
      res.status(400).json({ success: false, message: 'Invalid proxy headers', data: null, errors: ['invalid_proxy_headers'] });
      return;
    }
    delete req.headers.forwarded;
    next();
  });
}
